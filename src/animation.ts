import { produce } from 'immer';
import { NUM_TILES } from './constants';
import { getOverlay, setCurrentLevel, setOverlay } from './game-state-access';
import { emptyTile, putTileInDynamicLayer, tileEq } from './layer';
import { computeCombo, tileOfGameState } from './model';
import { int, lerp, Point, vm2, vplus, vscale, vsub } from './point';
import { GameState, IfaceState, State } from './state';
import { init_state } from './init-state';
import { Bus, Facing, Item, PlayerSprite } from './types';

/**
 * An `Animation` is the type of all changes to the game state that
 * result from player actions, together with enough information that
 * we can render them as animations.
 */
export type Animation =
  {
    t: 'PlayerAnimation',
    pos: Point,
    animState: PlayerSprite,
    impetus: Point,
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


/**
 * An `Animator` is a list of animations (which are meant to run concurrently)
 * together with the duration that the whole group takes.
 * **WEIRD**: Why store this duration as a separate value? Isn't it just
 * the max of the individual animation's durations?
 */
export type Animator = {
  dur: number, // duration in frames

  anims: Animation[],
}

/** A convenience type for two perspectives on time during an animation. */
export type Time = {
  /** The fraction of the animation's duration that has been completed, in [0,1] */
  t: number,
  /** The number of frames since the animation has started. */
  fr: number,
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
          prevPos: s.player.prevPos,
          combo: s.player.combo,
          posOffset: vplus(vscale(s.player.pos, -t), vscale(pos, t)),
          animState: animState,
          flipState: flipState,
          impetus: impetus
        }
        if (t == 1) {
          s.time++;
          s.player.pos = pos;
          s.player.prevPos = state.player.pos;
          s.player.combo = computeCombo(state.player.combo, vsub(pos, state.player.pos));
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
        s.player.combo = undefined;
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
