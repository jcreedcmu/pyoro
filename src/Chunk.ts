import { hash, vplus } from './util';
import * as _ from 'underscore';

export const CHUNK_SIZE = 16; // in number of tiles, for purposes of caching

function rawGetTile(p) {
  var h = hash(p, 2);
  var mtn = h[0] - (p.x * 0.015 + p.y * -0.003);
  if (h[0] - p.y * 0.1 < 0.3 || mtn < 0.3) {
    return mtn < 0.25 ? 'box' : (mtn < 0.275 ? 'box3' : 'fragile_box');
  }
  else return 'empty';
}

export function Layer() {
  this.tiles = {};
}

Layer.prototype.getTile = function(p) {
  return this.tiles[p.x + ',' + p.y];
}

Layer.prototype.putTile = function(p, t) {
  this.tiles[p.x + ',' + p.y] = t;
}

Layer.prototype.extend = function(l) {
  _.extend(this.tiles, l.tiles);
}

export function CompositeLayer(l1, l2) {
  this.l1 = l1;
  this.l2 = l2;
}

CompositeLayer.prototype = new Layer();

CompositeLayer.prototype.putTile = function(p, t) {
  throw "CompositeLayer is readonly";
}

CompositeLayer.prototype.getTile = function(p) {
  return this.l1.getTile(p) || this.l2.getTile(p);
}

export function Chunk(p, props) {
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

Chunk.prototype = new Layer();
