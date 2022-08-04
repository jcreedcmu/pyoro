import { Animator } from "./animation";
import { handle_edit_click, handle_world_click, _putTile } from "./model";
import { State } from "./state";
import { Point } from "./point";
import { Tile } from "./types";

export type Action =
  | { t: 'changeState', f: (s: State) => State }
  | { t: 'setState', s: State }
  | { t: 'animate', cur_frame: number, animator: Animator }
  | { t: 'putTile', p: Point, tile: Tile }
  | { t: 'worldClick', p: Point }
  | { t: 'editClick', ix: number };

export type Dispatch = (a: Action) => void;

export function reduce(s: State, a: Action): State {
  switch (a.t) {
    case 'changeState': return a.f(s);
    case 'setState': return a.s;
    case 'animate': return a.animator.anim(a.cur_frame, s);
    case 'putTile': return _putTile(s, a.p, a.tile);
    case 'worldClick': return handle_world_click(s, a.p);
    case 'editClick': return handle_edit_click(s, a.ix);
  }
}
