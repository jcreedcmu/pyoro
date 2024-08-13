import { produce } from 'immer';
import { Action } from './action';
import { bindings } from './bindings';
import { editTiles } from './constants';
import { getInitOverlay, setCurrentLevel } from './game-state-access';
import { putDynamicTile } from './layer';
import { logger } from './logger';
import { animator_for_move, handle_toolbar_mousedown, handle_world_drag, handle_world_mousedown, renderGameAnims, renderIfaceAnims, tileOfGameState } from './model';
import { runSetter } from './optic';
import { ButtonedTileFields, DoorTileFields, State, TimedTileFields } from './state';
import * as testTools from './test-tools';
import { DynamicTile, Move } from './types';
import { wpoint_of_vd } from './view';
import { Animation } from './animation';

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
  let anim = s.anim;
  if (anim != null) {
    // resolve existing animation first
    s = resolveAllAnimations(s, anim.animator.anims);
  }

  return produce(s, s => {
    s.anim = {
      frame: 1,
      animator: animator_for_move(s, move)
    };
    s.effects.push({ t: 'scheduleFrame' });
  });
}

function resolveAllAnimations(s: State, anims: Animation[]): State {
  return {
    iface: renderIfaceAnims(anims, 'complete', s),
    game: renderGameAnims(anims, 'complete', s.game),
    anim: null,
    effects: [],
  };
}

export function reduce(s: State, a: Action): State {
  const look = tileOfGameState(s.game, { x: 1, y: 2 });
  console.log('reduce peek', look);
  console.log('reduce', s, a);
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
        console.error('Tried to advance frame without active animation');
        return s;
      }
      if (ams.animator.dur == ams.frame + 1) {
        return resolveAllAnimations(s, ams.animator.anims);
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
    case 'setField':
      return runSetter(a.setter, s);
    case 'testToolsAction': {
      if (s.iface.toolState.t != 'test_tool') {
        throw new Error('reducing test tool action while not in test tool state');
      }
      const oldState = s.iface.toolState.testToolState;
      const newState = testTools.reduce(oldState, a.action);
      return produce(s, s => {
        s.iface.toolState = { t: 'test_tool', testToolState: newState };
      });
    }
  }
}
