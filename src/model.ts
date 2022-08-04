import { produce } from 'immer';
import { Animation, Animator, applyAnimation, duration } from './animation';
import { editTiles, FULL_IMPETUS, NUM_TILES, rotateTile } from './constants';
import { getTile, Layer, putTile } from './layer';
import { Player, State } from "./state";
import { Facing, MotiveMove, Move, Point, Sprite, Tile } from './types';
import { max } from './util';
import { vplus } from './point';

function isItem(x: Tile): boolean {
  return x == 'teal_fruit';
}

function openTile(x: Tile): boolean {
  return x == 'empty' || x == 'save_point' || isItem(x) || isSpike(x);
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

type Motion = {
  dpos: Point,
  forced?: Point, // optionally force a block in the direction of motion
  impetus?: number, // optionally set impetus to some value
  attachWall: boolean, // optionally set attachment to some value
};

type Board = { tiles: Layer, player: Player };

function ropen(b: Board, x: number, y: number): boolean {
  const { tiles, player } = b;
  return openTile(getTile(tiles, vplus(player.pos, { x, y })));
}

function execute_down(b: Board): Motion {
  return ropen(b, 0, 1) ?
    { dpos: { x: 0, y: 1 }, impetus: 0, attachWall: false } :
    { dpos: { x: 0, y: 0 }, impetus: 0, attachWall: false }
}

function execute_up(b: Board): Motion {
  var { player } = b;
  if (player.impetus) {
    if (ropen(b, 0, -1)) {
      return { dpos: { x: 0, y: -1 }, attachWall: false }
    }
    else {
      var rv = execute_down(b);
      rv.forced = { x: 0, y: -1 };
      return rv;
    }
  }
  else {
    return { dpos: { x: 0, y: 1 }, attachWall: false };
  }
}

function execute_horiz(b: Board, flip: Facing): Motion {
  const { player } = b;
  const dx = flip == 'left' ? -1 : 1;
  const forward_open = ropen(b, dx, 0);
  if (!forward_open) {
    return { dpos: { x: 0, y: 0 }, impetus: 1, attachWall: true };
  }

  if (player.impetus && !ropen(b, 0, 1)) {
    return forward_open
      ? { dpos: { x: dx, y: 0 }, impetus: 0, attachWall: false }
      : { dpos: { x: 0, y: 0 }, forced: { x: dx, y: 0 }, impetus: 0, attachWall: false };
  }
  else {
    if (forward_open) {
      return ropen(b, dx, 1)
        ? { dpos: { x: dx, y: 1 }, impetus: 0, attachWall: false }
        : { dpos: { x: dx, y: 0 }, impetus: 0, attachWall: false };
    }
    else
      return { dpos: { x: 0, y: 1 }, forced: { x: dx, y: 0 }, impetus: 0, attachWall: false }
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
  if (!ropen(b, dx, 0))
    return { dpos: { x: 0, y: 0 }, forced: { x: dx, y: 0 }, attachWall: true };
  if (ropen(b, dx, -1))
    return { dpos: { x: dx, y: -1 }, attachWall: false }
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
  return getTile(s.game.overlay, p);
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

// The animations we return here are concurrent, I think?
function animate_move(s: State, move: Move): Animation[] {
  const forcedBlocks: Point[] = []
  const anims: Animation[] = [];

  const player = s.game.player;

  if (player.dead || move == 'reset') {
    return [{ t: 'ResetAnimation' }];
  }

  if (move == 'recenter') {
    return [{ t: 'RecenterAnimation' }];
  }

  const belowBefore = vplus(player.pos, { x: 0, y: 1 });
  const tileBefore = _getTile(s, belowBefore);
  const supportedBefore = !openTile(tileBefore);
  if (supportedBefore) forcedBlocks.push({ x: 0, y: 1 });
  const stableBefore = supportedBefore || player.animState == 'player_wall'; // XXX is depending on anim_state fragile?

  const result = get_motion({ tiles: s.game.overlay, player }, move);
  const flipState = get_flip_state(move) || player.flipState;

  if (result.forced != null) forcedBlocks.push(result.forced);

  forcedBlocks.forEach(fb => {
    const pos = vplus(player.pos, fb);
    forceBlock(pos, _getTile(s, pos), anims);
  });

  let impetus = player.impetus;

  if (stableBefore)
    impetus = genImpetus(tileBefore) + (s.game.inventory.teal_fruit != undefined ? 1 : 0);
  if (result.impetus != null)
    impetus = result.impetus;

  if (result.dpos == null)
    throw "didn't expect to have a null dpos here";

  const nextPos = vplus(player.pos, result.dpos);
  let animState: Sprite = 'player';
  const tileAfter = _getTile(s, nextPos);
  const suppTileAfter = _getTile(s, vplus(nextPos, { x: 0, y: 1 }));
  const supportedAfter = !openTile(suppTileAfter);
  const dead = isDeadly(tileAfter);

  if (result.attachWall) {
    animState = 'player_wall';
  }
  else if (supportedAfter) {
    impetus = genImpetus(suppTileAfter);
  }
  else {
    if (impetus)
      impetus--;
    animState = impetus ? 'player_rise' : 'player_fall';
  }

  anims.push({ t: 'PlayerAnimation', pos: nextPos, animState, impetus, flipState, dead });

  if (tileAfter == 'save_point')
    anims.push({ t: 'SavePointChangeAnimation', pos: nextPos });

  if (isItem(tileAfter))
    anims.push({ t: 'ItemGetAnimation', pos: nextPos });

  if (nextPos.x - s.iface.viewPort.x >= NUM_TILES.x - 1)
    anims.push({ t: 'ViewPortAnimation', dpos: { x: 1, y: 0 } });
  if (nextPos.x - s.iface.viewPort.x < 1)
    anims.push({ t: 'ViewPortAnimation', dpos: { x: -1, y: 0 } });
  if (nextPos.y - s.iface.viewPort.y >= NUM_TILES.y - 1)
    anims.push({ t: 'ViewPortAnimation', dpos: { x: 0, y: 1 } });
  if (nextPos.y - s.iface.viewPort.y < 1)
    anims.push({ t: 'ViewPortAnimation', dpos: { x: 0, y: -1 } });

  return anims;
}

export function animator_for_move(s: State, move: Move): Animator {
  const anims = animate_move(s, move).map(anim => ({ anim, dur: duration(anim) }));
  const dur = max(anims.map(a => a.dur));
  return {
    dur,
    anim: (fr: number, s: State): State => {
      anims.forEach(({ anim, dur }) => {
        s = applyAnimation(anim, s, { t: fr / dur, fr });
      });
      return s;
    }
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
