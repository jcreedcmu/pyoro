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

export type SettingsAction =
  | { t: 'cancel' }
  | { t: 'ok' }
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
  }
}

export function Settings(props: SettingsProps): JSX.Element {
  return <>hello</>;
}
