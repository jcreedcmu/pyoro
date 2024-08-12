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
    return { target: -1, newImpetus: impetus + 1 }
  }
  else {
    // descending
    return { target: 1, newImpetus: Math.max(motive, impetus + 1) };
  }
}

export function targetPhase(state: GameState, ctx: TargetPhaseContext): TargetPhaseOutput {
  const { entity, motive, support } = ctx;
  const { impetus, pos } = entity;
  if (support != undefined) {
    const supportPosAbs = vadd(pos, support);
    const supportTile = tileOfGameState(state, supportPosAbs);
    return {
      target: motive,
      newImpetus: vadd(genImpetus(supportTile), { x: 0, y: -1 }),
      forced: [{ pos: support, force: impetus }]
    };
  }
  else {
    const resultX = targetPhaseUnsupportedX(state, { impetus: impetus.x, motive: motive.x });
    const resultY = targetPhaseUnsupportedY(state, { impetus: impetus.y, motive: motive.y });
    return {
      forced: [],
      newImpetus: { x: resultX.newImpetus, y: resultY.newImpetus },
      target: { x: resultX.target, y: resultY.target },
    };
  }
}

export type BouncePhaseContext = { target: Point };

export type BouncePhaseOutput = {
  destination: Point,
  forced: ForcedBlock[]
};

export function bouncePhase(state: GameState, ctx: BouncePhaseContext): BouncePhaseOutput {

}


export function entityTick(state: GameState, tickContext: TickContext): TickOutput {
  const { newImpetus, target, forced: forced1 } = targetPhase(state, tickContext);
  const { destination, forced: forced2 } = bouncePhase(state, { target });
  return {
    entity: {
      pos: destination,
      impetus: newImpetus,
    },
    forced: [...forced1, ...forced2]
  }
}
