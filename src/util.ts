import { Point, vadd, vdiag, vm, vscale, vsub } from './lib/point';
import { Color, Rect, Dict, Brect } from "./lib/types";

export function int(x: number): number {
  return Math.floor(x);
}

export function mod(x: number, y: number): number {
  var z = x % y;
  if (z < 0) z += y;
  return z;
}

export function div(x: number, y: number): number {
  return int(x / y);
}

export function imgProm(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const sprite = new Image();
    sprite.src = src;
    sprite.onload = function() { res(sprite); }
  });
}

export function max(x: number[]): number {
  return Math.max.apply(Math, x);
}

export function min(x: number[]): number {
  return Math.min.apply(Math, x);
}

export function rgba(r: number, g: number, b: number, a: number): string {
  return `rgb(${r}, ${g}, ${b}, ${a})`;
}

export function lerp(a: number, b: number, l: number): number {
  return a * (1 - l) + b * l;
}

export function inrect(p: Point, r: Rect): boolean {
  return p.x >= r.p.x && p.y >= r.p.y && p.x < r.p.x + r.sz.x && p.y < r.p.y + r.sz.y;
}

export function rgbOfColor(color: string): Color {
  color = color.replace(/^#/, '');
  return {
    r: parseInt(color.slice(0, 2), 16),
    g: parseInt(color.slice(2, 4), 16),
    b: parseInt(color.slice(4, 6), 16)
  };
}

export function partialRecordEntries<K extends string, V>(pr: Partial<Record<K, V>>): [K, V][] {
  return Object.entries(pr) as [K, V][];
}

export function mapValues<T, U>(d: Dict<T>, f: (x: T, key: string) => U): Dict<U> {
  const rv: Dict<U> = {};
  for (const key of Object.keys(d)) {
    rv[key] = f(d[key], key);
  }
  return rv;
}

export function boundBrect(points: Point[]): Brect {
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const min = { x: Math.min(...xs), y: Math.min(...ys) };
  const max = { x: Math.max(...xs), y: Math.max(...ys) };
  return { min, max };
}

export function pointInBrect(p: Point, r: Brect): boolean {
  return (
    p.x >= r.min.x &&
    p.y >= r.min.y &&
    p.x <= r.max.x &&
    p.y <= r.max.y
  );
}

export function brectOfRect(r: Rect): Brect {
  return { min: r.p, max: vadd(r.p, r.sz) };
}

/**
 * Given a Brect, return a Rect under the convention that a Brect that
 * has the same max and min counts as size 1.
 */
export function thickRectOfBrect(r: Brect): Rect {
  return { p: r.min, sz: vadd(vdiag(1), vsub(r.max, r.min)) };
}

/**
 * Given a Brect, return a Rect under the convention that a Brect that
 * has the same max and min counts as size 0.
 */
export function rectOfBrect(r: Brect): Rect {
  return { p: r.min, sz: vsub(r.max, r.min) };
}

export function insetRect(r: Rect, amount: number): Rect {
  return {
    p: vadd(r.p, vdiag(amount)),
    sz: vsub(r.sz, vdiag(2 * amount)),
  };
}

export function rectMidpoint(r: Rect): Point {
  return vadd(r.p, vscale(r.sz, 0.5));
}

/**
 * Restrict all coordinates to +/-1
 */
export function clamp(p: Point): Point {
  function clamp1(x: number): number {
    if (x > 1) return 1;
    if (x < -1) return -1;
    return x;
  }
  return vm(p, clamp1);
}
