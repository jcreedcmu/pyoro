import { produce } from 'immer';
import { Animation, Animator, app, duration } from './animation';
import { editTiles, FULL_IMPETUS, NUM_TILES, rotateTile } from './constants';
import { getTile, Layer, putTile } from './layer';
import { Player, State } from "./state";
import { Facing, MotiveMove, Move, Point, Sprite, Tile } from './types';
import { max, nope, vplus } from './util';

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
};

type Board = { tiles: Layer, player: Player };

function ropen(b: Board, x: number, y: number): boolean {
  const { tiles, player } = b;
  return openTile(getTile(tiles, vplus(player.pos, { x, y })));
}

function execute_down(b: Board): Motion {
  return ropen(b, 0, 1) ?
    { dpos: { x: 0, y: 1 }, impetus: 0 } :
    { dpos: { x: 0, y: 0 }, impetus: 0 }
}

function execute_up(b: Board): Motion {
  var { player } = b;
  if (player.impetus) {
    if (ropen(b, 0, -1)) {
      return { dpos: { x: 0, y: -1 } }
    }
    else {
      var rv = execute_down(b);
      rv.forced = { x: 0, y: -1 };
      return rv;
    }
  }
  else {
    return { dpos: { x: 0, y: 1 } };
  }
}

function execute_horiz(b: Board, flip: Facing): Motion {
  const { player } = b;
  const dx = flip == 'left' ? -1 : 1;
  const forward_open = ropen(b, dx, 0);
  if (player.impetus && !ropen(b, 0, 1)) {
    return forward_open ? { dpos: { x: dx, y: 0 }, impetus: 0 } : {
      dpos: { x: 0, y: 0 }, forced: { x: dx, y: 0 },
      impetus: 0
    };
  }
  else {
    if (forward_open) {
      return ropen(b, dx, 1) ? { dpos: { x: dx, y: 1 }, impetus: 0 } : { dpos: { x: dx, y: 0 }, impetus: 0 };
    }
    else
      return { dpos: { x: 0, y: 1 }, forced: { x: dx, y: 0 }, impetus: 0 }
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
    return { dpos: { x: 0, y: -1 }, forced: { x: dx, y: 0 } };
  if (ropen(b, dx, -1))
    return { dpos: { x: dx, y: -1 } }
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
    default:
      return nope(move);
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
    default:
      return nope(move);
  }
}

export class Model {
  state: State;

  constructor(state: State) {
    this.state = state;
  }

  getTile(p: Point): Tile {
    return getTile(this.state.gameState.overlay, p);
  }

  putTile(p: Point, t: Tile): void {
    this.state = produce(this.state, s => {
      putTile(s.gameState.overlay, p, t);
    });
  }

  forceBlock(pos: Point, tile: Tile, anims: Animation[]): void {
    if (tile == 'fragile_box')
      anims.push({ t: 'MeltAnimation', pos });
  }

  animate_move(move: Move): Animation[] {
    var forcedBlocks: Point[] = []
    var anims: Animation[] = [];

    var s = this.state;
    var player = s.gameState.player;

    if (player.dead || move == 'reset') {
      return [{ t: 'ResetAnimation' }];
    }

    if (move == 'recenter') {
      return [{ t: 'RecenterAnimation' }];
    }

    var belowBefore = vplus(player.pos, { x: 0, y: 1 });
    var tileBefore = this.getTile(belowBefore);
    var supportedBefore = !openTile(tileBefore);
    if (supportedBefore) forcedBlocks.push({ x: 0, y: 1 });

    const result = get_motion({ tiles: this.state.gameState.overlay, player }, move);
    const flipState = get_flip_state(move) || player.flipState;

    if (result.forced != null) forcedBlocks.push(result.forced);

    forcedBlocks.forEach(fb => {
      var pos = vplus(player.pos, fb);
      this.forceBlock(pos, this.getTile(pos), anims);
    });

    let impetus = player.impetus;

    if (supportedBefore)
      impetus = genImpetus(tileBefore) + (s.gameState.inventory.teal_fruit != undefined ? 1 : 0);
    if (result.impetus != null)
      impetus = result.impetus;

    if (result.dpos == null)
      throw "didn't expect to have a null dpos here";

    const nextPos = vplus(player.pos, result.dpos);
    let animState: Sprite = 'player';
    const tileAfter = this.getTile(nextPos);
    const suppTileAfter = this.getTile(vplus(nextPos, { x: 0, y: 1 }));
    const supportedAfter = !openTile(suppTileAfter);
    const dead = isDeadly(tileAfter);

    if (supportedAfter) {
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

    if (nextPos.x - s.viewPort.x >= NUM_TILES.x - 1)
      anims.push({ t: 'ViewPortAnimation', dpos: { x: 1, y: 0 } });
    if (nextPos.x - s.viewPort.x < 1)
      anims.push({ t: 'ViewPortAnimation', dpos: { x: -1, y: 0 } });
    if (nextPos.y - s.viewPort.y >= NUM_TILES.y - 1)
      anims.push({ t: 'ViewPortAnimation', dpos: { x: 0, y: 1 } });
    if (nextPos.y - s.viewPort.y < 1)
      anims.push({ t: 'ViewPortAnimation', dpos: { x: 0, y: -1 } });

    return anims;
  }

  animator_for_move(move: Move): Animator {
    const anims = this.animate_move(move).map(anim => ({ anim, dur: duration(anim) }));
    const dur = max(anims.map(a => a.dur));
    return {
      dur,
      anim: (fr: number, s: State): State => {
        anims.forEach(({ anim, dur }) => {
          s = app(anim, s, { t: fr / dur, fr });
        });
        return s;
      }
    }
  }

  handle_world_click(p: Point): void {
    const s = this.state;
    const newTile = rotateTile(editTiles[s.iface.editTileIx], s.iface.editTileRotation);
    if (this.getTile(p) != newTile)
      this.putTile(p, newTile);
    else
      this.putTile(p, 'empty');
  }

  handle_edit_click(ix: number): void {
    this.state = produce(this.state, s => {
      if (ix < editTiles.length && ix >= 0)
        s.iface.editTileIx = ix;
    });
  }

  get_player() {
    return this.state.gameState.player;
  }

  get_viewPort() {
    return this.state.viewPort;
  }
}
