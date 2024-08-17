import * as React from 'react';
import { doEffect } from './effect';
import { extractEffects } from './extract-effects';
import { initMainState } from './init-state';
import { MainComp } from './main-comp';
import { reduce } from './reduce';
import { useEffectfulReducer } from './use-effectful-reducer';

export function App(props: {}): JSX.Element {
  const [state, dispatch] = useEffectfulReducer(initMainState, extractEffects(reduce), doEffect);
  return <MainComp state={state} dispatch={dispatch} />;
}
