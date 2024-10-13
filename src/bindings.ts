import { Action, KeyBindableAction } from './action';
import { Dict } from "./lib/types";
import { Command } from "./reduce";
import { KeyBindableTool, KeyBindableToolState } from './state';
import { Move } from "./types";
import { mapValues } from "./util";

export const moveBindings: Dict<Move> = {
  'KP7': 'up-left',
  'KP9': 'up-right',
  'KP4': 'left',
  'KP8': 'up',
  'KP6': 'right',
  'KP2': 'down',
  'KP5': 'down',
  'q': 'up-left',
  'e': 'up-right',
  'a': 'left',
  'w': 'up',
  'd': 'right',
  's': 'down',
  'S-r': 'reset',
  'c': 'recenter',
  'up': 'up',
  'left': 'left',
  'right': 'right',
  'down': 'down',
}

export const commandBindings: Dict<Command> = {
  '.': 'nextEditTile',
  ',': 'prevEditTile',
  'C-s': 'saveOverlay',
  'r': 'rotateEditTile',
  'S-d': 'edit',
  'C-d': 'debug',
  '`': 'eyedropper',
}

export const miscBindings: Dict<KeyBindableAction> = {
  'h': { t: 'setCurrentToolState', toolState: { t: 'hand_tool' } },
  'n': { t: 'setCurrentToolState', toolState: { t: 'pencil_tool' } },
}

export const initBindings: Dict<KeyBindableAction> = {
  ...miscBindings,
  ...mapValues(commandBindings, command => ({ t: 'doCommand', command })),
  ...mapValues(moveBindings, move => ({ t: 'doMove', move })),
}

// This refines `string`.
export type ExternalKeyBind =
  | Command
  | Move
  | KeyBindableTool
  ;

export function actionOfExternalKeyBind(b: ExternalKeyBind): KeyBindableAction {
  switch (b) {
    case 'prevEditTile': // these fallthroughs are intentional
    case 'nextEditTile':
    case 'saveOverlay':
    case 'rotateEditTile':
    case 'debug':
    case 'edit':
    case 'eyedropper':
      return { t: 'doCommand', command: b };
    case 'up':
    case 'down':
    case 'left':
    case 'right':
    case 'up-left':
    case 'up-right':
    case 'reset':
    case 'recenter':
      return { t: 'doMove', move: b };
    case 'play_tool':
    case 'hand_tool':
    case 'pencil_tool':
      return {
        t: 'setCurrentToolState', toolState: { t: b }
      };
  }
}


export function externalKeyBindOfAction(a: Action): ExternalKeyBind {
  switch (a.t) {
    case 'doCommand': return a.command;
    case 'doMove': return a.move;
    case 'setCurrentToolState': {
      return a.toolState.t;
    }
    default:
      throw new Error(`non key bindable action: ${JSON.stringify(a)}`);
  }
}

export const allKeyBinds: ExternalKeyBind[] = [
  'prevEditTile',
  'nextEditTile',
  'saveOverlay',
  'rotateEditTile',
  'debug',
  'edit',
  'eyedropper',
  'up',
  'down',
  'left',
  'right',
  'up-left',
  'up-right',
  'reset',
  'recenter',
  'play_tool',
  'hand_tool',
  'pencil_tool',
];
