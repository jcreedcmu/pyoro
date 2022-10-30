export type Dict<T> = { [k: string]: T };
export type Point = { x: number, y: number };
export type Color = { r: number, g: number, b: number };
export type BadRect = { p: Point, w: number, h: number };
export type Rect = { p: Point, sz: Point };
export type Ctx = CanvasRenderingContext2D;


export type Item =
  | 'teal_fruit'
  | 'coin'
  ;

export type TimedBlockComplexTile =
  { t: 'timed', phase: number, on_for: number, off_for: number };

export type ButtonedBlockComplexTile =
  { t: 'buttoned', button_source: Point };

export type ComplexTile =
  | { t: 'simple', tile: Tile }
  | TimedBlockComplexTile
  | ButtonedBlockComplexTile
  ;

export type Tile =
  | 'box'
  | 'box3'
  | 'fragile_box'
  | 'empty'
  | 'broken_box'
  | 'up_box'
  | 'spike_up'
  | 'spike_left'
  | 'spike_right'
  | 'spike_down'
  | 'save_point'
  | 'grip_wall'
  | 'coin_wall'
  | 'button_on'
  | 'button_off'
  | 'timed_wall'
  | 'buttoned_wall'
  | Item
  ;
export type MotiveMove =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'up-left'
  | 'up-right'
  ;
export type Move =
  | MotiveMove
  | 'reset'
  | 'recenter'
  ;
export type Facing =
  | 'left'
  | 'right'
  ;
export type PlayerSprite =
  | 'player'
  | 'player_fall'
  | 'player_rise'
  | 'player_wall'
  | 'player_dead'
  | 'player_crouch'
  ;

export type Tool =
  | 'play_tool'
  | 'hand_tool'
  | 'pencil_tool'
  | 'modify_tool'
  ;

export type ToolTile =
  | `${Tool}_inactive`
  | `${Tool}_active`
  ;

export type Sprite =
  | Tile
  | PlayerSprite
  | ToolTile
  ;
