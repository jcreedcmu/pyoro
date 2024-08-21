import { produce } from 'immer';
import { NUM_TILES, TILE_SIZE } from './constants';
import { getCurrentLevel, getCurrentLevelData, getOverlay, resetRoom, setCurrentLevel, setWorldFromView } from './game-state-access';
import { emptyTile, putTileInDynamicLayer, tileEq } from './layer';
import { int, Point, vdiag, vlerp, vm2, vplus, vscale, vsub } from './lib/point';
import { compose, mkSE2, SE2, translate } from './lib/se2';
import { computeCombo, tileOfGameState } from './model';
import { GameState, IfaceState, MainState } from './state';
import { getWorldFromView, lerpTranslates } from './transforms';
import { Bus, Facing, Item, PlayerSprite } from './types';
import { EntityState } from './entity';
import { PhysicsEntityState } from './physics';

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
  | { t: 'ViewPortAnimation', dpos_in_world: Point }
  | { t: 'MeltAnimation', pos: Point }
  | { t: 'SavePointChangeAnimation', pos: Point }
  | { t: 'ItemGetAnimation', pos: Point, item: Item }
  | { t: 'ResetAnimation' }
  | { t: 'RecenterAnimation' }
  | { t: 'SpendCoinAnimation', pos: Point }
  | { t: 'ButtonToggleAnimation', pos: Point }
  | { t: 'BusButtonToggleAnimation', bus: Bus }
  | { t: 'ChangeLevelAnimation', oldLevel: string, newLevel: string, newPosition: Point }
  | {
    t: 'EntityAnimation',
    index: number, // XXX should be an id
    oldEntity: EntityState,
    newEntity: PhysicsEntityState,
  }
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

/**
 * Returns a world_from_view transform that puts p_in_world in the center of the view.
 */
export function centeredWorldFromView(p_in_world: Point): SE2 {
  return mkSE2(vdiag(1 / TILE_SIZE), vm2(p_in_world, NUM_TILES, (p, NT) => int(p - NT / 2)));
}

const DEATH_FADE_OUT = 2;
const DEATH_HOLD = 0;
const DEATH_FADE_IN = 2;
const DEATH_FRAMES = DEATH_FADE_OUT + DEATH_HOLD + DEATH_FADE_IN;

const CHANGE_ROOM_FADE_OUT = 2;
const CHANGE_ROOM_HOLD = 0;
const CHANGE_ROOM_FADE_IN = 2;
const CHANGE_ROOM_FRAMES = CHANGE_ROOM_FADE_OUT + CHANGE_ROOM_HOLD + CHANGE_ROOM_FADE_IN;


export function applyIfaceAnimation(a: Animation, state: MainState, frc: number | 'complete'): IfaceState {
  const dur = duration(a);
  const fr = frc == 'complete' ? dur : frc;
  const t = fr / dur;

  const { game, iface } = state;

  switch (a.t) {
    case 'PlayerAnimation': return iface;
    case 'ViewPortAnimation': {
      const world_from_view = getWorldFromView(iface);
      return setWorldFromView(iface, compose(translate(vscale(a.dpos_in_world, t)), world_from_view));
    }
    case 'MeltAnimation': return iface;
    case 'ResetAnimation': {
      let blackout = produce(iface, s => {
        if (fr <= DEATH_FADE_OUT) {
          s.blackout = fr / DEATH_FADE_OUT;
        }
        else if (fr <= DEATH_FADE_OUT + DEATH_HOLD) {
          s.blackout = 1;
        }
        else {
          s.blackout = (DEATH_FRAMES - fr) / DEATH_FADE_OUT;
        }
      });
      if (fr >= DEATH_FADE_OUT) {
        blackout = setWorldFromView(blackout, centeredWorldFromView(game.lastSave));
      }
      return blackout;
    }
    case 'SavePointChangeAnimation': return iface;
    case 'RecenterAnimation': {
      const target = centeredWorldFromView(game.player.pos);
      return setWorldFromView(iface, lerpTranslates(getWorldFromView(iface), target, t));
    }
    case 'ItemGetAnimation': return iface;
    case 'SpendCoinAnimation': return iface;
    case 'ButtonToggleAnimation': return iface;
    case 'BusButtonToggleAnimation': return iface;
    case 'ChangeLevelAnimation': {
      let blackout = produce(iface, s => {
        if (fr <= CHANGE_ROOM_FADE_OUT) {
          s.blackout = fr / CHANGE_ROOM_FADE_OUT;
        }
        else if (fr <= CHANGE_ROOM_FADE_OUT + CHANGE_ROOM_HOLD) {
          s.blackout = 1;
        }
        else {
          s.blackout = (CHANGE_ROOM_FRAMES - fr) / CHANGE_ROOM_FADE_OUT;
        }
      });
      if (fr >= CHANGE_ROOM_FADE_OUT)
        blackout = setWorldFromView(blackout, centeredWorldFromView(a.newPosition));
      return blackout;
    }
    case 'EntityAnimation': {
      // YYY
      return iface;
    }
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
      else
        return resetRoom(state);
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
      const oldBusState = getCurrentLevel(state).busState[a.bus];
      return produce(state, s => {
        getCurrentLevel(s).busState[a.bus] = !oldBusState;
      });
    case 'ChangeLevelAnimation':
      if (fr < CHANGE_ROOM_FADE_OUT)
        return state;
      let newLevelState = setCurrentLevel(state, a.newLevel);
      const newBusState = getCurrentLevelData(newLevelState).busState;
      return produce(newLevelState, s => {
        getCurrentLevel(s).busState = newBusState;
        s.player.pos = a.newPosition;
        s.lastSave = a.newPosition;
        s.player.combo = undefined;
      });
    case 'EntityAnimation': {
      const { index, newEntity, oldEntity } = a;
      const pos = vlerp(oldEntity.pos, newEntity.pos, t);
      return produce(state, s => {
        getCurrentLevel(s).entities[index].pos = pos;
        if (t >= 0.75)
          getCurrentLevel(s).entities[index].impetus = newEntity.impetus;
      });
    }
  }
}


// duration in frames
export function duration(a: Animation): number {
  switch (a.t) {
    case 'PlayerAnimation': return 4;
    case 'ViewPortAnimation': return 4;
    case 'MeltAnimation': return 2;
    case 'ResetAnimation': return DEATH_FRAMES;
    case 'SavePointChangeAnimation': return 2;
    case 'RecenterAnimation': return 4;
    case 'ItemGetAnimation': return 2;
    case 'SpendCoinAnimation': return 1;
    case 'ButtonToggleAnimation': return 1;
    case 'BusButtonToggleAnimation': return 1;
    case 'ChangeLevelAnimation': return CHANGE_ROOM_FRAMES;
    case 'EntityAnimation': return 4;
  }
}
