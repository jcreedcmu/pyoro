import { NUM_TILES, SCALE, TILE_SIZE } from '../src/constants';
import { Rect } from '../src/lib/types';
import { canvasPointOfClientPoint, fieldRectInCss, fieldSizeInCss, resizeView, ViewData } from '../src/view';

const FIELD_UNITS = {
  x: NUM_TILES.x * TILE_SIZE * SCALE,
  y: NUM_TILES.y * TILE_SIZE * SCALE,
};

function fakeCanvas(): HTMLCanvasElement {
  return { width: 0, height: 0, style: {} } as unknown as HTMLCanvasElement;
}

/** Runs resizeView with the given window size and device pixel ratio. */
function resizeIn(window: { x: number, y: number }, ratio: number, avail?: Rect):
  { vd: ViewData, c: HTMLCanvasElement } {
  (globalThis as any).innerWidth = window.x;
  (globalThis as any).innerHeight = window.y;
  (globalThis as any).devicePixelRatio = ratio;
  const c = fakeCanvas();
  return { vd: resizeView(c, avail), c };
}

describe('resizeView', () => {
  it('draws at full scale on a desktop-sized window', () => {
    const { vd, c } = resizeIn({ x: 1920, y: 1080 }, 1);
    expect(vd.zoom).toBe(1);
    expect(vd.wsize).toEqual({ x: 1920, y: 1080 });
    expect(vd.origin).toEqual({ x: 1920 / 2 - 384, y: 1080 / 2 - 288 });
    expect(c.width).toBe(1920);
    expect(c.height).toBe(1080);
  });

  it('never zooms in past SCALE, however much room there is', () => {
    expect(resizeIn({ x: 4000, y: 3000 }, 1).vd.zoom).toBe(1);
    expect(resizeIn({ x: 4000, y: 3000 }, 2).vd.zoom).toBe(1);
  });

  it('shrinks the field to fit a phone in portrait', () => {
    const { vd, c } = resizeIn({ x: 390, y: 844 }, 3);
    // Backing store covers the whole window at full device resolution.
    expect(c.width).toBe(390 * 3);
    expect(c.height).toBe(844 * 3);
    // Width binds in portrait, so the field spans it exactly.
    const field = fieldRectInCss(vd);
    expect(field.sz.x).toBeCloseTo(390);
    expect(field.p.x).toBeCloseTo(0);
  });

  it('fills the binding axis of the available rect exactly', () => {
    for (const ratio of [1, 2, 3]) {
      for (const width of [320, 375, 390, 430, 700]) {
        const { vd } = resizeIn({ x: width, y: 844 }, ratio);
        const field = fieldRectInCss(vd);
        // Width binds at every one of these sizes, except where it is
        // narrower than one device pixel per game pixel allows.
        const floorWidth = FIELD_UNITS.x / (SCALE * ratio);
        expect(field.sz.x).toBeCloseTo(Math.max(width, floorWidth));
      }
    }
  });

  it('fills the width on a dpr 2 phone as well as a dpr 3 one', () => {
    // A whole number of device pixels per game pixel used to floor 1.95
    // to 1 here, drawing the field at half the width of the screen.
    const { vd } = resizeIn({ x: 375, y: 667 }, 2);
    expect(fieldRectInCss(vd).sz.x).toBeCloseTo(375);
  });

  it('centers the field in the available rect', () => {
    const avail: Rect = { p: { x: 0, y: 0 }, sz: { x: 390, y: 320 } };
    const { vd } = resizeIn({ x: 390, y: 844 }, 3, avail);
    const field = fieldRectInCss(vd);
    // Still fills the window, but the field lives in the top 320px.
    expect(vd.wsize.x * vd.zoom).toBeCloseTo(390, 0);
    expect(vd.wsize.y * vd.zoom).toBeCloseTo(844, 0);
    expect(field.sz.y).toBeLessThanOrEqual(avail.sz.y);
    // Within a pixel: `origin` is truncated to whole canvas units.
    expect(field.p.y).toBeCloseTo((avail.sz.y - field.sz.y) / 2, 0);
  });

  it('leaves the field clear of a control pad at the bottom', () => {
    const PAD = 210; // two rows of buttons plus padding and safe area
    const avail: Rect = { p: { x: 0, y: 0 }, sz: { x: 390, y: 844 - PAD } };
    const { vd } = resizeIn({ x: 390, y: 844 }, 3, avail);
    const field = fieldRectInCss(vd);
    expect(field.sz.x).toBeCloseTo(390);
    expect(field.p.y).toBeGreaterThanOrEqual(0);
    // The whole field sits above where the pad starts.
    expect(field.p.y + field.sz.y).toBeLessThanOrEqual(844 - PAD);
  });

  it('bottoms out at one device pixel per game pixel', () => {
    const { vd } = resizeIn({ x: 100, y: 100 }, 1);
    expect(vd.zoom * SCALE * 1).toBe(1);
  });
});

describe('fieldSizeInCss', () => {
  it('agrees with where resizeView puts the field', () => {
    for (const ratio of [1, 2, 3]) {
      for (const size of [{ x: 390, y: 844 }, { x: 844, y: 390 }, { x: 1920, y: 1080 }]) {
        const { vd } = resizeIn(size, ratio);
        expect(fieldSizeInCss(size)).toEqual(fieldRectInCss(vd).sz);
      }
    }
  });

  it('puts the field at the top of a rect that exactly fits it', () => {
    // This is what lets the pad claim everything under the field
    // without anything having to measure the pad.
    const window = { x: 390, y: 844 };
    const forField = { x: window.x, y: window.y - 260 };
    resizeIn(window, 3);
    const avail: Rect = {
      p: { x: 0, y: 0 },
      sz: { x: forField.x, y: fieldSizeInCss(forField).y },
    };
    const field = fieldRectInCss(resizeIn(window, 3, avail).vd);
    expect(field.p.y).toBeCloseTo(0);
    expect(field.sz.y).toBeCloseTo(avail.sz.y);
  });
});

describe('canvasPointOfClientPoint', () => {
  it('maps the field corner in css pixels to the origin in canvas units', () => {
    const { vd } = resizeIn({ x: 390, y: 844 }, 3);
    const corner = fieldRectInCss(vd).p;
    expect(canvasPointOfClientPoint(vd, corner)).toEqual(vd.origin);
  });

  it('is the identity when not zoomed', () => {
    const { vd } = resizeIn({ x: 1920, y: 1080 }, 1);
    expect(canvasPointOfClientPoint(vd, { x: 37, y: 91 })).toEqual({ x: 37, y: 91 });
  });
});
