import { rect_intersect, vplus } from './util';
import { Dict, Point, Tile, Rect } from './types';
import { NUM_TILES_X, NUM_TILES_Y } from './constants';

export type TileFunc = (p: Point) => Tile;

export const CHUNK_SIZE = 16; // in number of tiles, for purposes of caching

export interface ReadLayer {
  getTile(p: Point): Tile;
}

export type LayerData = { tiles: Dict<Tile> };

export function getTile(l: LayerData, p: Point) {
  return l.tiles[p.x + ',' + p.y];
}

export function putTile(l: LayerData, p: Point, t: Tile): void {
  l.tiles[p.x + ',' + p.y] = t;
}

export class Layer implements ReadLayer {
  tiles: Dict<Tile> = {};

  constructor(ld?: LayerData) {
    if (ld) {
      this.tiles = ld.tiles;
    }
  }

  getTile(p: Point): Tile {
    return this.tiles[p.x + ',' + p.y];
  }

  putTile(p: Point, t: Tile): void {
    this.tiles[p.x + ',' + p.y] = t;
  }

  extend(l: Layer): void {
    Object.keys(l.tiles).forEach(k => {
      this.tiles[k] = l.tiles[k]
    });
  }
}

type PosPt = { pos: Point };
