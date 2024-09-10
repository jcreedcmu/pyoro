import { produce } from "immer";
import { Result } from "./use-effectful-reducer";

// If we have an ordinary pure reducer `reduce` that takes state S and action A
// and returns a state, and the state type S happens to have a field effects: E[],
// then `extractEffects(reduce)` is a suitable reducer for feeding into use-effectful-reducer.
//
// To cause side effects during reduce, the caller needs only put them
// in the `.effects` field of the outputstate. `extractEffects` takes
// care of returning them to useEffectfulReducer in the appropriate way.
export function extractEffects<A, E, S extends { effects: E[] }>(
  reduce: (state: S, action: A) => S,
): ((state: S, action: A) => Result<S, E>) {
  return (state: S, action: A) => {
    return postExtractEffects(reduce(state, action));
  }
}

// If we just the state that arose from reducing, the state type S happens to have a field effects: E[],
// then `postExtractEffects(reduce)` yields the Result with the effects peeled off.
export function postExtractEffects<E, S extends { effects: E[] }>(
  state: S
): Result<S, E> {
  const stateNoEffects = produce(state, s => {
    s.effects = [];
  });
  return {
    state: stateNoEffects,
    effects: state.effects,
  }
}
