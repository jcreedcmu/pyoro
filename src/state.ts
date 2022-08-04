import { Layer } from './layer';
import { Point, Facing, Sprite, Tile } from './types';
import { FULL_IMPETUS } from './constants';
import { initOverlay } from './initial_overlay';

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
  viewPort: Point,
  blackout: number,
  dragTile: Tile | undefined,
};

export type Item = 'teal_fruit';

export type Inventory = { [k in Item]: Point | undefined };

export type GameState = {
  player: Player,
  initOverlay: Layer,
  overlay: Layer,
  inventory: Inventory,
  lastSave: Point,
}

export type State = {
  game: GameState,
  iface: IfaceState,
};

export const init_player: Player = {
  dead: false,
  pos: { x: 0, y: 0 },
  animState: 'player',
  flipState: 'right',
  impetus: FULL_IMPETUS,
};

export const init_state: State = {
  game: {
    player: init_player,
    initOverlay: initOverlay,
    overlay: initOverlay,
    inventory: {
      teal_fruit: undefined,
    },
    lastSave: { x: 0, y: 0 },
  },
  iface: {
    viewPort: { x: -13, y: -9 },
    blackout: 0,
    editTileIx: 0,
    editTileRotation: 0,
    dragTile: undefined,
  }
};
