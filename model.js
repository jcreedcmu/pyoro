function Model(props) {
  _.extend(this, props);
  bindVia(this, Model.prototype);
}

Model.prototype.getTile = function (p) {
  if (p.y == 0 && p.x != 0)
    return 'box';
  else return 'white';
}

var openTiles = _.object("white".split(" "), []);

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
