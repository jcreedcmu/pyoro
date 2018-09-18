import View from './view';
import { Player } from './Animation';
import { Model } from './model';
import { imgProm } from './util';
import { Dict, Move } from './types';
import { Layer } from './Chunk';

window.onload = go;

let view: View;

function go() {
  var model = new Model({
    player: new Player({ pos: { x: -1, y: 0 } }),
    viewPort: { x: -13, y: -9 },
    layer: new Layer(),
  });

  var c = document.getElementById('c') as HTMLCanvasElement;
  var d = c.getContext('2d') as CanvasRenderingContext2D;

  view = new View(model, c, d);

  window.onresize = () => view.resize();

  init_keys();

  imgProm('assets/sprite.png').then(function(s) {
    view.spriteImg = s;
  }).then(() => view.resize());
}

const keys: Dict<Move> = {
  36: 'up-left',
  33: 'up-right',
  37: 'left',
  38: 'up',
  39: 'right',
  40: 'down',
  0: 'down',
}

keys['Q'.charCodeAt(0)] = 'up-left';
keys['E'.charCodeAt(0)] = 'up-right';
keys['A'.charCodeAt(0)] = 'left';
keys['W'.charCodeAt(0)] = 'up';
keys['D'.charCodeAt(0)] = 'right';
keys['S'.charCodeAt(0)] = 'down';
keys['L'.charCodeAt(0)] = 'reset';

function init_keys() {
  document.onkeydown = e => {
    if (keys[e.keyCode]) {
      handle_key(keys[e.keyCode]);
    }
  };
}

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
