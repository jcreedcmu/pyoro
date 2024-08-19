import { produce } from 'immer';
import { initMainState } from './init-state';
import { DynamicLayer } from './layer';
import { emptyLevel, LevelData } from './level';
import { Point, vdiag } from './lib/point';
import { Brect } from "./lib/types";
import { GameState, IfaceState, Level, MainState } from './state';
import { boundBrect, pointInBrect } from './util';
import { mkSE2, SE2 } from './lib/se2';
import { TILE_SIZE } from './constants';

export function getCurrentLevel(state: GameState): Level {
  return state.levels[state.currentLevel];
}

export function getCurrentLevelData(state: GameState): LevelData {
  return getCurrentLevel(state).levelData;
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
  return produce(state, s => { s.levels[state.currentLevel].overlay = overlay; });
}

export function setCurrentLevel(state: GameState, levelName: string): GameState {
  return produce(state, s => {
    if (state.levels[levelName] == undefined) {
      s.levels[levelName] = emptyLevel();
    }
    s.currentLevel = levelName;
  });
}

/**
 * Imperatively update the bounding rect of the current level to include p.
 * This is an idempotent operation.
 */
export function expandBoundRect(state: GameState, p: Point): void {
  const brect = getBoundRect(state);
  if (!pointInBrect(p, brect)) {
    state.levels[state.currentLevel].levelData.boundRect = boundBrect([brect.min, brect.max, p]);
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
  state = setOverlay(state, { tiles: {} });

  const last_save = state.lastSave;
  const initBusState = getCurrentLevelData(state).busState;
  const newPlayer = produce(initMainState.game.player, p => {
    p.pos = last_save;
  });
  return produce(state, s => {
    s.inventory = {};
    getCurrentLevel(s).busState = initBusState;
    s.player = newPlayer;
    s.time = 0;
  });
}

// XXX Deprecated
export function getViewport(state: MainState): Point {
  return getViewportIface(state.iface);
}

// XXX Deprecated
export function getViewportIface(state: IfaceState): Point {
  return state.world_from_view.translate;
}

// XXX Deprecated
export function setViewport(state: MainState, viewPort: Point): MainState {
  const newIface = setViewportIface(state.iface, viewPort);
  return produce(state, s => {
    s.iface = newIface;
  });
}

// XXX Deprecated
export function setViewportIface(state: IfaceState, viewPort: Point): IfaceState {
  const worldFromView = mkSE2(vdiag(1 / TILE_SIZE), viewPort);
  return produce(state, s => {
    s.world_from_view = worldFromView;
  });
}

export function setWorldFromView(state: IfaceState, world_from_view: SE2): IfaceState {
  return produce(state, s => {
    s.world_from_view = world_from_view;
  });
}
