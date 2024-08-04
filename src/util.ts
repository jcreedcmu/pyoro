import { Point } from './point';
import { Color, Rect, Dict } from './types';

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
