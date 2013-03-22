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

  $(window).resize(view.draw);

  init_keys();

  imgProm('sprite.png').then(function(s) {
    view.spriteImg = s;
  }).then(view.draw)
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
    }
    catch(e) {
      if (e == "handled") {
	return false;
      }
      else {
	throw e;
      }
    }
  });
}

function _handle_key(ks) {
  switch(ks) {
  case 'up':
    view.model.player.pos.y -= 1;
    view.draw();
    break;
  case 'down':
    view.model.player.pos.y += 1;
    view.draw();
    break;
  case 'left':
    view.model.player.pos.x -= 1;
    view.draw();
    break;
  case 'right':
    view.model.player.pos.x += 1;
    view.draw();
    break;
  }
}

function handle_key(ks) {
  _handle_key(ks);
  throw "handled";
}
