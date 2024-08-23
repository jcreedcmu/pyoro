import { produce } from 'immer';
import { initMainState } from './init-state';
import { DynamicLayer } from './layer';
import { emptyLevel, emptyLevelData, LevelData, mkLevel } from './level';
import { Point, vdiag } from './lib/point';
import { Brect } from "./lib/types";
import { GameState, IfaceState, Level, MainState } from './state';
import { boundBrect, pointInBrect } from './util';
import { mkSE2, SE2 } from './lib/se2';
import { TILE_SIZE } from './constants';

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
