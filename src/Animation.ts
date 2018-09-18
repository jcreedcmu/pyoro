import * as _ from 'underscore';
import { Layer, ReadLayer } from './Chunk';
import { FULL_IMPETUS, Sprite } from './constants';
import { vplus, vscale } from './util';
import { Point } from './types';

export type State = {
  player: Player,
  viewPort: Point,
  layer: Layer,
};

export class Animation {
  apply(state: State, t: number) { }
  tileHook(map: ReadLayer, t: number) { return new Layer(); }
}

export class PlayerAnimation extends Animation {
  pos = { x: 0, y: 0 };
  animState = 'player';
  impetus = FULL_IMPETUS;
  flipState = false;

  constructor(props: any) {
    super();
    _.extend(this, props);
  }

  apply(state: State, t: number) {
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

  constructor(dpos: Point, props?: any) {
    super();
    this.dpos = dpos;
    _.extend(this, props);
  }

  apply(state: State, t: number) {
    state.viewPort = vplus(state.viewPort, vscale(this.dpos, t));
  }
}

export class MeltAnimation extends Animation {
  pos: Point;

  constructor(pos: Point) {
    super();
    this.pos = pos;
  }

  tileHook(map: ReadLayer, t: number) {
    var rv = new Layer();
    rv.putTile(this.pos, t > 0.5 ? 'empty' : 'broken_box');
    return rv;
  }
}

export class Player {
  animState: Sprite = 'player';
  flipState = false;
  pos: Point = { x: 0, y: 0 };
  impetus = FULL_IMPETUS;

  constructor(props: any) {
    _.extend(this, props);
  }

  getAnimState(): Sprite {
    return this.animState;
  }

  getFlipState(): boolean {
    return this.flipState;
  }
}
