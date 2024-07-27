import { boxTile, complexOfSimple } from './layer';
import { Sprite, Point, Tile, Tool, ComplexTile } from './types';

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
    complexOfSimple('grip_wall'),
    { t: 'box3' },
    { t: 'up_box' },
    { t: 'fragile_box' },
    { t: 'spike_up' },
    complexOfSimple('save_point'),
    { t: 'item', item: 'teal_fruit' },
    { t: 'item', item: 'coin' },
    complexOfSimple('coin_wall'),
    complexOfSimple('button_on'),
    complexOfSimple('button_off'),
    complexOfSimple('timed_wall'),
    complexOfSimple('buttoned_wall'),
    complexOfSimple('bus_button_red_on'),
    complexOfSimple('bus_button_green_on'),
    complexOfSimple('bus_button_blue_on'),
    complexOfSimple('bus_block_red_on'),
    complexOfSimple('bus_block_green_on'),
    complexOfSimple('bus_block_blue_on'),
    complexOfSimple('bus_block_red_off'),
    complexOfSimple('bus_block_green_off'),
    complexOfSimple('bus_block_blue_off'),
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
