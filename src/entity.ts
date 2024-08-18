import { Point } from './lib/point';

export type EntityType =
  | { t: 'movable' }
  ;

export type EntityState = {
  etp: EntityType,
  pos: Point,
  impetus: Point,
};
