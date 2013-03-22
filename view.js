var NUM_TILES_X = 16;
var NUM_TILES_Y = 12;
var TILE_SIZE = 16;
var SCALE = 3;

var sprites = {
  box:    {x:1, y:4},
  white:  {x:0, y:0},
  player: {x:1, y:2},
};

function View(props) {
  _.extend(this, props);
  bindVia(this, View.prototype);
}

View.prototype.draw = function () {
  var c = this.c;
  var d = this.d;
  var model = this.model;

  c.width = 0;
  c.height = 0;
  this.ww = c.width = document.width;
  this.hh = c.height = document.height;

  d.fillStyle = "#def";
  d.fillRect(0,0,this.ww,this.hh);

  for (var y = 0; y < NUM_TILES_Y; y++) {
    for (var x = 0; x < NUM_TILES_X; x++) {
      this.draw_sprite(model.getTile(x + model.viewPort.x, y + model.viewPort.y), {x:x, y:y});
    }
  }

  this.draw_sprite('player', {x:model.player.pos.x - model.viewPort.x,
				 y:model.player.pos.y - model.viewPort.y});


}

View.prototype.draw_sprite = function (sprite_id, wpos) {
  var center_x = int(this.ww / 2);
  var center_y = int(this.hh / 2);

  var o_x = center_x - int(NUM_TILES_X * TILE_SIZE * SCALE / 2);
  var o_y = center_y - int(NUM_TILES_Y * TILE_SIZE * SCALE / 2);

  var sprite_loc = sprites[sprite_id];

  var d = this.d;
  d.webkitImageSmoothingEnabled = false;
  d.drawImage(this.spriteImg,
	      sprite_loc.x * TILE_SIZE, sprite_loc.y * TILE_SIZE, TILE_SIZE, TILE_SIZE,
	      o_x + wpos.x * TILE_SIZE * SCALE, o_y + wpos.y * TILE_SIZE * SCALE, TILE_SIZE * SCALE, TILE_SIZE * SCALE);
}
