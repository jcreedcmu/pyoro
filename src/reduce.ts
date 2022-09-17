import { produce } from 'immer';
import { bindings } from './bindings';
import { editTiles, tools } from "./constants";
import { logger } from './logger';
import { animator_for_move, getOverlayForSave, handle_toolbar_mousedown, handle_world_drag, handle_world_mousedown, renderGameAnims, renderIfaceAnims, _putTile } from "./model";
import { Point } from "./point";
import { State } from "./state";
import { Move, Tile, Tool } from "./types";
import * as effectful from "./use-effectful-reducer";
import { ViewData, wpoint_of_vd } from "./view";

export type Command =
  | 'prevEditTile'
  | 'nextEditTile'
  | 'saveOverlay'
  | 'rotateEditTile'
  | 'debug';

export type Action =
  | { t: 'keyUp', key: string, code: string, name: string }
  | { t: 'keyDown', key: string, code: string, name: string }
  | { t: 'setState', s: State }
  | { t: 'putTile', p: Point, tile: Tile }
  | { t: 'mouseDown', point: Point }
  | { t: 'mouseUp' }
  | { t: 'mouseMove', point: Point }
  | { t: 'resize', vd: ViewData }
  | { t: 'nextFrame' }
  | { t: 'doCommand', command: Command }
  | { t: 'doMove', move: Move }
  | { t: 'setCurrentTool', tool: Tool };

export type Dispatch = (a: Action) => void;

export type Effect =
  | { t: 'scheduleFrame' };

type Result = effectful.Result<State, Effect>;

export function pure(state: State): Result {
  return { state };
}

export function reduceCommand(s: State, cmd: Command): Result {
  switch (cmd) {
    case 'nextEditTile':
      return pure(produce(s, s => {
        s.iface.editTileIx = (s.iface.editTileIx + 1) % editTiles.length;
      }));

    case 'prevEditTile':
      return pure(produce(s, s => {
        s.iface.editTileIx = (s.iface.editTileIx - 1 + editTiles.length) % editTiles.length;
      }));

    case 'saveOverlay': {
      // XXX this belongs in an Effect, I reckon.
      const req = new Request('/save', {
        method: 'POST',
        body: JSON.stringify(getOverlayForSave(s.game)),
        headers: {
          'Content-Type': 'application/json',
        }
      });
      fetch(req).then(r => r.json())
        .then(x => logger('networkRequest', x))
        .catch(console.error);
      return pure(s);
    }

    case 'rotateEditTile':
      return pure(produce(s, s => {
        s.iface.editTileRotation = (s.iface.editTileRotation + 1) % 4;
      }));
    case 'debug':
      console.log(s);
      return pure(s);
  }
}

function reduceMove(s: State, move: Move): Result {
  // XXX should instead buffer moves?
  if (s.anim == null) {
    return {
      state: produce(s, s => {
        s.anim = {
          frame: 1,
          animator: animator_for_move(s, move)
        }
      }),
      effects: [{ t: 'scheduleFrame' }]
    };
  }
  else {
    return pure(s);
  }
}

export function reduce(s: State, a: Action): Result {
  switch (a.t) {
    case 'keyDown': {
      const name = a.name;
      const action = bindings[name];
      const ss = produce(s, s => { s.iface.keysDown[a.code] = true; });
      if (action) {
        return reduce(ss, action);
      }
      else {
        logger('chatty', `unbound key ${name} pressed`);
        return pure(ss);
      }
    }
    case 'keyUp':
      return pure(produce(s, s => { delete s.iface.keysDown[a.code]; }));
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
    case 'mouseDown': {
      const vd = s.iface.vd;
      if (vd == null)
        return pure(s);
      const wpoint = wpoint_of_vd(vd, a.point, s);
      logger('mouse', 'mouseDown wpoint=', wpoint);
      switch (wpoint.t) {
        case 'World': return pure(handle_world_mousedown(s, a.point, wpoint.p));
        case 'Toolbar': return pure(handle_toolbar_mousedown(s, wpoint.tilePoint));
      }
    }
    case 'mouseUp': return pure(produce(s, s => { s.iface.mouse = { t: 'up' } }));
    case 'mouseMove': {
      const vd = s.iface.vd;
      if (vd == null)
        return pure(s);
      const wpoint = wpoint_of_vd(vd, a.point, s);
      return pure(handle_world_drag(s, a.point, wpoint));

    }
    case 'doCommand':
      return reduceCommand(s, a.command);
    case 'doMove':
      return reduceMove(s, a.move);
    case 'setCurrentTool':
      return pure(produce(s, s => {
        const ix = tools.findIndex(x => x == a.tool);
        if (ix !== -1) {
          s.iface.currentToolIx = ix;
        }
        else {
          console.error(`invalid tool ${a.tool}`);
        }
      }));
  }
}
