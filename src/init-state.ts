import { mkLevel } from "./level";
import { allLevels } from "./level-data";
import { MainState, State, init_player } from "./state";
import { mapValues } from "./util";

export const initState: State = {
  t: 'title'
};

export const initMainState: MainState = {
  nonVisibleState: {
    mouseCache: undefined,
  },
  effects: [],
  game: {
    player: init_player,
    levels: mapValues(allLevels, mkLevel),
    currentLevel: 'start',
    inventory: {},
    lastSave: { x: 0, y: 0 },
    time: 0,
    busState: {
      red: false,
      green: false,
      blue: false,
    }
  },
  iface: {
    keysDown: {},
    viewPort: { x: -13, y: -9 },
    blackout: 0,
    editTileIx: 0,
    toolState: { t: 'play_tool' },
    editTileRotation: 0,
    mouse: { t: 'up' },
    vd: null,
  },
  anim: null,
};
