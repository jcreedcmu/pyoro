import produce from 'immer';
import { FULL_IMPETUS } from '../src/constants';
import { bootstrapDynamicLayer, Layer } from '../src/layer';
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
    initOverlay: bootstrapDynamicLayer(layer),
    inventory: { teal_fruit: undefined, },
    lastSave: { x: 0, y: 0 },
    overlay: bootstrapDynamicLayer(layer),
    player: init_player,
    time: 0,
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
    expect(player.animState).toBe("player_rise");
    expect(player.flipState).toBe('right');
    expect(player.pos).toEqual({ x: 0, y: -1 });
    expect(player.impetus).toBe(FULL_IMPETUS - 1);
  });

  it('should prevent jumping straight up into boxes', () => {
    const layer = basicLayer();
    layer.tiles['0,-1'] = 'box';
    let m = basicState(layer);
    m = executeMove(m, 'up');

    const player = m.player;
    expect(player.animState).toBe('player');
    expect(player.flipState).toBe('right');
    expect(player.pos).toEqual({ x: 0, y: 0 });
    expect(player.impetus).toBe(FULL_IMPETUS);
  });

  it('should allow running over small gaps', () => {
    const layer = basicLayer();
    layer.tiles['-2,1'] = 'up_box';
    let m = basicState(layer);
    m = executeMove(m, 'left');
    {
      const player = m.player;
      expect(player.animState).toBe("player_fall");
      expect(player.flipState).toBe('left');
      expect(player.pos).toEqual({ x: -1, y: 0 });
      expect(player.impetus).toBe(0);
    }
    m = executeMove(m, 'left');
    {
      const player = m.player;
      expect(player.animState).toBe("player");
      expect(player.flipState).toBe('left');
      expect(player.pos).toEqual({ x: -2, y: 0 });
      expect(player.impetus).toBe(FULL_IMPETUS);
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
      expect(player.animState).toBe("player_rise");
      expect(player.flipState).toBe('right');
      expect(player.pos).toEqual({ x: 0, y: -1 });
      expect(player.impetus).toBe(FULL_IMPETUS - 1);
    }
    m = executeMove(m, 'up');

    {
      const player = m.player;
      expect(player.animState).toBe("player_rise");
      expect(player.flipState).toBe('right');
      expect(player.pos).toEqual({ x: 0, y: -2 });
      expect(player.impetus).toBe(FULL_IMPETUS - 2);
    }
    m = executeMove(m, 'up-left');

    {
      const player = m.player;
      expect(player.animState).toBe("player_fall");
      expect(player.flipState).toBe('left');
      expect(player.pos).toEqual({ x: 0, y: -1 });
      expect(player.impetus).toBe(0);
    }
  });

  it('should disallow horizontally constrained diagonal moves', () => {
    const layer = basicLayer();
    layer.tiles['0,-1'] = 'box';
    let m = basicState(layer);
    m = executeMove(m, 'up-left');

    const player = m.player;
    expect(player.animState).toBe("player_fall");
    expect(player.flipState).toBe('left');
    expect(player.pos).toEqual({ x: -1, y: 0 });
    expect(player.impetus).toBe(0);

  });

  it('should allow jumping and breaking ice bricks if there is enough impetus', () => {
    const layer = basicLayer();
    layer.tiles['0,' + (-FULL_IMPETUS)] = 'fragile_box';
    let m = basicState(layer);

    for (let i = 0; i < FULL_IMPETUS; i++)
      m = executeMove(m, 'up');

    expect(tileOfGameState(m, { x: 0, y: -FULL_IMPETUS })).toBe('empty');
  });

  it('should not breaking ice bricks if there is not enough impetus', () => {
    const layer = basicLayer();
    layer.tiles['0,' + (-FULL_IMPETUS - 1)] = 'fragile_box';
    let m = basicState(layer);

    for (let i = 0; i < FULL_IMPETUS + 1; i++)
      m = executeMove(m, 'up');

    expect(tileOfGameState(m, { x: 0, y: -FULL_IMPETUS - 1 })).toBe('fragile_box');
  });

});

describe('getOverlayForSave', () => {
  it('should filter out empties', () => {
    let s = basicState(basicLayer());
    s = _putTileInGameStateInitOverlay(s, { x: 0, y: 1 }, { t: 'simple', tile: 'empty' }); // delete the existing box
    expect(getOverlayForSave(s)).toEqual(bootstrapDynamicLayer({ tiles: {} }));
    s = _putTileInGameStateInitOverlay(s, { x: 0, y: 2 }, { t: 'simple', tile: 'box' }); // add some box
    s = _putTileInGameStateInitOverlay(s, { x: 0, y: 0 }, { t: 'simple', tile: 'empty' }); // add another spurious empty
    expect(getOverlayForSave(s)).toEqual(bootstrapDynamicLayer({ tiles: { '0,2': 'box' } }));
  });
});
