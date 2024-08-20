import * as React from 'react';
import { Level, MainState, TestToolState } from './state';
import { MotionTest, MotionTestAssertion, motionTestResult, MotionTestStep, motionTestSuite } from './test-motion';
import { produce } from 'immer';
import { mod } from './util';
import { LevelData } from './level';

export type Action =
  | { t: 'prevTest' }
  | { t: 'nextTest' }
  | { t: 'prevStep' }
  | { t: 'nextStep' }
  ;

function getCurrentTestLevel(state: MainState, tts: TestToolState): LevelData {
  return state.game.levels[motionTestSuite[tts.testIx].levelName];
}

function getCurrentTest(tts: TestToolState): MotionTest {
  return motionTestSuite[tts.testIx];
}

export function reduce(tts: TestToolState, action: Action): TestToolState {
  switch (action.t) {
    case 'prevTest': return produce(tts, s => {
      s.testIx = mod(tts.testIx - 1, motionTestSuite.length);
      s.testTime = 0;
    });
    case 'nextTest': return produce(tts, s => {
      s.testIx = mod(tts.testIx + 1, motionTestSuite.length);
      s.testTime = 0;
    });
    case 'prevStep': {
      const currentTest = getCurrentTest(tts);
      return produce(tts, s => {
        s.testTime = mod(tts.testTime - 1, currentTest.steps.length + 1);
      });
    }
    case 'nextStep': {
      const currentTest = getCurrentTest(tts);
      return produce(tts, s => {
        s.testTime = mod(tts.testTime + 1, currentTest.steps.length + 1);
      });
    }
  }
}

export function renderAssertion(assn: MotionTestAssertion): JSX.Element | string {
  switch (assn.t) {
    case 'position': return `Position: (${assn.pos.x}, ${assn.pos.y})`;
    case 'flipState': return `Flip State: ${assn.facing}`;
    case 'animState': return `Anim State: ${assn.sprite}`;
    case 'impetus': return `Impetus: ${assn.impetus}`;
  }
}

export function renderStep(steps: MotionTestStep[], time: number): JSX.Element | string {
  if (time >= steps.length) {
    return 'done';
  }
  const step = steps[time];
  switch (step.t) {
    case 'assertion': return `Assertion: ${renderAssertion(step.assn)}`;
    case 'move': return `Move: ${step.move}`;
  }
}
export function renderTestTools(state: MainState, dispatch: (action: Action) => void): JSX.Element | undefined {
  const toolState = state.iface.toolState;
  if (toolState.t != 'test_tool')
    return undefined;
  const { testToolState } = toolState;
  const { testIx, testTime } = testToolState;
  const currentTest = motionTestSuite[testIx];

  // XXX Doing a lot of unnecessary work here duplicating that in getTestState
  const { pass } = motionTestResult(currentTest, testTime);

  return <div className="test-tools">
    <b>{currentTest.levelName}</b><br />
    <button onMouseDown={() => { dispatch({ t: 'prevTest' }) }}>prev</button>
    <button onMouseDown={() => { dispatch({ t: 'nextTest' }) }}>next</button>
    <br />
    <button onMouseDown={() => { dispatch({ t: 'prevStep' }) }}>&lt;</button>
    <button onMouseDown={() => { dispatch({ t: 'nextStep' }) }}>&gt;</button>
    <br />
    <b>Time</b>: {testTime}<br />
    <b>Result</b>: {pass ? 'pass' : 'fail'}<br />
    <b>Next Step</b>: {renderStep(currentTest.steps, testTime)}<br />
    <br />
    {currentTest.description}
  </div>;
}
