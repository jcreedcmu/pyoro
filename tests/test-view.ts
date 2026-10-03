import { NUM_TILES, SCALE, TILE_SIZE } from '../src/constants';
import { Point } from '../src/lib/point';
import { Rect } from '../src/lib/types';
import { canvasPointOfClientPoint, fieldRectInCss, resizeView, ViewData } from '../src/view';

const FIELD_UNITS = {
  x: NUM_TILES.x * TILE_SIZE * SCALE,
  y: NUM_TILES.y * TILE_SIZE * SCALE,
};

function fakeCanvas(): HTMLCanvasElement {
  return { width: 0, height: 0, style: {} } as unknown as HTMLCanvasElement;
}

/**
 * Runs resizeView for a canvas occupying `box` in the window. The
 * canvas is the whole of what the play field has to work with, so this
 * is the only geometry it is given.
 */
function resizeIn(box: Rect, ratio: number, fill = false):
  { vd: ViewData, c: HTMLCanvasElement } {
  (globalThis as any).devicePixelRatio = ratio;
  const c = fakeCanvas();
  return { vd: resizeView(c, box, fill), c };
}

/** A canvas of the given size at the top left of the window. */
function at(sz: Point): Rect {
  return { p: { x: 0, y: 0 }, sz };
}

describe('resizeView', () => {
  it('draws at full scale on a desktop-sized canvas', () => {
    const { vd, c } = resizeIn(at({ x: 1920, y: 1048 }), 1);
    expect(vd.zoom).toBe(1);
    expect(vd.wsize).toEqual({ x: 1920, y: 1048 });
    expect(vd.origin).toEqual({ x: 1920 / 2 - 384, y: 1048 / 2 - 288 });
    expect(c.width).toBe(1920);
    expect(c.height).toBe(1048);
  });

  it('never zooms in past SCALE, however much room there is', () => {
    expect(resizeIn(at({ x: 4000, y: 3000 }), 1).vd.zoom).toBe(1);
    expect(resizeIn(at({ x: 4000, y: 3000 }), 2).vd.zoom).toBe(1);
  });

  it('fills the binding axis of the canvas exactly', () => {
    for (const ratio of [1, 2, 3]) {
      for (const width of [320, 375, 390, 430, 700]) {
        const { vd } = resizeIn(at({ x: width, y: 600 }), ratio);
        const field = fieldRectInCss(vd);
        // Width binds at all of these, except where it is narrower than
        // one device pixel per game pixel allows.
        const floorWidth = FIELD_UNITS.x / (SCALE * ratio);
        expect(field.sz.x).toBeCloseTo(Math.max(width, floorWidth));
      }
    }
  });

  it('fills the width on a dpr 2 phone as well as a dpr 3 one', () => {
    // A whole number of device pixels per game pixel used to floor 1.95
    // here, drawing the field at half the width of the screen.
    expect(fieldRectInCss(resizeIn(at({ x: 375, y: 480 }), 2).vd).sz.x)
      .toBeCloseTo(375);
  });

  it('centers the field in the canvas', () => {
    const box = at({ x: 390, y: 560 });
    const field = fieldRectInCss(resizeIn(box, 3).vd);
    // Within a pixel: `origin` is truncated to whole canvas units.
    expect(field.p.x).toBeCloseTo((box.sz.x - field.sz.x) / 2, 0);
    expect(field.p.y).toBeCloseTo((box.sz.y - field.sz.y) / 2, 0);
    expect(field.p.y).toBeGreaterThanOrEqual(0);
    expect(field.p.y + field.sz.y).toBeLessThanOrEqual(box.sz.y);
  });

  it('places the field the same way wherever the canvas sits', () => {
    // The play band starts below a menu bar, which moves the canvas
    // down the window without changing anything inside it.
    const sz = { x: 390, y: 560 };
    const top = resizeIn({ p: { x: 0, y: 0 }, sz }, 3).vd;
    const lower = resizeIn({ p: { x: 0, y: 82 }, sz }, 3).vd;
    expect(lower.origin).toEqual(top.origin);
    expect(lower.zoom).toBe(top.zoom);
    expect(lower.clientOrigin).toEqual({ x: 0, y: 82 });
  });

  it('bottoms out at one device pixel per game pixel', () => {
    const { vd } = resizeIn(at({ x: 100, y: 100 }), 1);
    expect(vd.zoom * SCALE * 1).toBe(1);
  });
});

describe('resizeView filling the canvas', () => {
  it('covers the canvas exactly, with no letterbox', () => {
    for (const box of [{ x: 390, y: 560 }, { x: 375, y: 430 }, { x: 820, y: 900 }]) {
      const { vd } = resizeIn(at(box), 3, true);
      const field = fieldRectInCss(vd);
      expect(vd.origin).toEqual({ x: 0, y: 0 });
      expect(field.sz.x).toBeCloseTo(box.x);
      expect(field.sz.y).toBeCloseTo(box.y);
    }
  });

  it('keeps the field the nominal number of tiles wide', () => {
    // So that the same amount of level is visible across, whatever the
    // screen's width, and only the vertical extent follows the shape of
    // the window.
    for (const box of [{ x: 390, y: 560 }, { x: 375, y: 430 }, { x: 820, y: 900 }]) {
      const { vd } = resizeIn(at(box), 3, true);
      expect(vd.fsize.x / TILE_SIZE).toBeCloseTo(NUM_TILES.x, 0);
    }
  });

  it('shows more tiles vertically than the nominal field does', () => {
    // A 4:3 field in a portrait window would letterbox; filling it
    // means the extra room goes to more rows of world.
    const { vd } = resizeIn(at({ x: 390, y: 560 }), 3, true);
    expect(vd.fsize.y / TILE_SIZE).toBeGreaterThan(NUM_TILES.y);
  });

  it('leaves the nominal field alone when not filling', () => {
    const { vd } = resizeIn(at({ x: 390, y: 560 }), 3);
    expect(vd.fsize).toEqual({ x: NUM_TILES.x * TILE_SIZE, y: NUM_TILES.y * TILE_SIZE });
  });
});

describe('canvasPointOfClientPoint', () => {
  it('maps the field corner in css pixels to the origin in canvas units', () => {
    const { vd } = resizeIn(at({ x: 390, y: 560 }), 3);
    const corner = fieldRectInCss(vd).p;
    expect(canvasPointOfClientPoint(vd, corner)).toEqual(vd.origin);
  });

  it('is the identity when the canvas fills the window unzoomed', () => {
    const { vd } = resizeIn(at({ x: 1920, y: 1048 }), 1);
    expect(canvasPointOfClientPoint(vd, { x: 37, y: 91 })).toEqual({ x: 37, y: 91 });
  });

  it('takes off where the canvas starts in the window', () => {
    // A touch on the canvas's top left corner is the canvas origin,
    // however far down the window the band it lives in begins.
    const { vd } = resizeIn({ p: { x: 0, y: 82 }, sz: { x: 390, y: 560 } }, 3);
    expect(canvasPointOfClientPoint(vd, { x: 0, y: 82 })).toEqual({ x: 0, y: 0 });
  });
});
