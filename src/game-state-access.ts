import { produce } from 'immer';
import { EntityState, MobileId } from './entity';
import { initMainState } from './init-state';
import { DynamicLayer, isEmptyTile, pointMapEntries, putDynamicTile } from './layer';
import { emptyLevelData, LevelData, mkLevel } from './level';
import { Point } from './lib/point';
import { SE2 } from './lib/se2';
import { Brect } from "./lib/types";
import { isUnbreathable, itemTimeLimit } from './model-utils';
import { GameState, IfaceState, Level, MainState } from './state';
import { Item } from './types';
import { boundBrect, pointInBrect } from './util';
import { tileOfGameState } from './model';

export function getCurrentLevel(state: GameState): Level {
  return state.currentLevelState;
}

export function getCurrentLevelData(state: GameState): LevelData {
  return state.levels[state.currentLevel];
}

export function getBoundRect(state: GameState): Brect {
  return getCurrentLevelData(state).boundRect;
}

export function getInitOverlay(state: GameState): DynamicLayer {
  return getCurrentLevelData(state).initOverlay;
}

export function getOverlay(state: GameState): DynamicLayer {
  return getCurrentLevel(state).overlay;
}

export function setOverlay(state: GameState, overlay: DynamicLayer): GameState {
  return produce(state, s => { s.currentLevelState.overlay = overlay; });
}

export function setCurrentLevel(state: GameState, levelName: string): GameState {
  if (state.levels[levelName] == undefined) {
    state = produce(state, s => {
      s.levels[levelName] = emptyLevelData();
    });
  }

  const newLevel = mkLevel(state.levels[levelName]);
  return produce(state, s => {
    s.currentLevel = levelName;
    s.currentLevelState = newLevel;
  });
}

/**
 * Imperatively update the bounding rect of the current level to include p.
 * This is an idempotent operation.
 */
export function expandBoundRect(state: GameState, p: Point): void {
  const brect = getBoundRect(state);
  if (!pointInBrect(p, brect)) {
    state.levels[state.currentLevel].boundRect = boundBrect([brect.min, brect.max, p]);
  }
}

export function isToolbarActive(state: MainState): boolean {
  return state.iface.toolState.t != 'play_tool';
}

export function getMouseCache(state: MainState): Point | undefined {
  return state.nonVisibleState.mouseCache;
}

export function setMouseCache(state: MainState, p: Point | undefined): void {
  state.nonVisibleState.mouseCache = p;
}

/**
 * Resets the current room's state. This can be somewhat subtle,
 * since if there's elements that have changed that we want to
 * consider "monotonic progress forward" we don't want to reset them.
 * My point of reference for that concept is how Isles of
 * Sea and Sky. This is discussed a little in DESIGN.md.
 */
export function resetRoom(state: GameState): GameState {
  const newLevelState = mkLevel(state.levels[state.currentLevel])
  state = setOverlay(state, { tiles: {} });

  const last_save = state.lastSave;
  const newPlayer = produce(initMainState.game.player, p => {
    p.pos = last_save;
  });
  return produce(state, s => {
    s.inventory = {};
    s.currentLevelState = newLevelState;
    s.player = newPlayer;
    s.time = 0;
  });
}

export function setWorldFromView(state: IfaceState, world_from_view: SE2): IfaceState {
  return produce(state, s => {
    s.world_from_view = world_from_view;
  });
}

export function getMobileById(state: GameState, id: MobileId): EntityState | undefined {
  return state.currentLevelState.entities.find(x => x.id == id);
}

export function setMobileById(state: GameState, id: MobileId, es: EntityState): GameState {
  const ix = state.currentLevelState.entities.findIndex(x => x.id == id);
  if (ix == -1) {
    console.error(`entity with id ${id} not found`);
    return state;
  }
  return produce(state, s => {
    s.currentLevelState.entities[ix] = es;
  });
}

export function deleteMobile(state: GameState, id: MobileId): GameState {
  const ix = state.currentLevelState.entities.findIndex(x => x.id == id);
  if (ix == -1) {
    console.error(`entity with id ${id} not found`);
    return state;
  }
  return produce(state, s => {
    s.currentLevelState.entities.splice(ix, 1);
  });
}

export function elapseTimeBasedItems(state: GameState): GameState {
  const ks = Object.keys(state.inventory);
  return produce(state, s => {
    for (const k of ks as Item[]) {
      if (itemTimeLimit(k) != undefined)
        s.inventory[k] = Math.max(0, (state.inventory[k] ?? 0) - 1);
    }
  });
}

export function adjustOxygen(state: GameState): GameState {
  const player = state.player;
  const tile = tileOfGameState(state, player.pos);
  if (isUnbreathable(tile)) {
    state = produce(state, s => { s.player.oxygen--; });
  }
  else {
    state = produce(state, s => { s.player.oxygen = 0; });
  }
  if (state.player.oxygen < -5) {
    state = produce(state, s => { s.player.dead = true; });
  }
  return state;
}

// Undefined behavior if dst is a level that already exists. The UI
// should prevent that.
export function renameLevel(state: GameState, src: string, dst: string): GameState {
  type Rewrite = { level: string, loc: Point };

  // Handle trivial nonrenaming case
  if (src == dst) return state;

  // find doors to rewrite
  const rewrites: Rewrite[] = [];
  for (const [k, v] of Object.entries(state.levels)) {
    for (const e of pointMapEntries(v.initOverlay)) {
      if (e.value.t == 'door') {
        if (e.value.destinationLevel == src) {
          rewrites.push({ level: k, loc: e.loc });
        }
      }
    }
  }

  // rewrite all doors
  state = produce(state, s => {
    for (const p of rewrites) {
      putDynamicTile(s.levels[p.level].initOverlay, p.loc,
        { t: 'door', destinationLevel: dst });
    }
  });

  // swing entire level over to new name
  state = produce(state, s => {
    s.levels[dst] = state.levels[src];
    delete s.levels[src];
  });

  // refresh current level if necessary
  if (state.currentLevel == src) {
    state = produce(state, s => {
      s.currentLevel = dst;
    });
    state = setCurrentLevel(state, dst);
  }

  return state;
}

// Change bounds of current level to be the tightest they can be to
// contain all the tiles of the level.
export function cropLevel(state: GameState): GameState {
  const entries = pointMapEntries(getCurrentLevelData(state).initOverlay);
  const newRect = boundBrect(entries.flatMap(({ loc, value }) =>
    isEmptyTile(value) ? [] : [loc])
  );
  return produce(state, s => {
    s.levels[state.currentLevel].boundRect = newRect;
  });
}
