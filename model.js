function Model(props) {
  _.extend(this, props);
  bindVia(this, Model.prototype);
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
