import { Animator } from "./animation";
import { animator_for_move, handle_edit_click, handle_world_click, _putTile } from "./model";
import { State } from "./state";
import { Point } from "./point";
import { Move, Tile } from "./types";
import { ViewData, WidgetPoint } from "./view";
import { produce } from 'immer';

export type Action =
  | { t: 'changeState', f: (s: State) => State }
  | { t: 'setState', s: State }
  | { t: 'putTile', p: Point, tile: Tile }
  | { t: 'click', wpoint: WidgetPoint }
  | { t: 'resize', vd: ViewData }
  | { t: 'startAnim', m: Move }
  | { t: 'nextFrame' };
//  | { t: 'keyDown', code: string };

export type Dispatch = (a: Action) => void;

export type Effect =
  | { t: 'scheduleFrame' };

export type Result = { s: State, effects?: Effect[] };

export function pure(s: State): Result {
  return { s };
}

export function reduce(s: State, a: Action): Result {
  switch (a.t) {
    case 'changeState': return pure(a.f(s));
    case 'setState': return pure(a.s);
    case 'putTile': return pure(_putTile(s, a.p, a.tile));
    case 'click':
      switch (a.wpoint.t) {
        case 'World': return pure(handle_world_click(s, a.wpoint.p));
        case 'EditTiles': return pure(handle_edit_click(s, a.wpoint.ix));
      }
      break;
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
      return { s: nextState, effects };
    }
    case 'startAnim': {
      // XXX should instead buffer moves?
      if (s.anim == null) {
        return {
          s: produce(s, s => {
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
  }
}
