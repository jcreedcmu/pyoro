import { initBindings } from "./bindings";
import { centeredWorldFromView, defaultCameraZoom } from "./camera";
import { mkLevel } from "./level";
import { allLevels } from "./level-data";
import { MainState, SettingsState, State, init_player } from "./state";
import { mapValues } from "./util";

export const initState: State = {
  t: 'title'
};

/** The world point the view is centered on when the game starts. */
const INITIAL_VIEW_CENTER = { x: -1, y: 0 };

export const initSettingsState: SettingsState = {
  musicVolume: 1,
  sfxVolume: 1,
  debugImpetus: false,
  controlPad: 'auto',
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
    world_from_view: centeredWorldFromView(INITIAL_VIEW_CENTER, defaultCameraZoom()),
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
