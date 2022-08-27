import { produce } from 'immer';
import { NUM_TILES } from './constants';
import { putTile } from './layer';
import { GameState, IfaceState, init_state, State } from './state';
import { Facing, Point, Sprite, Item } from './types';
import { vm2, vplus, vscale, int, lerp } from './point';

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
  | { t: 'ItemGetAnimation', pos: Point, item: Item }
  | { t: 'ResetAnimation' }
  | { t: 'RecenterAnimation' };


// Here's the intended invariant. Suppose s is the current state. an
// Animator has a total of dur+1 frames, 0, 1, 2, … n. To get the
// state at frame i, we call anim(i, s) --- all based from the same
// initial state, not folded together. If we want to get the effect of
// the move overall, without all the intermediate animations, we can
// simply call anim(dur, s).
export type Animator = {
  dur: number, // duration in frames

  // There is an intrinsic asymmetry here in that I want to allow ifaceAnim to depend
  // on game state, but not vice-versa.
  animsGame: Animation[],
  animsIface: Animation[],
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

export function applyIfaceAnimation(a: Animation, state: State, frc: number | 'complete'): IfaceState {
  const dur = duration(a);
  const fr = frc == 'complete' ? dur : frc;
  const t = fr / dur;

  const { game, iface } = state;

  switch (a.t) {
    case 'PlayerAnimation': return iface;
    case 'ViewPortAnimation':
      return produce(iface, s => {
        s.viewPort = vplus(s.viewPort, vscale(a.dpos, t));
      });
    case 'MeltAnimation': return iface;
    case 'ResetAnimation':
      return produce(iface, s => {
        if (fr <= DEATH_FADE_OUT) {
          s.blackout = fr / DEATH_FADE_OUT;
        }
        else if (fr <= DEATH_FADE_OUT + DEATH_HOLD) {
          s.blackout = 1;
        }
        else {
          s.blackout = (DEATH - fr) / DEATH_FADE_OUT;
        }
        if (fr >= DEATH_FADE_OUT) {
          s.viewPort = centeredViewPort(game.lastSave);
        }
      });
    case 'SavePointChangeAnimation': return iface;
    case 'RecenterAnimation':
      return produce(iface, s => {
        const target = centeredViewPort(game.player.pos);
        s.viewPort = vm2(target, s.viewPort, (tgt, vp) => lerp(vp, tgt, t));
      });
    case 'ItemGetAnimation': return iface;
  }
}

export function applyGameAnimation(a: Animation, state: GameState, frc: number | 'complete'): GameState {
  const dur = duration(a);
  const fr = frc == 'complete' ? dur : frc;
  const t = fr / dur;

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
    case 'ViewPortAnimation': return state;
    case 'MeltAnimation':
      return produce(state, s => {
        putTile(s.overlay, a.pos, t > 0.5 ? 'empty' : 'broken_box');
      });
    case 'ResetAnimation':
      return produce(state, s => {
        if (fr >= DEATH_FADE_OUT) {
          s.overlay = s.initOverlay;
          const last_save = s.lastSave;
          s.player = produce(init_state.game.player, p => {
            p.pos = last_save;
          });
        }
      });
    case 'SavePointChangeAnimation':
      return produce(state, s => {
        if (t > 0.5)
          s.lastSave = a.pos;
      });
    case 'RecenterAnimation': return state;
    case 'ItemGetAnimation':
      return produce(state, s => {
        s.inventory[a.item] = (s.inventory[a.item] ?? 0) + 1;
        putTile(s.overlay, a.pos, 'empty');
      });
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
  }
}
