import { FULL_IMPETUS } from '../src/constants';
import { initOverlay } from '../src/initial_overlay';
import { boxTile, dynamicOfTile, emptyTile, mapPointMap, PointMap } from '../src/layer';
import { _putTileInGameStateInitOverlay, animateMove, getOverlayForSave, renderGameAnims, tileOfGameState } from '../src/model';
import { emptyOverlay, GameState, init_player } from '../src/state';
import { Tile, Move, DynamicTile } from '../src/types';

function complexLayer(): PointMap<Tile> {
  return {
    'tiles':
      { '0,1': { t: 'up_box' } }
  }
};

function complexState(layer: PointMap<Tile>): GameState {
  return {
    levels: {
      start: {
        initOverlay: mapPointMap(layer, dynamicOfTile),
        overlay: mapPointMap(layer, dynamicOfTile),
      }
    },
    currentLevel: 'start',
    inventory: { teal_fruit: undefined, },
    lastSave: { x: 0, y: 0 },
    player: init_player,
    time: 0,
    busState: { red: false, green: false, blue: false },
  };
}

function dynamicState(layer: PointMap<DynamicTile>): GameState {
  return {
    levels: {
      start: {
        initOverlay: layer,
        overlay: emptyOverlay,
      }
    },
    currentLevel: 'start',
    inventory: { teal_fruit: undefined, },
    lastSave: { x: 0, y: 0 },
    player: init_player,
    time: 0,
    busState: { red: false, green: false, blue: false },
  };
}

function executeMove(s: GameState, move: Move): GameState {
  return renderGameAnims(animateMove(s, move), 'complete', s);
}

describe('State', () => {
  it('should allow jumping up', () => {

    let m = dynamicState(initOverlay['_test1']);
    m = executeMove(m, 'up');
    const player = m.player;
    expect(player.animState).toBe("player_rise");
    expect(player.flipState).toBe('right');
    expect(player.pos).toEqual({ x: 0, y: -1 });
    expect(player.impetus).toBe(FULL_IMPETUS - 1);
  });

  it('should prevent jumping straight up into boxes', () => {
    let m = dynamicState(initOverlay['_test2']);
    m = executeMove(m, 'up');

    const player = m.player;
    expect(player.animState).toBe('player');
    expect(player.flipState).toBe('right');
    expect(player.pos).toEqual({ x: 0, y: 0 });
    expect(player.impetus).toBe(FULL_IMPETUS);
  });

  it('should allow running over small gaps', () => {
    let m = dynamicState(initOverlay['_test3']);
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
      expect(player.impetus).toBe(1);
    }
  });

  it('should disallow narrow diagonal moves', () => {
    let m = dynamicState(initOverlay['_test4']);
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
    let m = dynamicState(initOverlay['_test2']);
    m = executeMove(m, 'up-left');

    const player = m.player;
    expect(player.animState).toBe("player_fall");
    expect(player.flipState).toBe('left');
    expect(player.pos).toEqual({ x: -1, y: 0 });
    expect(player.impetus).toBe(0);

  });

  it('should allow jumping and breaking ice bricks if there is enough impetus', () => {
    const layer = complexLayer();
    layer.tiles['0,' + (-FULL_IMPETUS)] = { t: 'fragile_box' };
    let m = complexState(layer);

    for (let i = 0; i < FULL_IMPETUS; i++)
      m = executeMove(m, 'up');

    expect(tileOfGameState(m, { x: 0, y: -FULL_IMPETUS })).toEqual(emptyTile());
  });

  it('should not breaking ice bricks if there is not enough impetus', () => {
    const layer = complexLayer();
    layer.tiles['0,' + (-FULL_IMPETUS - 1)] = { t: 'fragile_box' };
    let m = complexState(layer);

    for (let i = 0; i < FULL_IMPETUS + 1; i++)
      m = executeMove(m, 'up');

    expect(tileOfGameState(m, { x: 0, y: -FULL_IMPETUS - 1 })).toEqual({ t: 'fragile_box' });
  });

  it('should allow recentering', () => {
    const layer = complexLayer();
    let m = complexState(layer);
    console.log(m);
    m = executeMove(m, 'recenter');
    m = executeMove(m, 'left');
  });
});

describe('getOverlayForSave', () => {
  it('should filter out empties', () => {
    let s = complexState(complexLayer());
    s = _putTileInGameStateInitOverlay(s, { x: 0, y: 1 }, dynamicOfTile(emptyTile())); // delete the existing box
    expect(getOverlayForSave(s)).toEqual({ start: { tiles: {} } });
    s = _putTileInGameStateInitOverlay(s, { x: 0, y: 2 }, dynamicOfTile(boxTile())); // add some box
    s = _putTileInGameStateInitOverlay(s, { x: 0, y: 0 }, dynamicOfTile(emptyTile())); // add another spurious empty
    expect(getOverlayForSave(s)).toEqual({ start: { tiles: { '0,2': dynamicOfTile(boxTile()) } } });
  });
});
