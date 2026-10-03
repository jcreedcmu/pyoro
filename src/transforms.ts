import { NUM_TILES, SCALE, TILE_SIZE } from './constants';
import { Point, vdiag, vlerp, vm } from './lib/point';
import { compose, inverse, mkSE2, SE2 } from './lib/se2';
import { IfaceState } from './state';
import { lerp } from './util';
import { ViewData } from './view';

export function getWorldFromView(state: IfaceState): SE2 {
  return state.world_from_view;
}

/**
 * How many world tiles across the play field is, at camera zoom 1. The
 * field covers the whole canvas on a touch device, so this depends on
 * the shape of the window; before there is a canvas to go by, the
 * nominal `NUM_TILES` stands in.
 */
export function getFieldTiles(vd: ViewData | null): Point {
  return vd == null ? NUM_TILES : vm(vd.fsize, s => s / TILE_SIZE);
}

export function getWorldFromViewTiles(state: IfaceState): SE2 {
  return compose(state.world_from_view, mkSE2(vdiag(TILE_SIZE), vdiag(0)));
}

export function getCanvasFromView(vd: ViewData): SE2 {
  return mkSE2(vdiag(SCALE), vd.origin);
}

export function getCanvasFromWorld(vd: ViewData, iface: IfaceState): SE2 {
  return compose(getCanvasFromView(vd), inverse(getWorldFromView(iface)));
}

export function getWorldFromCanvas(vd: ViewData, iface: IfaceState): SE2 {
  return compose(getWorldFromView(iface), inverse(getCanvasFromView(vd)));
}

/**
 * Linearly interpolates between two transforms, scale as well as
 * translation, for a time parameter t in [0,1].
 */
export function lerpSE2(a: SE2, b: SE2, t: number): SE2 {
  return mkSE2(vlerp(a.scale, b.scale, t), vlerp(a.translate, b.translate, t));
}
