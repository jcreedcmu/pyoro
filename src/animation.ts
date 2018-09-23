import { Layer, ReadLayer } from './chunk';
import { FULL_IMPETUS } from './constants';
import { vplus, vscale } from './util';
import { Point, Facing, Sprite } from './types';

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
  pos: Point = { x: 0, y: 0 };
  animState: Sprite = 'player';
  impetus: number = FULL_IMPETUS;
  flipState: Facing = 'left';

  constructor(
    pos: Point,
    animState: Sprite,
    impetus: number,
    flipState: Facing
  ) {
    super();
    this.pos = pos;
    this.animState = animState;
    this.flipState = flipState;
    this.impetus = impetus;
  }

  apply(state: State, t: number) {
    state.player = {
      pos: vplus(vscale(state.player.pos, 1 - t), vscale(this.pos, t)),
      animState: this.animState,
      flipState: this.flipState,
      impetus: this.impetus
    };
  }
}

export class ViewPortAnimation extends Animation {
  dpos: Point;

  constructor(dpos: Point) {
    super();
    this.dpos = dpos;
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

export type Player = {
  animState: Sprite,
  flipState: Facing,
  pos: Point,
  impetus: number,
};

export function newPlayer(pos: Point): Player {
  return {
    pos,
    animState: 'player',
    flipState: 'left',
    impetus: FULL_IMPETUS,
  };
}
