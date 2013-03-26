var CHUNK_SIZE = 16; // in number of tiles, for purposes of caching
var FULL_IMPETUS = 4;

function rawGetTile (p) {
  SIZE = 4;
  if (hash(p) - p.y * 0.05 < 0.3 || hash(p) - p.x * 0.03 < 0.3) return 'box';
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

function Model(props) {
  this.cache = new ChunkCache();
  this.cache_misses = 0;
  this.chunk_props = {}; // can inject rawGetTile in here
  _.extend(this, props);
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
  return openTile(this.getTile({x: this.player.pos.x + x, y: this.player.pos.y + y}));
}

Model.prototype.execute_up = function () {
  var player = this.player;
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
  this.player.flipState = flip;

  var dx = flip ? -1 : 1;
  var forward_open = this.ropen(dx, 0);
  if (this.player.impetus && !this.ropen(0, 1)) {
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
  this.player.flipState = flip;

  var dx = flip ? -1 : 1;
  var forward_open = this.ropen(dx, 0);
  if (!this.player.impetus || !this.ropen(0, -1))
    return this.execute_right(flip);
  if (!this.ropen(dx, 0))
    return {dpos:{x:0,y:-1}};
  return this.ropen(dx, -1) ? {dpos:{x:dx,y:-1}} : this.execute_down();
}

Model.prototype.execute_move = function (move) {
  var player = this.player;

  var result = {};

  var supportedBefore = !openTile(this.getTile(vplus(player.pos, {x:0,y:1})));
  if (supportedBefore) {
    player.impetus = FULL_IMPETUS;
  }

  switch (move){
  case 'up':
    result = this.execute_up();
    break;
  case 'down':
    result = this.execute_down();
    break;
  case 'left':
    result = this.execute_right(true);
    break;
  case 'right':
    result = this.execute_right(false);
    break;
  case 'up-left':
    result = this.execute_up_right(true);
    break;
  case 'up-right':
    result = this.execute_up_right(false);
    break;
  case 'reset':
    this.resetViewPort();
    result = player;
    break;
  }

  player.pos.x += result.dpos.x;
  player.pos.y += result.dpos.y;
  player.impetus = _.has(result, 'impetus') ? result.impetus : player.impetus;

  var supportedAfter = !openTile(this.getTile(vplus(player.pos, {x:0,y:1})));

  if (supportedAfter) {
    player.animState = 'player';
    player.impetus = FULL_IMPETUS
  }
  else {
    if (player.impetus) { player.impetus--; }
    player.animState = player.impetus ? 'player_rise' : 'player_fall';
  }
  if (player.pos.x - this.viewPort.x >= NUM_TILES_X - 1) { this.viewPort.x += 1 }
  if (player.pos.x - this.viewPort.x < 1) { this.viewPort.x -= 1 }
  if (player.pos.y - this.viewPort.y >= NUM_TILES_Y - 1) { this.viewPort.y += 1 }
  if (player.pos.y - this.viewPort.y < 1) { this.viewPort.y -= 1 }

  if (this.cache_misses) {
    this.cache_misses = 0;
    this.cache.filter({p: this.viewPort, w: NUM_TILES_X, h: NUM_TILES_Y});
  }
}

Model.prototype.resetViewPort = function () {
  this.viewPort.x = int(this.player.pos.x - NUM_TILES_X / 2);
  this.viewPort.y = int(this.player.pos.y - NUM_TILES_Y / 2);
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
