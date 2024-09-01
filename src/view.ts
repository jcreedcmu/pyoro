import { produce } from 'immer';
import { COMBO_THRESHOLD, editTiles, guiData, NUM_INVENTORY_ITEMS, NUM_TILES, rotateTile, SCALE, TILE_SIZE, tools, viewRectInView } from './constants';
import { getBoundRect, getCurrentLevel, getCurrentLevelData, isToolbarActive } from './game-state-access';
import { emptyTile, getItem, PointMap, putItem } from './layer';
import { fillRect, fillText, pathRect, strokeRect } from './lib/dutil';
import { int, Point, vdiag, vint, vm, vm2, vplus, vscale } from './lib/point';
import { apply, compose, inverse, mkSE2 } from './lib/se2';
import { apply_to_rect } from './lib/se2-extra';
import { Rect } from './lib/types';
import { DEBUG } from './debug';
import { renderGameAnims, renderIfaceAnims, show_empty_tile_override, tileOfState } from './model';
import { Combo, IfaceState, MainState } from './state';
import { getTestState } from './test-state';
import { getCanvasFromWorld, getWorldFromCanvas, getWorldFromView } from './transforms';
import { Item, PlayerSprite, Tile, ToolTile } from './types';
import * as u from './util';
import { rgba } from './util';
import { MobileType } from './entity';

export type WidgetPoint =
  | { t: 'Toolbar', tilePoint: Point }
  | { t: 'World', p_in_world: Point }
  | { t: 'None', p_in_canvas: Point }
  ;

// Functional View Data
export type FView = {
  d: CanvasRenderingContext2D;
  vd: ViewData;
  spriteImg: HTMLImageElement;
}

export type ViewData = {
  wsize: Point, // this is the overall window size
  origin: Point, // this is the origin of the play area in pixels, as an offset from the browser window
};

/**
 * Returns combo data in human readable form
 */
export function stringOfCombo(c: Combo): string {
  if (c == undefined) return 'none';
  return `(${c.dir.x}, ${c.dir.y}) x ${c.rep}`;
}

