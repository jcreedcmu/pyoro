import { boxTile } from './layer';
import { Rect } from './lib/types';
import { Direction, Tile, Tool, Bus } from './types';
import { mod } from './util';

export const FULL_IMPETUS = 4;
export const COMBO_THRESHOLD = 3;
export const NUM_TILES = { x: 24, y: 18 };
export const TILE_SIZE = 16;
export const SCALE = 2;

export const viewRectInView: Rect = { p: { x: 0, y: 0 }, sz: { x: NUM_TILES.x * TILE_SIZE, y: NUM_TILES.y * TILE_SIZE } };

export const FRAME_DURATION_MS = 30;

export const PLAYER_WEIGHT = 1;
export const MAX_CLIMB_WEIGHT = 1;

export const tools: Tool[] = [
  'play_tool',
  'pencil_tool',
  'hand_tool',
  'modify_tool',
  'test_tool',
]

export const editTiles: Tile[][] = [
  [
    boxTile(),
    { t: 'grip_wall' },
    { t: 'box3' },
    { t: 'stone' },
    { t: 'up_box' },
    { t: 'fragile_box' },
    { t: 'spike', direction: 'left' },
    { t: 'save_point' },
    { t: 'item', item: 'teal_fruit' },
    { t: 'item', item: 'coin' },
    { t: 'coin_wall' },
    { t: 'button_on' },
    { t: 'button_off' },
    { t: 'timed_wall' },
    { t: 'buttoned_wall' },
    { t: 'bus_button', bus: 'red', on: true },
    { t: 'bus_button', bus: 'green', on: true },
    { t: 'bus_button', bus: 'blue', on: true },
    { t: 'bus_block', bus: 'red', on: true },
    { t: 'bus_block', bus: 'green', on: true },
    { t: 'bus_block', bus: 'blue', on: true },
    { t: 'door', destinationLevel: 'start' },
    { t: 'motion_block', direction: 'up', on: true },
    { t: 'motion_block', direction: 'down', on: true },
    { t: 'motion_block', direction: 'left', on: true },
    { t: 'motion_block', direction: 'right', on: true },
    { t: 'side_breakable' },
    { t: 'wood_box' },
    { t: 'metal_box' },
  ],
  [
    { t: 'ladder' },
    { t: 'water' },
  ],
];

function numberOfDirection(direction: Direction): number {
  switch (direction) {
    case 'up': return 0;
    case 'right': return 1;
    case 'down': return 2;
    case 'left': return 3;
  }
}

function directionOfNumber(direction: number): Direction {
  switch (mod(direction, 4)) {
    case 0: return 'up';
    case 1: return 'right';
    case 2: return 'down';
    case 3: return 'left';
    default:
      console.error(`unexpected direction number ${direction}`);
      return 'up';
  }
}

function rotateDirection(direction: Direction, amount: number): Direction {
  return directionOfNumber((numberOfDirection(direction) + amount));
}

export function rotateTile(tile: Tile, amount: number): Tile {
  switch (tile.t) {
    case 'spike': return {
      t: 'spike', direction: rotateDirection(tile.direction, amount)
    }
    default: return tile;
  }
}

export const guiData = {
  background_color: "#b3b099",
  stage_color: "#333333",
};

export const NUM_INVENTORY_ITEMS = 5;
