import * as React from 'react';

// The point of this hook is that we assume we're given some types S ("State"), A ("Action"), E ("Effect"),
// and a reducer of type
//   reduce: (state: S, action: A) => Result<S, E>,
// as well as some
//   initialState: S,
// and an imperative way to evaluate effects
//   doEffect: (effect: E) => void):
//
// The reducer itself is meant to be a pure computation of a
// description of the next state and some side effects we should do,
// as a consequence of an action and the current state.
//
// We then use React's own useReducer, slipping in an action data
// structure that has an extra field which we sneakily update in place
// with the effect-part of the return value of the reducer, so that by
// the time the dispatch call is over, we can see the side-effects
// that we wanted to trigger, and we can call doEffect on them.

export type Result<S, E> = { state: S, effects?: E[] };

type ProxyAction<A, S, E> = {
  action: A,
  effects?: E[],
}

export function useEffectfulReducer<A, S, E>(
  initialState: S,
  reduce: (state: S, action: A) => Result<S, E>,
  doEffect: (effect: E) => void):
  [S, (action: A) => void] {
  function proxyReduce(state: S, proxyAction: ProxyAction<A, S, E>): S {
    const result = reduce(state, proxyAction.action);
    proxyAction.effects = result.effects;
    return result.state;
  }
  const [state, dispatch] = React.useReducer<(state: S, action: ProxyAction<A, S, E>) => S>(proxyReduce, initialState);
  return [state, (a: A) => {
    const proxyAction: ProxyAction<A, S, E> = { action: a };
    dispatch(proxyAction);
    if (proxyAction.effects !== undefined) {
      for (const effect of proxyAction.effects) {
        doEffect(effect);
      }
    }
  }];
}
