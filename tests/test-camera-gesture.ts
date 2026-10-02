import { cameraOfGesture, GestureAnchor } from '../src/camera-gesture';
import {
  cameraCenter, cameraZoomOfWorldFromView, centeredWorldFromView, clampCamera,
  DEFAULT_TILES_VISIBLE_X, MAX_CAMERA_ZOOM, minCameraZoom
} from '../src/camera';
import { NUM_TILES } from '../src/constants';
import { getBoundRect } from '../src/game-state-access';
import { initMainState } from '../src/init-state';
import { Point } from '../src/lib/point';
import { apply, compose, inverse, SE2 } from '../src/lib/se2';
import { Brect } from '../src/lib/types';
import { getCanvasFromView } from '../src/transforms';
import { ViewData } from '../src/view';

const vd: ViewData = { origin: { x: 100, y: 50 }, wsize: { x: 800, y: 600 }, zoom: 1 };

/** The world point under a canvas point, for a given camera. */
function worldAt(world_from_view: SE2, p_in_canvas: Point): Point {
  return apply(compose(world_from_view, inverse(getCanvasFromView(vd))), p_in_canvas);
}

function anchorAt(points: Point[], zoom = 1): GestureAnchor {
  return { points, world_from_view: centeredWorldFromView({ x: 0, y: 0 }, zoom) };
}

describe('cameraOfGesture', () => {
  it('keeps the world under a dragging finger', () => {
    const from = { x: 300, y: 200 };
    const to = { x: 420, y: 155 };
    const anchor = anchorAt([from]);
    const moved = cameraOfGesture(anchor, [to], vd);
    expect(worldAt(moved, to).x).toBeCloseTo(worldAt(anchor.world_from_view, from).x);
    expect(worldAt(moved, to).y).toBeCloseTo(worldAt(anchor.world_from_view, from).y);
  });

  it('does not change the zoom when one finger drags', () => {
    const anchor = anchorAt([{ x: 300, y: 200 }], 1.5);
    const moved = cameraOfGesture(anchor, [{ x: 150, y: 260 }], vd);
    expect(cameraZoomOfWorldFromView(moved)).toBeCloseTo(1.5);
  });

  it('keeps the world under both fingers of a pinch', () => {
    const from = [{ x: 300, y: 200 }, { x: 400, y: 300 }];
    const to = [{ x: 280, y: 160 }, { x: 480, y: 360 }];
    const anchor = anchorAt(from);
    const moved = cameraOfGesture(anchor, to, vd);
    for (let i = 0; i < 2; i++) {
      const before = worldAt(anchor.world_from_view, from[i]);
      const after = worldAt(moved, to[i]);
      expect(after.x).toBeCloseTo(before.x);
      expect(after.y).toBeCloseTo(before.y);
    }
  });

  it('zooms in by the ratio the fingers moved apart', () => {
    const from = [{ x: 300, y: 300 }, { x: 400, y: 300 }];
    // Same midpoint, twice the separation.
    const to = [{ x: 250, y: 300 }, { x: 450, y: 300 }];
    const moved = cameraOfGesture(anchorAt(from), to, vd);
    expect(cameraZoomOfWorldFromView(moved)).toBeCloseTo(2);
  });

  it('zooms out by the ratio the fingers moved together', () => {
    const from = [{ x: 250, y: 300 }, { x: 450, y: 300 }];
    const to = [{ x: 300, y: 300 }, { x: 400, y: 300 }];
    const moved = cameraOfGesture(anchorAt(from, 2), to, vd);
    expect(cameraZoomOfWorldFromView(moved)).toBeCloseTo(1);
  });

  it('survives two fingers landing on the same spot', () => {
    const same = { x: 300, y: 300 };
    const moved = cameraOfGesture(anchorAt([same, same]), [same, same], vd);
    expect(cameraZoomOfWorldFromView(moved)).toBeCloseTo(1);
  });

  it('is the identity when nothing moved', () => {
    const anchor = anchorAt([{ x: 300, y: 200 }, { x: 400, y: 300 }]);
    const moved = cameraOfGesture(anchor, anchor.points, vd);
    expect(moved.scale.x).toBeCloseTo(anchor.world_from_view.scale.x);
    expect(moved.translate.x).toBeCloseTo(anchor.world_from_view.translate.x);
    expect(moved.translate.y).toBeCloseTo(anchor.world_from_view.translate.y);
  });
});

