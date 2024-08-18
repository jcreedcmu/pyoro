import { Facing, Move, PlayerSprite } from './types';
import { animateMove, renderGameAnims } from './model';
import { Point, vequal } from './lib/point';
import { GameState, init_player } from './state';
import { getVerticalImpetus } from './player-accessors';
import { mkLevel } from './level';
import { allLevels } from './level-data';

export type MotionTestAssertion =
  | { t: 'position', pos: Point }
  | { t: 'flipState', facing: Facing }
  | { t: 'animState', sprite: PlayerSprite }
  | { t: 'impetus', impetus: number }
  ;

export type MotionTestStep =
  | { t: 'assertion', assn: MotionTestAssertion }
  | { t: 'move', move: Move }

export type MotionTest = {
  description: string,
  levelName: string,
  steps: MotionTestStep[],
}

export function testInitialGameState(levelName: string): GameState {
  return {
    levels: {
      start: mkLevel(allLevels[levelName]),
    },
    currentLevel: 'start',
    inventory: { teal_fruit: undefined, },
    lastSave: { x: 0, y: 0 },
    player: init_player,
    entities: [],
    time: 0,
  };
}

export function motionTestLength(test: MotionTest): number {
  return test.steps.length;
}

function executeMove(s: GameState, move: Move): GameState {
  return renderGameAnims(animateMove(s, move), 'complete', s);
}

function motionTestAssertion(state: GameState, assertion: MotionTestAssertion): boolean {
  const player = state.player;
  switch (assertion.t) {
    case 'position': return vequal(player.pos, assertion.pos);
    case 'flipState': return player.flipState == assertion.facing;
    case 'animState': return player.animState == assertion.sprite;
    case 'impetus': return getVerticalImpetus(player) == assertion.impetus;
  }
}

function motionTestStep(state: GameState, step: MotionTestStep): [boolean, GameState] {
  switch (step.t) {
    case 'assertion': return [motionTestAssertion(state, step.assn), state];
    case 'move': return [true, executeMove(state, step.move)];
  }
}

export function motionTestPasses(test: MotionTest): boolean {
  return motionTestResult(test, undefined).pass;
}

export function motionTestResult(test: MotionTest, time: number | undefined): { pass: boolean, state: GameState } {
  if (time == undefined)
    time = motionTestLength(test);

  // time == 0 means don't execute any test steps
  // time == 1 means execute one test step
  // time == motionTestLength(test) means execute all steps.
  let state = testInitialGameState(test.levelName);
  for (let i = 0; i < time; i++) {
    const [pass, newState] = motionTestStep(state, test.steps[i]);
    if (!pass)
      return { pass: false, state: newState };
    state = newState;
  }
  return { pass: true, state };
}

export const motionTestSuite: MotionTest[] = [
  {
    description: 'should allow jumping up',
    levelName: '_test1', steps: [
      { t: 'move', move: 'up' },
      { t: 'assertion', assn: { t: 'animState', sprite: 'player_rise' } },
      { t: 'assertion', assn: { t: 'flipState', facing: 'right' } },
      { t: 'assertion', assn: { t: 'position', pos: { x: 0, y: -1 } } },
      { t: 'assertion', assn: { t: 'impetus', impetus: -3 } },
    ]
  },
  {
    description: 'should prevent jumping straight up into boxes',
    levelName: '_test2', steps: [
      { t: 'move', move: 'up' },
      { t: 'assertion', assn: { t: 'animState', sprite: 'player' } },
      { t: 'assertion', assn: { t: 'flipState', facing: 'right' } },
      { t: 'assertion', assn: { t: 'position', pos: { x: 0, y: 0 } } },
      { t: 'assertion', assn: { t: 'impetus', impetus: 0 } },
    ],
  },
  {
    description: 'should allow running over small gaps',
    levelName: '_test3', steps: [
      { t: 'move', move: 'left' },
      { t: 'assertion', assn: { t: 'animState', sprite: 'player_fall' } },
      { t: 'assertion', assn: { t: 'flipState', facing: 'left' } },
      { t: 'assertion', assn: { t: 'position', pos: { x: -1, y: 0 } } },
      { t: 'assertion', assn: { t: 'impetus', impetus: 0 } },
      { t: 'move', move: 'left' },
      { t: 'assertion', assn: { t: 'animState', sprite: 'player' } },
      { t: 'assertion', assn: { t: 'flipState', facing: 'left' } },
      { t: 'assertion', assn: { t: 'position', pos: { x: -2, y: 0 } } },
      { t: 'assertion', assn: { t: 'impetus', impetus: 0 } },
    ],
  },
  {
    description: 'should be able to do wall jumps',
    levelName: '_test6', steps: [
      { t: 'move', move: 'up' },
      { t: 'move', move: 'right' },
      { t: 'move', move: 'up-left' },
      { t: 'move', move: 'left' },
      { t: 'assertion', assn: { t: 'position', pos: { x: -1, y: -2 } } },
      { t: 'assertion', assn: { t: 'animState', sprite: 'player_wall' } },
    ],
  },
  {
    description: 'wall jump should fail when falling fast',
    levelName: '_test7', steps: [
      { t: 'move', move: 'up-right' },
      { t: 'move', move: 'down' },
      { t: 'move', move: 'down' },
      { t: 'move', move: 'down' },
      { t: 'move', move: 'right' },
      { t: 'assertion', assn: { t: 'position', pos: { x: 1, y: 3 } } },
      { t: 'assertion', assn: { t: 'animState', sprite: 'player_fall' } },
    ],
  },
  {
    description: 'teal fruit should enhance jump',
    levelName: '_test8', steps: [
      { t: 'move', move: 'right' },
      { t: 'move', move: 'right' },
      { t: 'move', move: 'up' },
      { t: 'move', move: 'up' },
      { t: 'move', move: 'up' },
      { t: 'move', move: 'up' },
      { t: 'move', move: 'up' },
      { t: 'move', move: 'right' },
      { t: 'assertion', assn: { t: 'position', pos: { x: 3, y: -5 } } },
      { t: 'assertion', assn: { t: 'animState', sprite: 'player' } },
    ],
  },
  {
    description: 'hit buttons while falling',
    levelName: '_test9', steps: [
      { t: 'move', move: 'right' },
      { t: 'move', move: 'down' },
      { t: 'move', move: 'down' },
      { t: 'move', move: 'right' },
      { t: 'move', move: 'down' },
      { t: 'move', move: 'down' },
      { t: 'assertion', assn: { t: 'position', pos: { x: 1, y: 3 } } },
      { t: 'assertion', assn: { t: 'animState', sprite: 'player' } },
    ],
  },
]