function drawScaled(fv: FView, state: MainState): void {
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
  drawEntities(fv, state);

  const ts = state.iface.toolState;
  if (ts.t == 'modify_tool' && ts.modifyCell !== null) {
    drawWorldTileSelection(fv, state.iface, ts.modifyCell);
  }
  d.restore();

  if (isToolbarActive(state)) {
    drawEditorStuff(fv, state);
  }

  // Draw fade effect for death and restart
  if (state.iface.blackout) {
    const c = u.rgbOfColor(guiData.stage_color);
    d.fillStyle = rgba(c.r, c.g, c.b, state.iface.blackout);
    d.fillRect(origin.x, origin.y, NUM_TILES.x * TILE_SIZE * SCALE, NUM_TILES.y * TILE_SIZE * SCALE);
    return;
  }

  drawInventory(fv, state);

  if (DEBUG.devicePixelRatio) {
    d.fillStyle = "black";
    d.fillRect(200, 100.25, 100, 0.5);
    d.fillRect(200, 110.5, 100, 0.5);
    d.fillRect(200, 120.75, 100, 0.5);
    d.fillRect(200, 131, 100, 0.5);
  }

  const debugLines: string[] = [];

  if (isToolbarActive(state)) {
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
}

function spriteLocOfEntity(entity: MobileType, dead: boolean): Point {
  // This might need to change if we every break the injection from
  // entities into tiles, but this is good enough for now. The
  // typechecker will probably catch it.
  return spriteLocOfTile({ t: dead ? `${entity.t}_dead` : entity.t });
}

function spriteLocOfTile(tile: Tile): Point {
  switch (tile.t) {
    case 'box': return { x: 1, y: 4 };
    case 'box3': return { x: 3, y: 3 };
    case 'stone': return { x: 1, y: 7 };
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
    case 'wood_box': return { x: 7, y: 7 };
    case 'metal_box': return { x: 8, y: 7 };
    case 'wood_box_dead': return { x: 9, y: 7 };
    case 'metal_box_dead': return { x: 8, y: 7 }; // XXX nothing can destroy metal boxes right now
    case 'ladder': return { x: 6, y: 7 };
    case 'water': return { x: 5, y: 7 };
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

function cell_rect_in_world(p_in_world: Point): Rect {
  return { p: p_in_world, sz: { x: 1, y: 1 } };
}

function cell_rect_in_canvas(vd: ViewData, iface: IfaceState, p_in_world: Point): Rect {
  return apply_to_rect(getCanvasFromWorld(vd, iface), cell_rect_in_world(p_in_world));
}

const metrics: (keyof TextMetrics)[] = [
  'actualBoundingBoxAscent',
  'actualBoundingBoxDescent',
  'actualBoundingBoxLeft',
  'actualBoundingBoxRight',
  'alphabeticBaseline',
  'emHeightAscent',
  'emHeightDescent',
  'fontBoundingBoxAscent',
  'fontBoundingBoxDescent',
  'hangingBaseline',
  'ideographicBaseline',
  'width',
];



function drawDebugText(fv: FView, text: string, p_in_canvas: Point): void {
  const { d } = fv;
  d.textAlign = 'center';
  d.textBaseline = 'middle';
  const font = '12px sans-serif';
  d.font = font;
  const measure = d.measureText(text);
  const textRect = u.insetRect(u.rectOfBrect({
    min: { x: p_in_canvas.x - measure.actualBoundingBoxLeft, y: p_in_canvas.y - measure.actualBoundingBoxAscent },
    max: { x: p_in_canvas.x + measure.actualBoundingBoxRight, y: p_in_canvas.y + measure.actualBoundingBoxDescent }
  }), -3);

  fillRect(d, textRect, '#fff');
  strokeRect(d, textRect, '#000', 1);
  fillText(d, text, p_in_canvas, '#000', font);
}

function drawEntities(fv: FView, state: MainState): void {
  const level = getCurrentLevel(state.game);
  level.entities.forEach(ent => {
    const rect_in_canvas = cell_rect_in_canvas(fv.vd, state.iface, ent.pos);
    draw_sprite(fv, spriteLocOfEntity(ent.etp, ent.dead), rect_in_canvas);
    if (state.settings.debugImpetus) {
      drawDebugText(fv, `${ent.impetus.x},${ent.impetus.y}`, u.rectMidpoint(rect_in_canvas));
    }
  });
}

function drawField(fv: FView, state: MainState): void {
  const player = state.game.player;
  const { d } = fv;

  const world_from_view = getWorldFromView(state.iface);
  const levelBounds = getBoundRect(state.game);

  // emptyTileOverride "temporarily" displays things as empty, for
  // which we want to retain some kind of convenient way of reinstating
  // them. Therefore I am using this for savepoints (because I want old
  // savepoints to spring back into existence when I change lastSave)
  // but not any longer for other inventory stuff, which I just want to
  // statefully update in the actual overlay layer.
  const emptyTileOverride: PointMap<boolean> = { tiles: {} };
  putItem(emptyTileOverride, state.game.lastSave, true);

  const viewBrect_in_world = u.brectOfRect(apply_to_rect(world_from_view, viewRectInView));
  const fmin = vint(viewBrect_in_world.min);
  const fmax = vint(viewBrect_in_world.max);

  // draw the background
  for (let y = fmin.y; y <= fmax.y; y++) {
    for (let x = fmin.x; x <= fmax.x; x++) {
      const cell_in_world = { x, y };
      const viewIntent = state.iface.toolState.t != 'play_tool';
      let tile = tileOfState(state, cell_in_world, viewIntent);
      // For now, only do empty-tile overriding if the erstwhile tile is a save_point.
      if (getItem(emptyTileOverride, cell_in_world) && show_empty_tile_override(state) && tile.t == 'save_point')
        tile = emptyTile();

      const rect_in_canvas: Rect = cell_rect_in_canvas(fv.vd, state.iface, cell_in_world);

      if (u.pointInBrect(cell_in_world, levelBounds)) {
        draw_sprite(fv, spriteLocOfTile(tile), rect_in_canvas);
      }
      else {
        fillRect(d, rect_in_canvas, '#666');
      }
    }
  }

  const basePlayerSprite: PlayerSprite = player.dead ? 'player_dead' : player.animState;
  const playerSprite: PlayerSprite = (basePlayerSprite == 'player' &&
    player.combo != undefined && player.combo.dir.x != 0 && player.combo.rep >= COMBO_THRESHOLD) ? 'player_run' : basePlayerSprite;

  const effectivePos = player.posOffset == undefined ? player.pos : vplus(player.pos, player.posOffset);
  draw_sprite(fv, spriteLocOfPlayer(playerSprite),
    cell_rect_in_canvas(fv.vd, state.iface, effectivePos),
    player.flipState == 'left');
}

function drawInventorySelection(d: CanvasRenderingContext2D, p: Point): void {
  d.fillStyle = rgba(0, 192, 192, 0.7);
  d.beginPath();
  d.rect(p.x * TILE_SIZE * SCALE, p.y * TILE_SIZE * SCALE, TILE_SIZE * SCALE, TILE_SIZE * SCALE);
  d.rect((p.x * TILE_SIZE + 1) * SCALE, (p.y * TILE_SIZE + 1) * SCALE, (TILE_SIZE - 2) * SCALE, (TILE_SIZE - 2) * SCALE);
  d.fill('evenodd');
}

function drawWorldTileSelection(fv: FView, iface: IfaceState, p_in_world: Point): void {
  const { d } = fv;
  d.fillStyle = rgba(0, 192, 192, 0.7);

  const world_from_view = getWorldFromView(iface);
  const canvas_from_view = mkSE2(vdiag(SCALE), fv.vd.origin);
  const canvas_from_world = compose(canvas_from_view, inverse(world_from_view));

  d.beginPath();
  const rect_in_canvas = apply_to_rect(canvas_from_world, cell_rect_in_world(p_in_world));
  pathRect(d, rect_in_canvas);
  pathRect(d, u.insetRect(rect_in_canvas, SCALE));
  d.fill('evenodd');
}

function drawEditorStuff(fv: FView, state: MainState): void {
  const { d, vd: { origin } } = fv;

  // toolbar
  tools.forEach((t, ix) => {
    raw_draw_sprite(fv, spriteLocOfTool(t == state.iface.toolState.t ? `${t}_active` : `${t}_inactive`),
      { p: { x: ix * TILE_SIZE * SCALE, y: TILE_SIZE * SCALE }, sz: vdiag(TILE_SIZE * SCALE) });
  });

  const editPage = editTiles[state.iface.editPageIx];

  // background of tile list
  d.fillStyle = guiData.background_color;
  d.fillRect(0, 0, editPage.length * TILE_SIZE * SCALE, 1 * TILE_SIZE * SCALE);

  const levelInitBusState = getCurrentLevelData(state.game).busState;

  // tiles for pencil tool
  editPage.forEach((et, ix) => {
    let tile = rotateTile(et, state.iface.editTileRotation);
    if (tile.t == 'bus_block' || tile.t == 'bus_button') {
      const bus = tile.bus;
      tile = produce(tile, tl => { tl.on = levelInitBusState[bus] });
    }
    raw_draw_sprite(fv, spriteLocOfTile(tile), { p: { x: ix * TILE_SIZE * SCALE, y: 0 }, sz: vdiag(TILE_SIZE * SCALE) });
  });

  // selected tile & selected tool
  drawInventorySelection(d, { x: state.iface.editTileIx, y: 0 });
}

function drawInventory(fv: FView, state: MainState): void {
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
    raw_draw_sprite(fv, spriteLocOfTile({ t: 'item', item }), { p: ipos, sz: vdiag(SCALE * TILE_SIZE) });

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

function raw_draw_sprite(fv: FView, sprite_loc: Point, rect_in_canvas: Rect, flip?: boolean): void {
  const d = fv.d;
  d.save();

  if (flip) {
    d.translate(rect_in_canvas.p.x + rect_in_canvas.sz.x / 2, 0);
    d.scale(-1, 1);
    d.translate(-rect_in_canvas.p.x - rect_in_canvas.sz.x / 2, 0);
    rect_in_canvas = {
      p: { x: rect_in_canvas.p.x, y: rect_in_canvas.p.y },
      sz: { x: rect_in_canvas.sz.x, y: rect_in_canvas.sz.y },
    };
  }
  d.imageSmoothingEnabled = false;
  d.drawImage(fv.spriteImg,
    sprite_loc.x * TILE_SIZE, sprite_loc.y * TILE_SIZE,
    TILE_SIZE, TILE_SIZE,
    rect_in_canvas.p.x, rect_in_canvas.p.y,
    rect_in_canvas.sz.x, rect_in_canvas.sz.y);
  d.restore();
}

function draw_sprite_in_world(fv: FView, iface: IfaceState, sprite_loc: Point, p_in_world: Point): void {
  raw_draw_sprite(fv, sprite_loc, cell_rect_in_canvas(fv.vd, iface, p_in_world));
}

// sprite_loc: position in sprite sheet, in tiles.
function draw_sprite(fv: FView, sprite_loc: Point, rect_in_canvas: Rect, flip?: boolean): void {
  const { vd: { origin } } = fv;
  // XXX check if totally out of bounds?
  raw_draw_sprite(fv, sprite_loc, rect_in_canvas, flip);
}


export function drawView(fv: FView, state: MainState): void {
  const { d } = fv;
  d.save();
  d.scale(devicePixelRatio, devicePixelRatio);

  let effectiveState = state;

  if (state.iface.toolState.t == 'test_tool') {
    const gameState = getTestState(state.iface.toolState.testToolState);
    effectiveState = {
      settings: state.settings,
      nonVisibleState: state.nonVisibleState,
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
        settings: state.settings,
        nonVisibleState: state.nonVisibleState,
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

export function wpoint_of_vd(vd: ViewData, p_in_canvas: Point, s: MainState): WidgetPoint {
  const { origin } = vd;

  const world_size = vm(NUM_TILES, NT => TILE_SIZE * SCALE * NT);
  if (u.inrect(p_in_canvas, { p: origin, sz: world_size }))
    return {
      t: 'World',
      p_in_world: vint(apply(getWorldFromCanvas(vd, s.iface), p_in_canvas)),
    };
  else if (isToolbarActive(s)) {
    const rv: WidgetPoint = {
      t: 'Toolbar',
      tilePoint: vm(p_in_canvas, p => int(p / (SCALE * TILE_SIZE))),
    }
    return rv;
  }
  else {
    return {
      t: 'None',
      p_in_canvas,
    }
  }
}
