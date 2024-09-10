import * as React from 'react';
import { Action } from './action';
import { doEffect, Effect } from './effect';
import { extractEffects, postExtractEffects } from './extract-effects';
import { initMainState, initState } from './init-state';
import { MainComp } from './main-comp';
import { reduceMain } from './reduce';
import { MainState, SettingsState, State } from './state';
import { TitleCard } from './title';
import { useEffectfulReducer } from './use-effectful-reducer';
import { reduceSettings, Settings } from './settings';
import { produce } from 'immer';

function reduceWithEffects(state: State, action: Action): { state: State, effects: Effect[] | undefined } {
  switch (state.t) {
    case 'main': {
      if (action.t == 'openSettings') {
        return { state: { t: 'settings', prev: state.state, settingsState: state.state.settings }, effects: [] };
      }
      const { state: mstate, effects } = extractEffects<Action, Effect, MainState>(reduceMain)(state.state, action);
      return { state: { t: 'main', state: mstate }, effects };
    }
    case 'title': {
      switch (action.t) {
        default:
          return { state: { t: 'main', state: initMainState }, effects: [{ t: 'startSound' }] };
      }
    }
    case 'settings': {
      if (action.t == 'settingsAction') {
        const res = reduceSettings(state.settingsState, action.action);
        switch (res.t) {
          case 'settingsState': {
            const { state: settingsState, effects } = postExtractEffects<Effect, SettingsState>(res.state);
            return { state: { t: 'settings', prev: state.prev, settingsState }, effects };
          }
          case 'cancel': return {
            state: { t: 'main', state: state.prev },
            effects: [{ t: 'realizeSoundSettings', musicVolume: state.prev.settings.musicVolume, sfxVolume: state.prev.settings.sfxVolume }],
          };
          case 'ok': return {
            state: { t: 'main', state: produce(state.prev, s => { s.settings = res.state; }) },
            effects: [{ t: 'realizeSoundSettings', musicVolume: state.settingsState.musicVolume, sfxVolume: state.settingsState.sfxVolume }],
          };
        }
      }
      else {
        throw new Error('incompatible action');
      }
    }
  }
}

export function App(props: {}): JSX.Element {
  const [state, dispatch] = useEffectfulReducer(initState, reduceWithEffects, doEffect);
  switch (state.t) {
    case 'main': return <MainComp state={state.state} dispatch={dispatch} />;
    case 'title': return <TitleCard dispatch={dispatch} />;
    case 'settings': return <Settings state={state.settingsState} prev={state.prev} dispatch={action => dispatch({ t: 'settingsAction', action })} />;
  }
}
