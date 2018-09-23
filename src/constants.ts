import { Sprite, Point } from './types';

export const FULL_IMPETUS = 4;
export const CHUNK_SIZE = 16;

export const NUM_TILES_X = 24;
export const NUM_TILES_Y = 18;
export const TILE_SIZE = 16;
export const SCALE = 2;

export const sprites: { [k in Sprite]: Point } = {
  box: { x: 1, y: 4 },
  fragile_box: { x: 2, y: 6 },
  broken_box: { x: 4, y: 3 },
  box3: { x: 3, y: 3 },
  empty: { x: 0, y: 0 },
  player: { x: 1, y: 2 },
  player_fall: { x: 1, y: 0 },
  player_rise: { x: 1, y: 1 },
  up_box: { x: 6, y: 6 },
};



export const DEBUG = {
  globals: false,
  keys: false,
};
