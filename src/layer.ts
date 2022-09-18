import { ComplexTile, Dict, Point, Tile } from './types';
import { mapValues } from './util';

export type PointMap<T> = { tiles: Dict<T> };

export type Layer = PointMap<Tile>;
export type ComplexLayer = PointMap<ComplexTile>;

export function getItem<T>(l: PointMap<T>, p: Point): T {
  return l.tiles[p.x + ',' + p.y];
}

export function putItem<T>(l: PointMap<T>, p: Point, v: T): void {
  l.tiles[p.x + ',' + p.y] = v;
}

function resolveComplexTile(ct: ComplexTile, l: ComplexLayer): Tile {
  switch (ct.t) {
    case 'simple':
      return ct.tile;
    case 'timed':
      return 'box';
  }
}

export function isEmptyTile(ct: ComplexTile): boolean {
  return ct.t == 'simple' && ct.tile == 'empty';
}

export function getTile(l: Layer, p: Point): Tile | undefined {
  return getItem(l, p);
}

export function getTileOfComplexLayer(l: ComplexLayer, p: Point): Tile | undefined {
  const item = getItem(l, p);
  return item == undefined ? undefined : resolveComplexTile(item, l);
}

export function putTileInComplexLayer(l: ComplexLayer, p: Point, t: Tile): void {
  putItem(l, p, { t: 'simple', tile: t });
}

export function putComplexTile(l: ComplexLayer, p: Point, t: ComplexTile): void {
  putItem(l, p, t);
}

export function putTile(l: Layer, p: Point, t: Tile): void {
  putItem(l, p, t);
}

export type LayerStack =
  | { t: 'base', layer: ComplexLayer }
  | { t: 'overlay', top: ComplexLayer, rest: LayerStack };

export function tileOfStack(ls: LayerStack, p: Point): Tile {
  switch (ls.t) {
    case 'base': return getTileOfComplexLayer(ls.layer, p) || 'empty';
    case 'overlay': {
      const top = getTileOfComplexLayer(ls.top, p);
      return top == undefined ? tileOfStack(ls.rest, p) : top;
    }
  }
}

export function mapPointMap<T, U>(pointMap: PointMap<T>, f: (x: T) => U): PointMap<U> {
  return {
    tiles: mapValues(pointMap.tiles, f)
  };
}

export function bootstrapComplexLayer(layer: Layer): ComplexLayer {
  return mapPointMap(layer, x => ({ t: 'simple', tile: x }));
}
