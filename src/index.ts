import View from './view';
import { Player, newPlayer } from './state';
import { Model } from './model';
import { imgProm } from './util';
import { Dict, Move, Tile } from './types';
import { Layer } from './layer';
import { DEBUG, FRAME_DURATION_MS } from './constants';
import { key } from './key';
import { initial_overlay } from './initial_overlay';
import { produce } from 'immer';

window.onload = () => {
  const app = new App;
  app.run();
};

class App {
  view: View;
  editTileIndex: number = 0;
  editTiles: Tile[] = ['box3', 'up_box', 'fragile_box'];

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

  static commandBindings: Dict<(a: App) => void> = {
    ',': a => {
      a.editTileIndex = (a.editTileIndex + 1) % a.editTiles.length;
      a.view.model.editTile = a.editTiles[a.editTileIndex];
    },
    '.': a => {
      a.editTileIndex = (a.editTileIndex - 1 + a.editTiles.length) % a.editTiles.length;
      a.view.model.editTile = a.editTiles[a.editTileIndex];
    },
    's': a => {
      const req = new Request('/save', {
        method: 'POST',
        body: JSON.stringify(a.view.model.state.overlay),
        headers: {
          'Content-Type': 'application/json',
        }
      });
      fetch(req).then(r => r.json())
        .then(x => console.log(x))
        .catch(console.error);
    }
  }

  constructor() {
    const model = new Model({
      player: newPlayer({ x: -1, y: 0 }),
      viewPort: { x: -13, y: -9 },
      transient_layer: new Layer(),
      overlay: new Layer(initial_overlay),
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
        f(this);
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

    if (!this.lock) {
      const animator = model.animator_for_move(ks);
      model.state = animator(0.5);
      this.lock = true;
      view.draw();
      setTimeout(() => {
        model.state = animator(1);
        model.extend(model.state.transient_layer);
        model.state = produce(model.state, st => {
          st.transient_layer = new Layer();
        });
        this.lock = false;
        view.draw();
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
      view.draw();
    };
  }
}
