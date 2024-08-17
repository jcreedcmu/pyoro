import { produce } from 'immer';
import { DynamicLayer } from './layer';
import { GameState, MainState } from './state';
import { emptyLevel } from './level';
import { Brect } from './types';
import { boundBrect, pointInBrect } from './util';
import { Point } from './point';

export function getBoundRect(state: GameState): Brect {
  return state.levels[state.currentLevel].boundRect;
}

export function getInitOverlay(state: GameState): DynamicLayer {
  return state.levels[state.currentLevel].initOverlay;
}

export function getOverlay(state: GameState): DynamicLayer {
  return state.levels[state.currentLevel].overlay;
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
