import produce from "immer";
import { editTiles, logger } from "./constants";
import { Command } from "./reduce";
import { State } from "./state";
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
}
