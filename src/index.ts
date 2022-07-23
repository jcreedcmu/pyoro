import { View } from './view';
import { Player, State, init_state } from './state';
import { Model } from './model';
import { imgProm, nope } from './util';
import { Dict, Move, Tile } from './types';
import { DEBUG, FRAME_DURATION_MS, editTiles, guiData } from './constants';
import { key } from './key';
import { produce } from 'immer';
import * as dat from 'dat.gui';

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

class App {
  view: View;
  model: Model;

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
        body: JSON.stringify(s.gameState.overlay),
        headers: {
          'Content-Type': 'application/json',
        }
      });
      fetch(req).then(r => r.json())
        .then(x => console.log(x))
        .catch(console.error);
      return produce(s, s => {
        s.initial_overlay.tiles = s.gameState.overlay.tiles;
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
    this.model = new Model(init_state);
  }

  run(): void {
    const { view } = this;

    if (DEBUG.globals) {
      (window as any)['_app'] = this;
    }

    window.onresize = () => this.resize();

    this.init_keys();
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
    this.view.draw(this.model.state);
  }

  init_keys(): void {
    document.onkeydown = e => {
      if (DEBUG.keys) {
        console.log(e.keyCode);
        console.log(e.code);
      }
      const k = key(e);
      const f = App.commandBindings[k];
      if (f) {
        e.stopPropagation();
        e.preventDefault();
        const oldState = this.model.state;
        const newState = f(oldState);
        if (newState != oldState) {
          this.model.state = newState;
          this.view.draw(this.model.state);
        }
      }
      else {
        const move = App.moveBindings[k];
        if (move) {
          e.stopPropagation();
          e.preventDefault();
          this.handle_key(move);
        }
      }
    };
  }

  // XXX loule I'm not even buffering keys that were pressed during
  // the lock period? Probably should fix this.
  lock = false;
  handle_key(ks: Move): void {
    const { view, model } = this;
    const state = model.state;

    if (!this.lock) {
      let cur_frame = 0;
      const animator = model.animator_for_move(ks);
      this.lock = true;

      const step = () => {
        cur_frame++;
        const nextState = animator.anim(cur_frame, state);
        view.draw(nextState);
        if (cur_frame == animator.dur) {
          model.state = nextState;
          this.lock = false;
        }
        else
          setTimeout(step, FRAME_DURATION_MS);
      };

      step();
    }
  }

  init_mouse(): void {
    const { view, model } = this;
    const c = view.c;
    c.onmousedown = (e: MouseEvent) => {
      const wpoint = view.wpoint_of_canvas({ x: e.clientX, y: e.clientY }, model.state);
      if (DEBUG.mouse) {
        console.log(wpoint);
      }
      switch (wpoint.t) {
        case 'World':
          model.handle_world_click(wpoint.p);
          view.draw(model.state);
          break;
        case 'EditTiles':
          model.handle_edit_click(wpoint.ix);
          view.draw(model.state);
          break;
        default:
          return nope(wpoint);
      }
    };
  }
}
