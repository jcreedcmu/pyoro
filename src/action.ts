import { Setter } from "./optic";
import { Point } from "./lib/point";
import { Command, PanelStateFieldTypes } from "./reduce";
import { ButtonedTileFields, DoorTileFields, MainState, TimedTileFields, ToolState } from "./state";
import * as testTools from './test-tools';
import { Move } from "./types";
import { ViewData } from "./view";
import { SettingsAction } from "./settings";

export type Dispatch = (a: Action) => void;

export type Action =
  | { t: 'keyUp', key: string, code: string, name: string }
  | { t: 'keyDown', key: string, code: string, name: string }
  | { t: 'setState', s: MainState }
  | { t: 'mouseDown', point: Point, buttons: number }
  | { t: 'mouseUp' }
  | { t: 'mouseMove', point: Point }
  | { t: 'resize', vd: ViewData }
  | { t: 'nextFrame' }
  | { t: 'doCommand', command: Command }
  | { t: 'doMove', move: Move }
  | { t: 'setCurrentToolState', toolState: ToolState }
  | PanelStateFieldTypes[keyof TimedTileFields]
  | PanelStateFieldTypes[keyof ButtonedTileFields]
  | PanelStateFieldTypes[keyof DoorTileFields]
  | { t: 'saveModifyPanel' }
  | { t: 'setCurrentLevel', name: string }
  | { t: 'setField', setter: Setter<MainState> }
  | { t: 'testToolsAction', action: testTools.Action }
  | { t: 'cacheMouse', p: Point }
  | { t: 'settingsAction', action: SettingsAction }
  ;
