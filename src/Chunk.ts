import * as _ from 'underscore';
import { hash, vplus } from './util';
import { Dict, Point } from './types';

export const CHUNK_SIZE = 16; // in number of tiles, for purposes of caching

type Tile = 'box' | 'box3' | 'fragile_box' | 'empty';

function rawGetTile(p: Point): Tile {
  var h = hash(p, 2);
  var mtn = h[0] - (p.x * 0.015 + p.y * -0.003);
  if (h[0] - p.y * 0.1 < 0.3 || mtn < 0.3) {
    return mtn < 0.25 ? 'box' : (mtn < 0.275 ? 'box3' : 'fragile_box');
  }
  else return 'empty';
}

export class Layer {
  tiles: Dict<Tile> = {};

  getTile(p: Point): Tile {
    return this.tiles[p.x + ',' + p.y];
  }

  putTile(p: Point, t: Tile): void {
    this.tiles[p.x + ',' + p.y] = t;
  }

  extend(l) {
    _.extend(this.tiles, l.tiles);
  }

}

export class CompositeLayer extends Layer {
  l1: Layer;
  l2: Layer;

  constructor(l1: Layer, l2: Layer) {
    super();
    this.l1 = l1;
    this.l2 = l2;
  }

  putTile(p: Point, t: Tile): void {
    throw "CompositeLayer is readonly";
  }

  getTile(p: Point): Tile {
    return this.l1.getTile(p) || this.l2.getTile(p);
  }
}

export class Chunk extends Layer {
  pos: Point;
  rawGetTile: (p: Point) => Tile;

  constructor(p: Point, props) {
    super();
    this.pos = p;
    this.rawGetTile = rawGetTile;
    _.extend(this, props);
    for (var y = 0; y < CHUNK_SIZE; y++) {
      for (var x = 0; x < CHUNK_SIZE; x++) {
        var m = vplus(p, { x: x, y: y });
        this.tiles[m.x + ',' + m.y] = this.rawGetTile(m);
      }
    }
  }
}
