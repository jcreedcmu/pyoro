import { NUM_TILES, SCALE, TILE_SIZE } from '../src/constants';
import { Rect } from '../src/lib/types';
import { canvasPointOfClientPoint, resizeView, ViewData } from '../src/view';

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

/** The play field's rect in css pixels, as the browser sees it. */
function fieldRectInCss(vd: ViewData): Rect {
  return {
    p: { x: vd.origin.x * vd.zoom, y: vd.origin.y * vd.zoom },
    sz: { x: FIELD_UNITS.x * vd.zoom, y: FIELD_UNITS.y * vd.zoom },
  };
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
    expect(vd.zoom).toBe(0.5);
    // Backing store covers the whole window at full device resolution.
    expect(c.width).toBe(390 * 3);
    expect(c.height).toBe(844 * 3);
    // Field fits within the window, horizontally centered.
    const field = fieldRectInCss(vd);
    expect(field.sz).toEqual({ x: 384, y: 288 });
    expect(field.p.x).toBeCloseTo((390 - 384) / 2);
    expect(field.p.x + field.sz.x).toBeLessThanOrEqual(390);
  });

  it('uses a whole number of device pixels per game pixel', () => {
    for (const ratio of [1, 2, 3]) {
      for (const width of [320, 390, 430, 700, 1024]) {
        const { vd } = resizeIn({ x: width, y: 844 }, ratio);
        const devicePixelsPerGamePixel = vd.zoom * SCALE * ratio;
        expect(devicePixelsPerGamePixel).toBe(Math.round(devicePixelsPerGamePixel));
        expect(devicePixelsPerGamePixel).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('centers the field in the available rect', () => {
    const avail: Rect = { p: { x: 0, y: 0 }, sz: { x: 390, y: 320 } };
    const { vd } = resizeIn({ x: 390, y: 844 }, 3, avail);
    const field = fieldRectInCss(vd);
    // Still fills the window, but the field lives in the top 320px.
    expect(vd.wsize).toEqual({ x: 780, y: 1688 });
    expect(field.sz.y).toBeLessThanOrEqual(avail.sz.y);
    expect(field.p.y).toBeCloseTo((320 - 288) / 2);
  });

  it('leaves the field clear of a control pad at the bottom', () => {
    const PAD = 210; // two rows of buttons plus padding and safe area
    const avail: Rect = { p: { x: 0, y: 0 }, sz: { x: 390, y: 844 - PAD } };
    const { vd } = resizeIn({ x: 390, y: 844 }, 3, avail);
    const field = fieldRectInCss(vd);
    expect(field.sz).toEqual({ x: 384, y: 288 });
    expect(field.p.y).toBeGreaterThanOrEqual(0);
    // The whole field sits above where the pad starts.
    expect(field.p.y + field.sz.y).toBeLessThanOrEqual(844 - PAD);
  });

  it('bottoms out at one device pixel per game pixel', () => {
    const { vd } = resizeIn({ x: 100, y: 100 }, 1);
    expect(vd.zoom * SCALE * 1).toBe(1);
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
