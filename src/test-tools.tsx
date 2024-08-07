import * as React from 'react';
import { State, TestToolState } from './state';
import { motionTestSuite } from './test-motion';
import { produce } from 'immer';
import { mod } from './util';

export type Action =
  | { t: 'prevTest' }
  | { t: 'nextTest' }
  | { t: 'prevStep' }
  | { t: 'nextStep' }
  ;

export function reduce(tts: TestToolState, action: Action): TestToolState {
  switch (action.t) {
    case 'prevTest': return produce(tts, s => {
      s.currentTestIx = mod(tts.currentTestIx - 1, motionTestSuite.length);
    });
    case 'nextTest': return produce(tts, s => {
      s.currentTestIx = mod(tts.currentTestIx + 1, motionTestSuite.length);
      console.log(s.currentTestIx);
    });
    case 'prevStep': return tts;
    case 'nextStep': return tts;
  }
}

export function renderTestTools(state: State, dispatch: (action: Action) => void): JSX.Element | undefined {
  const toolState = state.iface.toolState;
  if (toolState.t != 'test_tool')
    return undefined;
  const { testToolState: { currentTestIx } } = toolState;
  const currentTest = motionTestSuite[currentTestIx];
  return <div className="test-tools">
    <b>{currentTest.levelName}</b><br />
    <div className="title">{currentTest.description}</div>
    <button onMouseDown={() => { dispatch({ t: 'prevTest' }) }}>prev</button>
    <button onMouseDown={() => { dispatch({ t: 'nextTest' }) }}>next</button>
    <br />
    <button onMouseDown={() => { dispatch({ t: 'prevStep' }) }}>&lt;</button>
    <button onMouseDown={() => { dispatch({ t: 'nextStep' }) }}>&gt;</button>
  </div>;
}
