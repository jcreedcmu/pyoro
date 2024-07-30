import { Animator } from './animation';
import { FULL_IMPETUS } from './constants';
import { initOverlay } from './initial_overlay';
import { DynamicLayer } from './layer';
import { Bus, DynamicTile, Facing, Item, Move, PlayerSprite, Point } from './types';
import { mapValues } from './util';
import { ViewData } from './view';

export type Player = {
  dead: boolean,
  animState: PlayerSprite,
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
  | { t: 'tileDrag', tile: DynamicTile }
  | { t: 'panDrag', init: Point, initViewPort: Point }

export type IfaceState = {
  keysDown: Record<string, boolean>,
  bufferedMoves: Move[],
  editTileIx: number,
  toolState: ToolState,
  editTileRotation: number,
  viewPort: Point,
  blackout: number,
  mouse: MouseState,
  vd: ViewData | null,
};

export type Inventory = Partial<Record<Item, number>>;

export type Level = {
  initOverlay: DynamicLayer,
  overlay: DynamicLayer,
}

// XXX may want to move other stuff into level state
export type GameState = {
  player: Player,
  levels: Record<string, Level>,
  currentLevel: string,
  inventory: Inventory,
  lastSave: Point,
  time: number,
  busState: Record<Bus, boolean>,
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

export const emptyOverlay: DynamicLayer = { tiles: {} };


// In the interface, not in the model
export type TimedTileFields = { phase: string, on_for: string, off_for: string };
export type ButtonedTileFields = { x: string, y: string };
export type DoorTileFields = { destinationLevel: string };

export type ModifyPanelState =
  | { t: 'none' }
  | { t: 'timed' } & TimedTileFields
  | { t: 'buttoned' } & ButtonedTileFields
  | { t: 'door' } & DoorTileFields
  ;

export type ToolState =
  | { t: 'play_tool' }
  | { t: 'hand_tool' }
  | { t: 'pencil_tool' }
  | { t: 'modify_tool', modifyCell: Point | null, panelState: ModifyPanelState }
  ;

export const init_level: Level = {
  initOverlay: initOverlay.start,
  overlay: emptyOverlay,
};

export const init_state: State = {
  game: {
    player: init_player,
    levels: mapValues(initOverlay, initOverlay => ({ initOverlay, overlay: emptyOverlay })),
    currentLevel: 'start',
    inventory: {
    },
    lastSave: { x: 0, y: 0 },
    time: 0,
    busState: {
      red: false,
      green: false,
      blue: false,
    }
  },
  iface: {
    bufferedMoves: [],
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
