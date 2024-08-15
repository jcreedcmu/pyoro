import { Point, vequal, vsub } from './point';
import { Brect, Bus, Dict, DynamicTile, Tile } from './types';
import { mapValues, pointInBrect } from './util';

export type PointMap<T> = { tiles: Dict<T> };

export type DynamicLayer = PointMap<DynamicTile>;

export function getItem<T>(l: PointMap<T>, p: Point): T | undefined {
  return l.tiles[p.x + ',' + p.y];
}

export function putItem<T>(l: PointMap<T>, p: Point, v: T): void {
  l.tiles[p.x + ',' + p.y] = v;
}

export function removeItem<T>(l: PointMap<T>, p: Point): void {
  delete l.tiles[p.x + ',' + p.y];
}

export type LayerStack =
  | { t: 'base', layer: DynamicLayer }
  | { t: 'overlay', top: DynamicLayer, rest: LayerStack };

export type TileResolutionContext = {
  busState: Record<Bus, boolean>;
  playerPos: Point,
  playerPrevPos: Point,
  time: number,
  layerStack: LayerStack,
  boundRect: Brect,
}

function busActive(trc: TileResolutionContext, bus: Bus): boolean {
  return trc.busState[bus];
}

export function boxTile(): Tile { return { t: 'box' }; }
export function emptyTile(): Tile { return { t: 'empty' }; }

function resolveDynamicTile(
  tile: DynamicTile,
  tilePos: Point,
  trc: TileResolutionContext,
  viewIntent?: boolean,
): Tile {
  switch (tile.t) {
    case 'static':
      return tile.tile;
    case 'bus_block':
      return { t: 'bus_block', bus: tile.bus, on: busActive(trc, tile.bus) };
    case 'bus_button':
      return { t: 'bus_button', bus: tile.bus, on: busActive(trc, tile.bus) };
    case 'timed': {
      if (viewIntent) {
        return { t: 'timed_wall' };
      }
      const len = tile.on_for + tile.off_for;
      const wantsBox = (trc.time + tile.phase) % len < tile.on_for;
      const playerIsHere = vequal(trc.playerPos, tilePos);
      return wantsBox && !playerIsHere ? boxTile() : emptyTile();
    }
    case 'buttoned': {
      if (viewIntent) {
        return { t: 'buttoned_wall' };
      }
      else {
        const is_button_on = tileEq(tileOfStack(trc.layerStack, tile.button_source, trc, viewIntent), { t: 'button_on' });
        return is_button_on ? boxTile() : emptyTile();
      }
    }
    case 'door': return { t: 'door', destinationLevel: tile.destinationLevel };
    case 'motion':
      const motion = vsub(trc.playerPos, trc.playerPrevPos);
      const noPlayer = !vequal(trc.playerPos, tilePos);
      switch (tile.direction) {
        case 'up': return { t: 'motion_block', direction: 'up', on: noPlayer && motion.y >= 0 };
        case 'down': return { t: 'motion_block', direction: 'down', on: noPlayer && motion.y <= 0 };
        case 'left': return { t: 'motion_block', direction: 'left', on: noPlayer && motion.x >= 0 };
        case 'right': return { t: 'motion_block', direction: 'right', on: noPlayer && motion.x <= 0 };

      }
  }
}

export function tileEq(t1: Tile, t2: Tile): boolean {
  switch (t1.t) {
    case 'box': return t2.t == 'box';
    case 'box3': return t2.t == 'box3';
    case 'stone': return t2.t == 'stone';
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
    case 'bus_block': return t2.t == 'bus_block' && t1.bus == t2.bus && t1.on == t2.on;
    case 'bus_button': return t2.t == 'bus_button' && t1.bus == t2.bus && t1.on == t2.on;
    case 'door': return t2.t == 'door';
    case 'motion_block': return t2.t == 'motion_block' && t1.direction == t2.direction && t1.on == t2.on;
    case 'side_breakable': return t2.t == 'side_breakable';
  }
}

/**
 * Returns true if `t1` and `t2` are a close enough match to justify
 * switching tiles in the editor to the one found in the world.
 */
export function weakTileEq(t1: Tile, t2: Tile): boolean {
  switch (t1.t) {
    case 'bus_block': return t2.t == 'bus_block' && t1.bus == t2.bus;
    case 'bus_button': return t2.t == 'bus_button' && t1.bus == t2.bus;
    default:
      return t1.t == t2.t;
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

export function removeDynamicTile(l: DynamicLayer, p: Point): void {
  removeItem(l, p);
}

export function tileOfStack(ls: LayerStack, p: Point, trc: TileResolutionContext, viewIntent?: boolean): Tile {
  if (!pointInBrect(p, trc.boundRect)) {
    return { t: 'box' }
  }
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

export type PointMapEntry<T> = { loc: Point, value: T };
export function pointMapEntries<T>(pointMap: PointMap<T>): PointMapEntry<T>[] {
  return Object.entries(pointMap.tiles).map(([k, v]) => {
    const [x, y] = k.split(',').map(x => parseInt(x));
    return { loc: { x, y }, value: v };
  });
}
