import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { App } from './app';
import { COMBO_THRESHOLD, editTiles, guiData, NUM_INVENTORY_ITEMS, NUM_TILES, rotateTile, SCALE, TILE_SIZE, tools } from './constants';
import { emptyTile, getItem, PointMap, putItem } from './layer';
import { DEBUG } from './logger';
import { renderGameAnims, renderIfaceAnims, show_empty_tile_override, tileOfState } from './model';
import { int, Point, vfpart, vint, vm, vm2, vminus, vmn, vplus, vscale, vsub } from './point';
import { Combo, State } from './state';
import { Item, PlayerSprite, Tile, ToolTile } from './types';
import * as u from './util';
import { rgba } from './util';
import { getTestState } from './test-state';
import { motionTestResult } from './test-motion';

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

/**
 * Returns combo data in human readable form
 */
export function stringOfCombo(c: Combo): string {
  if (c == undefined) return 'none';
  return `(${c.dir.x}, ${c.dir.y}) x ${c.rep}`;
}

/**
 * Initializes the react renderer
 */
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

  const ts = state.iface.toolState;
  if (ts.t == 'modify_tool' && ts.modifyCell !== null) {
    drawWorldTileSelection(fv, vsub(ts.modifyCell, state.iface.viewPort));
  }
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

  const debugLines: string[] = [];

  if (DEBUG.gameTime) {
    debugLines.push(`time: ${state.game.time}`);
  }
  if (DEBUG.impetus) {
    debugLines.push(`impetus: ${JSON.stringify(state.game.player.impetus)}`);
  }
  if (DEBUG.combo) {
    debugLines.push(`combo: ${stringOfCombo(state.game.player.combo)}`);
  }

  debugLines.forEach((line, i) => {
    d.fillStyle = 'white';
    d.font = '10px sans-serif';
    d.textBaseline = 'top';
    d.fillText(line, fv.vd.origin.x + 3, fv.vd.origin.y - (i + 1) * 15);
  });
}

function spriteLocOfTile(tile: Tile): Point {
  switch (tile.t) {
    case 'box': return { x: 1, y: 4 };
    case 'box3': return { x: 3, y: 3 };
    case 'fragile_box': return { x: 2, y: 6 };
    case 'empty': return { x: 0, y: 0 };
    case 'broken_box': return { x: 4, y: 3 };
    case 'up_box': return { x: 6, y: 6 };
    case 'spike': switch (tile.direction) {
      case 'up': return { x: 0, y: 3 };
      case 'right': return { x: 2, y: 3 };
      case 'left': return { x: 2, y: 4 };
      case 'down': return { x: 2, y: 5 };
    } break;
    case 'item': switch (tile.item) {
      case 'teal_fruit': return { x: 3, y: 5 };
      case 'coin': return { x: 3, y: 4 };
    } break;
    case 'save_point': return { x: 2, y: 2 };
    case 'grip_wall': return { x: 3, y: 0 };
    case 'coin_wall': return { x: 4, y: 5 };
    case 'button_on': return { x: 5, y: 5 };
    case 'button_off': return { x: 5, y: 6 };
    case 'timed_wall': return { x: 9, y: 2 };
    case 'buttoned_wall': return { x: 9, y: 3 };
    case 'bus_button': switch (tile.bus) {
      case 'red': return tile.on ? { x: 10, y: 6 } : { x: 10, y: 5 };
      case 'green': return tile.on ? { x: 11, y: 6 } : { x: 11, y: 5 };
      case 'blue': return tile.on ? { x: 12, y: 6 } : { x: 12, y: 5 };
    } break;
    case 'bus_block': switch (tile.bus) {
      case 'red': return tile.on ? { x: 10, y: 4 } : { x: 10, y: 3 };
      case 'green': return tile.on ? { x: 11, y: 4 } : { x: 11, y: 3 };
      case 'blue': return tile.on ? { x: 12, y: 4 } : { x: 12, y: 3 };
    } break;
    case 'motion_block': switch (tile.direction) {
      case 'up': return tile.on ? { x: 14, y: 4 } : { x: 14, y: 3 };
      case 'down': return tile.on ? { x: 13, y: 4 } : { x: 13, y: 3 };
      case 'left': return tile.on ? { x: 15, y: 4 } : { x: 15, y: 3 };
      case 'right': return tile.on ? { x: 16, y: 4 } : { x: 16, y: 3 };
    } break;
    case 'door': return { x: 8, y: 6 };
    case 'side_breakable': return { x: 7, y: 6 };
  }

}

function spriteLocOfPlayer(s: PlayerSprite): Point {
  switch (s) {
    case 'player': return { x: 1, y: 2 };
    case 'player_dead': return { x: 2, y: 0 };
    case 'player_fall': return { x: 1, y: 0 };
    case 'player_rise': return { x: 1, y: 1 };
    case 'player_wall': return { x: 2, y: 1 };
    case 'player_crouch': return { x: 3, y: 6 };
    case 'player_run': return { x: 3, y: 2 };
  }
}

function spriteLocOfTool(s: ToolTile): Point {
  switch (s) {
    case 'hand_tool_inactive': return { x: 10, y: 0 };
    case 'hand_tool_active': return { x: 10, y: 1 };
    case 'pencil_tool_inactive': return { x: 11, y: 0 };
    case 'pencil_tool_active': return { x: 11, y: 1 };
    case 'modify_tool_inactive': return { x: 12, y: 0 };
    case 'modify_tool_active': return { x: 12, y: 1 };
    case 'play_tool_inactive': return { x: 13, y: 0 };
    case 'play_tool_active': return { x: 13, y: 1 };
    case 'test_tool_inactive': return { x: 14, y: 0 };
    case 'test_tool_active': return { x: 14, y: 1 };
  }
}

