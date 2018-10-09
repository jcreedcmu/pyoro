import { TILE_SIZE, SCALE, sprites, rotateTile } from './constants';
import { DEBUG, editTiles, NUM_TILES, guiData } from './constants';
import { int, vm, vm2, vmn, vplus, vminus, vint, vfpart, rgba, vequal } from './util';
import * as u from './util';
import { Point, Sprite } from './types';
import { State, Item } from './state';
import { getItem, putItem, getTile, putTile, PointMap } from './layer';

export type WidgetPoint =
  | { t: 'EditTiles', ix: number }
  | { t: 'World', p: Point };

export class View {
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
    const { d } = this;
    d.save();
    d.scale(devicePixelRatio, devicePixelRatio);
    this.drawScaled(state);
    d.restore();
  }

  drawScaled(state: State) {
    const { d } = this;

    // background
    d.fillStyle = guiData.stage_color;
    d.fillRect(0, 0, this.wsize.x, this.wsize.y);
    d.fillStyle = guiData.background_color;
    d.fillRect(this.origin.x, this.origin.y, NUM_TILES.x * TILE_SIZE * SCALE, NUM_TILES.y * TILE_SIZE * SCALE);

    // set up clip rect for main play field
    d.save();
    d.beginPath();
    d.rect(this.origin.x, this.origin.y, NUM_TILES.x * TILE_SIZE * SCALE, NUM_TILES.y * TILE_SIZE * SCALE);
    d.clip();

    // draw clipped in the following scope
    {
      const vp = state.viewPort;

      const tileOverride: PointMap<boolean> = { tiles: {} };
      putItem(tileOverride, state.last_save, true);

      Object.entries<Point | undefined, Item>(state.inventory).forEach(([k, v]) => {
        if (v != undefined) {
          putItem(tileOverride, v, true);
        }
      });

      // draw the background
      for (let y = 0; y < NUM_TILES.y + 1; y++) {
        for (let x = 0; x < NUM_TILES.x + 1; x++) {
          const p = { x, y };
          const realp = vplus(p, vint(vp));
          let tile = getTile(state.overlay, realp);
          if (getItem(tileOverride, realp))
            tile = 'empty';
          this.draw_sprite(tile, vminus(p, vfpart(vp)));
        }
      }

      const playerSprite = state.player.dead ? 'player_dead' : state.player.animState;

      this.draw_sprite(playerSprite,
        vminus(state.player.pos, vp),
        state.player.flipState == 'left');
    }
    d.restore();

    // background of tile list
    d.fillStyle = guiData.background_color;
    d.fillRect(SCALE, SCALE, editTiles.length * TILE_SIZE * SCALE, 1 * TILE_SIZE * SCALE);

    // tiles for editor
    editTiles.forEach((et, ix) => {
      const t = rotateTile(et, state.iface.editTileRotation);
      this.raw_draw_sprite(t, { x: SCALE + ix * TILE_SIZE * SCALE, y: SCALE });
    });

    // selected tile in editor
    const sel = state.iface.editTileIx;
    d.fillStyle = rgba(0, 192, 192, 0.7);
    d.beginPath();
    d.rect(sel * TILE_SIZE * SCALE, 0, (2 + TILE_SIZE) * SCALE, (2 + TILE_SIZE) * SCALE);
    d.rect(sel * TILE_SIZE * SCALE + SCALE, SCALE, (TILE_SIZE) * SCALE, (TILE_SIZE) * SCALE);
    d.fill('evenodd');

    if (state.extra.blackout) {
      const c = u.rgbOfColor(guiData.stage_color);
      d.fillStyle = rgba(c.r, c.g, c.b, state.extra.blackout);
      d.fillRect(this.origin.x, this.origin.y, NUM_TILES.x * TILE_SIZE * SCALE, NUM_TILES.y * TILE_SIZE * SCALE);
      return;
    }

    if (DEBUG.devicePixelRatio) {
      d.fillStyle = "black";
      d.fillRect(200, 100.25, 100, 0.5);
      d.fillRect(200, 110.5, 100, 0.5);
      d.fillRect(200, 120.75, 100, 0.5);
      d.fillRect(200, 131, 100, 0.5);
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

    if (wpos.x < - 1 || wpos.y < -1 || wpos.x >= NUM_TILES.x + 1 || wpos.y >= NUM_TILES.y + 1)
      return;


    this.raw_draw_sprite(sprite_id, vm2(this.origin, wpos, (o, wpos) => o + wpos * TILE_SIZE * SCALE), flip);
  }

  resize() {
    const { c, d } = this;

    const ratio = devicePixelRatio;

    c.width = innerWidth;
    c.height = innerHeight;

    const ow = innerWidth;
    const oh = innerHeight;

    c.width = ow * ratio;
    c.height = oh * ratio;

    c.style.width = ow + 'px';
    c.style.height = oh + 'px';

    this.wsize = { x: c.width / ratio, y: c.height / ratio };

    const center = vm(this.wsize, wsize => int(wsize / 2));
    this.origin = vm2(center, NUM_TILES, (c, NT) => c - int(NT * TILE_SIZE * SCALE / 2));
  }

  wpoint_of_canvas(p: Point, s: State): WidgetPoint {
    const world_size = vm(NUM_TILES, NT => TILE_SIZE * SCALE * NT);
    if (u.inrect(p, { p: this.origin, sz: world_size }))
      return {
        t: 'World',
        p: vmn([s.viewPort, this.origin, p], ([vp, o, p]) => int(vp + (p - o) / (TILE_SIZE * SCALE)))
      };
    else {
      return {
        t: 'EditTiles',
        ix: vmn([{ x: SCALE, y: 0 }, p], ([o, p]) => int((p - o) / (TILE_SIZE * SCALE))).x,
      }
    }
  }
}
