import { produce } from 'immer';
import { Action } from './action';
import { bindings } from './bindings';
import { editTiles } from './constants';
import { getInitOverlay, setCurrentLevel } from './game-state-access';
import { putDynamicTile } from './layer';
import { logger } from './logger';
import { animator_for_move, handle_toolbar_mousedown, handle_world_drag, handle_world_mousedown, renderGameAnims, renderIfaceAnims } from './model';
import { ButtonedTileFields, DoorTileFields, State, TimedTileFields } from './state';
import { DynamicTile, Move } from './types';
import { wpoint_of_vd } from './view';

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
  & { [P in keyof ButtonedTileFields]: { t: 'setPanelStateField', key: P, value: ButtonedTileFields[P] } }
  & { [P in keyof DoorTileFields]: { t: 'setPanelStateField', key: P, value: DoorTileFields[P] } }
  ;

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
      return produce(s, s => {
        s.effects.push({ t: 'saveOverlay' });
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

function reduceMove(s: State, move: Move): State {
  if (s.anim == null) {
    return produce(s, s => {
      s.anim = {
        frame: 1,
        animator: animator_for_move(s, move)
      };
      s.effects.push({ t: 'scheduleFrame' });
    });
  }
  else {
    return produce(s, s => {
      s.iface.bufferedMoves.push(move);
      s.effects.push({ t: 'scheduleFrame' });
    });
  }
}

export function reduce(s: State, a: Action): State {
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
        return ss;
      }
    }
    case 'doCommand':
      return reduceCommand(s, a.command);
    case 'doMove':
      return reduceMove(s, a.move);
    case 'nextFrame': {
      const ams = s.anim;
      if (ams == null) {
        if (s.iface.bufferedMoves.length == 0) {
          console.error('Tried to advance frame without active animation or buffered moves');
          return s;
        }
        else {
          const move = s.iface.bufferedMoves[0];
          const stateAfterShift = produce(s, s => { s.iface.bufferedMoves.shift(); });
          const resultState = reduceMove(stateAfterShift, move);

          // If this is the only buffered move, no need to schedule more frames
          if (s.iface.bufferedMoves.length <= 1)
            return resultState;
          // Otherwise, schedule more
          return produce(resultState, s => { s.effects.push({ t: 'scheduleFrame' }) });
        }
      }
      if (ams.animator.dur == ams.frame + 1) {
        const nextState = {
          iface: renderIfaceAnims(ams.animator.anims, 'complete', s),
          game: renderGameAnims(ams.animator.anims, 'complete', s.game),
          anim: null,
          effects: [],
        }
        return nextState;
      }
      else {
        return produce(s, s => {
          s.anim!.frame++;
          s.effects.push({ t: 'scheduleFrame' });
        });
      }
    }
    case 'keyUp':
      return produce(s, s => { delete s.iface.keysDown[a.code]; });
    case 'setState': return a.s;
    case 'resize':
      return produce(s, s => { s.iface.vd = a.vd; });
    case 'mouseDown': {
      const vd = s.iface.vd;
      if (vd == null)
        return s;
      const wpoint = wpoint_of_vd(vd, a.point, s);
      logger('mouse', 'mouseDown wpoint=', wpoint);
      switch (wpoint.t) {
        case 'World': return handle_world_mousedown(s, a.point, wpoint.p);
        case 'Toolbar': return handle_toolbar_mousedown(s, wpoint.tilePoint);
      }
    }
    case 'mouseUp': return produce(s, s => { s.iface.mouse = { t: 'up' } });
    case 'mouseMove': {
      const vd = s.iface.vd;
      if (vd == null)
        return s;
      const wpoint = wpoint_of_vd(vd, a.point, s);
      return handle_world_drag(s, a.point, wpoint);
    }
    case 'setCurrentToolState':
      return produce(s, s => {
        s.iface.toolState = a.toolState;
      });
    case 'setPanelStateField': return produce(s, s => {
      if (s.iface.toolState.t == 'modify_tool') {
        if (s.iface.toolState.panelState.t == 'timed') {
          (s.iface.toolState.panelState as any)[a.key] = a.value; // FIXME
        }
        if (s.iface.toolState.panelState.t == 'buttoned') {
          (s.iface.toolState.panelState as any)[a.key] = a.value; // FIXME
        }
        if (s.iface.toolState.panelState.t == 'door') {
          (s.iface.toolState.panelState as any)[a.key] = a.value; // FIXME
        }
      }
    });
    case 'saveModifyPanel': return produce(s, s => {
      const ts = s.iface.toolState;
      if (ts.t == 'modify_tool' && ts.modifyCell !== null) {
        if (ts.panelState.t == 'timed') {
          const ct: DynamicTile = {
            t: 'timed',
            phase: parseInt(ts.panelState.phase),
            off_for: parseInt(ts.panelState.off_for),
            on_for: parseInt(ts.panelState.on_for),
          };
          putDynamicTile(getInitOverlay(s.game), ts.modifyCell, ct);
        }
        else if (ts.panelState.t == 'buttoned') {
          const ct: DynamicTile = {
            t: 'buttoned',
            button_source: {
              x: parseInt(ts.panelState.x),
              y: parseInt(ts.panelState.y)
            },
          };
          putDynamicTile(getInitOverlay(s.game), ts.modifyCell, ct);
        }
        else if (ts.panelState.t == 'door') {
          const ct: DynamicTile = {
            t: 'door',
            destinationLevel: ts.panelState.destinationLevel,
          };
          putDynamicTile(getInitOverlay(s.game), ts.modifyCell, ct);
        }
      }
    });
    case 'setCurrentLevel':
      const newGameState = setCurrentLevel(s.game, a.name);
      return produce(s, s => {
        s.game = newGameState;
      });
  }
}
