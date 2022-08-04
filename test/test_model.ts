import * as assert from 'assert';
import * as fs from 'fs';
import { FULL_IMPETUS } from '../src/constants';
import * as util from '../src/util';
import { _getTile, animator_for_move, Model } from '../src/model';
import { init_player } from '../src/state';
import { Layer } from '../src/layer';
import { Move } from '../src/types';

function basicLayer(): Layer {
  return {
    'tiles':
      { '0,1': 'up_box' }
  }
};

function basicModel(layer: Layer) {
  return new Model({
    game: {
      initOverlay: layer,
      inventory: { teal_fruit: undefined, },
      lastSave: { x: 0, y: 0 },
      overlay: layer,
      player: init_player,
    },
    iface: {
      editTileIx: 0,
      editTileRotation: 0,
      blackout: 0,
      viewPort: { x: -5, y: -5 },
    },
  })
}

function executeMove(model: Model, move: Move) {
  const animator = animator_for_move(model.state, move);
  model.state = animator.anim(animator.dur, model.state);
}

describe('Model', function() {
  it('should allow jumping up', function() {

    const m = basicModel(basicLayer());
    executeMove(m, 'up');
    const player = m.get_player();
    assert.equal(player.animState, "player_rise");
    assert.equal(player.flipState, 'right');
    assert.deepEqual(player.pos, { x: 0, y: -1 });
    assert.equal(player.impetus, FULL_IMPETUS - 1);
  });

  it('should prevent jumping straight up into boxes', function() {
    const layer = basicLayer();
    layer.tiles['0,-1'] = 'box';
    const m = basicModel(layer);
    executeMove(m, 'up');

    const player = m.get_player();
    assert.equal(player.animState, "player");
    assert.equal(player.flipState, 'right');
    assert.deepEqual(player.pos, { x: 0, y: 0 });
    assert.equal(player.impetus, FULL_IMPETUS);
  });

  it('should allow running over small gaps', function() {
    const layer = basicLayer();
    layer.tiles['-2,1'] = 'up_box';
    const m = basicModel(layer);
    executeMove(m, 'left');
    {
      const player = m.get_player();
      assert.equal(player.animState, "player_fall");
      assert.equal(player.flipState, 'left');
      assert.deepEqual(player.pos, { x: -1, y: 0 });
      assert.equal(player.impetus, 0);
    }
    executeMove(m, 'left');
    {
      const player = m.get_player();
      assert.equal(player.animState, "player");
      assert.equal(player.flipState, 'left');
      assert.deepEqual(player.pos, { x: -2, y: 0 });
      assert.equal(player.impetus, FULL_IMPETUS);
    }
  });

  it('should disallow narrow diagonal moves', function() {
    const layer = basicLayer();
    layer.tiles['-1,-2'] = 'box';
    layer.tiles['0,-3'] = 'box';
    const m = basicModel(layer);
    executeMove(m, 'up');
    {
      const player = m.get_player();
      assert.equal(player.animState, "player_rise");
      assert.equal(player.flipState, 'right');
      assert.deepEqual(player.pos, { x: 0, y: -1 });
      assert.equal(player.impetus, FULL_IMPETUS - 1);
    }
    executeMove(m, 'up');

    {
      const player = m.get_player();
      assert.equal(player.animState, "player_rise");
      assert.equal(player.flipState, 'right');
      assert.deepEqual(player.pos, { x: 0, y: -2 });
      assert.equal(player.impetus, FULL_IMPETUS - 2);
    }
    executeMove(m, 'up-left');

    {
      const player = m.get_player();
      assert.equal(player.animState, "player_wall");
      assert.equal(player.flipState, 'left');
      assert.deepEqual(player.pos, { x: 0, y: -2 });
      assert.equal(player.impetus, 1);
    }
  });

  it('should disallow horizontally constrained diagonal moves', function() {
    const layer = basicLayer();
    layer.tiles['0,-1'] = 'box';
    const m = basicModel(layer);
    executeMove(m, 'up-left');

    const player = m.get_player();
    assert.equal(player.animState, "player_fall");
    assert.equal(player.flipState, 'left');
    assert.deepEqual(player.pos, { x: -1, y: 0 });
    assert.equal(player.impetus, 0);

  });

  it('should allow jumping and breaking ice bricks if there is enough impetus', function() {
    const layer = basicLayer();
    layer.tiles['0,' + (-FULL_IMPETUS)] = 'fragile_box';
    const m = basicModel(layer);

    for (let i = 0; i < FULL_IMPETUS; i++)
      executeMove(m, 'up');

    assert.equal(_getTile(m.state, { x: 0, y: -FULL_IMPETUS }), 'empty');
  });

  it('should not breaking ice bricks if there is not enough impetus', function() {
    const layer = basicLayer();
    layer.tiles['0,' + (-FULL_IMPETUS - 1)] = 'fragile_box';
    const m = basicModel(layer);

    for (let i = 0; i < FULL_IMPETUS + 1; i++)
      executeMove(m, 'up');

    assert.equal(_getTile(m.state, { x: 0, y: -FULL_IMPETUS - 1 }), 'fragile_box');
  });

});
