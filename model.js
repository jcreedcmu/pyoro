var CHUNK_SIZE = 16; // in number of tiles, for purposes of caching

function getTile (p) {
  SIZE = 4;
  if (hash(p) < 0.1) return 'box';

  if ((mod(p.y, 2 * SIZE) == 1 || mod(p.x, 2 * SIZE) == 1) &&
      !(mod(p.y, 2 * SIZE) == 1 + SIZE || mod(p.x, 2 * SIZE) == 1 + SIZE)) {
    return mod(p.x + p.y, 3) ? 'empty' : 'box2';
  }
  else return 'empty';
}

function Chunk(p) {
  this.pos = p;
  this.tiles = { };
  for (var y = 0; y < CHUNK_SIZE; y++) {
    for (var x = 0; x < CHUNK_SIZE; x++) {
      var m = vplus(p, {x:x,y:y});
      this.tiles[m.x + ',' + m.y] = getTile(m);
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
  _.extend(this, props);
  bindVia(this, Model.prototype);
}

Model.prototype.getTile = function (p) {
  var chunk_pos = vscale({x: div(p.x, CHUNK_SIZE), y: div(p.y, CHUNK_SIZE)}, CHUNK_SIZE);
  var c = this.cache.get(chunk_pos);
  if (!c) {
    this.cache_misses++;
    c = this.cache.add(new Chunk(chunk_pos));
  }
  return c.getTile(p);
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
    this.player.flipState = true;
    break;
  case 'right':
    playerIntent.x += 1;
    this.player.flipState = false;
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

  if (openTile(this.getTile(vplus(this.player.pos, {x:0,y:1}))))
    this.player.animState = 'player_rise';
  else
    this.player.animState = 'player';

  if (this.player.pos.x - this.viewPort.x >= NUM_TILES_X - 1) { this.viewPort.x += 1 }
  if (this.player.pos.x - this.viewPort.x < 1) { this.viewPort.x -= 1 }
  if (this.player.pos.y - this.viewPort.y >= NUM_TILES_Y - 1) { this.viewPort.y += 1 }
  if (this.player.pos.y - this.viewPort.y < 1) { this.viewPort.y -= 1 }

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
  this.flipState = 'false';
  this.pos = {x:0, y:0};
  this.impetus = 4;
  _.extend(this, props);

}

Player.prototype.getAnimState = function () {
  return this.animState;
}

Player.prototype.getFlipState = function () {
  return this.flipState;
}
