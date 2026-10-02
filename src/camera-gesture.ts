import { Point, vdiag, vlerp, vscale, vsub } from './lib/point';
import { composen, inverse, mkSE2, SE2 } from './lib/se2';
import { getCanvasFromView } from './transforms';
import { ViewData } from './view';

/**
 * Where the pointers were, and what the camera was, when a gesture
 * began. Positions are in canvas units.
 */
export type GestureAnchor = {
  points: Point[],
  world_from_view: SE2,
};

/** The smallest finger separation we will divide by, in canvas units. */
const MIN_PINCH_SPAN = 1;

function distance(a: Point, b: Point): number {
  const d = vsub(a, b);
  return Math.sqrt(d.x * d.x + d.y * d.y);
}

/**
 * The similarity taking the pointers at `from` to the pointers at
 * `to`: uniform scale from how far the fingers moved apart, and
 * translation from where their midpoint went. A single pointer only
 * translates.
 */
function similarityOfPointers(from: Point[], to: Point[]): SE2 {
  if (from.length < 2 || to.length < 2)
    return mkSE2(vdiag(1), vsub(to[0], from[0]));
  const span = distance(from[0], from[1]);
  const scale = span < MIN_PINCH_SPAN ? 1 : distance(to[0], to[1]) / span;
  const mid_from = vlerp(from[0], from[1], 0.5);
  const mid_to = vlerp(to[0], to[1], 0.5);
  return mkSE2(vdiag(scale), vsub(mid_to, vscale(mid_from, scale)));
}

/**
 * The camera that results from dragging the pointers of `anchor` to
 * `points`, which is the camera that keeps the world under each pointer
 * under it. The result is unclamped; the reducer decides what is in
 * range.
 */
export function cameraOfGesture(anchor: GestureAnchor, points: Point[], vd: ViewData): SE2 {
  if (points.length == 0 || anchor.points.length == 0)
    return anchor.world_from_view;
  const canvas_from_view = getCanvasFromView(vd);
  const new_canvas_from_canvas = similarityOfPointers(anchor.points, points);
  return composen(
    anchor.world_from_view,
    inverse(canvas_from_view),
    inverse(new_canvas_from_canvas),
    canvas_from_view,
  );
}
