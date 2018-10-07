import { TILE_SIZE, SCALE, sprites } from './constants';
import { DEBUG, editTiles, NUM_TILES } from './constants';
import { int, vm, vm2, vmn, vplus, vminus, vint, vfpart, rgba, vequal } from './util';
import { Point, Sprite } from './types';
import { State } from './state';
import { getTile } from './layer';

class View {
  c: HTMLCanvasElement;
  d: CanvasRenderingContext2D;
  wsize: Point;
  origin: Point;
  spriteImg: HTMLImageElement;

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
    // draw clipped
    {
      const vp = state.viewPort;

      for (let y = 0; y < NUM_TILES.y + 1; y++) {
        for (let x = 0; x < NUM_TILES.x + 1; x++) {
          const p = { x, y };
          const realp = vplus(p, vint(vp));
          let tile = getTile(state.overlay, realp);

          if (tile == 'save_point' && vequal(realp, state.last_save)) {
            tile = 'empty';
          }

          this.draw_sprite(tile, vminus(p, vfpart(vp)));
        }
      }

      const playerSprite = state.player.dead ? 'player_dead' : state.player.animState;

      this.draw_sprite(playerSprite,
        vminus(state.player.pos, vp),
        state.player.flipState == 'left');
    }
    d.restore();

    // tiles for editor
    editTiles.forEach((et, ix) => {
      this.raw_draw_sprite(et, { x: SCALE + ix * TILE_SIZE * SCALE, y: SCALE });
    });

    // selected tile in editor
    const sel = state.iface.editTileIx;
    d.fillStyle = rgba(0, 192, 192, 0.7);
    d.beginPath();
    d.rect(sel * TILE_SIZE * SCALE, 0, (2 + TILE_SIZE) * SCALE, (2 + TILE_SIZE) * SCALE);
    d.rect(sel * TILE_SIZE * SCALE + SCALE, SCALE, (TILE_SIZE) * SCALE, (TILE_SIZE) * SCALE);
    d.fill('evenodd');

    if (state.extra.blackout) {
      d.fillStyle = rgba(0, 0, 0, state.extra.blackout);
      d.fillRect(this.origin.x, this.origin.y, NUM_TILES.x * TILE_SIZE * SCALE, NUM_TILES.y * TILE_SIZE * SCALE);
      return;
    }
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

    c.width = innerWidth;
    c.height = innerHeight;
    this.wsize = { x: c.width, y: c.height };

    const center = vm(this.wsize, wsize => int(wsize / 2));
    this.origin = vm2(center, NUM_TILES, (c, NT) => c - int(NT * TILE_SIZE * SCALE / 2));
  }

  world_of_canvas(p: Point, s: State): Point {
    return vmn([s.viewPort, this.origin, p], ([vp, o, p]) => int(vp + (p - o) / (TILE_SIZE * SCALE)));
  }
}

export default View;
