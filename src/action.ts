import { Point } from "./point";
import { Command, PanelStateFieldTypes } from "./reduce";
import { State, ToolState, TimedTileFields, ButtonedTileFields, DoorTileFields } from "./state";
import { Move } from "./types";
import { ViewData } from "./view";

export type Dispatch = (a: Action) => void;

export type Action =
  | { t: 'keyUp', key: string, code: string, name: string }
  | { t: 'keyDown', key: string, code: string, name: string }
  | { t: 'setState', s: State }
  | { t: 'mouseDown', point: Point }
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
  ;
