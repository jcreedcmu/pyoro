import { rect_intersect, vplus } from './util';
import { Dict, Point, Tile, Rect } from './types';
import { NUM_TILES_X, NUM_TILES_Y } from './constants';

export type TileFunc = (p: Point) => Tile;

export const CHUNK_SIZE = 16; // in number of tiles, for purposes of caching

export type Layer = { tiles: Dict<Tile> };

export function getTile(l: Layer, p: Point): Tile {
  return l.tiles[p.x + ',' + p.y] || 'empty';
}

export function putTile(l: Layer, p: Point, t: Tile): void {
  l.tiles[p.x + ',' + p.y] = t;
}

type PosPt = { pos: Point };
