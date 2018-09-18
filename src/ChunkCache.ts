import { rect_intersect } from './util';
import { NUM_TILES_X, NUM_TILES_Y } from './view_constants';
import { Dict, Point } from './types';

export const CHUNK_SIZE = 16; // in number of tiles, for purposes of caching

type PosPt = { pos: Point };

export class ChunkCache<Chunk extends PosPt> {
  chunks: Dict<Chunk> = {};

  get(p: Point): Chunk {
    return this.chunks[p.x + ',' + p.y];
  }

  add(c: Chunk): Chunk {
    this.chunks[c.pos.x + ',' + c.pos.y] = c;
    return c;
  }

  // returns evicted chunks, updates chunks field to contain
  // only visible chunks.
  filter(viewPort): Chunk[] {
    const oldc = this.chunks;
    const evicted: Chunk[] = [];
    let newc: Dict<Chunk> = {};
    Object.entries(oldc).forEach(([k, chunk]) => {
      if (rect_intersect({ p: chunk.pos, w: CHUNK_SIZE, h: CHUNK_SIZE }, viewPort)) {
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
