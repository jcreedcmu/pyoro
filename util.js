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

function mod(x, y) {
  var z = x % y;
  if (z < 0) z += y;
  return z;
}

function div(x, y) {
  return int(x / y);
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

function vscale(v, s) {
  return {x: v.x * s, y: v.y * s};
}

function vint(v) {
  return {x: int(v.x), y: int(v.y)};
}

function vfpart(v) {
  return {x: v.x - int(v.x), y: v.y - int(v.y)};
}

function interval_intersect(a, b) {
  return b[0] < a[1] && a[0] < b[1];
}

function rect_intersect(r1, r2) {
  var rv = (interval_intersect([r1.p.x, r1.p.x + r1.w], [r2.p.x, r2.p.x + r2.w])
	  && interval_intersect([r1.p.y, r1.p.y + r1.h], [r2.p.y, r2.p.y + r2.h]));
  return rv;
}

function srand(n) {
  var x = n;
  var z = function() {
    x = (2147483629 * x + 2147483587) % 2147483647;
    return (x & 0xffff) / (1 << 16);
  }
  return z;
}

function hash(p) {
  var z = srand(1000 * p.x + 3758 * p.y);
  _.times(10, z);
  return z();
}

function js(x) { return JSON.stringify(x) }
