import { Animator } from './animation';
import { FULL_IMPETUS } from './constants';
import { initOverlay } from './initial_overlay';
import { ComplexLayer, Layer } from './layer';
import { ComplexTile, Facing, Item, Point, Sprite, Tile } from './types';
import { ViewData } from './view';

export type Player = {
  dead: boolean,
  animState: Sprite,
  flipState: Facing,
  pos: Point,
  posOffset?: Point, // undefined in all non-animated GameStates
  impetus: number,
};

export type AnimState = {
  animator: Animator,
  frame: number,
}

export type MouseState =
  | { t: 'up' }
  | { t: 'tileDrag', tile: ComplexTile }
  | { t: 'panDrag', init: Point, initViewPort: Point }

export type IfaceState = {
  keysDown: Record<string, boolean>,
  editTileIx: number,
  toolState: ToolState,
  editTileRotation: number,
  viewPort: Point,
  blackout: number,
  mouse: MouseState,
  vd: ViewData | null,
};

export type Inventory = Partial<Record<Item, number>>;

export type GameState = {
  player: Player,
  initOverlay: ComplexLayer,
  overlay: ComplexLayer,
  inventory: Inventory,
  lastSave: Point,
  time: number,
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

const emptyOverlay: ComplexLayer = { tiles: {} };


// In the interface, not in the model
export type TimedTileFields = { phase: string, on_for: string, off_for: string };

export type ModifyPanelState =
  | { t: 'none' }
  | { t: 'timed' } & TimedTileFields
  ;

export type ToolState =
  | { t: 'hand_tool' }
  | { t: 'pencil_tool' }
  | { t: 'modify_tool', modifyCell: Point | null, panelState: ModifyPanelState }
  ;

export const init_state: State = {
  game: {
    player: init_player,
    initOverlay: initOverlay,
    overlay: emptyOverlay,
    inventory: {
    },
    lastSave: { x: 0, y: 0 },
    time: 0,
  },
  iface: {
    keysDown: {},
    viewPort: { x: -13, y: -9 },
    blackout: 0,
    editTileIx: 0,
    toolState: { t: 'pencil_tool' },
    editTileRotation: 0,
    mouse: { t: 'up' },
    vd: null,
  },
  anim: null,
};
