import { NUM_TILES, TILE_SIZE } from './constants';
import { Point, vdiag, vm, vm2, vmn } from './lib/point';
import { apply, mkSE2, SE2 } from './lib/se2';

/**
 * How many world tiles the play field shows horizontally on a touch
 * device. The vertical count follows from the field's aspect ratio.
 */
export const DEFAULT_TILES_VISIBLE_X = 16;

/**
 * The scale component of a camera at zoom `z`. A world tile covers
 * `TILE_SIZE * z` field pixels, so at zoom 1 the field shows exactly
 * `NUM_TILES` tiles.
 */
export function cameraScaleOfZoom(z: number): Point {
  return vdiag(1 / (TILE_SIZE * z));
}

/** The zoom of a camera, inverse to {@link cameraScaleOfZoom}. */
export function cameraZoomOfWorldFromView(world_from_view: SE2): number {
  return 1 / (TILE_SIZE * world_from_view.scale.x);
}

/**
 * Zoom for a fresh game. A touch device shows
 * `DEFAULT_TILES_VISIBLE_X` tiles across, which is the same amount of
 * level whatever the screen size. Anything else shows the whole field.
 */
export function defaultCameraZoom(): number {
  const coarse = typeof matchMedia == 'function' && matchMedia('(pointer: coarse)').matches;
  return coarse ? NUM_TILES.x / DEFAULT_TILES_VISIBLE_X : 1;
}

/**
 * A camera at zoom `z` that puts `p_in_world` at the center of the
 * play field.
 */
export function centeredWorldFromView(p_in_world: Point, z: number): SE2 {
  return mkSE2(cameraScaleOfZoom(z),
    vm2(p_in_world, NUM_TILES, (p, NT) => p - NT / (2 * z)));
}

/** The most the camera will zoom in. */
export const MAX_CAMERA_ZOOM = 4;

/**
 * The most the camera will zoom out. At a half, a world tile covers
 * half a sprite's worth of pixels and the field shows 48x36 tiles,
 * which is the whole of the largest level.
 */
export const MIN_CAMERA_ZOOM = 0.5;

function clamp1(x: number, lo: number, hi: number): number {
  return Math.min(Math.max(x, lo), hi);
}

/** The world point at the center of the play field. */
export function cameraCenter(world_from_view: SE2): Point {
  return apply(world_from_view, vm(NUM_TILES, NT => NT * TILE_SIZE / 2));
}

/**
 * Keeps a camera within the zoom range, and pointed somewhere that
 * still shows the cell the player is standing in. Everything else is
 * fair game: the view may sit well outside the level's bounds, which is
 * what lets a player look around freely.
 */
export function clampCamera(world_from_view: SE2, p_in_world: Point): SE2 {
  const z = clamp1(cameraZoomOfWorldFromView(world_from_view),
    MIN_CAMERA_ZOOM, MAX_CAMERA_ZOOM);
  // Rebuilding around the center means clamping the zoom does not also
  // slide the view sideways.
  const centered = centeredWorldFromView(cameraCenter(world_from_view), z);
  const visible = vm(NUM_TILES, NT => NT / z);
  // The player's cell spans one tile, so the field's near edge must be
  // at or before it and its far edge at or after it.
  return mkSE2(centered.scale,
    vmn([centered.translate, p_in_world, visible], ([t, p, vis]) =>
      clamp1(t, Math.min(p + 1 - vis, p), Math.max(p + 1 - vis, p))));
}
