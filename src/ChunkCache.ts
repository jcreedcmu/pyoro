import { rect_intersect } from './util';
import { NUM_TILES_X, NUM_TILES_Y } from './view_constants';
export const CHUNK_SIZE = 16; // in number of tiles, for purposes of caching

export function ChunkCache() {
  this.chunks = {};
}

ChunkCache.prototype.get = function(p) {
  return this.chunks[p.x + ',' + p.y];
}

ChunkCache.prototype.add = function(c) {
  this.chunks[c.pos.x + ',' + c.pos.y] = c;
  return c;
}

ChunkCache.prototype.filter = function(viewPort) {
  var oldc = this.chunks;
  var newc = {};
  oldc.forEach((chunk, k) => {
    if (rect_intersect({ p: chunk.pos, w: CHUNK_SIZE, h: CHUNK_SIZE }, viewPort)) {
      newc[k] = chunk;
    }
    else {
      chunk.evict();
    }
  });
  this.chunks = newc;
}
