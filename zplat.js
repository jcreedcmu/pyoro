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
  $(document).keydown(function(e){
    console.log(e.keyCode);
    console.log(e.originalEvent.charCode);
    console.log(e.originalEvent.keyCode);
    try {
      if (_.has(keys, e.keyCode)) {
	handle_key(keys[e.keyCode]);
      }
    }
    catch(e) {
      if (e == "handled") {
	view.draw();
	return false;
      }
      else {
	throw e;
      }
    }
  });
}

function _handle_key(ks) {
  view.model.execute_move(ks);
}

function handle_key(ks) {
  _handle_key(ks);
  throw "handled";
}
