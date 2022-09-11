import { Animator } from './animation';
import { FULL_IMPETUS } from './constants';
import { initOverlay } from './initial_overlay';
import { Layer } from './layer';
import { Facing, Item, Point, Sprite, Tile } from './types';
import { ViewData } from './view';

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

export type MouseState =
  | { t: 'up' }
  | { t: 'tileDrag', tile: Tile }

export type IfaceState = {
  keysDown: Record<string, boolean>,
  editTileIx: number,
  currentToolIx: number,
  editTileRotation: number,
  viewPort: Point,
  blackout: number,
  mouse: MouseState,
  vd: ViewData | null,
};

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

const emptyOverlay: Layer = { tiles: {} };

export const init_state: State = {
  game: {
    player: init_player,
    initOverlay: initOverlay,
    overlay: emptyOverlay,
    inventory: {
    },
    lastSave: { x: 0, y: 0 },
  },
  iface: {
    keysDown: {},
    viewPort: { x: -13, y: -9 },
    blackout: 0,
    editTileIx: 0,
    currentToolIx: 0,
    editTileRotation: 0,
    mouse: { t: 'up' },
    vd: null,
  },
  anim: null,
};
