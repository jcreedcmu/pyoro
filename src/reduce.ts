import { Animator } from "./animation";
import { handle_edit_click, handle_world_click, _putTile } from "./model";
import { State } from "./state";
import { Point } from "./point";
import { Tile } from "./types";
import { ViewData, WidgetPoint } from "./view";
import { produce } from 'immer';

export type Action =
  | { t: 'changeState', f: (s: State) => State }
  | { t: 'setState', s: State }
  | { t: 'animate', cur_frame: number, animator: Animator }
  | { t: 'putTile', p: Point, tile: Tile }
  | { t: 'click', wpoint: WidgetPoint }
  | { t: 'resize', vd: ViewData };

export type Dispatch = (a: Action) => void;

export type Effect =
  void;

export type Result = { s: State, effects?: Effect[] };

export function pure(s: State): Result {
  return { s };
}

export function reduce(s: State, a: Action): Result {
  switch (a.t) {
    case 'changeState': return pure(a.f(s));
    case 'setState': return pure(a.s);
    case 'animate': return pure({
      game: a.animator.gameAnim(a.cur_frame, s.game),
      iface: a.animator.ifaceAnim(a.cur_frame, s)
    });
    case 'putTile': return pure(_putTile(s, a.p, a.tile));
    case 'click':
      switch (a.wpoint.t) {
        case 'World': return pure(handle_world_click(s, a.wpoint.p));
        case 'EditTiles': return pure(handle_edit_click(s, a.wpoint.ix));
      }
      break;
    case 'resize':
      return pure(produce(s, s => { s.iface.vd = a.vd; }));
  }
}
