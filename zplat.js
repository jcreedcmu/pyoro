$(go);

function int(x) {
  return Math.floor(x);
}

var NUM_TILES_X = 16;
var NUM_TILES_Y = 12;
var TILE_SIZE = 16;
var SCALE = 3;

var view = {};

var model;

var sprites = {
  box:    {x:1, y:4},
  white:  {x:0, y:0},
  player: {x:1, y:2},
};

function bindVia(obj, proto) {
  var fs = _.functions(proto);
  console.log(fs);
  _.each(fs, function(f) {
    obj[f] = function() {
      return proto[f].apply(obj, arguments);
    }
  });
}

function Model(props) {
  _.extend(this, props);
  bindVia(this, Model.prototype);
  console.log(_.methods(this));
}

Model.prototype.draw = function (msg) {
  var c = view.c;
  var d = view.d;

  c.width = 0;
  c.height = 0;
  ww = c.width = document.width;
  hh = c.height = document.height;

  d.fillStyle = "#def";
  d.fillRect(0,0,ww,hh);

  for (var y = 0; y < NUM_TILES_Y; y++) {
    for (var x = 0; x < NUM_TILES_X; x++) {
      draw_sprite(d, this.getTile(x + this.viewPort.x, y + this.viewPort.y), {x:x, y:y});
    }
  }

  draw_sprite(d, 'player', {x:this.player.pos.x - this.viewPort.x,
			    y:this.player.pos.y - this.viewPort.y});


}

Model.prototype.getTile = function (x,y) {
  if (y == 0)
    return 'box';
  else return 'white';
}

function imgProm(src) {
  var def = Q.defer();
  var sprite = new Image();
  sprite.src = "sprite.png";
  sprite.onload = function() { def.resolve(sprite); }
  return def.promise;
}

function go() {

  model = new Model({
    player: {pos: {x: 0, y: -1}},
    viewPort: {x: -5, y: -5},
  });

  $(window).resize(model.draw);

  var c = $("<canvas>")[0];
  $("body").append(c);

  var d = c.getContext('2d');

  init_keys();

  view.c = c;
  view.d = d;
  imgProm('sprite.png').then(function(s) {
    view.sprite = s;
  }).then(model.draw)
    .done();

}

function draw_sprite(d, sprite_id, wpos) {
  var center_x = int(ww / 2);
  var center_y = int(hh / 2);

  var o_x = center_x - int(NUM_TILES_X * TILE_SIZE * SCALE / 2);
  var o_y = center_y - int(NUM_TILES_Y * TILE_SIZE * SCALE / 2);

  var sprite_loc = sprites[sprite_id];

  d.webkitImageSmoothingEnabled = false;
  d.drawImage(view.sprite,
	      sprite_loc.x * TILE_SIZE, sprite_loc.y * TILE_SIZE, TILE_SIZE, TILE_SIZE,
	      o_x + wpos.x * TILE_SIZE * SCALE, o_y + wpos.y * TILE_SIZE * SCALE, TILE_SIZE * SCALE, TILE_SIZE * SCALE);
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
    }
  });
}

function _handle_key(ks) {
  switch(ks) {
  case 'up':
    model.player.pos.y -= 1;
    model.draw();
    break;
  case 'down':
    model.player.pos.y += 1;
    model.draw();
    break;
  case 'left':
    model.player.pos.x -= 1;
    model.draw();
    break;
  case 'right':
    model.player.pos.x += 1;
    model.draw();
    break;
  }
}

function handle_key(ks) {
  _handle_key(ks);
  throw "handled";
}
