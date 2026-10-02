import {
  cameraScaleOfZoom, cameraZoomOfWorldFromView, centeredWorldFromView,
  DEFAULT_TILES_VISIBLE_X, defaultCameraZoom
} from '../src/camera';
import { NUM_TILES, TILE_SIZE } from '../src/constants';
import { Point } from '../src/lib/point';
import { apply, inverse, SE2 } from '../src/lib/se2';

/** How many world tiles the field shows, given a camera. */
function tilesVisible(world_from_view: SE2): Point {
  const corner = apply(world_from_view, { x: 0, y: 0 });
  const far = apply(world_from_view,
    { x: NUM_TILES.x * TILE_SIZE, y: NUM_TILES.y * TILE_SIZE });
  return { x: far.x - corner.x, y: far.y - corner.y };
}

/** The world point at the center of the field, given a camera. */
function centerInWorld(world_from_view: SE2): Point {
  return apply(world_from_view,
    { x: NUM_TILES.x * TILE_SIZE / 2, y: NUM_TILES.y * TILE_SIZE / 2 });
}

describe('camera zoom', () => {
  it('shows the whole field at zoom 1', () => {
    expect(cameraScaleOfZoom(1)).toEqual({ x: 1 / TILE_SIZE, y: 1 / TILE_SIZE });
    expect(tilesVisible(centeredWorldFromView({ x: 0, y: 0 }, 1))).toEqual(NUM_TILES);
  });

  it('shows proportionally fewer tiles as it zooms in', () => {
    const z = NUM_TILES.x / DEFAULT_TILES_VISIBLE_X;
    const visible = tilesVisible(centeredWorldFromView({ x: 0, y: 0 }, z));
    expect(visible.x).toBeCloseTo(DEFAULT_TILES_VISIBLE_X);
    expect(visible.y).toBeCloseTo(NUM_TILES.y / z);
  });

  it('round trips through the camera scale', () => {
    for (const z of [0.5, 1, 1.5, 2, 2.7, 4]) {
      expect(cameraZoomOfWorldFromView(centeredWorldFromView({ x: 3, y: -4 }, z)))
        .toBeCloseTo(z);
    }
  });

  it('centers on the given world point at any zoom', () => {
    const p = { x: 7, y: -2 };
    for (const z of [0.5, 1, 1.5, 2, 2.7, 4]) {
      const center = centerInWorld(centeredWorldFromView(p, z));
      expect(center.x).toBeCloseTo(p.x);
      expect(center.y).toBeCloseTo(p.y);
    }
  });

  it('agrees with the transform the game shipped with at zoom 1', () => {
    // Field pixels to world tiles, with the field's top left corner at
    // the world point the view is centered on, minus half the field.
    expect(centeredWorldFromView({ x: -1, y: 0 }, 1)).toEqual({
      scale: { x: 1 / TILE_SIZE, y: 1 / TILE_SIZE },
      translate: { x: -13, y: -9 },
    });
  });

  it('defaults to the whole field without a coarse pointer', () => {
    expect(defaultCameraZoom()).toBe(1);
  });

  it('places field pixels where the inverse camera says', () => {
    const cam = centeredWorldFromView({ x: 0, y: 0 }, 1.5);
    const view_from_world = inverse(cam);
    // One world tile covers TILE_SIZE * z field pixels.
    const a = apply(view_from_world, { x: 0, y: 0 });
    const b = apply(view_from_world, { x: 1, y: 1 });
    expect(b.x - a.x).toBeCloseTo(TILE_SIZE * 1.5);
    expect(b.y - a.y).toBeCloseTo(TILE_SIZE * 1.5);
  });
});
