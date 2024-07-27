/** A string-keyed dictionary whose values are `T` */
export type Dict<T> = { [k: string]: T };

/** A point in a 2d space. */
export type Point = { x: number, y: number };

/** A color in the RGB colorspace, where the components are in [0,255]. */
export type Color = { r: number, g: number, b: number };

/** A rectangle given by its offset and size. */
export type Rect = { p: Point, sz: Point };

/** An object in the game world that can be picked up. */
export type Item =
  | 'teal_fruit'
  | 'coin'
  ;

/**
 * A tile that cycles through being present and absent.
 */
export type TimedBlockDynamicTile =
  { t: 'timed', phase: number, on_for: number, off_for: number };

/**
 * A tile whose presence is conditional on a button being pushed.
 */
export type ButtonedBlockDynamicTile =
  { t: 'buttoned', button_source: Point };

export type Bus = 'red' | 'green' | 'blue';

/**
 * A tile whose presence is conditional on a bus being active
 */
export type BusControlledDynamicTile =
  { t: 'bus_controlled', bus: Bus };

/**
 * A `DynamicTile` represents an "intension" that can resolve to an
 * actual tile via {@link layer.getTileOfDynamicLayer}. This means the
 * tile's effective realization, its "extension", changes dynamically
 * due to the passage of time, or due to other changes in the level.
 */
export type DynamicTile =
  | { t: 'static', tile: ComplexTile }
  | TimedBlockDynamicTile
  | ButtonedBlockDynamicTile
  | BusControlledDynamicTile
  ;

/**
 * A tile whose physics and rendering are known.
 * XXX rename to Tile, check code for other occurrences of 'complex'
 */
export type ComplexTile =
  /** A plain box */
  | { t: 'box' }
  /** A box with grass on it */
  | { t: 'box3' }
  /** A box that disappears if you walk on it */
  | { t: 'fragile_box' }
  | { t: 'empty' }
  | { t: 'broken_box' }
  | { t: 'up_box' }
  | { t: 'spike_up' }
  | { t: 'spike_left' }
  | { t: 'spike_right' }
  | { t: 'spike_down' }
  | { t: 'item', item: Item }
  | { t: 'save_point' }
  | { t: 'grip_wall' }
  | { t: 'coin_wall' }
  | { t: 'button_on' }
  | { t: 'button_off' }
  | { t: 'timed_wall' }
  | { t: 'buttoned_wall' }
  | { t: `bus_block_${Bus}_on` }
  | { t: `bus_block_${Bus}_off` }
  | { t: `bus_button_${Bus}_on` }
  | { t: `bus_button_${Bus}_off` }
  ;


/** A player move that entails an intention to move in a certain
 * physical direction. */
export type MotiveMove =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'up-left'
  | 'up-right'
  ;

/** A more general move than {@link MotiveMove} which includes
 * resetting the level or other UI actions. */
export type Move =
  | MotiveMove
  | 'reset'
  | 'recenter'
  ;

/** A direction the player can be facing. */
export type Facing =
  | 'left'
  | 'right'
  ;

/** What state the player is in, in terms of which player sprite should
 * be drawn. */
export type PlayerSprite =
  | 'player'
  | 'player_fall'
  | 'player_rise'
  | 'player_wall'
  | 'player_dead'
  | 'player_crouch'
  ;

/** Level editor tool choice. */
export type Tool =
  | 'play_tool'
  | 'hand_tool'
  | 'pencil_tool'
  | 'modify_tool'
  ;

/** A state of a tool button in the editor UI. */
export type ToolTile =
  | `${Tool}_inactive`
  | `${Tool}_active`
  ;

/** Any entity that maps onto a particular place in the sprite sheet. */
/* XXX deprecated? */
export type Sprite =
  | PlayerSprite
  | ToolTile
  ;
