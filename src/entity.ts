import { Point } from './lib/point';
import { DynamicTile, Tile } from './types';

// XXX this should be more like a guid
export type EntityId =
  | { t: 'player' }
  | { t: 'mobile', ix: number }
  ;

export type MobileType =
  | { t: 'wood_box' }
  | { t: 'metal_box' }
  ;

export type EntityState = {
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
