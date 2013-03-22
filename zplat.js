$(go);

var view;

function go() {
  var model = new Model({
    player: {pos: {x: 0, y: -1}},
    viewPort: {x: -5, y: -5},
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

function init_keys() {
  $(document).keydown(function(e){
    try {
      if (e.keyCode == 37) { handle_key('left'); }
      if (e.keyCode == 38) { handle_key('up'); }
      if (e.keyCode == 39) { handle_key('right'); }
      if (e.keyCode == 40) { handle_key('down'); }
      if (e.keyCode == 'A'.charCodeAt(0)) { handle_key('left'); }
      if (e.keyCode == 'W'.charCodeAt(0)) { handle_key('up'); }
      if (e.keyCode == 'D'.charCodeAt(0)) { handle_key('right'); }
      if (e.keyCode == 'S'.charCodeAt(0)) { handle_key('down'); }
      if (e.keyCode == 'L'.charCodeAt(0)) { handle_key('reset'); }
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
