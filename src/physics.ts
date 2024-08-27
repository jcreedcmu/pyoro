import { entityIxAtPoint, tileOfGameState } from "./model";
import { ForcedBlock, ForceType, genImpetus, isGrabbable, isOpenInState, isOpenInStateExcluding, Posture } from './model-utils';
import { Point, vadd, vm, vplus, vsub } from './lib/point';
import { GameState } from "./state";
import { Tile } from "./types";
import { EntityId } from "./entity";

export type TickContext = {
  entity: PhysicsEntityState,
  motive: Point,
  support: Point | undefined,
};

export type TickOutput = {
  entity: PhysicsEntityState,
  forced: ForcedBlock[],
  posture: Posture,
};

export type PhysicsEntityState = {
  pos: Point,
  impetus: Point,
};

export type TargetPhaseContext = TickContext;

export type TargetPhaseOutput = {
  target: Point,
  newImpetus: Point,
  forced: ForcedBlock[]
  fall: boolean,
};

export type TargetPhaseContextOneAxis = {
  motive: number,
  impetus: number,
}

export type TargetPhaseOutputOneAxis = {
  target: number, // relative coordinate
  newImpetus: number,
};

export function targetPhaseUnsupportedX(state: GameState, ctx: TargetPhaseContextOneAxis): TargetPhaseOutputOneAxis {
  const { motive, impetus } = ctx;
  if (impetus == 0) {
    // unaffected by impetus
    return { target: motive, newImpetus: 0 };
  }
  else {
    // affected by impetus
    const si = Math.sign(impetus);
    const sm = Math.sign(motive);
    return { target: si, newImpetus: impetus - si * (sm != si ? 1 : 0) };
  }
}

export function targetPhaseUnsupportedY(state: GameState, ctx: TargetPhaseContextOneAxis): TargetPhaseOutputOneAxis {
  const { motive, impetus } = ctx;
  if (motive < 0 && impetus < 0) {
    // ascending
    return { target: -1, newImpetus: impetus }
  }
  else {
    // descending
    return { target: 1, newImpetus: Math.max(motive - 1, impetus) }; // OPEN: substitute motive for motive-1?
  }
}

function genImpetusForMotive(supportTile: Tile, motive: Point, extraImpetus: number = 0): Point {
  if (motive.y < 0)
    return vsub({ x: 0, y: 1 - extraImpetus }, genImpetus(supportTile));
  else
    return { x: 0, y: 0 };
}

export function fblock(state: GameState, entity: PhysicsEntityState, rpos: Point, motive: Point): ForcedBlock {
  const cPos = vadd(entity.pos, rpos);
  const ix = entityIxAtPoint(state, cPos);
  const forceType: ForceType = ix != undefined
    ? { t: 'entity', ix }
    : { t: 'tile', tile: tileOfGameState(state, cPos) };
  return restrictForcedBlock({
    pos: rpos,
    force: vadd(entity.impetus, motive),
    forceType,
  });
}

export function targetPhase(state: GameState, ctx: TargetPhaseContext): TargetPhaseOutput {
  const { entity, motive, support } = ctx;
  const { impetus, pos } = entity;

  function _fblock(rpos: Point): ForcedBlock {
    return fblock(state, entity, rpos, motive);
  }

  if (support != undefined) {
    const supportTile = tileOfGameState(state, vadd(pos, support));
    return {
      target: motive,
      newImpetus: genImpetusForMotive(supportTile, motive, state.inventory.teal_fruit),
      forced: [_fblock(support)],
      fall: false, // fall is already "baked in" to newImpetus
    };
  }
  else {
    const resultX = targetPhaseUnsupportedX(state, { impetus: impetus.x, motive: motive.x });
    const resultY = targetPhaseUnsupportedY(state, { impetus: impetus.y, motive: motive.y });
    return {
      forced: [],
      newImpetus: { x: resultX.newImpetus, y: resultY.newImpetus },
      target: { x: resultX.target, y: resultY.target },
      fall: true,
    };
  }
}

