import { TILE_SIZE, SCALE, NUM_TILES_X, NUM_TILES_Y, sprites } from './constants';
import { DEBUG, editTiles } from './constants';
import { Model } from './model';
import { int, vplus, vint, vscale, vminus, vfpart, vdiv } from './util';
import { Point, Sprite } from './types';
import { State } from './state';
import { getTile } from './layer';

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

  draw(state: State) {
    const c = this.c;
    const d = this.d;

    // background
    d.fillStyle = "#def";
    d.fillRect(0, 0, this.ww, this.hh);
    d.fillStyle = "rgba(255,255,255,0.5)";
    d.fillRect(this.o_x, this.o_y, NUM_TILES_X * TILE_SIZE * SCALE, NUM_TILES_Y * TILE_SIZE * SCALE);

    d.save();
    d.beginPath();
    d.rect(this.o_x, this.o_y, NUM_TILES_X * TILE_SIZE * SCALE, NUM_TILES_Y * TILE_SIZE * SCALE);
    d.clip();

    const vp = state.viewPort;

    for (let y = 0; y < NUM_TILES_Y + 1; y++) {
      for (let x = 0; x < NUM_TILES_X + 1; x++) {
        const p = { x, y };
        this.draw_sprite(getTile(state.overlay, vplus(p, vint(vp))), vminus(p, vfpart(vp)));
      }
    }

    this.draw_sprite(state.player.animState,
      vminus(state.player.pos, vp),
      state.player.flipState == 'left');

    d.restore();

    this.raw_draw_sprite(editTiles[state.iface.editTileIx], { x: SCALE, y: SCALE });
  }

  // spos: position in window, in pixels. (0,0) is top left of window
  raw_draw_sprite(sprite_id: Sprite, spos: Point, flip?: boolean): void {
    const sprite_loc = sprites[sprite_id];

    const d = this.d;
    d.save();
    d.translate(spos.x, spos.y);
    if (flip) {
      d.translate(TILE_SIZE * SCALE, 0);
      d.scale(-1, 1);
    }
    d.imageSmoothingEnabled = false;
    d.drawImage(this.spriteImg,
      sprite_loc.x * TILE_SIZE, sprite_loc.y * TILE_SIZE,
      TILE_SIZE, TILE_SIZE,
      0, 0,
      TILE_SIZE * SCALE, TILE_SIZE * SCALE);
    d.restore();
  }

  // wpos: position in window, in tiles. (0,0) is top left of viewport
  draw_sprite(sprite_id: Sprite, wpos: Point, flip?: boolean): void {

    if (wpos.x < -1 || wpos.y < -1 || wpos.x >= NUM_TILES_X + 1 || wpos.y >= NUM_TILES_Y + 1)
      return;

    this.raw_draw_sprite(sprite_id, vplus({ x: this.o_x, y: this.o_y }, vscale(wpos, TILE_SIZE * SCALE)), flip);
  }

  resize() {
    const c = this.c;

    c.width = 0;
    c.height = 0;
    this.ww = c.width = innerWidth;
    this.hh = c.height = innerHeight;

    this.center_x = int(this.ww / 2);
    this.center_y = int(this.hh / 2);

    this.o_x = this.center_x - int(NUM_TILES_X * TILE_SIZE * SCALE / 2);
    this.o_y = this.center_y - int(NUM_TILES_Y * TILE_SIZE * SCALE / 2);

    this.draw(this.model.state);
  }

  origin(): Point {
    return { x: this.o_x, y: this.o_y };
  }

  world_of_canvas(p: Point): Point {
    return vint(vplus(this.model.get_viewPort(), vdiv(vminus(p, this.origin()), TILE_SIZE * SCALE)));
  }
}

export default View;
