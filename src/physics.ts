import { tileOfGameState } from "./model";
import { ForcedBlock, genImpetus, isGrabbable, isOpen, Posture } from './model-utils';
import { Point, vadd, vplus, vsub } from './point';
import { GameState } from "./state";
import { Tile } from "./types";

export type TickContext = {
  entity: EntityState,
  motive: Point,
  support: Point | undefined,
};

export type TickOutput = {
  entity: EntityState,
  forced: ForcedBlock[],
  posture: Posture,
};

export type EntityState = {
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

function genImpetusForMotive(supportTile: Tile, motive: Point): Point {
  if (motive.y < 0)
    return vsub({ x: 0, y: 1 }, genImpetus(supportTile));
  else
    return { x: 0, y: 0 };
}

export function targetPhase(state: GameState, ctx: TargetPhaseContext): TargetPhaseOutput {
  const { entity, motive, support } = ctx;
  const { impetus, pos } = entity;
  if (support != undefined) {
    const supportTile = tileOfGameState(state, vadd(pos, support));
    return {
      target: motive,
      newImpetus: genImpetusForMotive(supportTile, motive),
      forced: [{ pos: support, force: impetus }],
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

export type BouncePhaseContext = { entity: EntityState, motive: Point };

export type BouncePhaseOutput = {
  bounce: Point,
  forced: ForcedBlock[],
  posture: Posture,
};

export function bouncePhase(state: GameState, ctx: BouncePhaseContext): BouncePhaseOutput {
  const { entity, motive } = ctx;
  const { pos, impetus } = entity;

  function isRpOpen(relPt: Point): boolean {
    return isOpen(tileOfGameState(state, vadd(pos, relPt)));
  }

  function isRpGrabbable(relPt: Point): boolean {
    return isGrabbable(tileOfGameState(state, vadd(pos, relPt)));
  }

  const vertProj = { x: 0, y: motive.y };
  const horizProj = { x: motive.x, y: 0 };

  console.log(motive, impetus, tileOfGameState(state, vadd(pos, { x: motive.x, y: 0 })),
    isRpGrabbable({ x: motive.x, y: 0 }), impetus.y <= 1)
  // Early-return special case; If motive tile is grabbable wall,
  // and motive is horizontal, then we can grab it.
  if (isRpGrabbable({ x: motive.x, y: 0 }) && impetus.y <= 1) {
    return { bounce: { x: 0, y: 0 }, forced: [], posture: 'attachWall' };
  }

  // Attempt 1: Go to motive tile
  if (isRpOpen(motive) && isRpOpen(vertProj)) {
    return { bounce: motive, forced: [], posture: 'stand' };
  }

  // Attempt 2: go to horizontal projection
  if (isRpOpen(horizProj)) {
    return { bounce: horizProj, forced: [{ pos: !isRpOpen(vertProj) ? vertProj : motive, force: impetus }], posture: 'stand' };
  }

  // Attempt 3: go to vertical projection
  if (isRpOpen(vertProj)) {
    return { bounce: vertProj, forced: [{ pos: horizProj, force: impetus }], posture: 'stand' };
  }

  // Attempt 4: hold still
  return { bounce: { x: 0, y: 0 }, forced: [{ pos: vertProj, force: impetus }], posture: 'stand' };
}

export type DestinationPhaseContext = { entity: EntityState, target: Point };

export type DestinationPhaseOutput = {
  destination: Point,
  forced: ForcedBlock[]
  posture: Posture,
};

export function destinationPhase(state: GameState, ctx: DestinationPhaseContext): DestinationPhaseOutput {
  const { entity, target } = ctx;
  const { pos, impetus } = entity;

  function isRpOpen(relPt: Point): boolean {
    return isOpen(tileOfGameState(state, vadd(pos, relPt)));
  }

  function isRpGrabbable(relPt: Point): boolean {
    return isGrabbable(tileOfGameState(state, vadd(pos, relPt)));
  }

  const vertProj = { x: 0, y: target.y };
  const horizProj = { x: target.x, y: 0 };

  console.log(target, impetus, tileOfGameState(state, vadd(pos, { x: target.x, y: 0 })),
    isRpGrabbable({ x: target.x, y: 0 }), impetus.y <= 1)
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
    return { destination: horizProj, forced: [{ pos: !isRpOpen(vertProj) ? vertProj : target, force: impetus }], posture: 'stand' };
  }

  // Attempt 3: go to vertical projection
  if (isRpOpen(vertProj)) {
    return { destination: vertProj, forced: [{ pos: horizProj, force: impetus }], posture: 'stand' };
  }

  // Attempt 4: hold still
  return { destination: { x: 0, y: 0 }, forced: [{ pos: vertProj, force: impetus }], posture: 'stand' };
}

export type FallPhaseContext = {
  entity: EntityState,
  fall: boolean,
  posture: Posture,
};

export type FallPhaseOutput = {
  entity: EntityState,
};

function fallPhase(state: GameState, fallPhaseContext: FallPhaseContext): FallPhaseOutput {
  const { entity, fall, posture } = fallPhaseContext;

  if (!fall)
    return { entity };

  if (posture == 'attachWall')
    return { entity };

  if (!isOpen(tileOfGameState(state, vadd(entity.pos, { x: 0, y: 1 })))) {
    return { entity };
  }

  // if none of the above conditions apply, let gravity affect impetus
  return { entity: { pos: entity.pos, impetus: vadd(entity.impetus, { x: 0, y: 1 }) } };
}

export function entityTick(state: GameState, tickContext: TickContext): TickOutput {
  const entity = tickContext.entity;
  const { bounce, posture: posture1, forced: forced0 } = bouncePhase(state, { entity, motive: tickContext.motive });

  const { newImpetus, target, forced: forced1, fall } = targetPhase(state, { entity, motive: bounce, support: tickContext.support });
  const { destination, posture, forced: forced2 } = destinationPhase(state, { entity, target });
  const destEntity = {
    pos: vadd(entity.pos, destination),
    impetus: newImpetus,
  };
  const { entity: finalEntity } = fallPhase(state, { entity: destEntity, fall, posture });
  return {
    entity: finalEntity,
    forced: [...forced0, ...forced1, ...forced2],
    posture,
  }
}
