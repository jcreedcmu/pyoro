import { Sprite, Point, Tile, Tool } from './types';

export const FULL_IMPETUS = 4;
export const NUM_TILES = { x: 24, y: 18 };
export const TILE_SIZE = 16;
export const SCALE = 2;

export const FRAME_DURATION_MS = 30;

export const tools: Tool[] = [
  'play_tool',
  'pencil_tool',
  'hand_tool',
  'modify_tool',
]

// XXX ComplexTile
export const editTiles: Tile[] =
  [
    //    'box', // XXX ComplexTile
    'grip_wall',
    'box3',
    'up_box',
    'fragile_box',
    'spike_up',
    'save_point',
    'teal_fruit',
    'coin',
    'coin_wall',
    'button_on',
    'button_off',
    'timed_wall',
    'buttoned_wall',
    'bus_button_red_on',
    'bus_button_green_on',
    'bus_button_blue_on',
    'bus_block_red_on',
    'bus_block_green_on',
    'bus_block_blue_on',
    'bus_block_red_off',
    'bus_block_green_off',
    'bus_block_blue_off',
  ];

// XXX use ComplexTile
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

export const NUM_INVENTORY_ITEMS = 5;
