import { putTile } from './layer';
import { vplus, vscale } from './util';
import { Point, Facing, Sprite } from './types';
import { DraftObject } from 'immer';
import { State, init_state } from './state';

export type Animation = (state: DraftObject<State>, t: number) => void;

export function PlayerAnimation(pos: Point, animState: Sprite, impetus: number, flipState: Facing, dead: boolean): Animation {
  return (state: DraftObject<State>, t: number) => {
    state.player = {
      dead: dead && t >= 0.75,
      pos: vplus(vscale(state.player.pos, 1 - t), vscale(pos, t)),
      animState: animState,
      flipState: flipState,
      impetus: impetus
    }
  };
}

export function ViewPortAnimation(dpos: Point): Animation {
  return (state: DraftObject<State>, t: number) => {
    state.viewPort = vplus(state.viewPort, vscale(dpos, t));
  };
}

export function MeltAnimation(pos: Point): Animation {
  return (state: DraftObject<State>, t: number) => {
    putTile(state.overlay, pos, t > 0.5 ? 'empty' : 'broken_box');
  };
}

export function ResetAnimation(): Animation {
  return (state: DraftObject<State>, t: number) => {
    if (t > 0.75) {
      state.iface = init_state.iface;
      state.overlay = init_state.overlay;
      state.player = init_state.player;
      state.viewPort = init_state.viewPort;
    }
  };
}
