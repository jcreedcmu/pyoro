$(go);

var view;

function go() {
  var model = new Model({
    player: new Player({pos: {x: -1, y: 0}}),
    viewPort: {x: -13, y: -9},
  });

  var c = $("<canvas>")[0];
  $("body").append(c);

  var d = c.getContext('2d');

  view = new View({model: model, c: c, d: d});

  $(window).resize(view.resize);

  init_keys();

  imgProm('sprite.png').then(function(s) {
    view.spriteImg = s;
  }).then(view.resize)
    .done();
}

var keys = {
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
  $(document).keydown(function(e) {
    if (_.has(keys, e.keyCode)) {
      handle_key(keys[e.keyCode]);
    }
  });
}

var lock = false;
function handle_key(ks) {
  if (!lock) {
    var animator = view.model.animator_for_move(ks);
    view.model.state = animator(0.5);
    lock = true;
    view.draw();
    setTimeout(function(){
      view.model.state = animator(1);
      view.model.extend(view.model.state.layer);
      lock = false;
      view.draw();
    }, 30);
  }
}
