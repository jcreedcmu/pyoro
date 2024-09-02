import { FULL_IMPETUS, MAX_CLIMB_WEIGHT } from "./constants";
import { EntityId, EntityState, MobileType } from "./entity";
import { emptyTile, tileEq, TileResolutionContext } from "./layer";
import { Point, vadd, vequal } from "./lib/point";
import { tileOfGameState } from "./model";
import { GameState, Player } from "./state";
import { Item, Tile } from "./types";

export type Posture = 'stand' | 'attachWall' | 'crouch' | 'dead';

export function getItem(x: Tile): Item | undefined {
  if (x.t == 'item')
    return x.item;

  else
    return undefined;
}

function isItem(x: Tile): boolean {
  return getItem(x) !== undefined;
}

export function itemTimeLimit(x: Item): number | undefined {
  switch (x) {
    case 'teal_fruit': return 30;
    case 'coin': return undefined;
  }
}

function isOpenBusBlock(x: Tile): boolean {
  return x.t == 'bus_block' && x.on == false;
}

function isOpenMotionBlock(x: Tile): boolean {
  return x.t == 'motion_block' && x.on == false;
}

function isDoor(x: Tile): boolean {
  return x.t == 'door';
}

function isLadder(x: Tile): boolean {
  return x.t == 'ladder';
}

export function isClimb(x: Tile): boolean {
  return x.t == 'ladder' || x.t == 'water';
}

function isOpen(x: Tile): boolean {
  return tileEq(x, emptyTile()) || x.t == 'save_point' || isItem(x) || isSpike(x)
    || isOpenBusBlock(x) || isOpenMotionBlock(x) || isDoor(x) || isLadder(x)
    || x.t == 'water';
}

export function isGrabbable(x: Tile): boolean {
  return x.t == 'grip_wall';
}

function isSpike(x: Tile): boolean {
  return x.t == 'spike';
}

export function isDeadly(x: Tile): boolean {
  return isSpike(x);
}

/**
 * @param tile Which tile
 * @returns How much impetus jumping from that tile yields
 *
 * **XXX**: We probably will need to generalize this for trampolines,
 * to also take impetus as an input.
 *
 * **XXX**: This also has an unexpected convention in that large
 * positive y is here actually upward-directed.
 */
export function genImpetus(tile: Tile): Point {
  if (isLadder(tile)) return { x: 0, y: 1 };
  if (isOpen(tile)) return { x: 0, y: 0 };
  if (tileEq(tile, { t: 'up_box' })) return { x: 0, y: FULL_IMPETUS };
  return { x: 0, y: 1 };
}

export type Board = {
  player: Player,
  trc: TileResolutionContext,
};

/**
 * A block adjoining an entity with a force applied to it. The `pos`
 * field is relative to the entity.
 */
export type ForcedBlock = {
  forceType: ForceType,
  force: Point,
  pos: Point, // relative
};

export type ForceType =
  | { t: 'tile', tile: Tile }
  | { t: 'entity', id: EntityId }
  ;

function canMobileSupport(ent: MobileType): boolean {
  return true;
}

/**
 * Returns true iff the cell `p_in_world` "has support" in state `state`.
 * This can happen if (one of the below)
 * - an entity exists below that cell which can support
 * - a tile exists below that cell that can support
 * - a tile exists *at* that cell that supports entities in that cell
 * ...but excluding `entityId` from being eligible as a supporter.
 */
export function isSupportedInStateExcluding(state: GameState, p_in_world: Point, entityId: EntityId, entityWeight: number): boolean {
  const below = vadd(p_in_world, { x: 0, y: 1 });
  if (state.currentLevelState.entities.some((ent) =>
    vequal(ent.pos, below) && canMobileSupport(ent.etp) && !(entityId.t == 'mobileId' && entityId.id == ent.id)
  )) {
    return true;
  }

  if (entityId.t != 'player' && vequal(state.player.pos, below))
    return true;

  if (isClimb(tileOfGameState(state, p_in_world)) && entityWeight <= MAX_CLIMB_WEIGHT)
    return true;

  if (!isOpen(tileOfGameState(state, below)))
    return true;

  return false;
}


/**
 * Returns true iff the cell `p_in_world` can be entered in state `state`.
 * This is true if (all of the below)
 * - no entity exists in that cell
 * - the underlying tile is open
 */
export function isOpenInState(state: GameState, p_in_world: Point): boolean {
  if (state.currentLevelState.entities.some(ent =>
    vequal(ent.pos, p_in_world)
  ))
    return false;

  if (vequal(state.player.pos, p_in_world))
    return false;

  return isOpen(tileOfGameState(state, p_in_world));
}

/**
 * Returns true iff the cell `p_in_world` can be entered in state `state`.
 * This is true if (all of the below)
 * - no entity exists in that cell
 * - the underlying tile is open
 */
export function isOpenInStateExcluding(state: GameState, p_in_world: Point, entityId: EntityId): boolean {
  if (state.currentLevelState.entities.some(ent =>
    vequal(ent.pos, p_in_world) && !(entityId.t == 'mobileId' && entityId.id == ent.id)
  ))
    return false;

  if (entityId.t != 'player' && vequal(state.player.pos, p_in_world))
    return false;

  return isOpen(tileOfGameState(state, p_in_world));
}

export function entityAtPoint(s: GameState, p: Point): EntityState | undefined {
  const ix = s.currentLevelState.entities.findIndex(ent => vequal(ent.pos, p));
  if (ix == -1)
    return undefined;
  else
    return s.currentLevelState.entities[ix];
}
