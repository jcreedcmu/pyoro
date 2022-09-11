import { produce } from 'immer';
import { Animation, Animator, applyGameAnimation, applyIfaceAnimation, duration } from './animation';
import { editTiles, FULL_IMPETUS, NUM_TILES, rotateTile, tools } from './constants';
import { getTile, Layer, LayerStack, putTile, tileOfStack } from './layer';
import { vplus, vsub } from './point';
import { GameState, IfaceState, Player, State } from "./state";
import { Facing, Item, MotiveMove, Move, Point, Sprite, Tile } from './types';
import { max } from './util';
import { WidgetPoint } from './view';

function getItem(x: Tile): Item | undefined {
  if (x == 'teal_fruit' || x == 'coin') return x;
}

function isItem(x: Tile): boolean {
  return getItem(x) !== undefined;
}

function openTile(x: Tile): boolean {
  return x == 'empty' || x == 'save_point' || isItem(x) || isSpike(x);
}

function isGrabbable(x: Tile): boolean {
  return x == 'grip_wall';
}

function isSpike(x: Tile): boolean {
  return x == 'spike_up' || x == 'spike_left' || x == 'spike_right' || x == 'spike_down';
}

function isDeadly(x: Tile): boolean {
  return isSpike(x);
}

function genImpetus(x: Tile): number {
  if (x == "empty") return 0;
  if (x == "up_box") return FULL_IMPETUS;
  return 1;
}

type Posture = 'stand' | 'attachWall' | 'crouch';
type Motion = {
  dpos: Point,
  forced?: Point, // optionally force a block in the direction of motion
  impetus?: number, // optionally set impetus to some value
  posture?: Posture, // optionally set posture to some value
};

type Board = { tiles: LayerStack, player: Player };

function ropen(b: Board, x: number, y: number): boolean {
  const { tiles, player } = b;
  return openTile(tileOfStack(tiles, vplus(player.pos, { x, y })));
}

function rgrabbable(b: Board, x: number, y: number): boolean {
  const { tiles, player } = b;
  return isGrabbable(tileOfStack(tiles, vplus(player.pos, { x, y })));
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
  return { player: s.player, tiles: layerStackOfState(s) }
}

// This goes from a Move to a Motion
function get_motion(b: Board, move: MotiveMove): Motion {
  const { tiles, player } = b;
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

export function tileOfState(s: State, p: Point): Tile {
  return tileOfGameState(s.game, p);
}

export function tileOfGameState(s: GameState, p: Point): Tile {
  return tileOfStack(layerStackOfState(s), p);
}

export function _putTile(s: State, p: Point, t: Tile): State {
  return produce(s, s => {
    putTile(s.game.overlay, p, t);
  });
}

export function _putTileInGameStateInitOverlay(s: GameState, p: Point, t: Tile): GameState {
  return produce(s, s => {
    putTile(s.initOverlay, p, t);
  });
}

export function _putTileInInitOverlay(s: State, p: Point, t: Tile): State {
  return produce(s, s => {
    s.game = _putTileInGameStateInitOverlay(s.game, p, t);
  });
}

function forceBlock(s: GameState, pos: Point, tile: Tile): Animation[] {
  switch (tile) {
    case 'fragile_box':
      return [{ t: 'MeltAnimation', pos }];
    case 'coin_wall':
      if ((s.inventory.coin ?? 0) >= 1) {
        return [{ t: 'SpendCoinAnimation', pos }];
      }
      else {
        return [];
      }
    default:
      return [];
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
  const supportedBefore = !openTile(tileBefore);
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

  if (stableBefore)
    impetus = genImpetus(tileBefore) + (s.inventory.teal_fruit ?? 0);
  if (result.impetus != null)
    impetus = result.impetus;

  if (result.dpos == null)
    throw "didn't expect to have a null dpos here";

  const nextPos = vplus(player.pos, result.dpos);
  let animState: Sprite = 'player';
  const tileAfter = tileOfGameState(s, nextPos);
  const suppTileAfter = tileOfGameState(s, vplus(nextPos, { x: 0, y: 1 }));
  const supportedAfter = !openTile(suppTileAfter);
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

  if (tileAfter == 'save_point')
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

export function handle_world_mousedown(s: State, rawPoint: Point, worldPoint: Point): State {
  switch (tools[s.iface.currentToolIx]) {
    case 'pencil_tool':
      const newTile = rotateTile(editTiles[s.iface.editTileIx], s.iface.editTileRotation);
      const tileToPut = tileOfState(s, worldPoint) != newTile ? newTile : 'empty';
      return produce(_putTileInInitOverlay(s, worldPoint, tileToPut), s => { s.iface.mouse = { t: 'tileDrag', tile: tileToPut }; });
    case 'hand_tool':
      return produce(s, s => { s.iface.mouse = { t: 'panDrag', init: rawPoint } });
  }
}

export function handle_world_drag(s: State, rawPoint: Point, widgetPoint: WidgetPoint): State {
  switch (s.iface.mouse.t) {
    case 'tileDrag':
      if (widgetPoint.t == 'World') {
        return _putTileInInitOverlay(s, widgetPoint.p, s.iface.mouse.tile);
      }
      else {
        return s;
      }
    case 'panDrag':
      console.log(vsub(rawPoint, s.iface.mouse.init));
      return s;
    default:
      console.error(`inconsistent mouse state: ` +
        `processing drag event but mouse stat isn't "drag". ` +
        `Not sure how this happened?`);
      return s;
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
        s.iface.currentToolIx = p.x;
    });
  }
  else {
    return s;
  }
}

export function show_empty_tile_override(s: State): boolean {
  return !s.iface.keysDown['KeyN']; // XXX Debugging
}

export function getOverlayForSave(s: GameState): Layer {
  const layer: Layer = { tiles: {} };
  for (const [k, v] of Object.entries(s.initOverlay.tiles)) {
    if (v !== 'empty')
      layer.tiles[k] = v;
  }
  return layer;
}
