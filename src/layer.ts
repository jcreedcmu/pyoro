import { vequal } from './point';
import { Tile, Dict, DynamicTile, Point } from './types';
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

export function boxTile(): Tile { return { t: 'box' }; }
export function emptyTile(): Tile { return { t: 'empty' }; }

function resolveDynamicTile(
  ct: DynamicTile,
  tilePos: Point,
  trc: TileResolutionContext,
  viewIntent?: boolean,
): Tile {
  switch (ct.t) {
    case 'static':
      return ct.tile;
    case 'bus_controlled':
      return busActive(trc, ct.bus, viewIntent ?? false) ? boxTile() : emptyTile();
    case 'timed': {
      if (viewIntent) {
        return { t: 'timed_wall' };
      }
      const len = ct.on_for + ct.off_for;
      const wantsBox = (trc.time + ct.phase) % len < ct.on_for;
      const playerIsHere = vequal(trc.playerPos, tilePos);
      return wantsBox && !playerIsHere ? boxTile() : emptyTile();
    }
    case 'buttoned': {
      if (viewIntent) {
        return { t: 'buttoned_wall' };
      }
      else {
        const is_button_on = tileEq(tileOfStack(trc.layerStack, ct.button_source, trc, viewIntent), { t: 'button_on' });
        return is_button_on ? boxTile() : emptyTile();
      }
    }
  }
}

export function tileEq(t1: Tile, t2: Tile): boolean {
  switch (t1.t) {
    case 'box': return t2.t == 'box';
    case 'box3': return t2.t == 'box3';
    case 'fragile_box': return t2.t == 'fragile_box';
    case 'empty': return t2.t == 'empty';
    case 'broken_box': return t2.t == 'broken_box';
    case 'up_box': return t2.t == 'up_box';
    case 'spike': return t2.t == 'spike' && t1.direction == t2.direction;
    case 'item': return t2.t == 'item' && t1.item == t2.item;
    case 'save_point': return t2.t == 'save_point';
    case 'grip_wall': return t2.t == 'grip_wall';
    case 'coin_wall': return t2.t == 'coin_wall';
    case 'button_on': return t2.t == 'button_on';
    case 'button_off': return t2.t == 'button_off';
    case 'timed_wall': return t2.t == 'timed_wall';
    case 'buttoned_wall': return t2.t == 'buttoned_wall';
    // XXX this giant cross product is horrible, fix it
    case 'bus_block_red_on': return t2.t == 'bus_block_red_on';
    case 'bus_block_red_off': return t2.t == 'bus_block_red_off';
    case 'bus_button_red_on': return t2.t == 'bus_button_red_on';
    case 'bus_button_red_off': return t2.t == 'bus_button_red_off';

    case 'bus_block_green_on': return t2.t == 'bus_block_green_on';
    case 'bus_block_green_off': return t2.t == 'bus_block_green_off';
    case 'bus_button_green_on': return t2.t == 'bus_button_green_on';
    case 'bus_button_green_off': return t2.t == 'bus_button_green_off';

    case 'bus_block_blue_on': return t2.t == 'bus_block_blue_on';
    case 'bus_block_blue_off': return t2.t == 'bus_block_blue_off';
    case 'bus_button_blue_on': return t2.t == 'bus_button_blue_on';
    case 'bus_button_blue_off': return t2.t == 'bus_button_blue_off';

  }
}

export function isEmptyTile(ct: DynamicTile): boolean {
  return ct.t == 'static' && ct.tile.t == 'empty';
}

export function putTileInDynamicLayer(l: DynamicLayer, p: Point, t: Tile): void {
  putItem(l, p, dynamicOfTile(t));
}

export function putDynamicTile(l: DynamicLayer, p: Point, t: DynamicTile): void {
  putItem(l, p, t);
}

export function tileOfStack(ls: LayerStack, p: Point, trc: TileResolutionContext, viewIntent?: boolean): Tile {
  const ct = dynamicTileOfStack(ls, p);
  return resolveDynamicTile(ct, p, trc, viewIntent);
}

export function dynamicOfTile(tile: Tile): DynamicTile {
  return { t: 'static', tile };
}

export function dynamicTileOfStack(ls: LayerStack, p: Point): DynamicTile {
  switch (ls.t) {
    case 'base': return getItem(ls.layer, p) ?? dynamicOfTile(emptyTile());
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