export type BouncePhaseContext = {
  entity: PhysicsEntityState,
  motive: Point,
  entityId: EntityId,
};

export type BouncePhaseOutput = {
  bounce: Point,
  forced: ForcedBlock[],
  posture: Posture,
};

export function bouncePhase(state: GameState, ctx: BouncePhaseContext): BouncePhaseOutput {
  const { entity, motive } = ctx;
  const { pos, impetus } = entity;

  function _fblock(rpos: Point): ForcedBlock {
    return fblock(state, entity, rpos, motive);
  }

  function isRpOpen(relPt: Point): boolean {
    return isOpenInStateExcluding(state, vadd(pos, relPt), ctx.entityId);
  }

  function isRpGrabbable(relPt: Point): boolean {
    return isGrabbable(tileOfGameState(state, vadd(pos, relPt)));
  }

  const vertProj = { x: 0, y: motive.y };
  const horizProj = { x: motive.x, y: 0 };

  // Early-return special case; If motive tile is grabbable wall,
  // and motive is horizontal, then we can grab it.
  if (isRpGrabbable({ x: motive.x, y: 0 }) && impetus.y <= 2) {
    return { bounce: { x: 0, y: 0 }, forced: [], posture: 'attachWall' };
  }

  // Attempt 1: Go to motive tile
  if (isRpOpen(motive) && isRpOpen(vertProj)) {
    return { bounce: motive, forced: [], posture: 'stand' };
  }

  // Attempt 2: go to horizontal projection
  if (isRpOpen(horizProj)) {
    return { bounce: horizProj, forced: [_fblock(!isRpOpen(vertProj) ? vertProj : motive)], posture: 'stand' };
  }

  // Attempt 3: go to vertical projection
  if (isRpOpen(vertProj)) {
    return { bounce: vertProj, forced: [_fblock(horizProj)], posture: 'stand' };
  }

  // Attempt 4: hold still
  return { bounce: { x: 0, y: 0 }, forced: [_fblock(vertProj)], posture: 'stand' };
}

export type DestinationPhaseContext = { entity: PhysicsEntityState, entityId: EntityId, target: Point };

export type DestinationPhaseOutput = {
  destination: Point,
  forced: ForcedBlock[]
  posture: Posture,
};

/** Along one dimension, returns the effective amount of impetus that
 * should actually apply to a collision, assuming the raw impetus is
 * `impetus` and the tile the entity is colliding with is located at
 * `target` relative to the entity.
 */
export function restrictImpetusOneAxis(impetus: number, target: number): number {
  if (Math.sign(target) != 0
    && Math.sign(impetus) != 0
    && Math.sign(impetus) == Math.sign(target)) {
    return impetus;
  }
  else {
    return 0;
  }
}

/** Returns the effective amount of impetus that should actually apply to a collision,
 * assuming the raw impetus is `impetus` and the tile the entity is colliding
 * with is located at `target` relative to the entity.
 */
export function restrictImpetus(impetus: Point, target: Point): Point {
  return {
    x: restrictImpetusOneAxis(impetus.x, target.x),
    y: restrictImpetusOneAxis(impetus.y, target.y),
  }
}

/** Returns the effective amount of impetus that should actually apply to a forced block. */
export function restrictForcedBlock(block: ForcedBlock): ForcedBlock {
  return {
    ...block,
    force: restrictImpetus(block.force, block.pos)
  };
}

