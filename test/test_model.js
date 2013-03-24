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

describe('Model', function(){
  it('should allow jumping up', function(){

    var m = new Model({player: new Player(), viewPort: {x: -5, y:-5}});
    m.execute_move('up');

    var x = new Player({animState: "player_rise", flip_state: false, pos: {x: 0, y: -1}, impetus: 4});
    console.log(JSON.stringify(m.player, null, 4));
    console.log(JSON.stringify(x, null, 4));
    assert.equal(m.player.animState, "player_rise");
    assert.equal(m.player.flipState, false);
    assert.deepEqual(m.player.pos, {x: 0, y: -1});
    assert.equal(m.player.impetus, 4);
  });

});
