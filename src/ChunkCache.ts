import { rect_intersect } from './util';
import { NUM_TILES_X, NUM_TILES_Y } from './constants';
import { Dict, Point } from './types';

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
  filter(viewPort): T[] {
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
