import { Facing, Move, PlayerSprite, Point } from '../src/types';
import { initOverlay } from './initial_overlay';
import { animateMove, renderGameAnims } from './model';
import { vequal } from './point';
import { emptyOverlay, GameState, init_player } from './state';

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
  levelName: string,
  steps: MotionTestStep[],
}

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
    case 'impetus': return player.impetus == assertion.impetus;
  }
}

function motionTestStep(state: GameState, step: MotionTestStep): [boolean, GameState] {
  switch (step.t) {
    case 'assertion': return [motionTestAssertion(state, step.assn), state];
    case 'move': return [true, executeMove(state, step.move)];
  }
}

export function motionTestPasses(test: MotionTest, time?: number): [boolean, GameState] {
  if (time == undefined)
    time = motionTestLength(test);

  // time == 0 means don't execute any test steps
  // time == 1 means execute one test step
  // time == motionTestLength(test) means execute all steps.
  let state = testState(test.levelName);
  for (let i = 0; i < time; i++) {
    const [pass, newState] = motionTestStep(state, test.steps[i]);
    if (!pass)
      return [false, newState];
    state = newState;
  }
  return [true, state];
}
