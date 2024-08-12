import { FULL_IMPETUS } from "./constants";
import { tileEq, emptyTile, TileResolutionContext, tileOfStack } from "./layer";
import { Point, vplus } from "./point";
import { Player } from "./state";
import { Tile, Item } from "./types";

export function getItem(x: Tile): Item | undefined {
  if (x.t == 'item')
    return x.item;

  else
    return undefined;
}

function isItem(x: Tile): boolean {
  return getItem(x) !== undefined;
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

export function isOpen(x: Tile): boolean {
  return tileEq(x, emptyTile()) || x.t == 'save_point' || isItem(x) || isSpike(x)
    || isOpenBusBlock(x) || isOpenMotionBlock(x) || isDoor(x);
}

function isGrabbable(x: Tile): boolean {
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
  pos: Point,
  force: Point,
};

export type Posture = 'stand' | 'attachWall' | 'crouch';

export type Motion = {
  dpos: Point,
  forced?: ForcedBlock, // optionally force a block in the direction of motion
  impetus?: Point, // optionally set impetus to some value
  posture?: Posture, // optionally set posture to some value
};

export function ropen(b: Board, x: number, y: number): boolean {
  const { player, trc } = b;
  return isOpen(tileOfStack(trc.layerStack, vplus(player.pos, { x, y }), trc));
}
export function rgrabbable(b: Board, x: number, y: number): boolean {
  const { player, trc } = b;
  return isGrabbable(tileOfStack(trc.layerStack, vplus(player.pos, { x, y }), trc));
}
