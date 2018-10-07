import { Layer } from './layer';
import { Point, Facing, Sprite, Tile } from './types';
import { FULL_IMPETUS } from './constants';
import { initial_overlay } from './initial_overlay';

export type Player = {
  dead: boolean,
  animState: Sprite,
  flipState: Facing,
  pos: Point,
  impetus: number,
};

export type IfaceState = {
  editTileIx: number,
  editTileRotation: number,
};

export type ExtraState = {
  blackout: number,
};

export type State = {
  player: Player,
  viewPort: Point,
  overlay: Layer,
  last_save: Point,
  iface: IfaceState,
  extra: ExtraState,
};

export const init_state: State = {
  player: {
    dead: false,
    pos: { x: 0, y: 0 },
    animState: 'player',
    flipState: 'left',
    impetus: FULL_IMPETUS,
  },
  last_save: { x: 0, y: 0 },
  viewPort: { x: -13, y: -9 },
  overlay: initial_overlay,
  extra: {
    blackout: 0,
  },
  iface: {
    editTileIx: 0,
    editTileRotation: 0,
  }
};