export function destinationPhase(state: GameState, ctx: DestinationPhaseContext): DestinationPhaseOutput {
  const { entity, target } = ctx;
  const { pos, impetus } = entity;

  function _fblock(rpos: Point): ForcedBlock {
    return fblock(state, entity, rpos, { x: 0, y: 0 });
  }

  function isRpOpen(relPt: Point): boolean {
    return isOpenInStateExcluding(state, vadd(pos, relPt), ctx.entityId);
  }

  function isRpGrabbable(relPt: Point): boolean {
    return isGrabbable(tileOfGameState(state, vadd(pos, relPt)));
  }

  const vertProj = { x: 0, y: target.y };
  const horizProj = { x: target.x, y: 0 };

  // Early-return special case; If target tile is grabbable wall,
  // and target is horizontal, then we can grab it.
  if (isRpGrabbable({ x: target.x, y: 0 }) && impetus.y <= 1) {
    return { destination: { x: 0, y: 0 }, forced: [], posture: 'attachWall' };
  }

  // Attempt 1: Go to target tile
  if (isRpOpen(target) && isRpOpen(vertProj)) {
    return { destination: target, forced: [], posture: 'stand' };
  }

  // Attempt 2: go to horizontal projection
  if (isRpOpen(horizProj)) {
    return { destination: horizProj, forced: [_fblock(!isRpOpen(vertProj) ? vertProj : target)], posture: 'stand' };
  }

  // Attempt 3: go to vertical projection
  if (isRpOpen(vertProj)) {
    return { destination: vertProj, forced: [_fblock(horizProj)], posture: 'stand' };
  }

  // Attempt 4: hold still
  return { destination: { x: 0, y: 0 }, forced: [_fblock(vertProj)], posture: 'stand' };
}

export type FallPhaseContext = {
  entity: PhysicsEntityState,
  entityId: EntityId,
  fall: boolean,
};

export type FallPhaseOutput = {
  entity: PhysicsEntityState,
};

/**
 * Returns the maximum survivable impetus when colliding with this block.
 */
function lethalThreshold(forcedBlock: ForcedBlock): number {
  const ft = forcedBlock.forceType;
  switch (ft.t) {
    case 'tile': {
      const { tile } = ft;
      switch (tile.t) {
        case 'stone': return 3;
        case 'box': return 5;
        case 'box3': return Infinity;
        default: return Infinity;
      }
    }
    case 'entity':
      return Infinity; // XXX no fall damage from entities yet
  }
}

/**
 * Returns true if this forced block applies so much force that we die.
 */
function lethalForcedBlock(collideBlock: ForcedBlock): boolean {
  const { force } = collideBlock;
  return Math.max(Math.abs(force.x), Math.abs(force.y)) > lethalThreshold(collideBlock);
}

function fallPhase(state: GameState, fallPhaseContext: FallPhaseContext): FallPhaseOutput {
  const { entity, fall, entityId } = fallPhaseContext;
  if (!fall)
    return { entity };

  if (!isOpenInStateExcluding(state, vadd(entity.pos, { x: 0, y: 1 }), entityId)) {
    return { entity };
  }

  // if none of the above conditions apply, let gravity affect impetus
  return { entity: { pos: entity.pos, impetus: vadd(entity.impetus, { x: 0, y: 1 }) } };
}

export function entityTick(state: GameState, tickContext: TickContext, entityId: EntityId): TickOutput {
  const entity = tickContext.entity;
  // Bounce Phase
  const { bounce, posture: posture, forced: forced0 } = bouncePhase(state, { entity, motive: tickContext.motive, entityId });
  if (posture == 'attachWall') {
    return {
      entity: { pos: entity.pos, impetus: { x: 0, y: 0 } },
      forced: [],
      posture: 'attachWall',
    }
  }

  console.log('targetIn', { entity, motive: bounce, support: tickContext.support });
  // Target Phase
  const { newImpetus, target, forced: forced1, fall } = targetPhase(state, { entity, motive: bounce, support: tickContext.support });
  // XXX we're throwing away posture here. Is that ok?

  // Destination Phase
  const { destination, forced: forced2, posture: undefined } = destinationPhase(state, { entity, entityId, target });
  const destEntity = {
    pos: vadd(entity.pos, destination),
    impetus: newImpetus,
  };

  const forced = [...forced0, ...forced1, ...forced2];
  if (forced.some(lethalForcedBlock)) {
    return { entity: entity, forced: [], posture: 'dead' };
  }

  const { entity: finalEntity } = fallPhase(state, { entity: destEntity, entityId, fall });
  return {
    entity: finalEntity,
    forced,
    posture,
  };
}
