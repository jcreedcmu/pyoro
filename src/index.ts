import { drawView, FView, initView, resizeView, ViewData, wpoint_of_canvas } from './view';
import { Player, State, init_state } from './state';
import { animator_for_move, handle_edit_click, handle_world_click, _putTile } from './model';
import { imgProm } from './util';
import { Dict, Move, Tile } from './types';
import { DEBUG, FRAME_DURATION_MS, editTiles, guiData } from './constants';
import { key } from './key';
import { produce } from 'immer';
import * as dat from 'dat.gui';
import { Animator } from './animation';
import { Action, Dispatch, Effect, reduce } from './reduce';

async function onload() {
  const app = new App;
  await app.run();

  if (DEBUG.datgui) {
    const gui = new dat.GUI();
    const colorCtr = gui.addColor(guiData, 'background_color');
    const stageCtr = gui.addColor(guiData, 'stage_color');
    colorCtr.onChange((value: string) => {
      guiData.background_color = value;
      //      app.redraw(); // XXX doesn't work now
    });
    stageCtr.onChange((value: string) => {
      guiData.stage_color = value;
      //    app.redraw(); // XXX doesn't work now
    });
  }
}

window.addEventListener('load', onload);

class App {
  c: HTMLCanvasElement;
  d: CanvasRenderingContext2D;
  spriteImg: HTMLImageElement | null = null;
  state: State = init_state;

  static moveBindings: Dict<Move> = {
    'KP7': 'up-left',
    'KP9': 'up-right',
    'KP4': 'left',
    'KP8': 'up',
    'KP6': 'right',
    'KP2': 'down',
    'KP5': 'down',
    'q': 'up-left',
    'e': 'up-right',
    'a': 'left',
    'w': 'up',
    'd': 'right',
    's': 'down',
    'S-r': 'reset',
    'c': 'recenter',
  }

  static commandBindings: Dict<(s: State) => State> = {
    '.': (s) => {
      return produce(s, s => {
        s.iface.editTileIx = (s.iface.editTileIx + 1) % editTiles.length;
      });
    },
    ',': (s) => {
      return produce(s, s => {
        s.iface.editTileIx = (s.iface.editTileIx - 1 + editTiles.length) % editTiles.length;
      });
    },
    'C-s': (s) => {
      const req = new Request('/save', {
        method: 'POST',
        body: JSON.stringify(s.game.overlay),
        headers: {
          'Content-Type': 'application/json',
        }
      });
      fetch(req).then(r => r.json())
        .then(x => console.log(x))
        .catch(console.error);
      return produce(s, s => {
        s.game.initOverlay.tiles = s.game.overlay.tiles;
      });
    },
    'r': (s) => {
      return produce(s, s => {
        s.iface.editTileRotation = (s.iface.editTileRotation + 1) % 4;
      });
    },
  }

  constructor() {
    this.c = document.getElementById('c') as HTMLCanvasElement;
    this.d = this.c.getContext('2d') as CanvasRenderingContext2D;

    initView();
  }

  getFview(): FView | null {
    if (this.state.iface.vd == null) return null;
    if (this.spriteImg == null) return null;
    return { d: this.d, vd: this.state.iface.vd, spriteImg: this.spriteImg };
  }

  async run(): Promise<void> {
    if (DEBUG.globals) {
      (window as any)['_app'] = this;
    }

    window.addEventListener('resize', () => this.resize(dispatch));

    const dispatch = (a: Action) => {
      const { s: newState, effects } = reduce(this.state, a);
      if (this.state != newState) {
        this.state = newState
        const fv = this.getFview();
        if (fv !== null) {
          drawView(fv, newState);
        }
      }
      if (effects) {
        effects.forEach(e => this.doEffect(e));
      }
    }

    this.init_keys(dispatch);
    this.init_mouse(dispatch);

    const s = await imgProm('assets/sprite.png');
    this.spriteImg = s;
    this.resize(dispatch);
  }

  doEffect(e: Effect) {
  }

  resize(dispatch: (a: Action) => void): void {
    dispatch({ t: 'resize', vd: resizeView(this.c) });
  }

  init_keys(dispatch: Dispatch): void {
    document.onkeydown = e => {
      if (DEBUG.keys) {
        console.log(e.keyCode);
        console.log(e.code);
      }
      const k = key(e);
      const f = App.commandBindings[k];
      if (f !== undefined) {
        e.stopPropagation();
        e.preventDefault();
        dispatch({ t: 'changeState', f });
      }
      else {
        const move = App.moveBindings[k];
        if (move) {
          e.stopPropagation();
          e.preventDefault();
          this.handle_key(dispatch, move);
        }
      }
    };
  }

  // XXX loule I'm not even buffering keys that were pressed during
  // the lock period? Probably should fix this.

  // XXX also should just update the state with the current frame and
  // functionally render from there.
  lock = false;
  handle_key(dispatch: Dispatch, ks: Move): void {
    if (!this.lock) {
      let cur_frame = 0; // XXX this belongs in interface state
      const animator = animator_for_move(this.state, ks);

      if (animator.dur > 0) {
        this.lock = true; // XXX this belongs in interface state

        const step = () => {
          cur_frame++;
          dispatch({ t: 'animate', cur_frame, animator });
          if (cur_frame == animator.dur) {
            this.lock = false; // XXX this belongs in interface state
          }
          else
            setTimeout(step, FRAME_DURATION_MS);
        };

        step();
      }
    }
  }

  // XXX doesn't get called right now
  drag_world(dispatch: Dispatch, tileToPut: Tile): void {
    const c = this.c;

    const mouseUp = (e: MouseEvent) => {
      c.removeEventListener('mousemove', mouseMove);
      document.removeEventListener('mouseup', mouseUp);
    }
    const mouseMove = (e: MouseEvent) => {
      const fv = this.getFview();
      if (fv == null)
        return;
      const wpoint = wpoint_of_canvas(fv, { x: e.clientX, y: e.clientY }, this.state);
      if (wpoint.t == 'World')
        dispatch({ t: 'putTile', p: wpoint.p, tile: tileToPut });
      c.addEventListener('mousemove', mouseMove);
      document.addEventListener('mouseup', mouseUp);
    }
  }

  init_mouse(dispatch: Dispatch): void {
    const c = this.c;
    c.onmousedown = (e: MouseEvent) => {
      const fv = this.getFview();
      if (fv == null)
        return;
      const wpoint = wpoint_of_canvas(fv, { x: e.clientX, y: e.clientY }, this.state);
      if (DEBUG.mouse) {
        console.log(wpoint);
      }
      dispatch({ t: 'click', wpoint });
    };
  }
}
