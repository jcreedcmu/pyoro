import { SCALE } from './constants';
import { vdiag } from './lib/point';
import { compose, inverse, mkSE2, SE2 } from './lib/se2';
import { IfaceState } from './state';
import { FView, ViewData } from './view';

export function getWorldFromView(state: IfaceState): SE2 {
  return state.world_from_view;
}

export function getCanvasFromView(fv: FView): SE2 {
  return mkSE2(vdiag(SCALE), fv.vd.origin);
}

export function getCanvasFromView_data(vd: ViewData): SE2 {
  return mkSE2(vdiag(SCALE), vd.origin);
}

// XXX Deprecate
export function getCanvasFromWorld(fv: FView, iface: IfaceState): SE2 {
  return compose(getCanvasFromView(fv), inverse(getWorldFromView(iface)));
}

export function getWorldFromCanvas(vd: ViewData, iface: IfaceState): SE2 {
  return compose(getWorldFromView(iface), inverse(getCanvasFromView_data(vd)));
}
