import { DraftObject, produce } from 'immer';
import { NUM_TILES } from './constants';
import { putTile } from './layer';
import { init_state, State } from './state';
import { Facing, Point, Sprite } from './types';
import { nope, vm2, vplus, vscale, int, lerp } from './util';

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
  | { t: 'ItemGetAnimation', pos: Point }
  | { t: 'ResetAnimation' }
  | { t: 'RecenterAnimation' };


export type Animator = {
  dur: number, // duration in frames
  anim: (fr: number, s: State) => State,
}

export type Time = {
  t: number,  // the fraction of the animation's duration that has been completed.
  fr: number, // the number of frames since the animation has started
};

export function centeredViewPort(pos: Point): Point {
  return vm2(pos, NUM_TILES, (p, NT) => int(p - NT / 2));
}

const DEATH_FADE_OUT = 2;
const DEATH_HOLD = 0;
const DEATH_FADE_IN = 2;
const DEATH = DEATH_FADE_OUT + DEATH_HOLD + DEATH_FADE_IN;

export function app(a: Animation, state: State, time: Time): State {
  const { t, fr } = time;
  switch (a.t) {
    case 'PlayerAnimation':
      const { pos, animState, impetus, flipState, dead } = a;
      return produce(state, s => {
        s.player = {
          dead: dead && t >= 0.75,
          pos: vplus(vscale(s.player.pos, 1 - t), vscale(pos, t)),
          animState: animState,
          flipState: flipState,
          impetus: impetus
        }
      });
    case 'ViewPortAnimation':
      return produce(state, s => {
        s.viewPort = vplus(s.viewPort, vscale(a.dpos, t));
      });

    case 'MeltAnimation':
      return produce(state, s => {
        putTile(s.overlay, a.pos, t > 0.5 ? 'empty' : 'broken_box');
      });
    case 'ResetAnimation':
      return produce(state, s => {
        if (fr <= DEATH_FADE_OUT) {
          s.extra.blackout = fr / DEATH_FADE_OUT;
        }
        else if (fr <= DEATH_FADE_OUT + DEATH_HOLD) {
          s.extra.blackout = 1;
        }
        else {
          s.extra.blackout = (DEATH - fr) / DEATH_FADE_OUT;
        }
        if (fr >= DEATH_FADE_OUT) {
          s.overlay = s.initial_overlay;
          const last_save = s.last_save;
          s.player = produce(init_state.player, p => {
            p.pos = last_save;
          });
          s.viewPort = centeredViewPort(last_save);
        }
      });
    case 'SavePointChangeAnimation':
      return produce(state, s => {
        if (t > 0.5)
          s.last_save = a.pos;
      });
    case 'RecenterAnimation':
      return produce(state, s => {
        const target = centeredViewPort(s.player.pos);
        s.viewPort = vm2(target, s.viewPort, (tgt, vp) => lerp(vp, tgt, t));
      });
    case 'ItemGetAnimation':
      return produce(state, s => {
        s.inventory.teal_fruit = a.pos;
      });
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
    case 'RecenterAnimation': return 4;
    case 'ItemGetAnimation': return 2;
    default:
      return nope(a);
  }
}
