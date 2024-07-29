import { produce } from 'immer';
import { Animation, Animator, applyGameAnimation, applyIfaceAnimation, duration } from './animation';
import { editTiles, FULL_IMPETUS, NUM_TILES, rotateTile, SCALE, TILE_SIZE, tools } from './constants';
import { tileEq, DynamicLayer, dynamicOfTile, dynamicTileOfStack, emptyTile, isEmptyTile, LayerStack, putDynamicTile, tileOfStack, TileResolutionContext } from './layer';
import { vmn, vplus } from './point';
import { GameState, IfaceState, ModifyPanelState, Player, State, ToolState } from "./state";
import { Tile, DynamicTile, Facing, Item, MotiveMove, Move, Point, Sprite, Tool } from './types';
import { max } from './util';
import { WidgetPoint } from './view';

function getItem(x: Tile): Item | undefined {
  if (x.t == 'item')
    return x.item;
  else
    return undefined;
}

function isItem(x: Tile): boolean {
  return getItem(x) !== undefined;
}

function isOpenBusBlock(x: Tile): boolean {
  return x.t == 'bus_block' && x.on == false;
}

function isOpen(x: Tile): boolean {
  return tileEq(x, emptyTile()) || x.t == 'save_point' || isItem(x) || isSpike(x)
    || isOpenBusBlock(x);
}

function isGrabbable(x: Tile): boolean {
  return x.t == 'grip_wall';
}

function isSpike(x: Tile): boolean {
  return x.t == 'spike';
}

function isDeadly(x: Tile): boolean {
  return isSpike(x);
}

function genImpetus(x: Tile): number {
  if (isOpen(x)) return 0;
  if (tileEq(x, { t: 'up_box' })) return FULL_IMPETUS;
  return 1;
}

export type Board = { player: Player, trc: TileResolutionContext };

type Posture = 'stand' | 'attachWall' | 'crouch';
type Motion = {
  dpos: Point,
  forced?: Point, // optionally force a block in the direction of motion
  impetus?: number, // optionally set impetus to some value
  posture?: Posture, // optionally set posture to some value
};

function ropen(b: Board, x: number, y: number): boolean {
  const { player, trc } = b;
  return isOpen(tileOfStack(trc.layerStack, vplus(player.pos, { x, y }), trc));
}

function rgrabbable(b: Board, x: number, y: number): boolean {
  const { player, trc } = b;
  return isGrabbable(tileOfStack(trc.layerStack, vplus(player.pos, { x, y }), trc));
}

function execute_down(b: Board, opts?: { preventCrouch: boolean }): Motion {
  return ropen(b, 0, 1) ?
    { dpos: { x: 0, y: 1 }, impetus: 0, posture: 'stand' } :
    { dpos: { x: 0, y: 0 }, impetus: 0, posture: opts?.preventCrouch ? 'stand' : 'crouch' }
}

function execute_up(b: Board): Motion {
  var { player } = b;
  if (player.impetus) {
    if (ropen(b, 0, -1)) {
      return { dpos: { x: 0, y: -1 }, posture: 'stand' }
    }
    else {
      var rv = execute_down(b, { preventCrouch: true });
      rv.forced = { x: 0, y: -1 };
      return rv;
    }
  }
  else {
    return { dpos: { x: 0, y: 1 }, posture: 'stand' };
  }
}

function execute_horiz(b: Board, flip: Facing): Motion {
  const { player } = b;
  const dx = flip == 'left' ? -1 : 1;
  const forward_open = ropen(b, dx, 0);
  if (rgrabbable(b, dx, 0)) {
    return { dpos: { x: 0, y: 0 }, impetus: 1, posture: 'attachWall' };
  }

  if (player.impetus && !ropen(b, 0, 1)) {
    return forward_open
      ? { dpos: { x: dx, y: 0 }, impetus: 0, posture: 'stand' }
      : { dpos: { x: 0, y: 0 }, forced: { x: dx, y: 0 }, impetus: 0, posture: 'stand' };
  }
  else {
    if (forward_open) {
      return ropen(b, dx, 1)
        ? { dpos: { x: dx, y: 1 }, impetus: 0, posture: 'stand' }
        : { dpos: { x: dx, y: 0 }, impetus: 0, posture: 'stand' };
    }
    else
      return { dpos: { x: 0, y: 1 }, forced: { x: dx, y: 0 }, impetus: 0, posture: 'stand' }
  }
}

