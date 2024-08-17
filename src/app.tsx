import * as React from 'react';
import { Action } from './action';
import { doEffect, Effect } from './effect';
import { extractEffects } from './extract-effects';
import { initMainState, initState } from './init-state';
import { MainComp } from './main-comp';
import { reduceMain } from './reduce';
import { MainState, State } from './state';
import { TitleCard } from './title';
import { useEffectfulReducer } from './use-effectful-reducer';

function reduceWithEffects(state: State, action: Action): { state: State, effects: Effect[] | undefined } {
  switch (state.t) {
    case 'main': {
      const { state: mstate, effects } = extractEffects<Action, Effect, MainState>(reduceMain)(state.state, action);
      return { state: { t: 'main', state: mstate }, effects };
    }
    case 'title': {
      switch (action.t) {
        default:
          return { state: { t: 'main', state: initMainState }, effects: [{ t: 'startSound' }] };
      }
    }
  }
}

export function App(props: {}): JSX.Element {
  const [state, dispatch] = useEffectfulReducer(initState, reduceWithEffects, doEffect);
  switch (state.t) {
    case 'main': return <MainComp state={state.state} dispatch={dispatch} />;
    case 'title': return <TitleCard dispatch={dispatch} />;
  }
}
