import { Layer } from './layer';
import { Point, Facing, Sprite, Tile } from './types';
import { FULL_IMPETUS } from './constants';
import { initial_overlay } from './initial_overlay';

export type Player = {
  animState: Sprite,
  flipState: Facing,
  pos: Point,
  impetus: number,
};

export type IfaceState = {
  editTileIx: number,
};

export type State = {
  player: Player,
  viewPort: Point,
  overlay: Layer,
  iface: IfaceState,
};

export const init_state: State = {
  player: {
    pos: { x: 0, y: 0 },
    animState: 'player',
    flipState: 'left',
    impetus: FULL_IMPETUS,
  },
  viewPort: { x: -13, y: -9 },
  overlay: initial_overlay,
  iface: {
    editTileIx: 0,
  }
};
