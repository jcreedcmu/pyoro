function Model(props) {
  _.extend(this, props);
  bindVia(this, Model.prototype);
}

Model.prototype.getTile = function (x,y) {
  if (y == 0)
    return 'box';
  else return 'white';
}

Model.prototype.execute_move = function (move) {
  switch (move){
  case 'up':
    this.player.pos.y -= 1;
    break;
  case 'down':
    this.player.pos.y += 1;
    break;
  case 'left':
    this.player.pos.x -= 1;
    break;
  case 'right':
    this.player.pos.x += 1;
    break;
  }
}
