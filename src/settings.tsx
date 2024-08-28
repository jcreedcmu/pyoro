import * as React from 'react';
import { Action, Dispatch } from './action';
import { doEffect, Effect } from './effect';
import { extractEffects } from './extract-effects';
import { initMainState, initState } from './init-state';
import { MainComp } from './main-comp';
import { reduceMain } from './reduce';
import { MainState, SettingsState, State } from './state';
import { TitleCard } from './title';
import { useEffectfulReducer } from './use-effectful-reducer';
import { produce } from 'immer';
import { setMusicVolume, setSfxVolume } from './sound';

export type SettingsAction =
  | { t: 'cancel' }
  | { t: 'ok' }
  | { t: 'setMusicVolume', val: number }
  | { t: 'setSfxVolume', val: number }
  ;

export type SettingsProps = {
  prev: MainState,
  state: SettingsState,
  dispatch: (action: SettingsAction) => void,
};

export type SettingsResult =
  | { t: 'settingsState', state: SettingsState }
  | { t: 'cancel' }
  | { t: 'ok', state: SettingsState }
  ;

export function reduceSettings(state: SettingsState, action: SettingsAction): SettingsResult {
  switch (action.t) {
    case 'cancel': return { t: 'cancel' };
    case 'ok': return { t: 'ok', state };
    case 'setMusicVolume': {
      // XXX side effect!
      setMusicVolume(action.val);
      return { t: 'settingsState', state: produce(state, s => { s.musicVolume = action.val }) };
    }
    case 'setSfxVolume': {
      // XXX side effect!
      setSfxVolume(action.val);
      return { t: 'settingsState', state: produce(state, s => { s.sfxVolume = action.val }) };
    }
  }
}

export function Settings(props: SettingsProps): JSX.Element {
  const { dispatch } = props;
  return <>Settings<br />
    Music Volume <input type="range" value={props.state.musicVolume * 100} min={0} max={100}
      onChange={e => { dispatch({ t: 'setMusicVolume', val: parseInt(e.currentTarget.value) / 100 }) }} /><br />
    Sfx Volume <input type="range" value={props.state.sfxVolume * 100} min={0} max={100}
      onChange={e => { dispatch({ t: 'setSfxVolume', val: parseInt(e.currentTarget.value) / 100 }) }} /><br />
    <button onMouseDown={() => { dispatch({ t: 'ok' }); }}>ok</button><br />
  </>;

  //// Can't really have an effective cancel button when I'm statefully updating music volume!
  // <button onMouseDown={() => { dispatch({ t: 'cancel' }); }}>cancel</button><br />
}
