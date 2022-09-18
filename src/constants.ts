import { Sprite, Point, Tile, Tool } from './types';

export const FULL_IMPETUS = 4;
export const NUM_TILES = { x: 24, y: 18 };
export const TILE_SIZE = 16;
export const SCALE = 2;

export const FRAME_DURATION_MS = 30;

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
  player_wall: { x: 2, y: 1 },
  up_box: { x: 6, y: 6 },
  spike_up: { x: 0, y: 3 },
  spike_right: { x: 2, y: 3 },
  spike_left: { x: 2, y: 4 },
  spike_down: { x: 2, y: 5 },
  save_point: { x: 2, y: 2 },
  teal_fruit: { x: 3, y: 5 },
  grip_wall: { x: 3, y: 0 },
  player_crouch: { x: 3, y: 6 },
  coin: { x: 3, y: 4 },
  coin_wall: { x: 4, y: 5 },
  hand_tool_inactive: { x: 10, y: 0 },
  hand_tool_active: { x: 10, y: 1 },
  pencil_tool_inactive: { x: 11, y: 0 },
  pencil_tool_active: { x: 11, y: 1 },
  button_on: { x: 5, y: 5 },
  button_off: { x: 5, y: 6 },
  timed_wall: { x: 9, y: 2 },
};

export const tools: Tool[] = [
  'pencil_tool',
  'hand_tool'
]

export const editTiles: Tile[] =
  [
    'box',
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
  ];

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
