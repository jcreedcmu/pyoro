var assert = require('assert');
var fs = require('fs');
var vm = require('vm');
_ = require('../src/underscore');

function pseudoRequire(x) {
  vm.runInThisContext(fs.readFileSync(x, 'utf8'), x);
}

pseudoRequire('src/view_constants.js');
pseudoRequire('src/util.js');
pseudoRequire('src/model.js');

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
  return new Model({player: new Player(), viewPort: {x: -5, y:-5}},
		   {chunk_props: {rawGetTile: testGetTile(map)}})
}

describe('Model', function(){
  it('should allow jumping up', function(){

    var map = basicMap();
    var m = basicModel(map);
    m.execute_move('up');

    var player = m.get_player();
    assert.equal(player.animState, "player_rise");
    assert.equal(player.flipState, false);
    assert.deepEqual(player.pos, {x: 0, y: -1});
    assert.equal(player.impetus, FULL_IMPETUS - 1);
  });

  it('should prevent jumping straight up into boxes', function(){
    var map = basicMap();
    map['0,-1'] = 'box';
    var m = basicModel(map);
    m.execute_move('up');

    var player = m.get_player();
    assert.equal(player.animState, "player");
    assert.equal(player.flipState, false);
    assert.deepEqual(player.pos, {x: 0, y: 0});
    assert.equal(player.impetus, FULL_IMPETUS);
  });

  it('should allow running over small gaps', function(){
    var map = basicMap();
    map['-2,1'] = 'box';
    var m = basicModel(map);
    m.execute_move('left');

    var player = m.get_player();

    assert.equal(player.animState, "player_fall");
    assert.equal(player.flipState, true);
    assert.deepEqual(player.pos, {x: -1, y: 0});
    assert.equal(player.impetus, 0);

    m.execute_move('left');

    var player = m.get_player();
    assert.equal(player.animState, "player");
    assert.equal(player.flipState, true);
    assert.deepEqual(player.pos, {x: -2, y: 0});
    assert.equal(player.impetus, FULL_IMPETUS);

  });

  it('should disallow narrow diagonal moves', function(){
    var map = basicMap();
    map['-1,-2'] = 'box';
    map['0,-3'] = 'box';
    var m = basicModel(map);
    m.execute_move('up');

    var player = m.get_player();
    assert.equal(player.animState, "player_rise");
    assert.equal(player.flipState, false);
    assert.deepEqual(player.pos, {x: 0, y: -1});
    assert.equal(player.impetus, FULL_IMPETUS - 1);

    m.execute_move('up');

    var player = m.get_player();
    assert.equal(player.animState, "player_rise");
    assert.equal(player.flipState, false);
    assert.deepEqual(player.pos, {x: 0, y: -2});
    assert.equal(player.impetus, FULL_IMPETUS - 2);

    m.execute_move('up-left');

    var player = m.get_player();
    assert.equal(player.animState, "player_fall");
    assert.equal(player.flipState, true);
    assert.deepEqual(player.pos, {x: 0, y: -1});
    assert.equal(player.impetus, 0);

  });

  it('should disallow horizontally constrained diagonal moves', function(){
    var map = basicMap();
    map['0,-1'] = 'box';
    var m = basicModel(map);
    m.execute_move('up-left');

    var player = m.get_player();
    assert.equal(player.animState, "player_fall");
    assert.equal(player.flipState, true);
    assert.deepEqual(player.pos, {x: -1, y: 0});
    assert.equal(player.impetus, 0);

  });

  it('should allow jumping and breaking ice bricks if there is enough impetus', function(){
    var map = basicMap();
    map['0,' + (-FULL_IMPETUS)] = 'fragile_box';
    var m = basicModel(map);

    _.times(FULL_IMPETUS, function () { m.execute_move('up') });

    assert.equal(m.getTile({x:0, y:-FULL_IMPETUS}), 'empty');
  });

  it('should not breaking ice bricks if there is not enough impetus', function(){
    var map = basicMap();
    map['0,' + (-FULL_IMPETUS-1)] = 'fragile_box';
    var m = basicModel(map);

    _.times(FULL_IMPETUS+1, function () { m.execute_move('up') });

    assert.equal(m.getTile({x:0, y:-FULL_IMPETUS-1}), 'fragile_box');
  });

});
