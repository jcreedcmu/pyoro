import { TILE_SIZE, SCALE, NUM_INVENTORY_ITEMS, sprites, rotateTile } from './constants';
import { DEBUG, editTiles, NUM_TILES, guiData } from './constants';
import { int, vm, vm2, vmn, vplus, vminus, vint, vfpart, vequal } from './point';
import { rgba } from './util';
import * as u from './util';
import { Point, Sprite } from './types';
import { State, Item } from './state';
import { getItem, putItem, getTile, putTile, PointMap } from './layer';

import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { CanvasInfo, useCanvas } from './use-canvas';

export type WidgetPoint =
  | { t: 'EditTiles', ix: number }
  | { t: 'World', p: Point };

// Functional View Data
type FView = {
  d: CanvasRenderingContext2D;
  vd: ViewData;
  spriteImg: HTMLImageElement;
}

type ViewData = {
  wsize: Point,
  origin: Point,
};

function CanvasTest(props: { msg: string }): JSX.Element {
  function render(ci: CanvasInfo, s: string) {
    const { d, size: { x, y } } = ci;
    console.log(s);
    d.fillStyle = 'white';
    d.fillRect(0, 0, x, y);
    d.fillStyle = 'red';
    d.fillText(props.msg, 12, 24);
  }
  const [canvasState, setCanvasState] = React.useState('hello');
  const [cref, mc] = useCanvas(canvasState, render)
  return React.createElement('canvas', { ref: cref });
}

export function initView() {
  const root = ReactDOM.createRoot(document.getElementById('render-root')!);
  root.render(React.createElement(CanvasTest, { msg: 'Hello World' }));
}

function drawScaled(fv: FView, state: State): void {
  const { d, vd: { origin, wsize } } = fv;

  // background
  d.fillStyle = guiData.stage_color;
  d.fillRect(0, 0, wsize.x, wsize.y);
  d.fillStyle = guiData.background_color;
  d.fillRect(origin.x, origin.y,
    NUM_TILES.x * TILE_SIZE * SCALE, NUM_TILES.y * TILE_SIZE * SCALE);

  // set up clip rect for main play field
  d.save();
  d.beginPath();
  d.rect(origin.x, origin.y,
    NUM_TILES.x * TILE_SIZE * SCALE, NUM_TILES.y * TILE_SIZE * SCALE);
  d.clip();
  drawField(fv, state);
  d.restore();

  drawEditorStuff(fv, state);
  drawInventory(fv, state);

  if (DEBUG.devicePixelRatio) {
    d.fillStyle = "black";
    d.fillRect(200, 100.25, 100, 0.5);
    d.fillRect(200, 110.5, 100, 0.5);
    d.fillRect(200, 120.75, 100, 0.5);
    d.fillRect(200, 131, 100, 0.5);
  }
}

function drawField(fv: FView, state: State): void {
  const { d } = fv;
  const vp = state.iface.viewPort;

  const tileOverride: PointMap<boolean> = { tiles: {} };
  putItem(tileOverride, state.game.lastSave, true);

  Object.entries<Point | undefined, Item>(state.game.inventory).forEach(([k, v]) => {
    if (v != undefined) {
      putItem(tileOverride, v, true);
    }
  });

  // draw the background
  for (let y = 0; y < NUM_TILES.y + 1; y++) {
    for (let x = 0; x < NUM_TILES.x + 1; x++) {
      const p = { x, y };
      const realp = vplus(p, vint(vp));
      let tile = getTile(state.game.overlay, realp);
      if (getItem(tileOverride, realp))
        tile = 'empty';
      draw_sprite(fv, tile, vminus(p, vfpart(vp)));
    }
  }

  const playerSprite = state.game.player.dead ? 'player_dead' : state.game.player.animState;

  draw_sprite(fv, playerSprite,
    vminus(state.game.player.pos, vp),
    state.game.player.flipState == 'left');
}

