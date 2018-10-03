import { Animation, MeltAnimation, PlayerAnimation, ViewPortAnimation } from './animation';
import { State, Player } from "./state";
import { Layer, LayerData, ReadLayer, TileFunc, putTile, getTile } from './layer';
import { FULL_IMPETUS, NUM_TILES_X, NUM_TILES_Y } from './constants';
import { Move, Point, Tile, Facing, Sprite } from './types';
import { clone, div, int, vplus, vscale, nope, hash } from './util';
import { produce } from 'immer';

function openTile(x: Tile): boolean {
  return x == "empty";
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

type Board = { tiles: ReadLayer, player: Player };

function ropen(b: Board, x: number, y: number): boolean {
  const { tiles, player } = b;
  return openTile(tiles.getTile(vplus(player.pos, { x, y })));
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
function get_motion(b: Board, move: Move): Motion {
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
function get_flip_state(move: Move): Facing | null {
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
  chunk_props: any;
  state: State;
  editTile: Tile = 'box3';

  constructor(state: State) {
    this.chunk_props = {};
    this.state = state;
  }

  extend(l: LayerData) {
    Object.entries(l.tiles).forEach(([k, v]) => {
      var coords = k.split(',').map(x => parseInt(x)) as [number, number]; // arrrrg
      this.putTile({ x: coords[0], y: coords[1] }, v as Tile);
    });
  }

  getTile(p: Point): Tile {
    return getTile(this.state.overlay, p) || 'empty';
  }

  putTile(p: Point, t: Tile): void {
    putTile(this.state.overlay, p, t);
  }

  forceBlock(pos: Point, tile: Tile, anims: Animation[]): void {
    if (tile == 'fragile_box')
      anims.push(new MeltAnimation(pos));
  }

  animate_move(move: Move): Animation[] {
    var forcedBlocks: Point[] = []
    var anims: Animation[] = [];


    var s = this.state;
    var player = s.player;

    var moved = true; // XXX this should come out of preresolve, really

    var belowBefore = vplus(player.pos, { x: 0, y: 1 });
    var tileBefore = this.getTile(belowBefore);
    var supportedBefore = !openTile(tileBefore);
    if (supportedBefore) forcedBlocks.push({ x: 0, y: 1 });

    const result = get_motion({ tiles: this, player }, move);
    const flipState = get_flip_state(move) || player.flipState;

    if (moved) {
      if (result.forced != null) forcedBlocks.push(result.forced);

      forcedBlocks.forEach(fb => {
        var pos = vplus(player.pos, fb);
        this.forceBlock(pos, this.getTile(pos), anims);
      });

      let prevImpetus = player.impetus;

      if (supportedBefore) {
        prevImpetus = genImpetus(tileBefore);
      }

      if (result.dpos == null) {
        throw "didn't expect to have a null dpos here";
      }

      const anim = {
        pos: vplus(player.pos, result.dpos),
        impetus: result.impetus != null ? result.impetus : prevImpetus,
        flipState,
        animState: 'player' as Sprite,
      };

      const tileAfter = this.getTile(vplus(anim.pos, { x: 0, y: 1 }));
      const supportedAfter = !openTile(tileAfter);

      if (supportedAfter) {
        anim.impetus = genImpetus(tileAfter);
      }
      else {
        if (anim.impetus) { anim.impetus--; }
        anim.animState = anim.impetus ? 'player_rise' : 'player_fall';
      }

      anims.push(new PlayerAnimation(anim.pos, anim.animState, anim.impetus, anim.flipState));

      if (anim.pos.x - s.viewPort.x >= NUM_TILES_X - 1)
        anims.push(new ViewPortAnimation({ x: 1, y: 0 }));
      if (anim.pos.x - s.viewPort.x < 1)
        anims.push(new ViewPortAnimation({ x: -1, y: 0 }));
      if (anim.pos.y - s.viewPort.y >= NUM_TILES_Y - 1)
        anims.push(new ViewPortAnimation({ x: 0, y: 1 }));
      if (anim.pos.y - s.viewPort.y < 1)
        anims.push(new ViewPortAnimation({ x: 0, y: -1 }));
    }

    return anims;
  }

  animator_for_move(move: Move): (t: number) => State {
    var orig_state = this.state;
    var anims = this.animate_move(move);

    return (t: number): State => {
      return produce(orig_state, dr => {
        anims.forEach(anim => { anim.apply(dr, t); });
        const layer = new Layer();
        anims.forEach(anim => { layer.extend(anim.tileHook(this, t)); });
        dr.transient_layer = layer;
      });
    };
  }

  handle_mousedown(p: Point): void {
    if (this.getTile(p) == 'empty')
      this.putTile(p, this.editTile);
    else
      this.putTile(p, 'empty');
  }

  execute_move(move: Move) {
    this.state = this.animator_for_move(move)(1);
    this.extend(this.state.transient_layer);
  }

  resetViewPortAnimation() {
    var s = this.state;
    return new ViewPortAnimation({
      x: int(s.player.pos.x - NUM_TILES_X / 2) - s.viewPort.x,
      y: int(s.player.pos.y - NUM_TILES_Y / 2) - s.viewPort.y
    });

  }

  get_player() {
    return this.state.player;
  }

  get_viewPort() {
    return this.state.viewPort;
  }
}
