import { Animator } from "./animation";
import { animator_for_move, handle_edit_click, handle_world_click, _putTile } from "./model";
import { State } from "./state";
import { Point } from "./point";
import { Move, Tile } from "./types";
import { ViewData, WidgetPoint, wpoint_of_vd } from "./view";
import { produce } from 'immer';
import { DEBUG } from "./constants";
import * as effectful from "./use-effectful-reducer";

export type Action =
  | { t: 'changeState', f: (s: State) => State }
  | { t: 'setState', s: State }
  | { t: 'putTile', p: Point, tile: Tile }
  | { t: 'click', point: Point }
  | { t: 'resize', vd: ViewData }
  | { t: 'startAnim', m: Move }
  | { t: 'nextFrame' };
//  | { t: 'keyDown', code: string };

export type Dispatch = (a: Action) => void;

export type Effect =
  | { t: 'scheduleFrame' };

type Result = effectful.Result<State, Effect>;

export function pure(state: State): Result {
  return { state };
}

export function reduce(s: State, a: Action): Result {
  switch (a.t) {
    case 'changeState': return pure(a.f(s));
    case 'setState': return pure(a.s);
    case 'putTile': return pure(_putTile(s, a.p, a.tile));
    case 'resize':
      return pure(produce(s, s => { s.iface.vd = a.vd; }));
    case 'nextFrame': {
      const effects: Effect[] = [];
      const nextState = produce(s, s => {
        const ams = s.anim;
        if (ams == null) {
          throw new Error('Tried to advance frame without active animation');
        }
        ams.frame++;
        if (ams.animator.dur == ams.frame) {
          s.iface = ams.animator.ifaceAnim(ams.animator.dur, s);
          s.game = ams.animator.gameAnim(ams.animator.dur, s.game);
          s.anim = null;
        }
        else {
          effects.push({ t: 'scheduleFrame' });
        }
      });
      return { state: nextState, effects: effects };
    }
    case 'startAnim': {
      // XXX should instead buffer moves?
      if (s.anim == null) {
        return {
          state: produce(s, s => {
            s.anim = {
              frame: 1,
              animator: animator_for_move(s, a.m)
            }
          }),
          effects: [{ t: 'scheduleFrame' }]
        };
      }
      else {
        return pure(s);
      }
    }
    case 'click': {
      const vd = s.iface.vd;
      if (vd == null)
        return pure(s);
      const wpoint = wpoint_of_vd(vd, a.point, s);
      if (DEBUG.mouse) {
        console.log(wpoint);
      }
      switch (wpoint.t) {
        case 'World': return pure(handle_world_click(s, wpoint.p));
        case 'EditTiles': return pure(handle_edit_click(s, wpoint.ix));
      }
    }
  }
}
