import View from './view';
import { Player, newPlayer } from './animation';
import { Model } from './model';
import { imgProm } from './util';
import { Dict, Move } from './types';
import { Layer } from './chunk';
import { DEBUG } from './constants';
import { key } from './key';

window.onload = () => {
  const app = new App;
  app.run();
};

class App {
  view: View;

  static bindings: Dict<Move> = {
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

  constructor() {
    const model = new Model({
      player: newPlayer({ x: -1, y: 0 }),
      viewPort: { x: -13, y: -9 },
      layer: new Layer(),
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
      const k = App.bindings[key(e)];
      if (k) {
        this.handle_key(k);
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
        model.extend(model.state.layer);
        this.lock = false;
        view.draw();
      }, 30);
    }
  }

  init_mouse(): void {
    const { view } = this;
    const { model } = view;
    document.onmousedown = (e: MouseEvent) => {

      const c = document.getElementById("c");
      if (c == null) throw "can't find canvas element";
      const rect = c.getBoundingClientRect();
      model.handle_mousedown(view.world_of_canvas({ x: e.clientX, y: e.clientY }));
      view.draw();
    };
  }
}
