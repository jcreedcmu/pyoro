import { boxTile } from './layer';
import { ComplexTile, Tool } from './types';

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

export const editTiles: ComplexTile[] =
  [
    boxTile(),
    { t: 'grip_wall' },
    { t: 'box3' },
    { t: 'up_box' },
    { t: 'fragile_box' },
    { t: 'spike_up' },
    { t: 'save_point' },
    { t: 'item', item: 'teal_fruit' },
    { t: 'item', item: 'coin' },
    { t: 'coin_wall' },
    { t: 'button_on' },
    { t: 'button_off' },
    { t: 'timed_wall' },
    { t: 'buttoned_wall' },
    { t: 'bus_button_red_on' },
    { t: 'bus_button_green_on' },
    { t: 'bus_button_blue_on' },
    { t: 'bus_block_red_on' },
    { t: 'bus_block_green_on' },
    { t: 'bus_block_blue_on' },
    { t: 'bus_block_red_off' },
    { t: 'bus_block_green_off' },
    { t: 'bus_block_blue_off' },
  ];

// XXX should look for a rotation trait in spike complex tile or something
export function rotateTile(tile: ComplexTile, amount: number): ComplexTile {
  const dirs = ['spike_up', 'spike_right', 'spike_down', 'spike_left'] as const;
  const spikes: ComplexTile[] = dirs.map(x => ({ t: x }));
  switch (tile.t) {
    case 'spike_up': return spikes[amount];
    default: return tile;
  }
}

export const guiData = {
  background_color: "#b3b099",
  stage_color: "#333333",
};

export const NUM_INVENTORY_ITEMS = 5;
