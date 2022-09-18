import * as assert from 'assert';
import produce from 'immer';
import { FULL_IMPETUS } from '../src/constants';
import { bootstrapComplexLayer, Layer } from '../src/layer';
import { animateMoveGame, getOverlayForSave, renderGameAnims, tileOfGameState, _putTile, _putTileInGameStateInitOverlay, _putTileInInitOverlay } from '../src/model';
import { GameState, init_player, init_state } from '../src/state';
import { Move } from '../src/types';

function basicLayer(): Layer {
  return {
    'tiles':
      { '0,1': 'up_box' }
  }
};

function basicState(layer: Layer): GameState {
  return {
    initOverlay: bootstrapComplexLayer(layer),
    inventory: { teal_fruit: undefined, },
    lastSave: { x: 0, y: 0 },
    overlay: bootstrapComplexLayer(layer),
    player: init_player,
  };
}

function executeMove(s: GameState, move: Move): GameState {
  return renderGameAnims(animateMoveGame(s, move), 'complete', s);
}

describe('State', () => {
  it('should allow jumping up', () => {

    let m = basicState(basicLayer());
    m = executeMove(m, 'up');
    const player = m.player;
    assert.equal(player.animState, "player_rise");
    assert.equal(player.flipState, 'right');
    assert.deepEqual(player.pos, { x: 0, y: -1 });
    assert.equal(player.impetus, FULL_IMPETUS - 1);
  });

  it('should prevent jumping straight up into boxes', () => {
    const layer = basicLayer();
    layer.tiles['0,-1'] = 'box';
    let m = basicState(layer);
    m = executeMove(m, 'up');

    const player = m.player;
    assert.equal(player.animState, 'player');
    assert.equal(player.flipState, 'right');
    assert.deepEqual(player.pos, { x: 0, y: 0 });
    assert.equal(player.impetus, FULL_IMPETUS);
  });

  it('should allow running over small gaps', () => {
    const layer = basicLayer();
    layer.tiles['-2,1'] = 'up_box';
    let m = basicState(layer);
    m = executeMove(m, 'left');
    {
      const player = m.player;
      assert.equal(player.animState, "player_fall");
      assert.equal(player.flipState, 'left');
      assert.deepEqual(player.pos, { x: -1, y: 0 });
      assert.equal(player.impetus, 0);
    }
    m = executeMove(m, 'left');
    {
      const player = m.player;
      assert.equal(player.animState, "player");
      assert.equal(player.flipState, 'left');
      assert.deepEqual(player.pos, { x: -2, y: 0 });
      assert.equal(player.impetus, FULL_IMPETUS);
    }
  });

  it('should disallow narrow diagonal moves', () => {
    const layer = basicLayer();
    layer.tiles['-1,-2'] = 'box';
    layer.tiles['0,-3'] = 'box';
    let m = basicState(layer);
    m = executeMove(m, 'up');
    {
      const player = m.player;
      assert.equal(player.animState, "player_rise");
      assert.equal(player.flipState, 'right');
      assert.deepEqual(player.pos, { x: 0, y: -1 });
      assert.equal(player.impetus, FULL_IMPETUS - 1);
    }
    m = executeMove(m, 'up');

    {
      const player = m.player;
      assert.equal(player.animState, "player_rise");
      assert.equal(player.flipState, 'right');
      assert.deepEqual(player.pos, { x: 0, y: -2 });
      assert.equal(player.impetus, FULL_IMPETUS - 2);
    }
    m = executeMove(m, 'up-left');

    {
      const player = m.player;
      assert.equal(player.animState, "player_fall");
      assert.equal(player.flipState, 'left');
      assert.deepEqual(player.pos, { x: 0, y: -1 });
      assert.equal(player.impetus, 0);
    }
  });

  it('should disallow horizontally constrained diagonal moves', () => {
    const layer = basicLayer();
    layer.tiles['0,-1'] = 'box';
    let m = basicState(layer);
    m = executeMove(m, 'up-left');

    const player = m.player;
    assert.equal(player.animState, "player_fall");
    assert.equal(player.flipState, 'left');
    assert.deepEqual(player.pos, { x: -1, y: 0 });
    assert.equal(player.impetus, 0);

  });

  it('should allow jumping and breaking ice bricks if there is enough impetus', () => {
    const layer = basicLayer();
    layer.tiles['0,' + (-FULL_IMPETUS)] = 'fragile_box';
    let m = basicState(layer);

    for (let i = 0; i < FULL_IMPETUS; i++)
      m = executeMove(m, 'up');

    assert.equal(tileOfGameState(m, { x: 0, y: -FULL_IMPETUS }), 'empty');
  });

  it('should not breaking ice bricks if there is not enough impetus', () => {
    const layer = basicLayer();
    layer.tiles['0,' + (-FULL_IMPETUS - 1)] = 'fragile_box';
    let m = basicState(layer);

    for (let i = 0; i < FULL_IMPETUS + 1; i++)
      m = executeMove(m, 'up');

    assert.equal(tileOfGameState(m, { x: 0, y: -FULL_IMPETUS - 1 }), 'fragile_box');
  });

});

describe('getOverlayForSave', () => {
  it('should filter out empties', () => {
    let s = basicState(basicLayer());
    s = _putTileInGameStateInitOverlay(s, { x: 0, y: 1 }, { t: 'simple', tile: 'empty' }); // delete the existing box
    assert.deepEqual(getOverlayForSave(s), bootstrapComplexLayer({ tiles: {} }));
    s = _putTileInGameStateInitOverlay(s, { x: 0, y: 2 }, { t: 'simple', tile: 'box' }); // add some box
    s = _putTileInGameStateInitOverlay(s, { x: 0, y: 0 }, { t: 'simple', tile: 'empty' }); // add another spurious empty
    assert.deepEqual(getOverlayForSave(s), bootstrapComplexLayer({ tiles: { '0,2': 'box' } }));
  });
});
