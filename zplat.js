$(go);

function int(x) {
  return Math.floor(x);
}

var NUM_TILES_X = 12;
var NUM_TILES_Y = 9;
var TILE_SIZE = 16;
var SCALE = 4;

var model = {};
var view = {};

function imgProm(src) {
  var def = Q.defer();
  var sprite = new Image();
  sprite.src = "sprite.png";
  sprite.onload = function() { def.resolve(sprite); }
  return def.promise;
}

function go() {
  var c = $("<canvas>")[0];
  $("body").append(c);

  var d = c.getContext('2d');

  view.c = c;
  view.d = d;
  imgProm('sprite.png').then(function(s) {
    view.sprite = s;
  }).then(draw_model);

}

function draw_sprite(d, sprite_loc, wpos) {
  var center_x = int(ww / 2);
  var center_y = int(hh / 2);

  var o_x = center_x - int(NUM_TILES_X * TILE_SIZE * SCALE / 2);
  var o_y = center_y - int(NUM_TILES_Y * TILE_SIZE * SCALE / 2);

  d.webkitImageSmoothingEnabled = false;
  d.drawImage(view.sprite,
	      sprite_loc.x * TILE_SIZE, sprite_loc.y * TILE_SIZE, TILE_SIZE, TILE_SIZE,
	      o_x + wpos.x * TILE_SIZE * SCALE, o_y + wpos.y * TILE_SIZE * SCALE, TILE_SIZE * SCALE, TILE_SIZE * SCALE);
}

function draw_model() {
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
      draw_sprite(d, {x:0, y:0},{x:x, y:y});
    }
  }

  draw_sprite(d, {x:1, y:2},{x:1, y:5});
  for (var x = 0; x < NUM_TILES_X; x++) {
    draw_sprite(d, {x:1, y:4},{x:x, y:6});
  }
}

$(window).resize(draw_model);
