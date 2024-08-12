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
