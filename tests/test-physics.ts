import { FULL_IMPETUS } from '../src/constants';
import { boxTile, dynamicOfTile, emptyTile, mapPointMap, PointMap } from '../src/layer';
import { _putTileInGameStateInitOverlay, animateMove, getAllLevels, renderGameAnims, tileOfGameState } from '../src/model';
import { executeMove, motionTestPasses, motionTestSuite, testInitialGameState } from '../src/test-motion';
import { GameState, init_player } from '../src/state';
import { Tile, Move, DynamicTile } from '../src/types';
import { getVerticalImpetus } from '../src/player-accessors';
import { LevelData, mkLevel } from '../src/level';
import { allLevels } from '../src/level-data';
import { entityTick, targetPhase, TargetPhaseContext } from '../src/physics';

describe('Entity tick', () => {
  it('should be impetus-neutral while climbing ladder', () => {
    let m = testInitialGameState('_test11');
    const player = m.player;
    const tickOutput = entityTick(m, {
      motive: { x: 0, y: -1 },
      support: { rpos: { x: 0, y: 1 }, forceType: { t: 'tile', tile: { t: 'box' } } },
      entity: {
        impetus: player.impetus,
        pos: player.pos,
      }
    }, { t: 'player' });
    expect(tickOutput.entity.impetus).toEqual({ x: 0, y: 0 });
  });
});

describe('Target phase', () => {
  it('should be impetus-neutral while climbing ladder', () => {
    let m = testInitialGameState('_test11');

    const tpc: TargetPhaseContext = {
      entity: { impetus: { x: 0, y: 0 }, pos: { x: 0, y: 0 } },
      motive: { x: 0, y: -1 },
      support: { rpos: { x: 0, y: 1 }, forceType: { t: 'tile', tile: { t: 'box' } } },
    };

    const { newImpetus } = targetPhase(m, tpc);
    expect(newImpetus).toEqual({ x: 0, y: 0 });
  });
});
