import { KeyBindableAction } from './action';
import { Dict } from "./lib/types";
import { Command } from "./reduce";
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
