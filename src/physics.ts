import { tileOfGameState } from "./model";
import { ForcedBlock, genImpetus, isOpen } from './model-utils';
import { Point, vadd, vplus } from './point';
import { GameState } from "./state";

export type TickContext = {
  entity: EntityState,
  motive: Point,
  support: Point | undefined,
};

export type TickOutput = {
  entity: EntityState,
  forced: ForcedBlock[],
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

export function targetPhase(state: GameState, ctx: TargetPhaseContext): TargetPhaseOutput {
  const { entity, motive, support } = ctx;
  const { impetus, pos } = entity;
  if (support != undefined) {
    const supportTile = tileOfGameState(state, vadd(pos, support));
    return {
      target: motive,
      newImpetus: vadd(genImpetus(supportTile), { x: 0, y: -1 }),
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

export type BouncePhaseContext = { entity: EntityState, target: Point };

export type BouncePhaseOutput = {
  destination: Point,
  forced: ForcedBlock[]
};

export function bouncePhase(state: GameState, ctx: BouncePhaseContext): BouncePhaseOutput {
  const { entity, target } = ctx;
  const { pos, impetus } = entity;

  function isRpOpen(relPt: Point): boolean {
    return isOpen(tileOfGameState(state, vadd(pos, relPt)));
  }

  const vertProj = { x: 0, y: target.y };
  const horizProj = { x: target.x, y: 0 };

  // Attempt 1: Go to target tile
  if (isRpOpen(target) && isRpOpen(vertProj)) {
    return { destination: target, forced: [] };
  }

  // Attempt 2: go to horizontal projection
  if (isRpOpen(horizProj)) {
    return { destination: horizProj, forced: [{ pos: !isRpOpen(vertProj) ? vertProj : target, force: impetus }] };
  }

  // Attempt 3: go to vertical projection
  if (isRpOpen(vertProj)) {
    return { destination: horizProj, forced: [{ pos: horizProj, force: impetus }] };
  }

  // Attempt 4: hold still
  return { destination: horizProj, forced: [{ pos: vertProj, force: impetus }] };
}

export type FallPhaseOutput = {
  entity: EntityState,
};

function fallPhase(state: GameState, entity: EntityState, fall: boolean): FallPhaseOutput {
  if (fall && isOpen(tileOfGameState(state, vadd(entity.pos, { x: 0, y: 1 }))))
    return { entity: { pos: entity.pos, impetus: vadd(entity.impetus, { x: 0, y: 1 }) } };
  else {
    return { entity };
  }
}

export function entityTick(state: GameState, tickContext: TickContext): TickOutput {
  const { newImpetus, target, forced: forced1, fall } = targetPhase(state, tickContext);
  const { destination, forced: forced2 } = bouncePhase(state, { entity: tickContext.entity, target });
  const entity = {
    pos: destination,
    impetus: newImpetus,
  };
  const { entity: finalEntity } = fallPhase(state, entity, fall);
  return {
    entity: finalEntity,
    forced: [...forced1, ...forced2]
  }
}
