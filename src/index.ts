import View from './view';
import { Player, State, init_state } from './state';
import { Model } from './model';
import { imgProm } from './util';
import { Dict, Move, Tile } from './types';
import { DEBUG, FRAME_DURATION_MS, editTiles } from './constants';
import { key } from './key';
import { produce, DraftObject } from 'immer';

window.onload = () => {
  const app = new App;
  app.run();
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
    'r': 'reset',
    'c': 'recenter',
  }

  static commandBindings: Dict<(s: State) => State> = {
    ',': (s) => {
      return produce(s, s => {
        s.iface.editTileIx = (s.iface.editTileIx + 1) % editTiles.length;
      });
    },
    '.': (s) => {
      return produce(s, s => {
        s.iface.editTileIx = (s.iface.editTileIx - 1 + editTiles.length) % editTiles.length;
      });
    },
    's': (s) => {
      const req = new Request('/save', {
        method: 'POST',
        body: JSON.stringify(s.overlay),
        headers: {
          'Content-Type': 'application/json',
        }
      });
      fetch(req).then(r => r.json())
        .then(x => console.log(x))
        .catch(console.error);
      return s;
    }
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
      (window as any)['app'] = this;
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
        const nextState = produce(state, s => animator.anim(cur_frame, s))
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
    document.onmousedown = (e: MouseEvent) => {

      const c = document.getElementById("c");
      const world_pos = view.world_of_canvas({ x: e.clientX, y: e.clientY }, model.state);
      if (DEBUG.mouse) {
        console.log(world_pos);
      }
      if (c == null) throw "can't find canvas element";
      const rect = c.getBoundingClientRect();
      model.handle_mousedown(world_pos);
      view.draw(model.state);
    };
  }
}
