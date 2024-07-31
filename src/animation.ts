import { produce } from 'immer';
import { NUM_TILES } from './constants';
import { tileEq, emptyTile, putTileInDynamicLayer } from './layer';
import { tileOfGameState } from './model';
import { int, lerp, vm2, vplus, vscale } from './point';
import { GameState, IfaceState, init_state, State } from './state';
import { Bus, Facing, Item, PlayerSprite, Point } from './types';
import { getOverlay, setCurrentLevel, setOverlay } from './game-state-access';

export type Animation =
  {
    t: 'PlayerAnimation',
    pos: Point,
    animState: PlayerSprite,
    impetus: number,
    flipState: Facing,
    dead: boolean
  }
  | { t: 'ViewPortAnimation', dpos: Point }
  | { t: 'MeltAnimation', pos: Point }
  | { t: 'SavePointChangeAnimation', pos: Point }
  | { t: 'ItemGetAnimation', pos: Point, item: Item }
  | { t: 'ResetAnimation' }
  | { t: 'RecenterAnimation' }
  | { t: 'SpendCoinAnimation', pos: Point }
  | { t: 'ButtonToggleAnimation', pos: Point }
  | { t: 'BusButtonToggleAnimation', bus: Bus }
  | { t: 'ChangeLevelAnimation', oldLevel: string, newLevel: string, newPosition: Point }
  ;


// Here's the intended invariant. Suppose s is the current state. an
// Animator has a total of dur+1 frames, 0, 1, 2, … n. To get the
// state at frame i, we call anim(i, s) --- all based from the same
// initial state, not folded together. If we want to get the effect of
// the move overall, without all the intermediate animations, we can
// simply call anim(dur, s).
export type Animator = {
  dur: number, // duration in frames

  // There is an intrinsic asymmetry here in that I want to allow
  // animsIface to depend on game state, but animsGame should not
  // depend on interface state.
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
const DEATH_FRAMES = DEATH_FADE_OUT + DEATH_HOLD + DEATH_FADE_IN;

const CHANGE_ROOM_FADE_OUT = 2;
const CHANGE_ROOM_HOLD = 0;
const CHANGE_ROOM_FADE_IN = 2;
const CHANGE_ROOM_FRAMES = CHANGE_ROOM_FADE_OUT + CHANGE_ROOM_HOLD + CHANGE_ROOM_FADE_IN;


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
          s.blackout = (DEATH_FRAMES - fr) / DEATH_FADE_OUT;
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
    case 'SpendCoinAnimation': return iface;
    case 'ButtonToggleAnimation': return iface;
    case 'BusButtonToggleAnimation': return iface;
    case 'ChangeLevelAnimation': return produce(iface, s => {
      if (fr <= CHANGE_ROOM_FADE_OUT) {
        s.blackout = fr / CHANGE_ROOM_FADE_OUT;
      }
      else if (fr <= CHANGE_ROOM_FADE_OUT + CHANGE_ROOM_HOLD) {
        s.blackout = 1;
      }
      else {
        s.blackout = (CHANGE_ROOM_FRAMES - fr) / CHANGE_ROOM_FADE_OUT;
      }
      if (fr >= CHANGE_ROOM_FADE_OUT) {
        s.viewPort = centeredViewPort(a.newPosition);
      }
    });
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
          pos: s.player.pos,
          posOffset: vplus(vscale(s.player.pos, -t), vscale(pos, t)),
          animState: animState,
          flipState: flipState,
          impetus: impetus
        }
        if (t == 1) {
          s.time++;
          s.player.pos = pos;
          s.player.posOffset = undefined;
        }
      });
    case 'ViewPortAnimation': return state;
    case 'MeltAnimation':
      return produce(state, s => {
        putTileInDynamicLayer(getOverlay(s), a.pos, t > 0.5 ? emptyTile() : { t: 'broken_box' });
      });
    case 'ResetAnimation':
      if (fr < DEATH_FADE_OUT)
        return state;
      // XXX Need to more carefully consider what state really changes
      // when reset Specifically bus state is not reset right now, and
      // maybe only the current level should be reset? While
      // preserving "monotonic progress changes" whatever those might
      // be? My point of reference for that concept is how Isles of
      // Sea and Sky handles unlockables.
      state = setOverlay(state, { tiles: {} });

      return produce(state, s => {
        s.inventory = {};
        const last_save = s.lastSave;
        s.player = produce(init_state.game.player, p => {
          p.pos = last_save;
        });
        s.time = 0;
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
        putTileInDynamicLayer(getOverlay(s), a.pos, emptyTile());
      });
    case 'SpendCoinAnimation':
      return produce(state, s => {
        putTileInDynamicLayer(getOverlay(s), a.pos, emptyTile());
        if (s.inventory.coin == undefined || s.inventory.coin == 0) {
          throw new Error("Trying to spend coins we don't have");
        }
        s.inventory.coin--;
      });
    case 'ButtonToggleAnimation':
      return produce(state, s => {
        putTileInDynamicLayer(getOverlay(s), a.pos, tileEq(tileOfGameState(s, a.pos), { t: 'button_on' }) ? { t: 'button_off' } : { t: 'button_on' });
      });
    case 'BusButtonToggleAnimation':
      return produce(state, s => {
        s.busState[a.bus] = !s.busState[a.bus];
      });
    case 'ChangeLevelAnimation':
      if (fr < CHANGE_ROOM_FADE_OUT)
        return state;
      return produce(setCurrentLevel(state, a.newLevel), s => {
        s.player.pos = a.newPosition;
        s.lastSave = a.newPosition;
      });
  }
}


// duration in frames
export function duration(a: Animation): number {
  switch (a.t) {
    case 'PlayerAnimation': return 2;
    case 'ViewPortAnimation': return 2;
    case 'MeltAnimation': return 2;
    case 'ResetAnimation': return DEATH_FRAMES;
    case 'SavePointChangeAnimation': return 2;
    case 'RecenterAnimation': return 4;
    case 'ItemGetAnimation': return 2;
    case 'SpendCoinAnimation': return 1;
    case 'ButtonToggleAnimation': return 1;
    case 'BusButtonToggleAnimation': return 1;
    case 'ChangeLevelAnimation': return CHANGE_ROOM_FRAMES;
  }
}
