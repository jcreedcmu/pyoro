import { LayerData } from './layer';
import { Point, Facing, Sprite } from './types';
import { FULL_IMPETUS } from './constants';

export type Player = {
  animState: Sprite,
  flipState: Facing,
  pos: Point,
  impetus: number,
};

export function newPlayer(pos: Point): Player {
  return {
    pos,
    animState: 'player',
    flipState: 'left',
    impetus: FULL_IMPETUS,
  };
}

export type State = {
  player: Player;
  viewPort: Point;
  overlay: LayerData;
};
