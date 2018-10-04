import { TILE_SIZE, SCALE, sprites } from './constants';
import { DEBUG, editTiles, NUM_TILES } from './constants';
import { int, vm, vm2, vmn, vplus, vminus, vint, vfpart } from './util';
import { Point, Sprite } from './types';
import { State } from './state';
import { getTile } from './layer';

class View {
  c: HTMLCanvasElement;
  d: CanvasRenderingContext2D;
  wsize: Point;
  origin: Point;
  spriteImg: HTMLImageElement;
  center: Point;

  constructor(c: HTMLCanvasElement, d: CanvasRenderingContext2D) {
    this.c = c;
    this.d = d;
  }

  draw(state: State) {
    const { c, d } = this;

    // background
    d.fillStyle = "#def";
    d.fillRect(0, 0, this.wsize.x, this.wsize.y);
    d.fillStyle = "rgba(255,255,255,0.5)";
    d.fillRect(this.origin.x, this.origin.y, NUM_TILES.x * TILE_SIZE * SCALE, NUM_TILES.y * TILE_SIZE * SCALE);

    d.save();
    d.beginPath();
    d.rect(this.origin.x, this.origin.y, NUM_TILES.x * TILE_SIZE * SCALE, NUM_TILES.y * TILE_SIZE * SCALE);
    d.clip();

    const vp = state.viewPort;

    for (let y = 0; y < NUM_TILES.y + 1; y++) {
      for (let x = 0; x < NUM_TILES.x + 1; x++) {
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

    if (wpos.x < -1 || wpos.y < -1 || wpos.x >= NUM_TILES.x + 1 || wpos.y >= NUM_TILES.y + 1)
      return;


    this.raw_draw_sprite(sprite_id, vm2(this.origin, wpos, (o, wpos) => o + wpos * TILE_SIZE * SCALE), flip);
  }

  resize() {
    const c = this.c;

    c.width = 0;
    c.height = 0;
    c.width = innerWidth;
    c.height = innerHeight;
    this.wsize = { x: c.width, y: c.height };

    this.center = vm(this.wsize, wsize => int(wsize / 2));
    this.origin = vm2(this.center, NUM_TILES, (c, NT) => c - int(NT * TILE_SIZE * SCALE / 2));
  }

  world_of_canvas(p: Point, s: State): Point {
    return vmn([s.viewPort, this.origin, p], ([vp, o, p]) => int(vp + (p - o) / (TILE_SIZE * SCALE)));
  }
}

export default View;
