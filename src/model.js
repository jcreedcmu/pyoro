var CHUNK_SIZE = 16; // in number of tiles, for purposes of caching
var FULL_IMPETUS = 4;

function rawGetTile (p) {
  SIZE = 4;
  var h = hash(p, 2);
  var mtn = h[0] - (p.x * 0.015 + p.y * -0.003);
  if (h[0] - p.y * 0.1 < 0.3 || mtn < 0.3) {
    return  mtn < 0.25 ? 'box' : (mtn < 0.275 ? 'box3' : 'fragile_box');
  }
  else return 'empty';
}

function Layer() {
  this.tiles = { };
}

Layer.prototype.getTile = function (p) {
  return this.tiles[p.x + ',' + p.y];
}

Layer.prototype.putTile = function (p, t) {
  this.tiles[p.x + ',' + p.y] = t;
}

Layer.prototype.extend = function (l) {
  _.extend(this.tiles, l.tiles);
}

function CompositeLayer(l1, l2) {
  this.l1 = l1;
  this.l2 = l2;
}

CompositeLayer.prototype = new Layer();

CompositeLayer.prototype.putTile = function (p, t) {
  throw "CompositeLayer is readonly";
}

CompositeLayer.prototype.getTile = function (p) {
  return this.l1.getTile(p) || this.l2.getTile(p);
}

function Chunk(p, props) {
  this.pos = p;
  this.rawGetTile = rawGetTile;
  _.extend(this, props);
  for (var y = 0; y < CHUNK_SIZE; y++) {
    for (var x = 0; x < CHUNK_SIZE; x++) {
      var m = vplus(p, {x:x,y:y});
      this.tiles[m.x + ',' + m.y] = this.rawGetTile(m);
    }
  }
}

Chunk.prototype = new Layer();

Chunk.prototype.evict = function () {
  // nothing yet, maybe save to disk when we allow modifications

  //  console.log('evicting chunk ' + JSON.stringify(this.pos));
}

function ChunkCache() {
  this.chunks = { };
}

ChunkCache.prototype.get = function (p) {
  return this.chunks[p.x + ',' + p.y];
}

ChunkCache.prototype.add = function (c) {
  this.chunks[c.pos.x + ',' + c.pos.y] = c;
  return c;
}

ChunkCache.prototype.filter = function (viewPort) {
  var oldc = this.chunks;
  var newc = { };
  _.each(oldc, function(chunk, k) {
    if (rect_intersect({p: chunk.pos, w:CHUNK_SIZE, h: CHUNK_SIZE}, viewPort)) {
      newc[k] = chunk;
    }
    else {
      chunk.evict();
    }
  });
  this.chunks = newc;
}

function Model(state, props) {
  this.cache = new ChunkCache();
  this.cache_misses = 0;
  this.chunk_props = {};
  this.state = state;
  _.extend(this, props); // can inject {chunk_props: {rawGetTile: ...}} in props
  bindVia(this, Model.prototype);
}

Model.prototype.extend = function (l) {
  var that = this;
  _.map(l.tiles, function (v, k) {
    var coords = k.split(','); // arrrrg
    that.putTile({x:coords[0],y:coords[1]}, v);
  });
}

Model.prototype.getTile = function (p) {
  var chunk_pos = vscale({x: div(p.x, CHUNK_SIZE), y: div(p.y, CHUNK_SIZE)}, CHUNK_SIZE);
  var c = this.cache.get(chunk_pos);
  if (!c) {
    this.cache_misses++;
    c = this.cache.add(new Chunk(chunk_pos, this.chunk_props));
  }
  return c.getTile(p);
}

Model.prototype.putTile = function (p, t) {
  var chunk_pos = vscale({x: div(p.x, CHUNK_SIZE), y: div(p.y, CHUNK_SIZE)}, CHUNK_SIZE);
  var c = this.cache.get(chunk_pos);
  if (!c) {
    this.cache_misses++;
    c = this.cache.add(new Chunk(chunk_pos, this.chunk_props));
  }
  return c.putTile(p, t);
}

