import { Sprite, Point, Tile } from './types';

export const FULL_IMPETUS = 4;
export const NUM_TILES = { x: 24, y: 18 };
export const TILE_SIZE = 16;
export const SCALE = 2;

export const FRAME_DURATION_MS = 100;

export const sprites: { [k in Sprite]: Point } = {
  box: { x: 1, y: 4 },
  fragile_box: { x: 2, y: 6 },
  broken_box: { x: 4, y: 3 },
  box3: { x: 3, y: 3 },
  empty: { x: 0, y: 0 },
  player: { x: 1, y: 2 },
  player_dead: { x: 2, y: 0 },
  player_fall: { x: 1, y: 0 },
  player_rise: { x: 1, y: 1 },
  up_box: { x: 6, y: 6 },
  spike_up: { x: 0, y: 3 },
  spike_right: { x: 2, y: 3 },
  spike_left: { x: 2, y: 4 },
  spike_down: { x: 2, y: 5 },
  save_point: { x: 2, y: 2 },
};

export const DEBUG = {
  globals: true,
  mouse: false,
  keys: false,
  datgui: false,
};

export const editTiles: Tile[] =
  ['box', 'box3', 'up_box', 'fragile_box', 'spike_up', 'save_point'];

export function rotateTile(tile: Tile, amount: number): Tile {
  const spikes: Tile[] = ['spike_up', 'spike_right', 'spike_down', 'spike_left'];
  switch (tile) {
    case 'spike_up': return spikes[amount];
    default: return tile;
  }
}

export const guiData = {
  background_color: "#b3b099",
  stage_color: "#333333",
};
