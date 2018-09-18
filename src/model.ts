import * as _ from 'underscore';
import { NUM_TILES_X, NUM_TILES_Y } from './view_constants';
import { bindVia, vscale, div, vplus, vminus, int } from './util';
import { ChunkCache } from './ChunkCache';
import { Chunk, Layer } from './Chunk';
import {
  Player, Animation, ViewPortAnimation,
  MeltAnimation, PlayerAnimation
} from './Animation';
import { CHUNK_SIZE, FULL_IMPETUS } from './constants';
import { Point, Tile } from './types';

function openTile(x: Tile): boolean {
  return x == "empty";
}

type State = {
  player: Player,
  viewPort: Point,
  layer: Layer,
};

type PostExecution = {
  dpos?: Point,
  forced?: Point,
  impetus?: number,
};

export class Model {
  cache: ChunkCache<Chunk>;
  cache_misses: number;
  chunk_props;
  state: State;

  constructor(state, props) {
    this.cache = new ChunkCache(CHUNK_SIZE);
    this.cache_misses = 0;
    this.chunk_props = {};
    this.state = state;
    _.extend(this, props); // can inject {chunk_props: {rawGetTile: ...}} in props, which is used in tests
    bindVia(this, Model.prototype);
  }

  extend(l) {
    var that = this;
    Object.entries(l.tiles).forEach(([k, v]) => {
      var coords = k.split(','); // arrrrg
      that.putTile({ x: coords[0], y: coords[1] }, v);
    });
  }

  getTile(p) {
    var chunk_pos = vscale({ x: div(p.x, CHUNK_SIZE), y: div(p.y, CHUNK_SIZE) }, CHUNK_SIZE);
    var c = this.cache.get(chunk_pos);
    if (!c) {
      this.cache_misses++;
      c = this.cache.add(new Chunk(chunk_pos, this.chunk_props));
    }
    return c.getTile(p);
  }

  putTile(p, t) {
    var chunk_pos = vscale({ x: div(p.x, CHUNK_SIZE), y: div(p.y, CHUNK_SIZE) }, CHUNK_SIZE);
    var c = this.cache.get(chunk_pos);
    if (!c) {
      this.cache_misses++;
      c = this.cache.add(new Chunk(chunk_pos, this.chunk_props));
    }
    return c.putTile(p, t);
  }


  ropen(x, y) {
    return openTile(this.getTile(vplus(this.state.player.pos, { x: x, y: y })));
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

  execute_right(flip): PostExecution {
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

  execute_up_right(flip): PostExecution {
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

  forceBlock(pos, tile, anims) {
    if (tile == 'fragile_box')
      anims.push(new MeltAnimation(pos));
  }

  animate_move(move) {
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

      _.each(forcedBlocks, function(fb) {
        var pos = vplus(player.pos, fb);
        that.forceBlock(pos, that.getTile(pos), anims);
      });

      if (supportedBefore) {
        player.impetus = FULL_IMPETUS;
      }

      if (result.dpos == null) {
        throw "didn't expect to have a null dpos here";
      }

      var anim = {
        pos: vplus(player.pos, result.dpos),
        impetus: _.has(result, 'impetus') ? result.impetus : player.impetus,
        flipState: flip,
        animState: 'player',
      };

      var supportedAfter = !openTile(this.getTile(vplus(anim.pos, { x: 0, y: 1 })));

      if (supportedAfter) {
        anim.impetus = FULL_IMPETUS
      }
      else {
        if (anim.impetus) { anim.impetus--; }
        anim.animState = anim.impetus ? 'player_rise' : 'player_fall';
      }

      anims.push(new PlayerAnimation(anim));

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

  animator_for_move(move) {
    var orig_state = this.state;
    var anims = this.animate_move(move);
    var that = this;

    return function(t) {
      var state: State = _.extend({}, orig_state);
      _.each(anims, function(anim) { anim.apply(state, t); });
      var layer = new Layer();
      _.each(anims, function(anim) { layer.extend(anim.tileHook(that, t)); });
      state.layer = layer;
      return state;
    };
  }

  execute_move(move) {
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