var openTiles = _.object("empty".split(" "), []);

function openTile(x) {
  return (_.has(openTiles, x));
}

Model.prototype.ropen = function (x, y) {
  return openTile(this.getTile(vplus(this.state.player.pos, {x:x,y:y})));
}

Model.prototype.execute_up = function () {
  var player = this.state.player;
  if (player.impetus) {
    if (this.ropen(0,-1)) {
      return {dpos:{x:0,y:-1}}
    }
    else {
      var rv = this.execute_down();
      rv.forced = {x:0,y:-1};
      return rv;
    }
  }
  else {
    return {dpos:{x:0,y:1}};
  }
}

Model.prototype.execute_down = function () {
  return this.ropen(0,1) ? {dpos:{x:0,y:1},impetus:0} : {dpos:{x:0,y:0},impetus:FULL_IMPETUS}
}

Model.prototype.execute_right = function (flip) {
  var dx = flip ? -1 : 1;
  var forward_open = this.ropen(dx, 0);
  if (this.state.player.impetus && !this.ropen(0, 1)) {
    return forward_open ? {dpos:{x:dx,y:0}, impetus:0} : {dpos:{x:0,y:0}, forced:{x:dx,y:0},
							  impetus:FULL_IMPETUS};
  }
  else {
    if (forward_open) {
      return this.ropen(dx, 1) ? {dpos:{x:dx,y:1}, impetus:0} : {dpos:{x:dx,y:0}, impetus:0};
    }
    else
      return {dpos:{x:0,y:1}, forced:{x:dx,y:0}, impetus:0}
  }
}

Model.prototype.execute_up_right = function (flip) {
  var dx = flip ? -1 : 1;
  var forward_open = this.ropen(dx, 0);
  if (!this.state.player.impetus)
    return this.execute_right(flip);
  if (!this.ropen(0, -1)) {
    var rv = this.execute_right(flip);
    rv.forced = {x:0,y:-1};
    return rv;
  }
  if (!this.ropen(dx, 0))
    return {dpos:{x:0,y:-1}, forced: {x:dx,y:0}};
  if (this.ropen(dx, -1))
    return {dpos:{x:dx,y:-1}}
  else {
    var rv = this.execute_down();
    rv.forced = {x:dx,y:-1};
    return rv;
  }
}

Model.prototype.forceBlock = function (pos, tile, anims) {
  if (tile == 'fragile_box')
    anims.push(new MeltAnimation(pos));
}

Model.prototype.animate_move = function (move) {
  var that = this;

  var forcedBlocks = []
  var anims = [];
  var flip = false;

  var s = this.state;
  var player = s.player;

  var result = {};
  var moved = true;

  var belowBefore = vplus(player.pos, {x:0,y:1});
  var tileBefore = this.getTile(belowBefore);
  var supportedBefore = !openTile(tileBefore);
  if (supportedBefore) forcedBlocks.push({x:0,y:1});

  switch (move){
  case 'up':
    result = this.execute_up();
    break;
  case 'down':
    result = this.execute_down();
    break;
  case 'left':
    result = this.execute_right(true);
    flip = true;
    break;
  case 'right':
    result = this.execute_right(false);
    break;
  case 'up-left':
    result = this.execute_up_right(true);
    flip = true;
    break;
  case 'up-right':
    result = this.execute_up_right(false);
    break;
  case 'reset':
    anims.push(this.resetViewPortAnimation());
    moved = false;
    break;
  }

  if (moved) {
    if (result.forced != null) forcedBlocks.push(result.forced);

    _.each(forcedBlocks, function(fb) {
      var pos = vplus(player.pos, fb);
      that.forceBlock(pos, that.getTile(pos), anims);
    });

    if (supportedBefore) {
      player.impetus = FULL_IMPETUS;
    }

    var anim = {
      pos: vplus(player.pos, result.dpos),
      impetus: _.has(result, 'impetus') ? result.impetus : player.impetus,
      flipState: flip,
      animState: 'player',
    };

    var supportedAfter = !openTile(this.getTile(vplus(anim.pos, {x:0,y:1})));

    if (supportedAfter) {
      anim.impetus = FULL_IMPETUS
    }
    else {
      if (anim.impetus) { anim.impetus--; }
      anim.animState = anim.impetus ? 'player_rise' : 'player_fall';
    }

    anims.push(new PlayerAnimation(anim));

    if (anim.pos.x - s.viewPort.x >= NUM_TILES_X - 1)
      anims.push(new ViewPortAnimation({x:1,y:0}));
    if (anim.pos.x - s.viewPort.x < 1)
      anims.push(new ViewPortAnimation({x:-1,y:0}));
    if (anim.pos.y - s.viewPort.y >= NUM_TILES_Y - 1)
      anims.push(new ViewPortAnimation({x:0,y:1}));
    if (anim.pos.y - s.viewPort.y < 1)
      anims.push(new ViewPortAnimation({x:0,y:-1}));
  }

  if (this.cache_misses) {
    this.cache_misses = 0;
    this.cache.filter({p: s.viewPort, w: NUM_TILES_X, h: NUM_TILES_Y});
  }

  return anims;
}

