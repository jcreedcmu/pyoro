import * as _ from 'underscore';
import { TILE_SIZE, SCALE, NUM_TILES_X, NUM_TILES_Y, sprites } from './view_constants';
import { Model } from './model';
import { CompositeLayer, ReadLayer } from './Chunk';
import { bindVia, int, vplus, vint, vscale, vminus, vfpart } from './util';
import { CHUNK_SIZE } from './constants';

var DEBUG = 0;

class View {
  c: HTMLCanvasElement;
  d: CanvasRenderingContext2D;
  model: Model;
  ww: number;
  hh: number;
  o_x: number;
  o_y: number;
  spriteImg: HTMLImageElement;
  center_x: number;
  center_y: number;

  constructor(model: Model, c: HTMLCanvasElement, d: CanvasRenderingContext2D) {
    this.model = model;
    this.c = c;
    this.d = d;
  }

  draw() {
    var c = this.c;
    var d = this.d;
    var model = this.model;
    var that = this;

    // background
    d.fillStyle = "#def";
    d.fillRect(0, 0, this.ww, this.hh);
    d.fillStyle = "rgba(255,255,255,0.5)";
    d.fillRect(this.o_x, this.o_y, NUM_TILES_X * TILE_SIZE * SCALE, NUM_TILES_Y * TILE_SIZE * SCALE);

    if (!DEBUG) {
      d.save();
      d.beginPath();
      d.rect(this.o_x, this.o_y, NUM_TILES_X * TILE_SIZE * SCALE, NUM_TILES_Y * TILE_SIZE * SCALE);
      d.clip();
    }

    var vp = model.get_viewPort();

    var drawable: ReadLayer = model;
    if (model.state.layer != null) {
      drawable = new CompositeLayer(model.state.layer, model);
    }

    for (var y = 0; y < NUM_TILES_Y + 1; y++) {
      for (var x = 0; x < NUM_TILES_X + 1; x++) {
        var p = { x: x, y: y };
        this.draw_sprite(drawable.getTile(vplus(p, vint(vp))), vminus(p, vfpart(vp)));
      }
    }

    this.draw_sprite(model.get_player().getAnimState(),
      vminus(model.get_player().pos, vp),
      model.get_player().getFlipState());

    // cache visualization
    if (DEBUG) {
      _.each(model.cache.chunks, function(chunk, k) {
        var chunk_pixels = TILE_SIZE * SCALE * CHUNK_SIZE;
        var op = vscale(vminus(chunk.pos, vp), TILE_SIZE * SCALE);
        d.strokeStyle = "red";
        d.lineWidth = 1;

        d.strokeRect(that.o_x + op.x - 0.5, that.o_y + op.y - 0.5, chunk_pixels, chunk_pixels);
      });
    }

    if (!DEBUG)
      d.restore();
  }

  // wpos: position in window, (0,0) is top left of viewport
  draw_sprite(sprite_id, wpos, flip?) {

    if (wpos.x < -1 || wpos.y < -1 || wpos.x >= NUM_TILES_X + 1 || wpos.y >= NUM_TILES_Y + 1)
      return;

    var sprite_loc = sprites[sprite_id];

    var d = this.d;
    d.save();
    d.translate(this.o_x + wpos.x * TILE_SIZE * SCALE,
      this.o_y + wpos.y * TILE_SIZE * SCALE);
    if (flip) {
      d.translate(TILE_SIZE * SCALE, 0);
      d.scale(-1, 1);
    }
    d.imageSmoothingEnabled = false;
    d.drawImage(this.spriteImg,
      sprite_loc.x * TILE_SIZE, sprite_loc.y * TILE_SIZE, TILE_SIZE, TILE_SIZE,
      0,
      0, TILE_SIZE * SCALE, TILE_SIZE * SCALE);
    d.restore();
  }

  resize() {
    console.trace();
    const c = this.c;

    c.width = 0;
    c.height = 0;
    this.ww = c.width = innerWidth;
    this.hh = c.height = innerHeight;

    this.center_x = int(this.ww / 2);
    this.center_y = int(this.hh / 2);

    this.o_x = this.center_x - int(NUM_TILES_X * TILE_SIZE * SCALE / 2);
    this.o_y = this.center_y - int(NUM_TILES_Y * TILE_SIZE * SCALE / 2);

    this.draw();
  }
}

export default View;
