import { Setter } from "./optic";
import { Point } from "./lib/point";
import { Command, PanelStateFieldTypes } from "./reduce";
import { ButtonedTileFields, DoorTileFields, KeyBindableToolState, MainState, TimedTileFields, ToolState } from "./state";
import * as testTools from './test-tools';
import { Move } from "./types";
import { ViewData } from "./view";
import { SettingsAction } from "./settings";

export type Dispatch = (a: Action) => void;

// These are amenable to keybindings because they have no arguments
// (well, none beyond the one argument of the wrapper)
export type KeyBindableAction =
  | { t: 'doCommand', command: Command }
  | { t: 'doMove', move: Move }
  | { t: 'setCurrentToolState', toolState: KeyBindableToolState }
  ;

export type Action =
  | { t: 'keyUp', key: string, code: string, name: string }
  | { t: 'keyDown', key: string, code: string, name: string }
  | { t: 'setState', s: MainState }
  | { t: 'mouseWheel', delta: number }
  | { t: 'mouseDown', point: Point, buttons: number }
  | { t: 'mouseUp' }
  | { t: 'mouseMove', point: Point }
  | { t: 'resize', vd: ViewData }
  | { t: 'nextFrame' }
  | PanelStateFieldTypes[keyof TimedTileFields]
  | PanelStateFieldTypes[keyof ButtonedTileFields]
  | PanelStateFieldTypes[keyof DoorTileFields]
  | { t: 'saveModifyPanel' }
  | { t: 'setCurrentLevel', name: string }
  | { t: 'setField', setter: Setter<MainState> }
  | { t: 'testToolsAction', action: testTools.Action }
  | { t: 'cacheMouse', p: Point }
  | { t: 'openSettings' }
  | { t: 'settingsAction', action: SettingsAction }
  | { t: 'cancelModals' }
  | { t: 'openRenameLevel', src: string }
  | { t: 'doRename', src: string, dst: string }
  | { t: 'cropLevel' }
  | KeyBindableAction
  ;