function drawField(fv: FView, state: State): void {
  const player = state.game.player;
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
      const viewIntent = state.iface.toolState.t != 'play_tool';
      let tile = tileOfState(state, realp, viewIntent);
      // For now, only do empty-tile overriding if the erstwhile tile is a save_point.
      if (getItem(emptyTileOverride, realp) && show_empty_tile_override(state) && tile.t == 'save_point')
        tile = emptyTile();
      draw_sprite(fv, spriteLocOfTile(tile), vminus(p, vfpart(vp)));
    }
  }

  const basePlayerSprite: PlayerSprite = player.dead ? 'player_dead' : player.animState;
  const playerSprite: PlayerSprite = (basePlayerSprite == 'player' &&
    player.combo != undefined && player.combo.dir.x != 0 && player.combo.rep >= COMBO_THRESHOLD) ? 'player_run' : basePlayerSprite;

  const effectivePos = player.posOffset == undefined ? player.pos : vplus(player.pos, player.posOffset);
  draw_sprite(fv, spriteLocOfPlayer(playerSprite),
    vminus(effectivePos, vp),
    player.flipState == 'left');
}

function drawInventorySelection(d: CanvasRenderingContext2D, p: Point): void {
  d.fillStyle = rgba(0, 192, 192, 0.7);
  d.beginPath();
  d.rect(p.x * TILE_SIZE * SCALE, p.y * TILE_SIZE * SCALE, TILE_SIZE * SCALE, TILE_SIZE * SCALE);
  d.rect((p.x * TILE_SIZE + 1) * SCALE, (p.y * TILE_SIZE + 1) * SCALE, (TILE_SIZE - 2) * SCALE, (TILE_SIZE - 2) * SCALE);
  d.fill('evenodd');
}

function drawWorldTileSelection(fv: FView, p: Point): void {
  const { d } = fv;
  d.fillStyle = rgba(0, 192, 192, 0.7);
  const sp = worldTilePosition(fv, p);
  d.beginPath();
  d.rect(sp.x, sp.y, TILE_SIZE * SCALE, TILE_SIZE * SCALE);
  d.rect(sp.x + SCALE, sp.y + SCALE, (TILE_SIZE - 2) * SCALE, (TILE_SIZE - 2) * SCALE);
  d.fill('evenodd');
}

function drawEditorStuff(fv: FView, state: State): void {
  const { d, vd: { origin } } = fv;

  // toolbar
  tools.forEach((t, ix) => {
    raw_draw_sprite(fv, spriteLocOfTool(t == state.iface.toolState.t ? `${t}_active` : `${t}_inactive`),
      { x: ix * TILE_SIZE * SCALE, y: TILE_SIZE * SCALE });
  });

  // background of tile list
  d.fillStyle = guiData.background_color;
  d.fillRect(0, 0, editTiles.length * TILE_SIZE * SCALE, 1 * TILE_SIZE * SCALE);

  // tiles for pencil tool
  editTiles.forEach((et, ix) => {
    const t = rotateTile(et, state.iface.editTileRotation);
    raw_draw_sprite(fv, spriteLocOfTile(t), { x: ix * TILE_SIZE * SCALE, y: 0 });
  });

  // selected tile & selected tool
  drawInventorySelection(d, { x: state.iface.editTileIx, y: 0 });

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
    raw_draw_sprite(fv, spriteLocOfTile({ t: 'item', item }), ipos);

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
// sprite_loc: position in sprite sheet, in tiles.
function raw_draw_sprite(fv: FView, sprite_loc: Point, spos: Point, flip?: boolean): void {
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

function worldTilePosition(fv: FView, wpos: Point): Point {
  return vm2(fv.vd.origin, wpos, (o, wpos) => o + wpos * TILE_SIZE * SCALE);
}

// wpos: position in window, in tiles. (0,0) is top left of viewport
// sprite_loc: position in sprite sheet, in tiles.
function draw_sprite(fv: FView, sprite_loc: Point, wpos: Point, flip?: boolean): void {
  const { vd: { origin } } = fv;
  if (wpos.x < - 1 || wpos.y < -1 || wpos.x >= NUM_TILES.x + 1 || wpos.y >= NUM_TILES.y + 1)
    return;
  raw_draw_sprite(fv, sprite_loc, worldTilePosition(fv, wpos), flip);
}

export function drawView(fv: FView, state: State): void {
  const { d } = fv;
  d.save();
  d.scale(devicePixelRatio, devicePixelRatio);

  let effectiveState = state;

  if (state.iface.toolState.t == 'test_tool') {
    const gameState = getTestState(state.game.levels, state.iface.toolState.testToolState);
    effectiveState = {
      anim: state.anim,
      effects: state.effects,
      game: gameState,
      iface: state.iface,
    }
  }
  else {
    // Here's where we let animators actually act
    const ams = state.anim;
    if (ams !== null) {
      effectiveState = {
        iface: renderIfaceAnims(ams.animator.anims, ams.frame, state),
        game: renderGameAnims(ams.animator.anims, ams.frame, state.game),
        anim: state.anim, // Hmm, it's not 100% clear to me why I need this to be non-null
        effects: [],
      };
    }
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
