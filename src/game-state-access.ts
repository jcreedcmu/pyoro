import { produce } from 'immer';
import { DynamicLayer } from './layer';
import { GameState, State } from './state';

export function getInitOverlay(state: GameState): DynamicLayer {
  return state.levels[state.currentLevel].initOverlay;
}

export function getOverlay(state: GameState): DynamicLayer {
  return state.levels[state.currentLevel].overlay;
}

export function setOverlay(state: GameState, overlay: DynamicLayer): GameState {
  return produce(state, s => { s.levels[state.currentLevel].overlay = overlay; });
}
