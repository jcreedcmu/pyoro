import { FULL_IMPETUS } from '../src/constants';
import { boxTile, dynamicOfTile, emptyTile, mapPointMap, PointMap } from '../src/layer';
import { _putTileInGameStateInitOverlay, animateMove, getAllLevels, renderGameAnims, tileOfGameState } from '../src/model';
import { motionTestPasses, motionTestSuite, testInitialGameState } from '../src/test-motion';
import { GameState, init_player } from '../src/state';
import { Tile, Move, DynamicTile } from '../src/types';
import { getVerticalImpetus } from '../src/player-accessors';
import { LevelData, mkLevel } from '../src/level';
import { allLevels } from '../src/level-data';


function executeMove(s: GameState, move: Move): GameState {
  return renderGameAnims(animateMove(s, move), 'complete', s);
}

describe('Motion rules', () => {
  motionTestSuite.forEach(mtest => {
    it(mtest.description, () => {
      expect(motionTestPasses(mtest)).toBe(true);
    });
  });
});

describe('State', () => {
  it('should disallow narrow diagonal moves', () => {
    let m = testInitialGameState('_test4');
    m = executeMove(m, 'up');
    {
      const player = m.player;
      expect(player.animState).toBe("player_rise");
      expect(player.flipState).toBe('right');
      expect(player.pos).toEqual({ x: 0, y: -1 });
      expect(getVerticalImpetus(player)).toBe(1 - FULL_IMPETUS);
    }
    m = executeMove(m, 'up');

    {
      const player = m.player;
      expect(player.animState).toBe("player_rise");
      expect(player.flipState).toBe('right');
      expect(player.pos).toEqual({ x: 0, y: -2 });
      expect(getVerticalImpetus(player)).toBe(2 - FULL_IMPETUS);
    }
    m = executeMove(m, 'up-left');

    {
      const player = m.player;
      expect(player.animState).toBe("player_fall");
      expect(player.flipState).toBe('left');
      expect(player.pos).toEqual({ x: 0, y: -1 });
      expect(getVerticalImpetus(player)).toBe(0);
    }
  });

  it('should disallow horizontally constrained diagonal moves', () => {
    let m = testInitialGameState('_test2');
    m = executeMove(m, 'up-left');

    const player = m.player;
    expect(player.animState).toBe("player_fall");
    expect(player.flipState).toBe('left');
    expect(player.pos).toEqual({ x: -1, y: 0 });
    expect(getVerticalImpetus(player)).toBe(0);

  });

  it('should allow jumping and breaking ice bricks if there is enough impetus', () => {
    let m = testInitialGameState('_test5');

    m = executeMove(m, 'up');
    m = executeMove(m, 'up');
    m = executeMove(m, 'up');
    expect(tileOfGameState(m, { x: 0, y: -4 })).toEqual({ t: 'fragile_box' });
    m = executeMove(m, 'up');
    expect(tileOfGameState(m, { x: 0, y: -4 })).toEqual(emptyTile());
  });

  it('should allow recentering', () => {
    let m = testInitialGameState('_test1');
    m = executeMove(m, 'recenter');
    m = executeMove(m, 'left');
  });
});

describe('getAllLevels', () => {
  it('should filter out empties', () => {
    let s = testInitialGameState('_test1');
    s = _putTileInGameStateInitOverlay(s, { x: 0, y: 1 }, dynamicOfTile(emptyTile())); // delete the existing box
    const expected1: Record<string, LevelData> = {
      start: {
        initOverlay: { tiles: {} },
        boundRect: { min: { x: -1, y: -1 }, max: { x: 1, y: 2 } },
        busState: { red: false, green: false, blue: false },
      }
    };
    expect(getAllLevels(s)).toEqual(expected1);
    s = _putTileInGameStateInitOverlay(s, { x: 0, y: 2 }, dynamicOfTile(boxTile())); // add some box
    s = _putTileInGameStateInitOverlay(s, { x: 0, y: 0 }, dynamicOfTile(emptyTile())); // add another spurious empty
    const expected2: Record<string, LevelData> = {
      start: {
        initOverlay: { tiles: { '0,2': dynamicOfTile(boxTile()) } },
        boundRect: { min: { x: -1, y: -1 }, max: { x: 1, y: 2 } },
        busState: { red: false, green: false, blue: false },
      }
    };
    expect(getAllLevels(s)).toEqual(expected2);
  });
});