function execute_up_diag(b: Board, flip: Facing): Motion {
  const { player } = b;
  const dx = flip == 'left' ? -1 : 1;
  const forward_open = ropen(b, dx, 0);
  if (!player.impetus)
    return execute_horiz(b, flip);
  if (!ropen(b, 0, -1)) {
    const rv = execute_horiz(b, flip);
    rv.forced = { x: 0, y: -1 };
    return rv;
  }
  if (rgrabbable(b, dx, 0))
    return { dpos: { x: 0, y: 0 }, forced: { x: dx, y: 0 }, posture: 'attachWall' };
  if (ropen(b, dx, -1))
    return { dpos: { x: dx, y: -1 }, posture: 'stand' }
  else {
    const rv = execute_down(b);
    rv.forced = { x: dx, y: -1 };
    return rv;
  }
}

function layerStackOfState(s: GameState): LayerStack {
  return {
    t: 'overlay',
    top: s.overlay,
    rest: { t: 'base', layer: s.initOverlay }
  };
}

function boardOfState(s: GameState): Board {
  return {
    player: s.player,
    trc: {
      busState: s.busState,
      layerStack: layerStackOfState(s),
      time: s.time,
      playerPos: s.player.pos
    }
  };
}

// This goes from a Move to a Motion
function get_motion(b: Board, move: MotiveMove): Motion {
  switch (move) {
    case 'up': return execute_up(b);
    case 'down': return execute_down(b);
    case 'left': return execute_horiz(b, 'left');
    case 'right': return execute_horiz(b, 'right');
    case 'up-left': return execute_up_diag(b, 'left');
    case 'up-right': return execute_up_diag(b, 'right');
  }
}

// null means "don't change the flip state"
function get_flip_state(move: MotiveMove): Facing | null {
  switch (move) {
    case 'left':
    case 'up-left':
      return 'left';
    case 'right':
    case 'up-right':
      return 'right';
    case 'up':
    case 'down':
      return null;
  }
}

export function tileOfState(s: State, p: Point, viewIntent?: boolean): Tile {
  return tileOfGameState(s.game, p, viewIntent);
}

export function dynamicTileOfState(s: State, p: Point): DynamicTile {
  return dynamicTileOfGameState(s.game, p);
}

export function tileOfGameState(s: GameState, p: Point, viewIntent?: boolean): Tile {
  const { player, trc } = boardOfState(s);
  return tileOfStack(trc.layerStack, p, trc, viewIntent);
}

export function dynamicTileOfGameState(s: GameState, p: Point): DynamicTile {
  const { player, trc } = boardOfState(s);
  return dynamicTileOfStack(trc.layerStack, p);
}

export function _putTileInGameStateInitOverlay(s: GameState, p: Point, t: DynamicTile): GameState {
  return produce(s, s => {
    putDynamicTile(s.initOverlay, p, t);
  });
}

export function _putTileInInitOverlay(s: State, p: Point, t: DynamicTile): State {
  return produce(s, s => {
    s.game = _putTileInGameStateInitOverlay(s.game, p, t);
  });
}

function forceBlock(s: GameState, pos: Point, tile: Tile): Animation[] {
  switch (tile.t) {
    case 'fragile_box':
      return [{ t: 'MeltAnimation', pos }];
    case 'coin_wall':
      if ((s.inventory.coin ?? 0) >= 1) {
        return [{ t: 'SpendCoinAnimation', pos }];
      }
      else {
        return [];
      }
    case 'bus_button':
      return [{ t: 'BusButtonToggleAnimation', bus: tile.bus }];
    case 'button_on': // fallthrough intentional
    case 'button_off':
      return [{ t: 'ButtonToggleAnimation', pos }];
    default: return [];
  }
}

function isJump(move: Move): boolean {
  switch (move) {
    case 'up': return true;
    case 'down': return false;
    case 'left': return false;
    case 'right': return false;
    case 'up-left': return true;
    case 'up-right': return true;
    case 'reset': return false;
    case 'recenter': return false;
  }
}

