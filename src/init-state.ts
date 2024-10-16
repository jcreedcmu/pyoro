import { initBindings } from "./bindings";
import { TILE_SIZE } from "./constants";
import { mkLevel } from "./level";
import { allLevels } from "./level-data";
import { vdiag } from "./lib/point";
import { mkSE2 } from "./lib/se2";
import { MainState, SettingsState, State, init_player } from "./state";
import { mapValues } from "./util";

export const initState: State = {
  t: 'title'
};

export const initSettingsState: SettingsState = {
  musicVolume: 1,
  sfxVolume: 1,
  debugImpetus: false,
  bindings: initBindings,
  effects: [],
  keyModal: undefined,
};

export const initMainState: MainState = {
  modals: {},
  nonVisibleState: {
    mouseCache: undefined,
  },
  effects: [],
  settings: initSettingsState,
  game: {
    player: init_player,
    currentLevelState: mkLevel(allLevels.start),
    levels: allLevels,
    currentLevel: 'start',
    inventory: {},
    lastSave: { x: 0, y: 0 },
    time: 0,
  },
  iface: {
    keysDown: {},
    world_from_view: mkSE2(vdiag(1 / TILE_SIZE), { x: -13, y: -9 }),
    blackout: 0,
    editPageIx: 0,
    editTileIx: 0,
    toolState: { t: 'play_tool' },
    editTileRotation: 0,
    mouse: { t: 'up' },
    vd: null,
  },
  anim: null,
};
