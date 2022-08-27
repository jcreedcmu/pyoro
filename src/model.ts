import { produce } from 'immer';
import { Animation, Animator, applyGameAnimation, applyIfaceAnimation, duration } from './animation';
import { editTiles, FULL_IMPETUS, NUM_TILES, rotateTile } from './constants';
import { getTile, Layer, putTile } from './layer';
import { GameState, IfaceState, Player, State } from "./state";
import { Facing, MotiveMove, Move, Point, Sprite, Tile } from './types';
import { max } from './util';
import { vplus } from './point';

function isItem(x: Tile): boolean {
  return x == 'teal_fruit';
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

type Board = { tiles: Layer, player: Player };

function ropen(b: Board, x: number, y: number): boolean {
  const { tiles, player } = b;
  return openTile(getTile(tiles, vplus(player.pos, { x, y })));
}

function rgrabbable(b: Board, x: number, y: number): boolean {
  const { tiles, player } = b;
  return isGrabbable(getTile(tiles, vplus(player.pos, { x, y })));
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

export function _getTile(s: State, p: Point): Tile {
  return tileOfGameState(s.game, p);
}

export function tileOfGameState(s: GameState, p: Point): Tile {
  return getTile(s.overlay, p);
}

export function _putTile(s: State, p: Point, t: Tile): State {
  return produce(s, s => {
    putTile(s.game.overlay, p, t);
  });
}

function forceBlock(pos: Point, tile: Tile, anims: Animation[]): void {
  if (tile == 'fragile_box')
    anims.push({ t: 'MeltAnimation', pos });
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

  const result = get_motion({ tiles: s.overlay, player }, move);
  const flipState = get_flip_state(move) || player.flipState;

  if (result.forced != null) forcedBlocks.push(result.forced);

  forcedBlocks.forEach(fb => {
    const pos = vplus(player.pos, fb);
    forceBlock(pos, tileOfGameState(s, pos), anims);
  });

  let impetus = player.impetus;

  if (stableBefore)
    impetus = genImpetus(tileBefore) + (s.inventory.teal_fruit != undefined ? 1 : 0);
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

  if (isItem(tileAfter))
    anims.push({ t: 'ItemGetAnimation', pos: nextPos });

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

export function completeGameAnims(animsGame: Animation[], s: GameState): GameState {
  animsGame.forEach(anim => {
    s = applyGameAnimation(anim, s, { t: 1, fr: duration(anim) });
  });
  return s;
}

export function completeIfaceAnims(animsIface: Animation[], s: State): State {
  return produce(s, s => {
    animsIface.forEach(anim => {
      s.iface = applyIfaceAnimation(anim, s, { t: 1, fr: duration(anim) });
    });
    return s;
  });
}

export function renderGameAnims(anims: Animation[], fr: number, s: GameState): GameState {
  anims.forEach(anim => {
    s = applyGameAnimation(anim, s, { t: fr / duration(anim), fr });
  });
  return s;
}

export function renderIfaceAnims(animsIfaceDur: { anim: Animation, dur: number }[]): (fr: number, s: State) => IfaceState {
  return (fr: number, s: State): IfaceState => {
    animsIfaceDur.forEach(({ anim, dur }) => {
      s = produce(s, s => { s.iface = applyIfaceAnimation(anim, s, { t: fr / dur, fr }) });
    });
    return s.iface;
  }
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

export function handle_world_click(s: State, p: Point): State {
  const newTile = rotateTile(editTiles[s.iface.editTileIx], s.iface.editTileRotation);
  const tileToPut = _getTile(s, p) != newTile ? newTile : 'empty';
  return produce(_putTile(s, p, tileToPut), s => { s.iface.dragTile = tileToPut });
}

export function handle_edit_click(s: State, ix: number): State {
  return produce(s, s => {
    if (ix < editTiles.length && ix >= 0)
      s.iface.editTileIx = ix;
  });
}