Model.prototype.animator_for_move = function (move) {
  var orig_state = this.state;
  var anims = this.animate_move(move);
  var that = this;

  return function(t) {
    var state = _.extend({}, orig_state);
    _.each(anims, function(anim) { anim.apply(state, t); });
    var layer = new Layer();
    _.each(anims, function(anim) { layer.extend(anim.tileHook(that, t)); });
    state.layer = layer;
    return state;
  };
}

Model.prototype.execute_move = function (move) {
  this.state = this.animator_for_move(move)(1);
  this.extend(this.state.layer);
}

Model.prototype.resetViewPortAnimation = function () {
  var s = this.state;
  return new ViewPortAnimation({
    x: int(s.player.pos.x - NUM_TILES_X / 2) - s.viewPort.x,
    y: int(s.player.pos.y - NUM_TILES_Y / 2) - s.viewPort.y});

}

Model.prototype.get_player = function () {
  return this.state.player;
}

Model.prototype.get_viewPort = function () {
  return this.state.viewPort;
}

function Animation() { }
Animation.prototype.apply = function (state, t) { }
Animation.prototype.tileHook = function (map, t) { return new Layer(); }

function PlayerAnimation(props) {
  this.pos = {x:0,y:0};
  this.animState = 'player';
  this.impetus = FULL_IMPETUS;
  _.extend(this, props);
}

PlayerAnimation.prototype = new Animation();

PlayerAnimation.prototype.apply = function (state, t) {
  state.player =
    new Player({pos: vplus(vscale(state.player.pos, 1-t), vscale(this.pos, t)),
		animState: this.animState,
		flipState: this.flipState,
		impetus: this.impetus});
}

function ViewPortAnimation(dpos, props) {
  this.dpos = dpos;
  _.extend(this, props);
}

ViewPortAnimation.prototype = new Animation();

ViewPortAnimation.prototype.apply = function (state, t) {
  state.viewPort = vplus(state.viewPort, vscale(this.dpos, t));
}

function MeltAnimation(pos, tile) { this.pos = pos; }
MeltAnimation.prototype = new Animation();

MeltAnimation.prototype.tileHook = function (map, t) {
  var rv = new Layer();
  rv.putTile(this.pos, t > 0.5 ? 'empty' : 'broken_box');
  return rv;
}

function Player(props) {
  this.animState = 'player';
  this.flipState = false;
  this.pos = {x:0, y:0};
  this.impetus = FULL_IMPETUS;
  _.extend(this, props);
}

Player.prototype.getAnimState = function () {
  return this.animState;
}

Player.prototype.getFlipState = function () {
  return this.flipState;
}
