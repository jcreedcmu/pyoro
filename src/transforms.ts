import { SCALE, TILE_SIZE } from './constants';
import { vdiag } from './lib/point';
import { compose, inverse, mkSE2, SE2 } from './lib/se2';
import { IfaceState } from './state';
import { ViewData } from './view';

export function getWorldFromView(state: IfaceState): SE2 {
  return state.world_from_view;
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
