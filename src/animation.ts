import { putTile } from './layer';
import { vplus, vscale, nope } from './util';
import { Point, Facing, Sprite } from './types';
import { produce, DraftObject } from 'immer';
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
  | { t: 'SavePointChangeAnimation', pos: Point }
  | { t: 'ResetAnimation' };


export type Animator = {
  dur: number, // duration in frames
  anim: (fr: number, s: DraftObject<State>) => void,
}

export type Time = {
  t: number,  // the fraction of the animation's duration that has been completed.
  fr: number, // the number of frames since the animation has started
};

const DEATH_FADE_OUT = 2;
const DEATH_HOLD = 0;
const DEATH_FADE_IN = 2;
const DEATH = DEATH_FADE_OUT + DEATH_HOLD + DEATH_FADE_IN;

export function app(a: Animation, state: DraftObject<State>, time: Time): void {
  const { t, fr } = time;
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
      if (fr <= DEATH_FADE_OUT) {
        state.extra.blackout = fr / DEATH_FADE_OUT;
      }
      else if (fr <= DEATH_FADE_OUT + DEATH_HOLD) {
        state.extra.blackout = 1;
      }
      else {
        state.extra.blackout = (DEATH - fr) / DEATH_FADE_OUT;
      }
      if (fr >= DEATH_FADE_OUT) {
        state.iface = init_state.iface;
        state.overlay = init_state.overlay;
        const last_save = state.last_save;
        state.player = produce(init_state.player, p => {
          p.pos = last_save;
        });
        state.viewPort = init_state.viewPort;
      }
      break;
    case 'SavePointChangeAnimation':
      if (t > 0.5)
        state.last_save = a.pos;
      break;
    default:
      return nope(a);
  }
}

// duration in frames
export function duration(a: Animation): number {
  switch (a.t) {
    case 'PlayerAnimation': return 2;
    case 'ViewPortAnimation': return 2;
    case 'MeltAnimation': return 2;
    case 'ResetAnimation': return DEATH;
    case 'SavePointChangeAnimation': return 2;
    default:
      return nope(a);
  }
}
