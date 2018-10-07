export type Dict<T> = { [k: string]: T };
export type Point = { x: number, y: number };
export type Rect = { p: Point, w: number, h: number };
export type Ctx = CanvasRenderingContext2D;
export type Tile =
  | 'box'
  | 'box3'
  | 'fragile_box'
  | 'empty'
  | 'broken_box'
  | 'up_box'
  | 'spike_up'
  | 'save_point';
export type MotiveMove =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'up-left'
  | 'up-right';
export type Move =
  | MotiveMove
  | 'reset'
  | 'recenter';
export type Facing =
  | 'left'
  | 'right';
export type PlayerSprite =
  | 'player'
  | 'player_fall'
  | 'player_rise'
  | 'player_dead';
export type Sprite =
  | Tile
  | PlayerSprite;
