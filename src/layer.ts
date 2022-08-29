import { Dict, Point, Tile } from './types';

export type PointMap<T> = { tiles: Dict<T> };

export type Layer = PointMap<Tile>;

export function getItem<T>(l: PointMap<T>, p: Point): T {
  return l.tiles[p.x + ',' + p.y];
}

export function putItem<T>(l: PointMap<T>, p: Point, v: T): void {
  l.tiles[p.x + ',' + p.y] = v;
}

export function getTile(l: Layer, p: Point): Tile {
  return getItem(l, p) || 'empty';
}

export function putTile(l: Layer, p: Point, t: Tile): void {
  putItem(l, p, t);
}

export type LayerStack =
  | { t: 'base', layer: Layer }
  | { t: 'overlay', top: Layer, rest: LayerStack };

export function tileOfStack(ls: LayerStack, p: Point): Tile {
  switch (ls.t) {
    case 'base': return getTile(ls.layer, p);
    case 'overlay': {
      const top = getTile(ls.top, p);
      return top == 'empty' ? tileOfStack(ls.rest, p) : top;
    }
  }
}
