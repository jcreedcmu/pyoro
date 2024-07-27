import { vequal } from './point';
import { DynamicTile, Dict, Point, Tile, ComplexTile } from './types';
import { mapValues } from './util';

export type PointMap<T> = { tiles: Dict<T> };

export type DynamicLayer = PointMap<DynamicTile>;

export function getItem<T>(l: PointMap<T>, p: Point): T | undefined {
  return l.tiles[p.x + ',' + p.y];
}

export function putItem<T>(l: PointMap<T>, p: Point, v: T): void {
  l.tiles[p.x + ',' + p.y] = v;
}

export type LayerStack =
  | { t: 'base', layer: DynamicLayer }
  | { t: 'overlay', top: DynamicLayer, rest: LayerStack };

export type TileResolutionContext = {
  // XXX need bus state here
  playerPos: Point,
  time: number,
  layerStack: LayerStack,
}

function busActive(trc: TileResolutionContext, bus: string, viewIntent: boolean): boolean {
  return true;
}

function resolveDynamicTile(
  ct: DynamicTile,
  tilePos: Point,
  trc: TileResolutionContext,
  viewIntent?: boolean,
): ComplexTile {
  switch (ct.t) {
    case 'static':
      return ct.tile;
    case 'bus_controlled':
      return complexOfSimple(busActive(trc, ct.bus, viewIntent ?? false) ? 'box' : 'empty');
    case 'timed': {
      if (viewIntent) {
        return complexOfSimple('timed_wall');
      }
      const len = ct.on_for + ct.off_for;
      const wantsBox = (trc.time + ct.phase) % len < ct.on_for;
      const playerIsHere = vequal(trc.playerPos, tilePos);
      return complexOfSimple(wantsBox && !playerIsHere ? 'box' : 'empty');
    }
    case 'buttoned': {
      if (viewIntent) {
        return complexOfSimple('buttoned_wall');
      }
      else {
        const is_button_on = complexTileEq(tileOfStack(trc.layerStack, ct.button_source, trc, viewIntent), complexOfSimple('button_on'));
        return complexOfSimple(is_button_on ? 'box' : 'empty');
      }
    }
  }
}

export function complexTileEq(t1: ComplexTile, t2: ComplexTile): boolean {
  switch (t1.t) {
    case 'simple': return t2.t == 'simple' && t1.tile == t2.tile;
  }
}

export function isEmptyTile(ct: DynamicTile): boolean {
  return ct.t == 'static' && ct.tile.t == 'simple' && ct.tile.tile == 'empty';
}

export function putTileInDynamicLayer(l: DynamicLayer, p: Point, t: Tile): void {
  putItem(l, p, dynamicOfSimple(t));
}

export function putDynamicTile(l: DynamicLayer, p: Point, t: DynamicTile): void {
  putItem(l, p, t);
}

export function tileOfStack(ls: LayerStack, p: Point, trc: TileResolutionContext, viewIntent?: boolean): ComplexTile {
  const ct = dynamicTileOfStack(ls, p);
  return resolveDynamicTile(ct, p, trc, viewIntent);
}

export function dynamicOfSimple(tile: Tile): DynamicTile {
  return { t: 'static', tile: { t: 'simple', tile } };
}

export function complexOfSimple(tile: Tile): ComplexTile {
  return { t: 'simple', tile };
}

export function dynamicTileOfStack(ls: LayerStack, p: Point): DynamicTile {
  switch (ls.t) {
    case 'base': return getItem(ls.layer, p) ?? dynamicOfSimple('empty');
    case 'overlay': {
      const top = getItem(ls.top, p);
      return top == undefined ? dynamicTileOfStack(ls.rest, p) : top;
    }
  }
}

export function mapPointMap<T, U>(pointMap: PointMap<T>, f: (x: T) => U): PointMap<U> {
  return {
    tiles: mapValues(pointMap.tiles, f)
  };
}

export function bootstrapDynamicLayer(layer: PointMap<Tile>): DynamicLayer {
  return mapPointMap(layer, dynamicOfSimple);
}
