import { produce } from 'immer';
import { Point } from './lib/point';
import { GameState, Level } from './state';
import { DynamicTile, Tile } from './types';
import { getMobileById } from './game-state-access';

export type EntityId =
  | { t: 'player' }
  | { t: 'mobileId', id: MobileId }
  ;

export type EntityInfo =
  | { t: 'player' }
  | { t: 'mobileId', id: MobileId, mtp: MobileType }
  ;

export type MobileId = string;

export type MobileType =
  | { t: 'wood_box' }
  | { t: 'metal_box' }
  ;

export type EntityState = {
  id: MobileId,
  etp: MobileType,
  pos: Point,
  impetus: Point,
  dead: boolean,
};

export function entityOfTile(tile: Tile): MobileType | undefined {
  switch (tile.t) {
    case 'wood_box': return { t: 'wood_box' };
    case 'metal_box': return { t: 'metal_box' };
    default: return undefined;
  }
}

export function entityOfDynamicTile(tile: DynamicTile): MobileType | undefined {
  switch (tile.t) {
    case 'static': return entityOfTile(tile.tile);
    default: return undefined;
  }
}

export function entityWeight(etp: MobileType): number {
  switch (etp.t) {
    case 'wood_box': return 1;
    case 'metal_box': return 2;
  }
}

export function getMobileId(level: Level): [Level, MobileId] {
  const ec = level.entityCounter;
  return [
    produce(level, l => {
      l.entityCounter = ec + 1;
    }),
    `mobile${ec}`
  ];
}

export function eqEntityId(a: EntityId, b: EntityId): boolean {
  switch (a.t) {
    case 'player': return b.t == 'player';
    case 'mobileId': return b.t == 'mobileId' && a.id == b.id;
  }
}

export function getEntityInfo(state: GameState, entity: EntityId): EntityInfo {
  switch (entity.t) {
    case 'player': return { t: 'player' };
    case 'mobileId': return {
      t: 'mobileId',
      id: entity.id,
      mtp: getMobileById(state, entity.id)!.etp
    };
  }
}
