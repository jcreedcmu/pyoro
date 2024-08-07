import * as React from 'react';
import { Level, State, TestToolState } from './state';
import { MotionTest, motionTestSuite } from './test-motion';
import { produce } from 'immer';
import { mod } from './util';

export type Action =
  | { t: 'prevTest' }
  | { t: 'nextTest' }
  | { t: 'prevStep' }
  | { t: 'nextStep' }
  ;

function getCurrentTestLevel(state: State, tts: TestToolState): Level {
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
        s.testTime = mod(tts.testTime - 1, currentTest.steps.length);
      });
    }
    case 'nextStep': {
      const currentTest = getCurrentTest(tts);
      return produce(tts, s => {
        s.testTime = mod(tts.testTime + 1, currentTest.steps.length);
      });
    }
  }
}

export function renderTestTools(state: State, dispatch: (action: Action) => void): JSX.Element | undefined {
  const toolState = state.iface.toolState;
  if (toolState.t != 'test_tool')
    return undefined;
  const { testToolState: { testIx, testTime } } = toolState;
  const currentTest = motionTestSuite[testIx];
  return <div className="test-tools">
    <b>{currentTest.levelName}</b><br />
    <button onMouseDown={() => { dispatch({ t: 'prevTest' }) }}>prev</button>
    <button onMouseDown={() => { dispatch({ t: 'nextTest' }) }}>next</button>
    <br />
    <button onMouseDown={() => { dispatch({ t: 'prevStep' }) }}>&lt;</button>
    <button onMouseDown={() => { dispatch({ t: 'nextStep' }) }}>&gt;</button>
    <br />
    <b>Test time</b>: {testTime}
    <br />
    {currentTest.description}
  </div>;
}
