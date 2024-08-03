import { FULL_IMPETUS } from '../src/constants';
import { initOverlay } from '../src/initial_overlay';
import { boxTile, dynamicOfTile, emptyTile, mapPointMap, PointMap } from '../src/layer';
import { _putTileInGameStateInitOverlay, animateMove, getOverlayForSave, renderGameAnims, tileOfGameState } from '../src/model';
import { emptyOverlay, GameState, init_player } from '../src/state';
import { Tile, Move, DynamicTile } from '../src/types';

function testState(layerName: string): GameState {
  return {
    levels: {
      start: {
        initOverlay: initOverlay[layerName],
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

    let m = testState('_test1');
    m = executeMove(m, 'up');
    const player = m.player;
    expect(player.animState).toBe("player_rise");
    expect(player.flipState).toBe('right');
    expect(player.pos).toEqual({ x: 0, y: -1 });
    expect(player.impetus).toBe(FULL_IMPETUS - 1);
  });

  it('should prevent jumping straight up into boxes', () => {
    let m = testState('_test2');
    m = executeMove(m, 'up');

    const player = m.player;
    expect(player.animState).toBe('player');
    expect(player.flipState).toBe('right');
    expect(player.pos).toEqual({ x: 0, y: 0 });
    expect(player.impetus).toBe(FULL_IMPETUS);
  });

  it('should allow running over small gaps', () => {
    let m = testState('_test3');
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
    let m = testState('_test4');
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
    let m = testState('_test2');
    m = executeMove(m, 'up-left');

    const player = m.player;
    expect(player.animState).toBe("player_fall");
    expect(player.flipState).toBe('left');
    expect(player.pos).toEqual({ x: -1, y: 0 });
    expect(player.impetus).toBe(0);

  });

  it('should allow jumping and breaking ice bricks if there is enough impetus', () => {
    let m = testState('_test5');

    m = executeMove(m, 'up');
    m = executeMove(m, 'up');
    m = executeMove(m, 'up');
    expect(tileOfGameState(m, { x: 0, y: -4 })).toEqual({ t: 'fragile_box' });
    m = executeMove(m, 'up');
    expect(tileOfGameState(m, { x: 0, y: -4 })).toEqual(emptyTile());
  });

  it('should allow recentering', () => {
    let m = testState('_test1');
    m = executeMove(m, 'recenter');
    m = executeMove(m, 'left');
  });
});

describe('getOverlayForSave', () => {
  it('should filter out empties', () => {
    let s = testState('_test1');
    s = _putTileInGameStateInitOverlay(s, { x: 0, y: 1 }, dynamicOfTile(emptyTile())); // delete the existing box
    expect(getOverlayForSave(s)).toEqual({ start: { tiles: {} } });
    s = _putTileInGameStateInitOverlay(s, { x: 0, y: 2 }, dynamicOfTile(boxTile())); // add some box
    s = _putTileInGameStateInitOverlay(s, { x: 0, y: 0 }, dynamicOfTile(emptyTile())); // add another spurious empty
    expect(getOverlayForSave(s)).toEqual({ start: { tiles: { '0,2': dynamicOfTile(boxTile()) } } });
  });
});
