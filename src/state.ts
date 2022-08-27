import { Layer } from './layer';
import { Point, Facing, Sprite, Tile } from './types';
import { FULL_IMPETUS } from './constants';
import { initOverlay } from './initial_overlay';
import { ViewData } from './view';
import { Animator } from './animation';

export type Player = {
  dead: boolean,
  animState: Sprite,
  flipState: Facing,
  pos: Point,
  impetus: number,
};

export type AnimState = {
  animator: Animator,
  frame: number,
}

export type IfaceState = {
  editTileIx: number,
  editTileRotation: number,
  viewPort: Point,
  blackout: number,
  dragTile: Tile | undefined,
  vd: ViewData | null,
};

export type Item = 'teal_fruit';

export type Inventory = Partial<Record<Item, number>>;

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
  anim: AnimState | null,
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
    },
    lastSave: { x: 0, y: 0 },
  },
  iface: {
    viewPort: { x: -13, y: -9 },
    blackout: 0,
    editTileIx: 0,
    editTileRotation: 0,
    dragTile: undefined,
    vd: null,
  },
  anim: null,
};