// The animations we return here are concurrent
export function animateMoveGame(s: GameState, move: Move): Animation[] {
  const forcedBlocks: Point[] = []
  const anims: Animation[] = [];

  const player = s.player;

  // ugh XXX this is duplicated across animateMoveGame and animateMoveIface
  if (player.dead || move == 'reset') {
    return [{ t: 'ResetAnimation' }];
  }

  // XXX so is this, in a way
  if (move == 'recenter') {
    return [];
  }

  const belowBefore = vplus(player.pos, { x: 0, y: 1 });
  const tileBefore = tileOfGameState(s, belowBefore);
  const supportedBefore = !isOpen(tileBefore);
  if (supportedBefore) forcedBlocks.push({ x: 0, y: 1 });
  const stableBefore = supportedBefore || player.animState == 'player_wall'; // XXX is depending on anim_state fragile?

  const result = get_motion(boardOfState(s), move);
  const flipState = get_flip_state(move) || player.flipState;

  if (result.forced != null) forcedBlocks.push(result.forced);

  forcedBlocks.forEach(fb => {
    const pos = vplus(player.pos, fb);
    anims.push(...forceBlock(s, pos, tileOfGameState(s, pos)));
  });

  let impetus = player.impetus;

  const jumpSucceeded = result.dpos.y < 0;
  if (stableBefore && isJump(move) && jumpSucceeded)
    impetus = genImpetus(tileBefore) + (s.inventory.teal_fruit ?? 0);
  else if (result.impetus != null)
    impetus = result.impetus;

  if (result.dpos == null)
    throw "didn't expect to have a null dpos here";

  const nextPos = vplus(player.pos, result.dpos);
  let animState: Sprite = 'player';

  // I'm not sure how generally this will work, but it works for
  // predicting the next state of time-oscillating blocks.
  const nextTimeS = produce(s, s => { s.time++ });

  const tileAfter = tileOfGameState(s, nextPos);
  const suppTileAfter = tileOfGameState(nextTimeS, vplus(nextPos, { x: 0, y: 1 }));
  const supportedAfter = !isOpen(suppTileAfter);
  const dead = isDeadly(tileAfter);

  if (result.posture != 'attachWall') {
    if (supportedAfter) {
      impetus = genImpetus(suppTileAfter);
    }
    else {
      if (impetus)
        impetus--;
    }
  }

  if (result.posture == 'attachWall') {
    animState = 'player_wall';
  }
  else if (result.posture == 'crouch') {
    animState = 'player_crouch';
  }
  else {
    animState = supportedAfter ? 'player' : impetus ? 'player_rise' : 'player_fall';
  }

  anims.push({ t: 'PlayerAnimation', pos: nextPos, animState, impetus, flipState, dead });

  if (tileEq(tileAfter, { t: 'save_point' }))
    anims.push({ t: 'SavePointChangeAnimation', pos: nextPos });

  const item = getItem(tileAfter);
  if (item !== undefined)
    anims.push({ t: 'ItemGetAnimation', pos: nextPos, item });

  return anims;
}

export function animateMoveIface(s: State, move: Move, nextPos: Point | undefined): Animation[] {
  const iface = s.iface;
  if (s.game.player.dead || move == 'reset') {
    return [{ t: 'ResetAnimation' }];
  }

  if (move == 'recenter') {
    return [{ t: 'RecenterAnimation' }];
  }

  const anims: Animation[] = [];
  if (nextPos !== undefined) {
    if (nextPos.x - iface.viewPort.x >= NUM_TILES.x - 1)
      anims.push({ t: 'ViewPortAnimation', dpos: { x: 1, y: 0 } });
    if (nextPos.x - iface.viewPort.x < 1)
      anims.push({ t: 'ViewPortAnimation', dpos: { x: -1, y: 0 } });
    if (nextPos.y - iface.viewPort.y >= NUM_TILES.y - 1)
      anims.push({ t: 'ViewPortAnimation', dpos: { x: 0, y: 1 } });
    if (nextPos.y - iface.viewPort.y < 1)
      anims.push({ t: 'ViewPortAnimation', dpos: { x: 0, y: -1 } });
  }
  return anims;
}

function hasNextPos(anim: Animation): Point | undefined {
  switch (anim.t) {
    case 'PlayerAnimation': return anim.pos;
    case 'ItemGetAnimation': return anim.pos;
    case 'SavePointChangeAnimation': return anim.pos;
    default:
      return undefined;
  }
}

export function renderGameAnims(anims: Animation[], fr: number | 'complete', s: GameState): GameState {
  anims.forEach(anim => {
    s = applyGameAnimation(anim, s, fr);
  });
  return s;
}

export function renderIfaceAnims(anims: Animation[], fr: number | 'complete', s: State): IfaceState {
  anims.forEach(anim => {
    s = produce(s, s => { s.iface = applyIfaceAnimation(anim, s, fr) });
  });
  return s.iface;
}

export function animator_for_move(s: State, move: Move): Animator {
  const animsGame = animateMoveGame(s.game, move);
  const nextPos = animsGame.map(hasNextPos).find(x => x !== undefined);
  const animsIface = animateMoveIface(s, move, nextPos);
  const dur = max([...animsGame.map(a => duration(a)), ...animsIface.map(a => duration(a))]);

  return {
    dur,
    animsGame,
    animsIface,
  }
}

// Just used for editing purposes, whether clicking on the "same" tile
// should erase instead of overwriting.
function similarStaticTiles(ct1: Tile, ct2: Tile): boolean {
  switch (ct1.t) {
    case 'spike': return ct2.t == 'spike';
    default: return ct1.t == ct2.t;
  }
}

// Just used for editing purposes, whether clicking on the "same" tile
// should erase instead of overwriting.
function similarTiles(ct1: DynamicTile, ct2: DynamicTile): boolean {
  switch (ct1.t) {
    case 'static': return ct2.t == 'static' && similarStaticTiles(ct1.tile, ct2.tile);
    case 'timed': return ct2.t == 'timed';
    case 'buttoned': return ct2.t == 'buttoned';
    case 'bus_button': return ct2.t == 'bus_button' && ct1.bus == ct2.bus;
    case 'bus_block': return ct2.t == 'bus_block' && ct1.bus == ct2.bus;
  }
}

