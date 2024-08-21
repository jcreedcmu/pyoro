import { Point } from "./lib/point";

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
  | { t: 'bus_button', bus: Bus }
  | { t: 'bus_block', bus: Bus }
  ;

/**
 * A tile that links to another level
 */
export type DoorDynamicTile =
  | { t: 'door', destinationLevel: string }
  ;

export type BlockMotion = 'up' | 'down' | 'left' | 'right';

/**
 * A tile that is only passable when player motion is a certain direction
 */
export type MotionDynamicTile =
  | { t: 'motion', direction: BlockMotion }
  ;

/**
 * A `DynamicTile` represents an "intension" that can resolve to an
 * actual tile via {@link layer.getTileOfDynamicLayer}. This means the
 * tile's effective realization, its "extension", changes dynamically
 * due to the passage of time, or due to other changes in the level.
 */
export type DynamicTile =
  | { t: 'static', tile: Tile }
  | TimedBlockDynamicTile
  | ButtonedBlockDynamicTile
  | BusControlledDynamicTile
  | DoorDynamicTile
  | MotionDynamicTile
  ;

export type Direction =
  | 'up'
  | 'left'
  | 'right'
  | 'down'
  ;

/**
 * A tile whose physics and rendering are known.
 */
export type Tile =
  /** A plain box */
  | { t: 'box' }
  /** A box with grass on it */
  | { t: 'box3' }
  /** Stone texture */
  | { t: 'stone' }
  /** A box that disappears if you walk on it */
  | { t: 'fragile_box' }
  | { t: 'empty' }
  | { t: 'broken_box' }
  | { t: 'up_box' }
  | { t: 'spike', direction: Direction }
  | { t: 'item', item: Item }
  | { t: 'save_point' }
  | { t: 'grip_wall' }
  | { t: 'coin_wall' }
  | { t: 'button_on' }
  | { t: 'button_off' }
  | { t: 'timed_wall' }
  | { t: 'buttoned_wall' }
  | { t: 'bus_block', bus: Bus, on: boolean }
  | { t: 'bus_button', bus: Bus, on: boolean }
  | { t: 'motion_block', direction: BlockMotion, on: boolean }
  | { t: 'door', destinationLevel: string }
  | { t: 'side_breakable' }
  | { t: 'movable' }
  | { t: 'ladder' }
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
  | 'player_run'
  ;

/** Level editor tool choice. */
export type Tool =
  | 'play_tool'
  | 'hand_tool'
  | 'pencil_tool'
  | 'modify_tool'
  | 'test_tool'
  ;

/** A state of a tool button in the editor UI. */
export type ToolTile =
  | `${Tool}_inactive`
  | `${Tool}_active`
  ;
