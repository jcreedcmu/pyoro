import { Action, KeyBindableAction } from './action';
import { Animator } from './animation';
import { RenameLevelData } from './core/rename-level';
import { Effect } from './effect';
import { EntityState } from './entity';
import { DynamicLayer } from './layer';
import { LevelData } from './level';
import { Point } from './lib/point';
import { SE2 } from './lib/se2';
import { Dict } from './lib/types';
import { Bus, DynamicTile, Facing, Item, Move, PlayerSprite } from './types';
import { ViewData } from './view';

export type Combo = undefined | { t: 'combo', dir: Point, rep: number };

export type Player = {
  dead: boolean,
  oxygen: number,
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
  | { t: 'panDrag', init: Point, initWorldFromView: SE2 }

export type IfaceState = {
  keysDown: Record<string, boolean>,
  editPageIx: number,
  editTileIx: number,
  toolState: ToolState,
  editTileRotation: number,

  /**
   * The world coordinates of the top-left displayed tile. As a
   * transform, this would be the translation component of
   * world_from_view_tile.
   */
  world_from_view: SE2,

  blackout: number,
  mouse: MouseState,
  vd: ViewData | null,
};

export type Inventory = Partial<Record<Item, number>>;

/**
 * The type of level data "in flight", as we're playing the game.
 */
export type Level = {
  overlay: DynamicLayer,
  entityCounter: number,
  busState: Record<Bus, boolean>,
  entities: EntityState[],
}

// XXX may want to move other stuff into level state
export type GameState = {
  player: Player,
  currentLevelState: Level,
  levels: Record<string, LevelData>,
  currentLevel: string,
  inventory: Inventory,
  lastSave: Point,
  time: number,
}

/**
 * This is state which we don't expect to do rerenders based on it
 */
export type NonVisibleState = {
  mouseCache: Point | undefined,
};

export type ModalDialogs = {
  renameLevel?: RenameLevelData,
}

/**
 * All the state we need when we're in the middle of playing the game
 */
export type MainState = {
  settings: SettingsState,
  game: GameState,
  iface: IfaceState,
  anim: AnimState | null,
  effects: Effect[],
  nonVisibleState: NonVisibleState,
  modals: ModalDialogs,
};

export type SettingsState = {
  musicVolume: number,
  sfxVolume: number,
  debugImpetus: boolean,
  effects: Effect[],
  bindings: Dict<KeyBindableAction>,
};

export type State =
  | { t: 'main', state: MainState }
  | { t: 'settings', prev: MainState, settingsState: SettingsState }
  | { t: 'title' }
  ;

export const init_player: Player = {
  oxygen: 0,
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

// These are amenable to keybindings because they have no arguments
export type KeyBindableToolState =
  | { t: 'play_tool' }
  | { t: 'hand_tool' }
  | { t: 'pencil_tool' }
  ;

export type ToolState =
  | KeyBindableToolState
  | { t: 'modify_tool', modifyCell: Point | null, panelState: ModifyPanelState }
  | { t: 'test_tool', testToolState: TestToolState }
  ;
