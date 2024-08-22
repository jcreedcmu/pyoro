import { Point } from './lib/point';
import { DynamicTile, Tile } from './types';

// XXX this should be more like a guid
export type EntityId =
  | { t: 'player' }
  | { t: 'mobile', ix: number }
  ;

export type EntityType =
  | { t: 'movable' }
  ;

export type EntityState = {
  etp: EntityType,
  pos: Point,
  impetus: Point,
};

export function entityOfTile(tile: Tile): EntityType | undefined {
  switch (tile.t) {
    case 'movable': return { t: 'movable' };
    default: return undefined;
  }
}

export function entityOfDynamicTile(tile: DynamicTile): EntityType | undefined {
  switch (tile.t) {
    case 'static': return entityOfTile(tile.tile);
    default: return undefined;
  }
}
