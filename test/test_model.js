var assert = require('assert');
var fs = require('fs');
var vm = require('vm');
_ = require('../underscore');

function pseudoRequire(x) {
  vm.runInThisContext(fs.readFileSync(x, 'utf8'), x);
}

pseudoRequire('view_constants.js');
pseudoRequire('util.js');
pseudoRequire('model.js');

function testGetTile(map) {
  return function(p) {
    var k = p.x + ',' + p.y;
   if (_.has(map, k))
     return map[k];
    else
      return 'empty';
  }
}

function basicMap() {
  return {'0,1': 'box'};
}

function basicModel(map) {
  return new Model({player: new Player(), viewPort: {x: -5, y:-5},
		    chunk_props: {rawGetTile: testGetTile(map)}})
}

describe('Model', function(){
  it('should allow jumping up', function(){

    var map = basicMap();
    var m = basicModel(map);
    m.execute_move('up');

    assert.equal(m.player.animState, "player_rise");
    assert.equal(m.player.flipState, false);
    assert.deepEqual(m.player.pos, {x: 0, y: -1});
    assert.equal(m.player.impetus, FULL_IMPETUS - 1);
  });

  it('should prevent jumping straight up into boxes', function(){
    var map = basicMap();
    map['0,-1'] = 'box';
    var m = basicModel(map);
    m.execute_move('up');

    assert.equal(m.player.animState, "player");
    assert.equal(m.player.flipState, false);
    assert.deepEqual(m.player.pos, {x: 0, y: 0});
    assert.equal(m.player.impetus, FULL_IMPETUS);
  });

  it('should allow running over small gaps', function(){
    var map = basicMap();
    map['-2,1'] = 'box';
    var m = basicModel(map);
    m.execute_move('left');

    assert.equal(m.player.animState, "player_fall");
    assert.equal(m.player.flipState, true);
    assert.deepEqual(m.player.pos, {x: -1, y: 0});
    assert.equal(m.player.impetus, 0);

    m.execute_move('left');

    assert.equal(m.player.animState, "player");
    assert.equal(m.player.flipState, true);
    assert.deepEqual(m.player.pos, {x: -2, y: 0});
    assert.equal(m.player.impetus, FULL_IMPETUS);

  });

  it('should disallow narrow diagonal moves', function(){
    var map = basicMap();
    map['-1,-2'] = 'box';
    map['0,-3'] = 'box';
    var m = basicModel(map);
    m.execute_move('up');

    assert.equal(m.player.animState, "player_rise");
    assert.equal(m.player.flipState, false);
    assert.deepEqual(m.player.pos, {x: 0, y: -1});
    assert.equal(m.player.impetus, FULL_IMPETUS - 1);

    m.execute_move('up');

    assert.equal(m.player.animState, "player_rise");
    assert.equal(m.player.flipState, false);
    assert.deepEqual(m.player.pos, {x: 0, y: -2});
    assert.equal(m.player.impetus, FULL_IMPETUS - 2);

    m.execute_move('up-left');

    assert.equal(m.player.animState, "player_fall");
    assert.equal(m.player.flipState, true);
    assert.deepEqual(m.player.pos, {x: 0, y: -1});
    assert.equal(m.player.impetus, 0);

  });
});