/** A level wider and taller than the field shows at zoom 1. */
const bigLevel: Brect = { min: { x: -30, y: -30 }, max: { x: 30, y: 30 } };
/** A level that fits inside the field several times over. */
const smallLevel: Brect = { min: { x: 0, y: 0 }, max: { x: 8, y: 5 } };

describe('clampCamera', () => {
  it('leaves a camera in range alone', () => {
    const cam = centeredWorldFromView({ x: 0, y: 0 }, 2);
    expect(clampCamera(cam, bigLevel)).toEqual(cam);
  });

  it('refuses to zoom in past the maximum', () => {
    const clamped = clampCamera(centeredWorldFromView({ x: 0, y: 0 }, 50), bigLevel);
    expect(cameraZoomOfWorldFromView(clamped)).toBeCloseTo(MAX_CAMERA_ZOOM);
  });

  it('zooms out no further than the whole field on a small level', () => {
    expect(minCameraZoom(smallLevel)).toBe(1);
    const clamped = clampCamera(centeredWorldFromView({ x: 4, y: 2 }, 0.1), smallLevel);
    expect(cameraZoomOfWorldFromView(clamped)).toBeCloseTo(1);
  });

  it('zooms out far enough to frame a level bigger than the field', () => {
    expect(minCameraZoom(bigLevel)).toBeCloseTo(NUM_TILES.y / 60);
    const clamped = clampCamera(centeredWorldFromView({ x: 0, y: 0 }, 0.01), bigLevel);
    expect(cameraZoomOfWorldFromView(clamped)).toBeCloseTo(NUM_TILES.y / 60);
  });

  it('keeps the zoom centered where it was when it clamps', () => {
    const center = { x: 7, y: -3 };
    const clamped = clampCamera(centeredWorldFromView(center, 50), bigLevel);
    // Zoom clamping must not slide the view, only scale it.
    const visible = NUM_TILES.x / MAX_CAMERA_ZOOM;
    expect(clamped.translate.x).toBeCloseTo(center.x - visible / 2);
  });

  it('will not let a big level be panned off screen', () => {
    const clamped = clampCamera(centeredWorldFromView({ x: 1000, y: 1000 }, 2), bigLevel);
    const visible = { x: NUM_TILES.x / 2, y: NUM_TILES.y / 2 };
    // The far edge of the view stops two tiles past the level bounds.
    expect(clamped.translate.x + visible.x).toBeCloseTo(bigLevel.max.x + 2);
    expect(clamped.translate.y + visible.y).toBeCloseTo(bigLevel.max.y + 2);
  });

  it('keeps a level smaller than the view fully visible', () => {
    for (const center of [{ x: 900, y: -900 }, { x: -50, y: 50 }, { x: 4, y: 2 }]) {
      const cam = clampCamera(centeredWorldFromView(center, 1), smallLevel);
      expect(cam.translate.x).toBeLessThanOrEqual(smallLevel.min.x);
      expect(cam.translate.y).toBeLessThanOrEqual(smallLevel.min.y);
      expect(cam.translate.x + NUM_TILES.x).toBeGreaterThanOrEqual(smallLevel.max.x);
      expect(cam.translate.y + NUM_TILES.y).toBeGreaterThanOrEqual(smallLevel.max.y);
    }
  });

  it('leaves the camera the game starts with alone', () => {
    // The clamp first runs on the first touch, which must not jolt the
    // view out from under the player.
    const bounds = getBoundRect(initMainState.game);
    for (const zoom of [1, NUM_TILES.x / DEFAULT_TILES_VISIBLE_X]) {
      const cam = centeredWorldFromView(
        cameraCenter(initMainState.iface.world_from_view), zoom);
      expect(clampCamera(cam, bounds)).toEqual(cam);
    }
  });
});
