import { Action, Command } from "./reduce";
import { Dict, Move } from "./types";

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
  'C-d': 'debug',
}

export const miscBindings: Dict<Action> = {
  'h': { t: 'setCurrentTool', tool: 'hand_tool' },
  'n': { t: 'setCurrentTool', tool: 'pencil_tool' },
}
