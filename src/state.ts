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

export type Item = 'teal_fruit';

export type Inventory = { [k in Item]: Point | undefined };

export type GameState = {
  player: Player,
  overlay: Layer,
  inventory: Inventory,
  last_save: Point,
}

export type State = {
  gameState: GameState,
  viewPort: Point,
  initial_overlay: Layer,
  iface: IfaceState,
  extra: ExtraState,
};

export const init_player: Player = {
  dead: false,
  pos: { x: 0, y: 0 },
  animState: 'player',
  flipState: 'right',
  impetus: FULL_IMPETUS,
};

export const init_state: State = {
  gameState: {
    player: init_player,
    overlay: initial_overlay,
    inventory: {
      teal_fruit: undefined,
    },
    last_save: { x: 0, y: 0 },
  },
  viewPort: { x: -13, y: -9 },
  initial_overlay: initial_overlay,
  extra: {
    blackout: 0,
  },
  iface: {
    editTileIx: 0,
    editTileRotation: 0,
  }
};
