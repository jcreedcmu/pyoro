import { produce } from 'immer';
import { DynamicLayer } from './layer';
import { GameState, State } from './state';

export function getInitOverlay(state: GameState): DynamicLayer {
  return state.level.initOverlay;
}

export function getOverlay(state: GameState): DynamicLayer {
  return state.level.overlay;
}

export function setOverlay(state: GameState, overlay: DynamicLayer): GameState {
  return produce(state, s => { s.level.overlay = overlay; });
}
