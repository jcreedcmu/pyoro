import { produce } from 'immer';
import { bindings } from './bindings';
import { editTiles, tools } from "./constants";
import { putDynamicTile } from './layer';
import { logger } from './logger';
import { animator_for_move, handle_toolbar_mousedown, handle_world_drag, handle_world_mousedown, renderGameAnims, renderIfaceAnims, _putTile, _putTileInInitOverlay } from "./model";
import { Point } from "./point";
import { ButtonedTileFields, State, TimedTileFields, ToolState } from "./state";
import { DynamicTile, Move, Tile, Tool } from "./types";
import * as effectful from "./use-effectful-reducer";
import { ViewData, wpoint_of_vd } from "./view";

export type Command =
  | 'prevEditTile'
  | 'nextEditTile'
  | 'saveOverlay'
  | 'rotateEditTile'
  | 'debug';


/**
 * The type of fields in panel state
 */
export type PanelStateFieldTypes =
  { [P in keyof TimedTileFields]: { t: 'setPanelStateField', key: P, value: TimedTileFields[P] } }
  & { [P in keyof ButtonedTileFields]: { t: 'setPanelStateField', key: P, value: ButtonedTileFields[P] } };

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
  | { t: 'setCurrentToolState', toolState: ToolState }
  | PanelStateFieldTypes[keyof TimedTileFields]
  | PanelStateFieldTypes[keyof ButtonedTileFields]
  | { t: 'saveModifyPanel' }
  ;

export type Dispatch = (a: Action) => void;

export type Effect =
  | { t: 'scheduleFrame' }
  | { t: 'saveOverlay' }
  ;

export type Result = effectful.Result<State, Effect>;

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
      return { state: s, effects: [{ t: 'saveOverlay' }] };
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
        const nextState = {
          iface: renderIfaceAnims(ams.animator.animsIface, 'complete', s),
          game: renderGameAnims(ams.animator.animsGame, 'complete', s.game),
          anim: null,
        }
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
    case 'setCurrentToolState':
      return pure(produce(s, s => {
        s.iface.toolState = a.toolState;
      }));
    case 'setPanelStateField': return pure(produce(s, s => {
      if (s.iface.toolState.t == 'modify_tool') {
        if (s.iface.toolState.panelState.t == 'timed') {
          (s.iface.toolState.panelState as any)[a.key] = a.value; // FIXME
        }
        if (s.iface.toolState.panelState.t == 'buttoned') {
          (s.iface.toolState.panelState as any)[a.key] = a.value; // FIXME
        }
      }
    }));
    case 'saveModifyPanel': return pure(produce(s, s => {
      const ts = s.iface.toolState;
      if (ts.t == 'modify_tool' && ts.modifyCell !== null) {
        if (ts.panelState.t == 'timed') {
          const ct: DynamicTile = {
            t: 'timed',
            phase: parseInt(ts.panelState.phase),
            off_for: parseInt(ts.panelState.off_for),
            on_for: parseInt(ts.panelState.on_for),
          };
          putDynamicTile(s.game.initOverlay, ts.modifyCell, ct);
        }
        else if (ts.panelState.t == 'buttoned') {
          const ct: DynamicTile = {
            t: 'buttoned',
            button_source: {
              x: parseInt(ts.panelState.x),
              y: parseInt(ts.panelState.y)
            },
          };
          putDynamicTile(s.game.initOverlay, ts.modifyCell, ct);
        }
      }
    }));
  }
}
