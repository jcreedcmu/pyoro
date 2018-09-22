import View from './view';
import { Player, newPlayer } from './animation';
import { Model } from './model';
import { imgProm } from './util';
import { Dict, Move } from './types';
import { Layer } from './chunk';
import { DEBUG } from './constants';
import { key } from './key';

window.onload = go;

let view: View;

function go() {
  var model = new Model({
    player: newPlayer({ x: -1, y: 0 }),
    viewPort: { x: -13, y: -9 },
    layer: new Layer(),
  });

  var c = document.getElementById('c') as HTMLCanvasElement;
  var d = c.getContext('2d') as CanvasRenderingContext2D;

  view = new View(model, c, d);

  if (DEBUG.globals) {
    (window as any)['view'] = view;
    (window as any)['model'] = model;
  }

  window.onresize = () => view.resize();

  init_keys();

  imgProm('assets/sprite.png').then(function(s) {
    view.spriteImg = s;
  }).then(() => view.resize());
}

const bindings: Dict<Move> = {
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


function init_keys() {
  document.onkeydown = e => {
    if (DEBUG.keys) {
      console.log(e.keyCode);
      console.log(e.code);
    }
    const k = bindings[key(e)];
    if (k) {
      handle_key(k);
    }
  };
}

// XXX loule I'm not even buffering keys that were pressed during the
// lock period? and the lock is global state? Probably should fix
// this.
let lock = false;
function handle_key(ks: Move): void {
  if (!lock) {
    var animator = view.model.animator_for_move(ks);
    view.model.state = animator(0.5);
    lock = true;
    view.draw();
    setTimeout(function() {
      view.model.state = animator(1);
      view.model.extend(view.model.state.layer);
      lock = false;
      view.draw();
    }, 30);
  }
}
