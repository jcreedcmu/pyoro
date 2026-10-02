import { NUM_TILES, TILE_SIZE } from './constants';
import { Point, vdiag, vm, vm2, vmn, vsub } from './lib/point';
import { apply, mkSE2, SE2 } from './lib/se2';
import { Brect } from './lib/types';

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

/** How far past the level's bounds the view may be panned, in tiles. */
const PAN_MARGIN_TILES = 2;

function clamp1(x: number, lo: number, hi: number): number {
  return Math.min(Math.max(x, lo), hi);
}

/** The world point at the center of the play field. */
export function cameraCenter(world_from_view: SE2): Point {
  return apply(world_from_view, vm(NUM_TILES, NT => NT * TILE_SIZE / 2));
}

/**
 * The least the camera will zoom out: far enough to see the whole play
 * field, or the whole level when the level is bigger than the field.
 */
export function minCameraZoom(bounds: Brect): number {
  const size = vsub(bounds.max, bounds.min);
  return Math.min(1,
    NUM_TILES.x / Math.max(1, size.x),
    NUM_TILES.y / Math.max(1, size.y));
}

/**
 * Keeps a camera within the zoom range and pointed at the level. The
 * view stays inside the level's bounds, or contains them outright on an
 * axis where the level is smaller than what the view shows, so the
 * level can never be panned off screen either way.
 */
export function clampCamera(world_from_view: SE2, bounds: Brect): SE2 {
  const z = clamp1(cameraZoomOfWorldFromView(world_from_view),
    minCameraZoom(bounds), MAX_CAMERA_ZOOM);
  // Rebuilding around the center means clamping the zoom does not also
  // slide the view sideways.
  const centered = centeredWorldFromView(cameraCenter(world_from_view), z);
  const visible = vm(NUM_TILES, NT => NT / z);
  const lo = vm(bounds.min, v => v - PAN_MARGIN_TILES);
  const hi = vm(bounds.max, v => v + PAN_MARGIN_TILES);
  return mkSE2(centered.scale,
    vmn([centered.translate, lo, hi, visible], ([t, lo, hi, vis]) =>
      clamp1(t, Math.min(lo, hi - vis), Math.max(lo, hi - vis))));
}
