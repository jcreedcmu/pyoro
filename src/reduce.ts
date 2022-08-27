import { produce } from 'immer';
import { editTiles, logger } from "./constants";
import { animator_for_move, handle_edit_click, handle_world_click, renderGameAnims, renderIfaceAnims, _putTile } from "./model";
import { Point } from "./point";
import { State } from "./state";
import { Move, Tile } from "./types";
import * as effectful from "./use-effectful-reducer";
import { ViewData, wpoint_of_vd } from "./view";

export type Command =
  | 'prevEditTile'
  | 'nextEditTile'
  | 'saveOverlay'
  | 'rotateEditTile'
  | 'debug';

export type Action =
  | { t: 'commandKey', cmd: Command }
  | { t: 'setState', s: State }
  | { t: 'putTile', p: Point, tile: Tile }
  | { t: 'click', point: Point }
  | { t: 'resize', vd: ViewData }
  | { t: 'startAnim', m: Move }
  | { t: 'nextFrame' };

export type Dispatch = (a: Action) => void;

export type Effect =
  | { t: 'scheduleFrame' };

type Result = effectful.Result<State, Effect>;

export function pure(state: State): Result {
  return { state };
}

export function reduceCommand(s: State, cmd: Command): State {
  switch (cmd) {
    case 'nextEditTile':
      return produce(s, s => {
        s.iface.editTileIx = (s.iface.editTileIx + 1) % editTiles.length;
      });

    case 'prevEditTile':
      return produce(s, s => {
        s.iface.editTileIx = (s.iface.editTileIx - 1 + editTiles.length) % editTiles.length;
      });

    case 'saveOverlay': {
      const req = new Request('/save', {
        method: 'POST',
        body: JSON.stringify(s.game.overlay),
        headers: {
          'Content-Type': 'application/json',
        }
      });
      fetch(req).then(r => r.json())
        .then(x => logger('networkRequest', x))
        .catch(console.error);
      return produce(s, s => {
        s.game.initOverlay.tiles = s.game.overlay.tiles;
      });
    }

    case 'rotateEditTile':
      return produce(s, s => {
        s.iface.editTileRotation = (s.iface.editTileRotation + 1) % 4;
      });
    case 'debug':
      console.log(s);
      return s;
  }
}

export function reduce(s: State, a: Action): Result {
  switch (a.t) {
    case 'commandKey': return pure(reduceCommand(s, a.cmd));

    case 'setState': return pure(a.s);
    case 'putTile': return pure(_putTile(s, a.p, a.tile));
    case 'resize':
      return pure(produce(s, s => { s.iface.vd = a.vd; }));
    case 'nextFrame': {
      const effects: Effect[] = [];
      const ams = s.anim;
      if (ams == null) {
        throw new Error('Tried to advance frame without active animation');
      }
      if (ams.animator.dur == ams.frame + 1) {
        const nextState = produce(s, s => {
          s.iface = renderIfaceAnims(ams.animator.animsIface, 'complete', s);
          s.game = renderGameAnims(ams.animator.animsGame, 'complete', s.game);
          s.anim = null;
        });
        return { state: nextState, effects: effects };
      }
      else {
        effects.push({ t: 'scheduleFrame' });
        return { state: produce(s, s => { s.anim!.frame++ }), effects: effects };
      }
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
      logger('mouse', wpoint);
      switch (wpoint.t) {
        case 'World': return pure(handle_world_click(s, wpoint.p));
        case 'EditTiles': return pure(handle_edit_click(s, wpoint.ix));
      }
    }
  }
}
