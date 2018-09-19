import { rect_intersect, hash, vplus } from './util';
import { Dict, Point, Tile, Rect } from './types';
import { NUM_TILES_X, NUM_TILES_Y } from './constants';

export const CHUNK_SIZE = 16; // in number of tiles, for purposes of caching

function rawGetTile(p: Point): Tile {
  var h = hash(p);
  var mtn = h - (p.x * 0.015 + p.y * -0.003);
  if (h - p.y * 0.1 < 0.3 || mtn < 0.3) {
    return mtn < 0.25 ? 'box' : (mtn < 0.275 ? 'box3' : 'fragile_box');
  }
  else return 'empty';
}

export interface ReadLayer {
  getTile(p: Point): Tile;
}

export class Layer implements ReadLayer {
  tiles: Dict<Tile> = {};

  getTile(p: Point): Tile {
    return this.tiles[p.x + ',' + p.y];
  }

  putTile(p: Point, t: Tile): void {
    this.tiles[p.x + ',' + p.y] = t;
  }

  extend(l: Layer): void {
    this.tiles = { ...this.tiles, ...l.tiles };
  }
}

export class Chunk extends Layer {
  pos: Point;
  rawGetTile: (p: Point) => Tile;

  constructor(p: Point) {
    super();
    this.pos = p;
    this.rawGetTile = rawGetTile;

    for (var y = 0; y < CHUNK_SIZE; y++) {
      for (var x = 0; x < CHUNK_SIZE; x++) {
        var m = vplus(p, { x: x, y: y });
        this.tiles[m.x + ',' + m.y] = this.rawGetTile(m);
      }
    }
  }
}

export class CompositeLayer implements ReadLayer {
  l1: ReadLayer;
  l2: ReadLayer;

  constructor(l1: ReadLayer, l2: ReadLayer) {
    this.l1 = l1;
    this.l2 = l2;
  }

  getTile(p: Point): Tile {
    return this.l1.getTile(p) || this.l2.getTile(p);
  }
}

type PosPt = { pos: Point };

export class ChunkCache<T extends PosPt> {
  chunks: Dict<T> = {};
  CHUNK_SIZE: number;

  constructor(CHUNK_SIZE: number) {
    this.CHUNK_SIZE = CHUNK_SIZE;
  }

  get(p: Point): T {
    return this.chunks[p.x + ',' + p.y];
  }

  add(c: T): T {
    this.chunks[c.pos.x + ',' + c.pos.y] = c;
    return c;
  }

  // returns evicted chunks, updates chunks field to contain
  // only visible chunks.
  filter(viewPort: Rect): T[] {
    const oldc = this.chunks;
    const evicted: T[] = [];
    let newc: Dict<T> = {};
    Object.entries(oldc).forEach(([k, chunk]) => {
      if (rect_intersect({ p: chunk.pos, w: this.CHUNK_SIZE, h: this.CHUNK_SIZE }, viewPort)) {
        newc[k] = chunk;
      }
      else {
        evicted.push(chunk);
      }
    });
    this.chunks = newc;
    return evicted;
  }
}