function defaultDynamicTileToPut(tile: Tile): DynamicTile {
  switch (tile.t) {
    case 'timed_wall': return { t: 'timed', phase: 0, on_for: 1, off_for: 1 };
    case 'buttoned_wall': return { t: 'buttoned', button_source: { x: -1, y: 0 } }; // FIXME, this is a default for testing before I can edit
    case 'bus_block': return { t: 'bus_block', bus: tile.bus };
    case 'bus_button': return { t: 'bus_button', bus: tile.bus };
    default: return dynamicOfTile(tile);
  }
}

function determineTileToPut(s: State, worldPoint: Point): DynamicTile {
  const newTile = defaultDynamicTileToPut(rotateTile(editTiles[s.iface.editTileIx], s.iface.editTileRotation));

  return similarTiles(dynamicTileOfState(s, worldPoint), newTile) ? dynamicOfTile(emptyTile()) : newTile;
}

export function modifyPanelStateForTile(s: State, worldPoint: Point): ModifyPanelState {
  const ct = dynamicTileOfState(s, worldPoint);
  switch (ct.t) {
    case 'static': return { t: 'none' };
    case 'bus_button': return { t: 'none' };
    case 'bus_block': return { t: 'none' };
    case 'timed': return {
      t: 'timed',
      off_for: ct.off_for + '',
      on_for: ct.on_for + '',
      phase: ct.phase + '',
    };
    case 'buttoned': return {
      t: 'buttoned',
      x: ct.button_source.x + '',
      y: ct.button_source.y + '',
    }
  }
}

export function handle_world_mousedown(s: State, rawPoint: Point, worldPoint: Point): State {
  const toolState = s.iface.toolState;
  switch (toolState.t) {
    case 'pencil_tool':
      const tileToPut = determineTileToPut(s, worldPoint);
      return produce(_putTileInInitOverlay(s, worldPoint, tileToPut), s => { s.iface.mouse = { t: 'tileDrag', tile: tileToPut }; });
    case 'hand_tool':
      return produce(s, s => { s.iface.mouse = { t: 'panDrag', init: rawPoint, initViewPort: s.iface.viewPort } });
    case 'modify_tool':
      return produce(s, s => {
        s.iface.toolState = { t: 'modify_tool', modifyCell: worldPoint, panelState: modifyPanelStateForTile(s, worldPoint) };
      });
    case 'play_tool':
      return s;
  }
}

export function handle_world_drag(s: State, rawPoint: Point, widgetPoint: WidgetPoint): State {
  const mouse = s.iface.mouse;
  switch (mouse.t) {
    case 'tileDrag':
      if (widgetPoint.t == 'World') {
        return _putTileInInitOverlay(s, widgetPoint.p, mouse.tile);
      }
      else {
        return s;
      }
    case 'panDrag':
      return produce(s, s => {
        s.iface.viewPort = vmn(
          [mouse.init, mouse.initViewPort, rawPoint],
          ([i, ivp, rp]) => ivp + Math.round((i - rp) / (TILE_SIZE * SCALE)))
      });
    default:
      console.error(`inconsistent mouse state: ` +
        `processing drag event but mouse stat isn't "drag". ` +
        `Not sure how this happened?`);
      return s;
  }
}

function initialToolState(t: Tool): ToolState {
  switch (t) {
    case 'pencil_tool': return { t: 'pencil_tool' };
    case 'hand_tool': return { t: 'hand_tool' };
    case 'modify_tool': return { t: 'modify_tool', modifyCell: null, panelState: { t: 'none' } };
    case 'play_tool': return { t: 'play_tool' };
  }
}

export function handle_toolbar_mousedown(s: State, p: Point): State {
  if (p.y == 0) {
    return produce(s, s => {
      if (p.x < editTiles.length && p.x >= 0)
        s.iface.editTileIx = p.x;
    });
  }
  else if (p.y == 1) {
    return produce(s, s => {
      if (p.x < tools.length && p.x >= 0)
        s.iface.toolState = initialToolState(tools[p.x]);
    });
  }
  else {
    return s;
  }
}

export function show_empty_tile_override(s: State): boolean {
  return !s.iface.keysDown['KeyN']; // XXX Debugging
}

export function getOverlayForSave(s: GameState): DynamicLayer {
  const layer: DynamicLayer = { tiles: {} };
  for (const [k, v] of Object.entries(s.initOverlay.tiles)) {
    if (!isEmptyTile(v))
      layer.tiles[k] = v;
  }
  return layer;
}
