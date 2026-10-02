import { NUM_TILES, TILE_SIZE } from './constants';
import { Point, vdiag, vm2 } from './lib/point';
import { mkSE2, SE2 } from './lib/se2';

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
