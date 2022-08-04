import { View } from './view';
import { Player, State, init_state } from './state';
import { animator_for_move, handle_edit_click, handle_world_click, _putTile } from './model';
import { imgProm, nope } from './util';
import { Dict, Move, Tile } from './types';
import { DEBUG, FRAME_DURATION_MS, editTiles, guiData } from './constants';
import { key } from './key';
import { produce } from 'immer';
import * as dat from 'dat.gui';
import { Animator } from './animation';

window.onload = () => {

  const app = new App;
  app.run();

  if (DEBUG.datgui) {
    const gui = new dat.GUI();
    const colorCtr = gui.addColor(guiData, 'background_color');
    const stageCtr = gui.addColor(guiData, 'stage_color');
    colorCtr.onChange((value: string) => {
      guiData.background_color = value;
      app.redraw();
    });
    stageCtr.onChange((value: string) => {
      guiData.stage_color = value;
      app.redraw();
    });

  }

};

type Action =
  | { t: 'changeState', f: (s: State) => State }
  | { t: 'setState', s: State }
  | { t: 'animate', cur_frame: number, animator: Animator };

function reduce(s: State, a: Action): State {
  switch (a.t) {
    case 'changeState': return a.f(s);
    case 'setState': return a.s;
    case 'animate': return a.animator.anim(a.cur_frame, s);
  }
}

class App {
  view: View;
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
    const c = document.getElementById('c') as HTMLCanvasElement;
    const d = c.getContext('2d') as CanvasRenderingContext2D;

    this.view = new View(c, d);
  }

  run(): void {
    const { view } = this;

    if (DEBUG.globals) {
      (window as any)['_app'] = this;
    }

    window.onresize = () => this.resize();

    const dispatch = (a: Action) => {
      const newState = reduce(this.state, a);
      if (this.state != newState) {
        this.state = newState
        this.view.draw(newState);
      }
    }

    this.init_keys(dispatch);
    this.init_mouse();

    imgProm('assets/sprite.png').then(s => {
      view.spriteImg = s;
    }).then(() => this.resize());
  }

  resize(): void {
    this.view.resize();
    this.redraw();
  }

  redraw(): void {
    this.view.draw(this.state);
  }

  init_keys(dispatch: (a: Action) => void): void {
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
  handle_key(dispatch: (s: Action) => void, ks: Move): void {
    const { view } = this;
    if (!this.lock) {
      let cur_frame = 0; // XXX this belongs in interface state
      const animator = animator_for_move(this.state, ks);
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

  drag_world(tileToPut: Tile): void {
    const { view } = this;
    const c = view.c;

    const mouseUp = (e: MouseEvent) => {
      c.removeEventListener('mousemove', mouseMove);
      document.removeEventListener('mouseup', mouseUp);
    }
    const mouseMove = (e: MouseEvent) => {
      const wpoint = view.wpoint_of_canvas({ x: e.clientX, y: e.clientY }, this.state);
      if (wpoint.t == 'World') {
        this.state = _putTile(this.state, wpoint.p, tileToPut);
        view.draw(this.state);
      }
    }
    c.addEventListener('mousemove', mouseMove);
    document.addEventListener('mouseup', mouseUp);
  }

  init_mouse(): void {
    const { view } = this;
    const c = view.c;
    c.onmousedown = (e: MouseEvent) => {

      const wpoint = view.wpoint_of_canvas({ x: e.clientX, y: e.clientY }, this.state);
      if (DEBUG.mouse) {
        console.log(wpoint);
      }
      switch (wpoint.t) {
        case 'World':
          const { tile, state } = handle_world_click(this.state, wpoint.p);
          this.state = state;
          view.draw(this.state);
          this.drag_world(tile);
          break;
        case 'EditTiles':
          this.state = handle_edit_click(this.state, wpoint.ix);
          view.draw(this.state);
          break;
        default:
          return nope(wpoint);
      }
    };
  }
}
