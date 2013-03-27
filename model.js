var CHUNK_SIZE = 16; // in number of tiles, for purposes of caching
var FULL_IMPETUS = 4;

function rawGetTile (p) {
  SIZE = 4;
  if (hash(p) - p.y * 0.02 < 0.3 || hash(p) - p.x * 0.02 < 0.3) return 'box';
  else return 'empty';
}

function Chunk(p, props) {
  this.pos = p;
  this.tiles = { };
  this.rawGetTile = rawGetTile;
  _.extend(this, props);
  for (var y = 0; y < CHUNK_SIZE; y++) {
    for (var x = 0; x < CHUNK_SIZE; x++) {
      var m = vplus(p, {x:x,y:y});
      this.tiles[m.x + ',' + m.y] = this.rawGetTile(m);
    }
  }
}

Chunk.prototype.getTile = function (p) {
  return this.tiles[p.x + ',' + p.y];
}

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

Model.prototype.getTile = function (p) {
  var chunk_pos = vscale({x: div(p.x, CHUNK_SIZE), y: div(p.y, CHUNK_SIZE)}, CHUNK_SIZE);
  var c = this.cache.get(chunk_pos);
  if (!c) {
    this.cache_misses++;
    c = this.cache.add(new Chunk(chunk_pos, this.chunk_props));
  }
  return c.getTile(p);
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
    return this.ropen(0,-1) ? {dpos:{x:0,y:-1}} : this.execute_down();
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
    return forward_open ? {dpos:{x:dx,y:0}, impetus:0} : {dpos:{x:0,y:0},impetus:FULL_IMPETUS};
  }
  else {
    if (forward_open) {
      return this.ropen(dx, 1) ? {dpos:{x:dx,y:1}, impetus:0} : {dpos:{x:dx,y:0}, impetus:0};
    }
    else
      return {dpos:{x:0,y:1}, impetus:0}
  }
}

Model.prototype.execute_up_right = function (flip) {
  var dx = flip ? -1 : 1;
  var forward_open = this.ropen(dx, 0);
  if (!this.state.player.impetus || !this.ropen(0, -1))
    return this.execute_right(flip);
  if (!this.ropen(dx, 0))
    return {dpos:{x:0,y:-1}};
  return this.ropen(dx, -1) ? {dpos:{x:dx,y:-1}} : this.execute_down();
}

Model.prototype.animate_move = function (move) {
  var s = this.state;
  var player = s.player;

  var result = {};
  var moved = true;

  var supportedBefore = !openTile(this.getTile(vplus(player.pos, {x:0,y:1})));
  if (supportedBefore) {
    player.impetus = FULL_IMPETUS;
  }

  var anims = [];
  var flip = false;

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

Model.prototype.execute_move = function (move) {
  var anims = this.animate_move(move);
  var state = _.extend({}, this.state);
  _.each(anims, function(anim) { anim.apply(state, 1); });
  this.state = state;
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

function PlayerAnimation(props) {
  this.pos = {x:0,y:0};
  this.animState = 'player';
  this.impetus = FULL_IMPETUS;
  _.extend(this, props);
}

PlayerAnimation.prototype.apply = function (state, t) {
  state.player =
    new Player({pos: this.pos,
		animState: this.animState,
		flipState: this.flipState,
		impetus: this.impetus});
}

function ViewPortAnimation(dpos, props) {
  this.dpos = dpos;
  _.extend(this, props);
}

ViewPortAnimation.prototype.apply = function (state, t) {
  state.viewPort = vplus(state.viewPort, this.dpos);
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
