import produce from "immer";
import { editTiles } from "./constants";
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

export const commandBindings: Dict<(s: State) => State> = {
  '.': (s) => {
    return produce(s, s => {
      s.iface.editTileIx = (s.iface.editTileIx + 1) % editTiles.length;
    });
  },
  ',': (s) => {
    return produce(s, s => {
      s.iface.editTileIx = (s.iface.editTileIx - 1 + editTiles.length) % editTiles.length;
    });
  },
  'C-s': (s) => {
    const req = new Request('/save', {
      method: 'POST',
      body: JSON.stringify(s.game.overlay),
      headers: {
        'Content-Type': 'application/json',
      }
    });
    fetch(req).then(r => r.json())
      .then(x => console.log(x))
      .catch(console.error);
    return produce(s, s => {
      s.game.initOverlay.tiles = s.game.overlay.tiles;
    });
  },
  'r': (s) => {
    return produce(s, s => {
      s.iface.editTileRotation = (s.iface.editTileRotation + 1) % 4;
    });
  },
}
