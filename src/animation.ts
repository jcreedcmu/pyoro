import { Layer, ReadLayer } from './layer';
import { FULL_IMPETUS } from './constants';
import { vplus, vscale } from './util';
import { Point, Facing, Sprite } from './types';
import { DraftObject } from 'immer';
import { State } from './state';

export interface Animation {
  apply: (state: DraftObject<State>, t: number) => void;
  tileHook?: (map: ReadLayer, t: number) => Layer;
}

export function PlayerAnimation(pos: Point, animState: Sprite, impetus: number, flipState: Facing): Animation {
  return {
    apply: (state: DraftObject<State>, t: number) => {
      state.player = {
        pos: vplus(vscale(state.player.pos, 1 - t), vscale(pos, t)),
        animState: animState,
        flipState: flipState,
        impetus: impetus
      }
    },
  }
}

export function ViewPortAnimation(dpos: Point): Animation {
  return {
    apply: (state: DraftObject<State>, t: number) => {
      state.viewPort = vplus(state.viewPort, vscale(dpos, t));
    },
  };
}

export function MeltAnimation(pos: Point): Animation {
  return {
    apply: (state: DraftObject<State>, t: number) => { },
    tileHook: (map: ReadLayer, t: number) => {
      var rv = new Layer();
      rv.putTile(this.pos, t > 0.5 ? 'empty' : 'broken_box');
      return rv;
    }
  };
}