function drawEditorStuff(fv: FView, state: State): void {
  const { d, vd: { origin } } = fv;

  // background of tile list
  d.fillStyle = guiData.background_color;
  d.fillRect(SCALE, SCALE, editTiles.length * TILE_SIZE * SCALE, 1 * TILE_SIZE * SCALE);

  // tiles for editor
  editTiles.forEach((et, ix) => {
    const t = rotateTile(et, state.iface.editTileRotation);
    raw_draw_sprite(fv, t, { x: SCALE + ix * TILE_SIZE * SCALE, y: SCALE });
  });

  // selected tile in editor
  const sel = state.iface.editTileIx;
  d.fillStyle = rgba(0, 192, 192, 0.7);
  d.beginPath();
  d.rect(sel * TILE_SIZE * SCALE, 0, (2 + TILE_SIZE) * SCALE, (2 + TILE_SIZE) * SCALE);
  d.rect(sel * TILE_SIZE * SCALE + SCALE, SCALE, (TILE_SIZE) * SCALE, (TILE_SIZE) * SCALE);
  d.fill('evenodd');

  if (state.iface.blackout) {
    const c = u.rgbOfColor(guiData.stage_color);
    d.fillStyle = rgba(c.r, c.g, c.b, state.iface.blackout);
    d.fillRect(origin.x, origin.y, NUM_TILES.x * TILE_SIZE * SCALE, NUM_TILES.y * TILE_SIZE * SCALE);
    return;
  }
}

function drawInventory(fv: FView, state: State): void {
  const { d, vd: { origin } } = fv;
  const i = state.game.inventory;
  d.fillStyle = guiData.background_color;
  const start = {
    x: origin.x,
    y: origin.y + (1 + NUM_TILES.y * TILE_SIZE) * SCALE,
  };
  d.fillRect(start.x, start.y,
    NUM_INVENTORY_ITEMS * TILE_SIZE * SCALE, 1 * TILE_SIZE * SCALE);

  if (i.teal_fruit != undefined) {
    raw_draw_sprite(fv, 'teal_fruit', start);
  }
}

// spos: position in window, in pixels. (0,0) is top left of window
function raw_draw_sprite(fv: FView, sprite_id: Sprite, spos: Point, flip?: boolean): void {
  const sprite_loc = sprites[sprite_id];

  const d = fv.d;
  d.save();
  d.translate(spos.x, spos.y);
  if (flip) {
    d.translate(TILE_SIZE * SCALE, 0);
    d.scale(-1, 1);
  }
  d.imageSmoothingEnabled = false;
  d.drawImage(fv.spriteImg,
    sprite_loc.x * TILE_SIZE, sprite_loc.y * TILE_SIZE,
    TILE_SIZE, TILE_SIZE,
    0, 0,
    TILE_SIZE * SCALE, TILE_SIZE * SCALE);
  d.restore();
}

// wpos: position in window, in tiles. (0,0) is top left of viewport
function draw_sprite(fv: FView, sprite_id: Sprite, wpos: Point, flip?: boolean): void {
  const { vd: { origin } } = fv;
  if (wpos.x < - 1 || wpos.y < -1 || wpos.x >= NUM_TILES.x + 1 || wpos.y >= NUM_TILES.y + 1)
    return;
  raw_draw_sprite(fv, sprite_id, vm2(origin, wpos, (o, wpos) => o + wpos * TILE_SIZE * SCALE), flip);
}

export class View {
  c: HTMLCanvasElement;
  d: CanvasRenderingContext2D;
  vd: ViewData | null = null;
  spriteImg: HTMLImageElement | null = null;

  constructor(c: HTMLCanvasElement, d: CanvasRenderingContext2D) {
    this.c = c;
    this.d = d;
  }

  getFview(): FView | null {
    if (this.vd == null) return null;
    if (this.spriteImg == null) return null;
    return { d: this.d, vd: this.vd, spriteImg: this.spriteImg };
  }

  draw(state: State): void {
    const fv = this.getFview();
    if (fv !== null) {
      const { d } = fv;
      d.save();
      d.scale(devicePixelRatio, devicePixelRatio);
      drawScaled(fv, state);
      d.restore();
    }
  }

  resize(): void {
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

    const wsize = { x: c.width / ratio, y: c.height / ratio };

    const center = vm(wsize, wsize => int(wsize / 2));
    const origin = vm2(center, NUM_TILES, (c, NT) => c - int(NT * TILE_SIZE * SCALE / 2));
    this.vd = { origin, wsize };
  }

  wpoint_of_canvas(p: Point, s: State): WidgetPoint {
    if (this.vd == null)
      throw new Error('No View');
    const { origin } = this.vd;

    const world_size = vm(NUM_TILES, NT => TILE_SIZE * SCALE * NT);
    if (u.inrect(p, { p: origin, sz: world_size }))
      return {
        t: 'World',
        p: vmn([s.iface.viewPort, origin, p], ([vp, o, p]) => int(vp + (p - o) / (TILE_SIZE * SCALE)))
      };
    else {
      return {
        t: 'EditTiles',
        ix: vmn([{ x: SCALE, y: 0 }, p], ([o, p]) => int((p - o) / (TILE_SIZE * SCALE))).x,
      }
    }
  }
}
