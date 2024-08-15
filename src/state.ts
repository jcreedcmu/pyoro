import { Animator } from './animation';
import { FULL_IMPETUS } from './constants';
import { Effect } from './effect';
import { DynamicLayer } from './layer';
import { Point } from './point';
import { Brect, Bus, DynamicTile, Facing, Item, Move, PlayerSprite, Rect } from './types';
import { ViewData } from './view';

export type Combo = undefined | { t: 'combo', dir: Point, rep: number };

export type Player = {
  dead: boolean,
  animState: PlayerSprite,
  flipState: Facing,
  pos: Point,
  combo: Combo,
  prevPos: Point,
  posOffset?: Point, // undefined in all non-animated GameStates
  impetus: Point,
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
  boundRect: Brect,
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
  effects: Effect[],
};

export const init_player: Player = {
  dead: false,
  pos: { x: 0, y: 0 },
  combo: undefined,
  prevPos: { x: 0, y: 0 },
  animState: 'player',
  flipState: 'right',
  impetus: { x: 0, y: 0 },
};

export function getEmptyOverlay(): DynamicLayer {
  return { tiles: {} };
}


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

export type TestToolState = {
  testIx: number,
  testTime: number
};

export type ToolState =
  | { t: 'play_tool' }
  | { t: 'hand_tool' }
  | { t: 'pencil_tool' }
  | { t: 'modify_tool', modifyCell: Point | null, panelState: ModifyPanelState }
  | { t: 'test_tool', testToolState: TestToolState }
  ;
