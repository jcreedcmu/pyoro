import * as _ from 'underscore';
import { Layer } from './Chunk';
import { FULL_IMPETUS } from './constants';
import { vplus, vscale } from './util';
import { Point } from './types';

export class Animation {
  apply(state, t) { }
  tileHook(map, t) { return new Layer(); }
}

export class PlayerAnimation extends Animation {
  pos = { x: 0, y: 0 };
  animState = 'player';
  impetus = FULL_IMPETUS;
  flipState = false;

  constructor(props) {
    super();
    _.extend(this, props);
  }

  apply(state, t) {
    state.player =
      new Player({
        pos: vplus(vscale(state.player.pos, 1 - t), vscale(this.pos, t)),
        animState: this.animState,
        flipState: this.flipState,
        impetus: this.impetus
      });
  }
}

export class ViewPortAnimation extends Animation {
  dpos: Point;

  constructor(dpos: Point, props?) {
    super();
    this.dpos = dpos;
    _.extend(this, props);
  }

  apply(state, t) {
    state.viewPort = vplus(state.viewPort, vscale(this.dpos, t));
  }
}

export class MeltAnimation extends Animation {
  pos: Point;

  constructor(pos: Point) {
    super();
    this.pos = pos;
  }

  tileHook(map, t) {
    var rv = new Layer();
    rv.putTile(this.pos, t > 0.5 ? 'empty' : 'broken_box');
    return rv;
  }
}

export class Player {
  animState = 'player';
  flipState = false;
  pos: Point = { x: 0, y: 0 };
  impetus = FULL_IMPETUS;

  constructor(props) {
    _.extend(this, props);
  }

  getAnimState(): string {
    return this.animState;
  }

  getFlipState(): boolean {
    return this.flipState;
  }
}
