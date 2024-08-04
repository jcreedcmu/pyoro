/** A point in a 2d space. */
export type Point = { x: number, y: number };

export function vm(a: Point, f: (a: number) => number): Point {
  return { x: f(a.x), y: f(a.y) };
}

export function vm2(a: Point, b: Point, f: (a: number, b: number) => number): Point {
  return { x: f(a.x, b.x), y: f(a.y, b.y) };
}

export function vm3(a: Point, b: Point, c: Point, f: (a: number, b: number, c: number) => number): Point {
  return { x: f(a.x, b.x, c.x), y: f(a.y, b.y, c.y) };
}

export function vmn(ps: Point[], f: (ns: number[]) => number): Point {
  return { x: f(ps.map(p => p.x)), y: f(ps.map(p => p.y)) };
}

export function vequal(a: Point, b: Point): boolean {
  return a.x == b.x && a.y == b.y;
}

export function vplus(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

export const vadd = vplus;

export function vminus(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

export const vsub = vminus;

export function vscale(b: Point, s: number): Point {
  return { x: s * b.x, y: s * b.y };
}

export function vdiv(b: Point, s: number): Point {
  return { x: b.x / s, y: b.y / s };
}

export const int = Math.floor;

export function vint(v: Point): Point {
  return { x: int(v.x), y: int(v.y) };
}

export function vfpart(v: Point): Point {
  return { x: v.x - int(v.x), y: v.y - int(v.y) };
}

export function lerp(a: number, b: number, l: number): number {
  return a * (1 - l) + b * l;
}
