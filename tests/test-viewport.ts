import { produce } from 'immer';
import { applyIfaceAnimation } from '../src/animation';
import { cameraZoomOfWorldFromView, centeredWorldFromView, defaultCameraZoom } from '../src/camera';
import { NUM_TILES } from '../src/constants';
import { initMainState } from '../src/init-state';
import { Point, vplus } from '../src/lib/point';
import { apply, inverse, mkSE2 } from '../src/lib/se2';
import { animateViewPort } from '../src/model';
import { MainState } from '../src/state';
import { getWorldFromViewTiles, lerpSE2 } from '../src/transforms';

const EPSILON = 1e-9;

/** A state whose view is centered on `center` at `zoom`. */
function stateAt(center: Point, zoom: number): MainState {
  return produce(initMainState, s => {
    s.iface.world_from_view = centeredWorldFromView(center, zoom, NUM_TILES);
  });
}

/** Where a world point sits in view tiles, for a given state. */
function inViewTiles(s: MainState, p_in_world: Point): Point {
  return apply(inverse(getWorldFromViewTiles(s.iface)), p_in_world);
}

/** The camera delta animateViewPort asks for, zero if it asks for none. */
function correction(s: MainState, playerPos: Point): Point {
  const anims = animateViewPort(s, 'right', playerPos);
  if (anims.length == 0)
    return { x: 0, y: 0 };
  // One animation carries both axes; they used to be emitted separately.
  expect(anims.length).toBe(1);
  const a = anims[0];
  if (a.t != 'ViewPortAnimation')
    throw new Error(`expected a ViewPortAnimation, got ${a.t}`);
  return a.dpos_in_world;
}

/** The state after the correction for `playerPos` has run to completion. */
function corrected(s: MainState, playerPos: Point): MainState {
  const dpos = correction(s, playerPos);
  return produce(s, s => {
    s.iface.world_from_view = mkSE2(s.iface.world_from_view.scale,
      vplus(s.iface.world_from_view.translate, dpos));
  });
}

describe('animateViewPort', () => {
  it('leaves the camera alone while the player is clear of the edge', () => {
    const s = stateAt({ x: 0, y: 0 }, 1);
    expect(correction(s, { x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
    expect(correction(s, { x: 5, y: 3 })).toEqual({ x: 0, y: 0 });
    expect(animateViewPort(s, 'right', { x: 0, y: 0 })).toEqual([]);
  });

  it('asks for nothing when the player is not moving anywhere', () => {
    expect(animateViewPort(stateAt({ x: 0, y: 0 }, 1), 'recenter', undefined)).toEqual([]);
  });

  it('scrolls exactly one tile when the player walks into the edge', () => {
    const s = stateAt({ x: 0, y: 0 }, 1);
    // At zoom 1 centered on the origin, the field spans world x -12..12.
    expect(inViewTiles(s, { x: 11, y: 0 }).x).toBe(NUM_TILES.x - 1);
    expect(correction(s, { x: 11, y: 0 })).toEqual({ x: 1, y: 0 });
    expect(correction(s, { x: -12, y: 0 })).toEqual({ x: -1, y: 0 });
    expect(correction(s, { x: 0, y: 8 })).toEqual({ x: 0, y: 1 });
    expect(correction(s, { x: 0, y: -9 })).toEqual({ x: 0, y: -1 });
  });

  it('corrects both axes in one animation', () => {
    const s = stateAt({ x: 0, y: 0 }, 1);
    expect(correction(s, { x: 11, y: 8 })).toEqual({ x: 1, y: 1 });
  });

  it('brings the player back after the view has been panned away', () => {
    const s = stateAt({ x: 0, y: 0 }, 1);
    // 40 tiles off to the right is far outside the field.
    expect(correction(s, { x: 40, y: 0 }).x).toBeCloseTo(29);
    expect(inViewTiles(corrected(s, { x: 40, y: 0 }), { x: 40, y: 0 }).x)
      .toBeCloseTo(NUM_TILES.x - 1);
  });

  it('leaves the player inside the margin at any zoom', () => {
    for (const zoom of [0.5, 1, 1.5, 2, 3]) {
      for (const player of [
        { x: 0, y: 0 }, { x: 20, y: 0 }, { x: -20, y: 0 },
        { x: 0, y: 20 }, { x: 0, y: -20 }, { x: 31, y: -17 },
      ]) {
        const after = inViewTiles(corrected(stateAt({ x: 0, y: 0 }, zoom), player), player);
        // The correction lands the player right on the margin, so
        // compare with a little slack for floating point.
        expect(after.x).toBeGreaterThan(1 - EPSILON);
        expect(after.x).toBeLessThan(NUM_TILES.x - 1 + EPSILON);
        expect(after.y).toBeGreaterThan(1 - EPSILON);
        expect(after.y).toBeLessThan(NUM_TILES.y - 1 + EPSILON);
      }
    }
  });

  it('measures its correction in world tiles, not view tiles', () => {
    /** The player position one view tile past the margin, at `zoom`. */
    function oneTilePast(zoom: number): Point {
      const s = stateAt({ x: 0, y: 0 }, zoom);
      return { x: s.iface.world_from_view.translate.x + NUM_TILES.x / zoom, y: 0 };
    }
    // Zoomed out, a view tile is more than a world tile, so the same
    // overshoot on screen asks for a bigger move through the world.
    expect(correction(stateAt({ x: 0, y: 0 }, 0.5), oneTilePast(0.5)).x).toBeCloseTo(2);
    // Zoomed in it asks for less than a tile, and the floor takes over.
    expect(correction(stateAt({ x: 0, y: 0 }, 2), oneTilePast(2)).x).toBeCloseTo(1);
  });
});

describe('RecenterAnimation', () => {
  it('centers the player and restores the default zoom', () => {
    const s = produce(stateAt({ x: 9, y: -6 }, 3), s => {
      s.game.player.pos = { x: 2, y: 1 };
    });
    const iface = applyIfaceAnimation({ t: 'RecenterAnimation' }, s, 'complete');
    expect(cameraZoomOfWorldFromView(iface.world_from_view))
      .toBeCloseTo(defaultCameraZoom());
    const center = apply(iface.world_from_view,
      { x: NUM_TILES.x * 16 / 2, y: NUM_TILES.y * 16 / 2 });
    expect(center.x).toBeCloseTo(2);
    expect(center.y).toBeCloseTo(1);
  });

  it('is partway there partway through', () => {
    const s = produce(stateAt({ x: 9, y: -6 }, 3), s => {
      s.game.player.pos = { x: 2, y: 1 };
    });
    const iface = applyIfaceAnimation({ t: 'RecenterAnimation' }, s, 2);
    const zoom = cameraZoomOfWorldFromView(iface.world_from_view);
    expect(zoom).toBeLessThan(3);
    expect(zoom).toBeGreaterThan(defaultCameraZoom());
  });
});

describe('lerpSE2', () => {
  it('interpolates scale as well as translation', () => {
    const a = mkSE2({ x: 1, y: 1 }, { x: 0, y: 0 });
    const b = mkSE2({ x: 3, y: 5 }, { x: 10, y: -10 });
    expect(lerpSE2(a, b, 0)).toEqual(a);
    expect(lerpSE2(a, b, 1)).toEqual(b);
    expect(lerpSE2(a, b, 0.5)).toEqual(mkSE2({ x: 2, y: 3 }, { x: 5, y: -5 }));
  });
});
