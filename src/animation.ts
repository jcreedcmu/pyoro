import { putTile } from './layer';
import { vplus, vscale, nope } from './util';
import { Point, Facing, Sprite } from './types';
import { DraftObject } from 'immer';
import { State, init_state } from './state';

export type Animation =
  {
    t: 'PlayerAnimation',
    pos: Point,
    animState: Sprite,
    impetus: number,
    flipState: Facing,
    dead: boolean
  }
  | { t: 'ViewPortAnimation', dpos: Point }
  | { t: 'MeltAnimation', pos: Point }
  | { t: 'ResetAnimation' };


export function app(a: Animation, state: DraftObject<State>, t: number): void {
  switch (a.t) {
    case 'PlayerAnimation':
      const { pos, animState, impetus, flipState, dead } = a;
      state.player = {
        dead: dead && t >= 0.75,
        pos: vplus(vscale(state.player.pos, 1 - t), vscale(pos, t)),
        animState: animState,
        flipState: flipState,
        impetus: impetus
      }
      break;
    case 'ViewPortAnimation':
      state.viewPort = vplus(state.viewPort, vscale(a.dpos, t));
      break;
    case 'MeltAnimation':
      putTile(state.overlay, a.pos, t > 0.5 ? 'empty' : 'broken_box');
      break;
    case 'ResetAnimation':
      if (t > 0.75) {
        state.iface = init_state.iface;
        state.overlay = init_state.overlay;
        state.player = init_state.player;
        state.viewPort = init_state.viewPort;
      }
      break;
    default:
      return nope(a);
  }
}
