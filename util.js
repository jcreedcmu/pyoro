function bindVia(obj, proto) {
  var fs = _.functions(proto);
  _.each(fs, function(f) {
    obj[f] = function() {
      return proto[f].apply(obj, arguments);
    }
  });
}

function int(x) {
  return Math.floor(x);
}

function imgProm(src) {
  var def = Q.defer();
  var sprite = new Image();
  sprite.src = "sprite.png";
  sprite.onload = function() { def.resolve(sprite); }
  return def.promise;
}

function vplus(v1, v2) {
  return {x: v1.x + v2.x, y: v1.y + v2.y};
}

function vminus(v1, v2) {
  return {x: v1.x - v2.x, y: v1.y - v2.y};
}
