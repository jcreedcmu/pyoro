import produce from 'immer';
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { App } from './app';
import { DEBUG, editTiles, guiData, NUM_INVENTORY_ITEMS, NUM_TILES, rotateTile, SCALE, sprites, TILE_SIZE, tools } from './constants';
import { getItem, getTile, PointMap, putItem } from './layer';
import { renderGameAnims, renderIfaceAnims, show_empty_tile_override, tileOfState } from './model';
import { int, vfpart, vint, vm, vm2, vminus, vmn, vplus, vscale } from './point';
import { State } from './state';
import { Item, Point, Sprite, Tool, ToolTile } from './types';
import * as u from './util';
import { rgba } from './util';

export type WidgetPoint =
  | { t: 'Toolbar', tilePoint: Point }
  | { t: 'World', p: Point };

// Functional View Data
export type FView = {
  d: CanvasRenderingContext2D;
  vd: ViewData;
  spriteImg: HTMLImageElement;
}

export type ViewData = {
  wsize: Point,
  origin: Point,
};

export function initView() {
  const root = ReactDOM.createRoot(document.getElementById('render-root')!);
  root.render(React.createElement(App, {}));
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

  // emptyTileOverride "temporarily" displays things as empty, for
  // which we want to retain some kind of convenient way of reinstating
  // them. Therefore I am using this for savepoints (because I want old
  // savepoints to spring back into existence when I change lastSave)
  // but not any longer for other inventory stuff, which I just want to
  // statefully update in the actual overlay layer.
  const emptyTileOverride: PointMap<boolean> = { tiles: {} };
  putItem(emptyTileOverride, state.game.lastSave, true);

  // draw the background
  for (let y = 0; y < NUM_TILES.y + 1; y++) {
    for (let x = 0; x < NUM_TILES.x + 1; x++) {
      const p = { x, y };
      const realp = vplus(p, vint(vp));
      let tile = tileOfState(state, realp);
      if (getItem(emptyTileOverride, realp) && show_empty_tile_override(state))
        tile = 'empty';
      draw_sprite(fv, tile, vminus(p, vfpart(vp)));
    }
  }

  const playerSprite = state.game.player.dead ? 'player_dead' : state.game.player.animState;

  draw_sprite(fv, playerSprite,
    vminus(state.game.player.pos, vp),
    state.game.player.flipState == 'left');
}

function drawSelection(d: CanvasRenderingContext2D, p: Point): void {
  d.fillStyle = rgba(0, 192, 192, 0.7);
  d.beginPath();
  d.rect(p.x * TILE_SIZE * SCALE, p.y * TILE_SIZE * SCALE, TILE_SIZE * SCALE, TILE_SIZE * SCALE);
  d.rect((p.x * TILE_SIZE + 1) * SCALE, (p.y * TILE_SIZE + 1) * SCALE, (TILE_SIZE - 2) * SCALE, (TILE_SIZE - 2) * SCALE);
  d.fill('evenodd');
}

function drawEditorStuff(fv: FView, state: State): void {
  const { d, vd: { origin } } = fv;

  // toolbar
  tools.forEach((t, ix) => {
    raw_draw_sprite(fv, ix == state.iface.currentToolIx ? `${t}_active` : `${t}_inactive`,
      { x: ix * TILE_SIZE * SCALE, y: TILE_SIZE * SCALE });
  });

  // background of tile list
  d.fillStyle = guiData.background_color;
  d.fillRect(0, 0, editTiles.length * TILE_SIZE * SCALE, 1 * TILE_SIZE * SCALE);

  // tiles for pencil tool
  editTiles.forEach((et, ix) => {
    const t = rotateTile(et, state.iface.editTileRotation);
    raw_draw_sprite(fv, t, { x: ix * TILE_SIZE * SCALE, y: 0 });
  });

  // selected tile & selected tool
  drawSelection(d, { x: state.iface.editTileIx, y: 0 });

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

  function drawInventoryItem(item: Item, count: number, p: Point) {
    const ipos = vplus(start, vscale(p, TILE_SIZE * SCALE));
    raw_draw_sprite(fv, item, ipos);

    // XXX temporary debugging count display, should do nice pixel font or something.
    if (count > 1) {
      d.fillStyle = 'white';
      const size = 7 * SCALE;
      const offset = SCALE * TILE_SIZE - size;
      d.fillRect(ipos.x + offset, ipos.y + offset, size, size);
      d.fillStyle = 'black';
      d.textBaseline = 'middle';
      d.textAlign = 'center';
      d.fillText(`${count}`, ipos.x + offset + size / 2, ipos.y + offset + size / 2);
    }
  }

  const items: Item[] = ['teal_fruit', 'coin'];
  items.forEach((item, ix) => {
    const count = i[item];
    if (count != undefined && count > 0) {
      drawInventoryItem(item, count, { x: ix, y: 0 });
    }
  });

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

export function drawView(fv: FView, state: State): void {
  const { d } = fv;
  d.save();
  d.scale(devicePixelRatio, devicePixelRatio);

  // Here's where we let animators actually act
  let effectiveState = state;
  const ams = state.anim;
  if (ams !== null) {
    effectiveState = produce(state, s => {
      s.iface = renderIfaceAnims(ams.animator.animsIface, ams.frame, s);
      s.game = renderGameAnims(ams.animator.animsGame, ams.frame, s.game);
    });
  }
  drawScaled(fv, effectiveState);
  d.restore();
}

export function resizeView(c: HTMLCanvasElement): ViewData {
  const ratio = devicePixelRatio;

  c.width = innerWidth;
  c.height = innerHeight;

  const ow = innerWidth;
  const oh = innerHeight;

  c.width = ow * ratio;
  c.height = oh * ratio;

  c.style.width = ow + 'px';
  c.style.height = oh + 'px';

  const wsize = vm({ x: c.width / ratio, y: c.height / ratio }, w => int(w));

  const center = vm(wsize, wsize => int(wsize / 2));
  const origin = vm2(center, NUM_TILES, (c, NT) => c - int(NT * TILE_SIZE * SCALE / 2));

  return { origin, wsize };
}

export function wpoint_of_vd(vd: ViewData, p: Point, s: State): WidgetPoint {
  const { origin } = vd;

  const world_size = vm(NUM_TILES, NT => TILE_SIZE * SCALE * NT);
  if (u.inrect(p, { p: origin, sz: world_size }))
    return {
      t: 'World',
      p: vmn([s.iface.viewPort, origin, p], ([vp, o, p]) => int(vp + (p - o) / (TILE_SIZE * SCALE)))
    };
  else {
    const rv: WidgetPoint = {
      t: 'Toolbar',
      tilePoint: vm(p, p => int(p / (SCALE * TILE_SIZE))),
    }
    return rv;
  }
}
