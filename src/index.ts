import View from './view';
import { Player, newPlayer, State } from './state';
import { Model } from './model';
import { imgProm } from './util';
import { Dict, Move, Tile } from './types';
import { DEBUG, FRAME_DURATION_MS, editTiles } from './constants';
import { key } from './key';
import { initial_overlay } from './initial_overlay';
import { produce, DraftObject } from 'immer';

window.onload = () => {
  const app = new App;
  app.run();
};

class App {
  view: View;

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
    const model = new Model({
      player: newPlayer({ x: -1, y: 0 }),
      viewPort: { x: -13, y: -9 },
      overlay: initial_overlay,
      iface: {
        editTileIx: 0,
      }
    });

    const c = document.getElementById('c') as HTMLCanvasElement;
    const d = c.getContext('2d') as CanvasRenderingContext2D;

    this.view = new View(model, c, d);
  }

  run(): void {
    const { view } = this;

    if (DEBUG.globals) {
      (window as any)['app'] = this;
    }

    window.onresize = () => view.resize();

    this.init_keys();
    this.init_mouse();

    imgProm('assets/sprite.png').then(s => {
      view.spriteImg = s;
    }).then(() => view.resize());
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
        const oldState = this.view.model.state;
        const newState = f(oldState);
        if (newState != oldState) {
          this.view.model.state = newState;
          this.view.draw(this.view.model.state);
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
    const { view } = this;
    const { model } = view;
    const state = model.state;

    if (!this.lock) {
      const animator = model.animator_for_move(ks);
      this.lock = true;
      view.draw(produce(state, s => animator(0.5, s)));
      setTimeout(() => {
        const finalState = produce(state, s => animator(1, s))
        model.state = finalState;
        this.lock = false;
        view.draw(finalState);
      }, FRAME_DURATION_MS);
    }
  }

  init_mouse(): void {
    const { view } = this;
    const { model } = view;
    document.onmousedown = (e: MouseEvent) => {

      const c = document.getElementById("c");
      const world_pos = view.world_of_canvas({ x: e.clientX, y: e.clientY });
      if (DEBUG.mouse) {
        console.log(world_pos);
      }
      if (c == null) throw "can't find canvas element";
      const rect = c.getBoundingClientRect();
      model.handle_mousedown(world_pos);
      view.draw(view.model.state);
    };
  }
}
