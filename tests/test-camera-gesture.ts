import { cameraOfGesture, GestureAnchor } from '../src/camera-gesture';
import {
  cameraCenter, cameraZoomOfWorldFromView, centeredWorldFromView, clampCamera,
  DEFAULT_TILES_VISIBLE_X, MAX_CAMERA_ZOOM, MIN_CAMERA_ZOOM
} from '../src/camera';
import { NUM_TILES } from '../src/constants';
import { initMainState } from '../src/init-state';
import { Point } from '../src/lib/point';
import { apply, compose, inverse, SE2 } from '../src/lib/se2';
import { getCanvasFromView } from '../src/transforms';
import { ViewData } from '../src/view';

const vd: ViewData = {
  origin: { x: 100, y: 50 }, wsize: { x: 800, y: 600 },
  fsize: { x: NUM_TILES.x * 16, y: NUM_TILES.y * 16 }, zoom: 1,
  clientOrigin: { x: 0, y: 0 },
};

/** The nominal field, which is what these tests frame things against. */
const FIELD = NUM_TILES;

/** The world point under a canvas point, for a given camera. */
function worldAt(world_from_view: SE2, p_in_canvas: Point): Point {
  return apply(compose(world_from_view, inverse(getCanvasFromView(vd))), p_in_canvas);
}

function anchorAt(points: Point[], zoom = 1): GestureAnchor {
  return { points, world_from_view: centeredWorldFromView({ x: 0, y: 0 }, zoom, FIELD) };
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

/** The world rect the field shows, for a given camera. */
function visibleRect(world_from_view: SE2): { min: Point, max: Point } {
  const min = apply(world_from_view, { x: 0, y: 0 });
  const max = apply(world_from_view,
    { x: NUM_TILES.x * 16, y: NUM_TILES.y * 16 });
  return { min, max };
}

/** Whether the field shows all of the cell at `p`. */
function showsCell(world_from_view: SE2, p: Point): boolean {
  const { min, max } = visibleRect(world_from_view);
  return min.x <= p.x && min.y <= p.y && max.x >= p.x + 1 && max.y >= p.y + 1;
}

describe('clampCamera', () => {
  const player = { x: 0, y: 0 };

  it('leaves a camera in range alone', () => {
    const cam = centeredWorldFromView({ x: 0, y: 0 }, 2, FIELD);
    expect(clampCamera(cam, player, FIELD)).toEqual(cam);
  });

  it('refuses to zoom in past the maximum', () => {
    const clamped = clampCamera(centeredWorldFromView(player, 50, FIELD), player, FIELD);
    expect(cameraZoomOfWorldFromView(clamped)).toBeCloseTo(MAX_CAMERA_ZOOM);
  });

  it('refuses to zoom out past the minimum', () => {
    const clamped = clampCamera(centeredWorldFromView(player, 0.01, FIELD), player, FIELD);
    expect(cameraZoomOfWorldFromView(clamped)).toBeCloseTo(MIN_CAMERA_ZOOM);
  });

  it('keeps the zoom centered where it was when it clamps', () => {
    const center = { x: 7, y: -3 };
    const clamped = clampCamera(
      centeredWorldFromView(center, 50, FIELD), { x: 7, y: -3 }, FIELD);
    // Zoom clamping must not slide the view, only scale it.
    const visible = NUM_TILES.x / MAX_CAMERA_ZOOM;
    expect(clamped.translate.x).toBeCloseTo(center.x - visible / 2);
  });

  it('does not care where the level is, only where the player is', () => {
    // The view sits ten tiles off from anything the start level
    // contains, which is allowed because the player is still shown.
    const cam = centeredWorldFromView({ x: 10, y: 6 }, 1, FIELD);
    expect(showsCell(cam, player)).toBe(true);
    expect(clampCamera(cam, player, FIELD)).toEqual(cam);
  });

  it('keeps the player on screen however far the view is panned', () => {
    for (const zoom of [MIN_CAMERA_ZOOM, 1, 1.5, 2, MAX_CAMERA_ZOOM]) {
      for (const center of [
        { x: 900, y: 0 }, { x: -900, y: 0 }, { x: 0, y: 900 },
        { x: 0, y: -900 }, { x: 40, y: -40 },
      ]) {
        const clamped = clampCamera(centeredWorldFromView(center, zoom, FIELD), player, FIELD);
        expect(showsCell(clamped, player)).toBe(true);
      }
    }
  });

  it('stops exactly at the edge, not a tile short of it', () => {
    // Panned hard to the right, the player's cell ends up flush against
    // the left edge of the field.
    const clamped = clampCamera(centeredWorldFromView({ x: 900, y: 0 }, 1, FIELD), player, FIELD);
    expect(clamped.translate.x).toBeCloseTo(player.x);
  });

  it('follows the player rather than the level', () => {
    const cam = centeredWorldFromView({ x: 0, y: 0 }, MAX_CAMERA_ZOOM, FIELD);
    // A player far outside the view drags it along to stay visible.
    const far = { x: 30, y: 20 };
    expect(showsCell(clampCamera(cam, far, FIELD), far)).toBe(true);
  });

  it('leaves the camera the game starts with alone', () => {
    // The clamp first runs on the first touch, which must not jolt the
    // view out from under the player.
    const pos = initMainState.game.player.pos;
    for (const zoom of [1, NUM_TILES.x / DEFAULT_TILES_VISIBLE_X]) {
      const cam = centeredWorldFromView(
        cameraCenter(initMainState.iface.world_from_view, FIELD), zoom, FIELD);
      expect(clampCamera(cam, pos, FIELD)).toEqual(cam);
    }
  });
});
