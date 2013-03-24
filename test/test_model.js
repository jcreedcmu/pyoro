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
    assert.equal(m.player.impetus, 4);
  });

});
