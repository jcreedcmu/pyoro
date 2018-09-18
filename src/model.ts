import { NUM_TILES_X, NUM_TILES_Y } from './constants';
import { vscale, div, vplus, vminus, int, clone } from './util';
import { ChunkCache } from './ChunkCache';
import { Chunk, Layer } from './Chunk';
import {
  Player, Animation, ViewPortAnimation,
  MeltAnimation, PlayerAnimation, State
} from './Animation';
import { CHUNK_SIZE, FULL_IMPETUS, Sprite } from './constants';
import { Point, Tile, Move, Dict } from './types';

function openTile(x: Tile): boolean {
  return x == "empty";
}

type PostExecution = {
  dpos?: Point,
  forced?: Point,
  impetus?: number,
};

export class Model {
  cache: ChunkCache<Chunk>;
  cache_misses: number;
  chunk_props: any;
  state: State;

  constructor(state: State) {
    this.cache = new ChunkCache(CHUNK_SIZE);
    this.cache_misses = 0;
    this.chunk_props = {};
    this.state = state;
  }

  extend(l: Layer) {
    var that = this;
    Object.entries(l.tiles).forEach(([k, v]) => {
      var coords = k.split(',').map(x => parseInt(x)) as [number, number]; // arrrrg
      that.putTile({ x: coords[0], y: coords[1] }, v as Tile);
    });
  }

  getTile(p: Point): Tile {
    var chunk_pos = vscale({ x: div(p.x, CHUNK_SIZE), y: div(p.y, CHUNK_SIZE) }, CHUNK_SIZE);
    var c = this.cache.get(chunk_pos);
    if (!c) {
      this.cache_misses++;
      c = this.cache.add(new Chunk(chunk_pos));
    }
    return c.getTile(p);
  }

  putTile(p: Point, t: Tile): void {
    var chunk_pos = vscale({ x: div(p.x, CHUNK_SIZE), y: div(p.y, CHUNK_SIZE) }, CHUNK_SIZE);
    var c = this.cache.get(chunk_pos);
    if (!c) {
      this.cache_misses++;
      c = this.cache.add(new Chunk(chunk_pos));
    }
    return c.putTile(p, t);
  }


  ropen(x: number, y: number) {
    return openTile(this.getTile(vplus(this.state.player.pos, { x, y })));
  }

  execute_up(): PostExecution {
    var player = this.state.player;
    if (player.impetus) {
      if (this.ropen(0, -1)) {
        return { dpos: { x: 0, y: -1 } }
      }
      else {
        var rv = this.execute_down();
        rv.forced = { x: 0, y: -1 };
        return rv;
      }
    }
    else {
      return { dpos: { x: 0, y: 1 } };
    }
  }

  execute_down(): PostExecution {
    return this.ropen(0, 1) ? { dpos: { x: 0, y: 1 }, impetus: 0 } : { dpos: { x: 0, y: 0 }, impetus: FULL_IMPETUS }
  }

  execute_right(flip: boolean): PostExecution {
    var dx = flip ? -1 : 1;
    var forward_open = this.ropen(dx, 0);
    if (this.state.player.impetus && !this.ropen(0, 1)) {
      return forward_open ? { dpos: { x: dx, y: 0 }, impetus: 0 } : {
        dpos: { x: 0, y: 0 }, forced: { x: dx, y: 0 },
        impetus: FULL_IMPETUS
      };
    }
    else {
      if (forward_open) {
        return this.ropen(dx, 1) ? { dpos: { x: dx, y: 1 }, impetus: 0 } : { dpos: { x: dx, y: 0 }, impetus: 0 };
      }
      else
        return { dpos: { x: 0, y: 1 }, forced: { x: dx, y: 0 }, impetus: 0 }
    }
  }

  execute_up_right(flip: boolean): PostExecution {
    const dx = flip ? -1 : 1;
    const forward_open = this.ropen(dx, 0);
    if (!this.state.player.impetus)
      return this.execute_right(flip);
    if (!this.ropen(0, -1)) {
      const rv = this.execute_right(flip);
      rv.forced = { x: 0, y: -1 };
      return rv;
    }
    if (!this.ropen(dx, 0))
      return { dpos: { x: 0, y: -1 }, forced: { x: dx, y: 0 } };
    if (this.ropen(dx, -1))
      return { dpos: { x: dx, y: -1 } }
    else {
      const rv = this.execute_down();
      rv.forced = { x: dx, y: -1 };
      return rv;
    }
  }

  forceBlock(pos: Point, tile: Tile, anims: Animation[]): void {
    if (tile == 'fragile_box')
      anims.push(new MeltAnimation(pos));
  }

  animate_move(move: Move): Animation[] {
    var that = this;

    var forcedBlocks: Point[] = []
    var anims: Animation[] = [];
    var flip = false;

    var s = this.state;
    var player = s.player;

    var result: PostExecution = {};
    var moved = true;

    var belowBefore = vplus(player.pos, { x: 0, y: 1 });
    var tileBefore = this.getTile(belowBefore);
    var supportedBefore = !openTile(tileBefore);
    if (supportedBefore) forcedBlocks.push({ x: 0, y: 1 });

    switch (move) {
      case 'up':
        result = this.execute_up();
        break;
      case 'down':
        result = this.execute_down();
        break;
      case 'left':
        result = this.execute_right(true);
        flip = true;
        break;
      case 'right':
        result = this.execute_right(false);
        break;
      case 'up-left':
        result = this.execute_up_right(true);
        flip = true;
        break;
      case 'up-right':
        result = this.execute_up_right(false);
        break;
      case 'reset':
        anims.push(this.resetViewPortAnimation());
        moved = false;
        break;
    }

    if (moved) {
      if (result.forced != null) forcedBlocks.push(result.forced);

      forcedBlocks.forEach(fb => {
        var pos = vplus(player.pos, fb);
        that.forceBlock(pos, that.getTile(pos), anims);
      });

      if (supportedBefore) {
        player.impetus = FULL_IMPETUS;
      }

      if (result.dpos == null) {
        throw "didn't expect to have a null dpos here";
      }

      const anim = {
        pos: vplus(player.pos, result.dpos),
        impetus: result.impetus != null ? result.impetus : player.impetus,
        flipState: flip,
        animState: 'player' as Sprite,
      };

      const supportedAfter = !openTile(this.getTile(vplus(anim.pos, { x: 0, y: 1 })));

      if (supportedAfter) {
        anim.impetus = FULL_IMPETUS
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

    if (this.cache_misses) {
      this.cache_misses = 0;
      this.cache.filter({ p: s.viewPort, w: NUM_TILES_X, h: NUM_TILES_Y });
    }

    return anims;
  }

  animator_for_move(move: Move): (t: number) => State {
    var orig_state = this.state;
    var anims = this.animate_move(move);

    return (t: number): State => {
      var state: State = clone(orig_state);
      anims.forEach(anim => { anim.apply(state, t); });
      var layer = new Layer();
      anims.forEach(anim => { layer.extend(anim.tileHook(this, t)); });
      state.layer = layer;
      return state;
    };
  }

  execute_move(move: Move) {
    this.state = this.animator_for_move(move)(1);
    this.extend(this.state.layer);
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
