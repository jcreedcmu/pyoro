import { vequal } from './point';
import { DynamicTile, Dict, Point, Tile } from './types';
import { mapValues } from './util';

export type PointMap<T> = { tiles: Dict<T> };

export type Layer = PointMap<Tile>;
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
): Tile { // XXX should return ComplexTile
  switch (ct.t) {
    case 'static':
      return ct.tile.tile;
    case 'bus_controlled':
      return busActive(trc, ct.bus, viewIntent ?? false) ? 'box' : 'empty';
    case 'timed': {
      if (viewIntent) {
        return 'timed_wall';
      }
      const len = ct.on_for + ct.off_for;
      const wantsBox = (trc.time + ct.phase) % len < ct.on_for;
      const playerIsHere = vequal(trc.playerPos, tilePos);
      return wantsBox && !playerIsHere ? 'box' : 'empty';
    }
    case 'buttoned': {
      if (viewIntent) {
        return 'buttoned_wall';
      }
      else
        return tileOfStack(trc.layerStack, ct.button_source, trc, viewIntent) == 'button_on' ? 'box' : 'empty';
    }
  }
}

export function isEmptyTile(ct: DynamicTile): boolean {
  return ct.t == 'static' && ct.tile.t == 'simple' && ct.tile.tile == 'empty';
}

export function getTile(l: Layer, p: Point): Tile | undefined {
  return getItem(l, p);
}

export function getTileOfDynamicLayer(l: DynamicLayer, p: Point, trc: TileResolutionContext): Tile | undefined {
  const item = getItem(l, p);
  return item == undefined ? undefined : resolveDynamicTile(item, p, trc);
}

export function putTileInDynamicLayer(l: DynamicLayer, p: Point, t: Tile): void {
  putItem(l, p, dynamicOfSimple(t));
}

export function putDynamicTile(l: DynamicLayer, p: Point, t: DynamicTile): void {
  putItem(l, p, t);
}

export function tileOfStack(ls: LayerStack, p: Point, trc: TileResolutionContext, viewIntent?: boolean): Tile {
  const ct = dynamicTileOfStack(ls, p);
  return resolveDynamicTile(ct, p, trc, viewIntent);
}

export function dynamicOfSimple(tile: Tile): DynamicTile {
  return { t: 'static', tile: { t: 'simple', tile } };
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

export function bootstrapDynamicLayer(layer: Layer): DynamicLayer {
  return mapPointMap(layer, dynamicOfSimple);
}
