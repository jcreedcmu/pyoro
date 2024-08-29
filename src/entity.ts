import { produce } from 'immer';
import { Point } from './lib/point';
import { Level } from './state';
import { DynamicTile, Tile } from './types';

// XXX this should be more like a guid
export type EntityId =
  | { t: 'player' }
  | { t: 'mobileId', id: MobileId }
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
