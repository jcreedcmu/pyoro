function Model(props) {
  _.extend(this, props);
  bindVia(this, Model.prototype);
}

function mod(x, y) {
  var z = x % y;
  if (z < 0) z += y;
  return z;
}

Model.prototype.getTile = function (p) {
  SIZE = 4;
  if ((mod(p.y, 2 * SIZE) == 1 || mod(p.x, 2 * SIZE) == 1) &&
      !(mod(p.y, 2 * SIZE) == 1 + SIZE || mod(p.x, 2 * SIZE) == 1 + SIZE)) {
    return mod(p.x + p.y, 3) ? 'box' : 'box2';
  }
  else return 'empty';
}

var openTiles = _.object("empty".split(" "), []);

function openTile(x) {
  return (_.has(openTiles, x));
}
Model.prototype.execute_move = function (move) {
  var playerIntent = {x:0, y:0};
  switch (move){
  case 'up':
    playerIntent.y -= 1;
    break;
  case 'down':
    playerIntent.y += 1;
    break;
  case 'left':
    playerIntent.x -= 1;
    break;
  case 'right':
    playerIntent.x += 1;
    break;
  case 'reset':
    this.resetViewPort();
    break;
  }

  var newpos = vplus(playerIntent, this.player.pos);
  if (openTile(this.getTile(newpos))) {
    this.player.pos = newpos;
  }
  else {
    // gravity ?
  }

  if (this.player.pos.x - this.viewPort.x >= NUM_TILES_X - 1) { this.viewPort.x += 1 }
  if (this.player.pos.x - this.viewPort.x < 1) { this.viewPort.x -= 1 }
  if (this.player.pos.y - this.viewPort.y >= NUM_TILES_Y - 1) { this.viewPort.y += 1 }
  if (this.player.pos.y - this.viewPort.y < 1) { this.viewPort.y -= 1 }

}

Model.prototype.resetViewPort = function () {
this.viewPort.x = int(this.player.pos.x - NUM_TILES_X / 2);
    this.viewPort.y = int(this.player.pos.y - NUM_TILES_Y / 2);
}
