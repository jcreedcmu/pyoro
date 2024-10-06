import { produce } from 'immer';
import * as React from 'react';
import { DEBUG } from './debug';
import { MainState, SettingsState } from './state';
import { KeyBindableAction } from './action';

export type SettingsAction =
  | { t: 'cancel' }
  | { t: 'ok' }
  | { t: 'setMusicVolume', val: number }
  | { t: 'setSfxVolume', val: number }
  | { t: 'setDebugImpetus', val: boolean }
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
      return {
        t: 'settingsState', state: produce(state, s => {
          s.musicVolume = action.val;
          s.effects.push({ t: 'realizeSoundSettings', musicVolume: action.val, sfxVolume: state.sfxVolume });
        })
      };
    }
    case 'setSfxVolume': {
      return {
        t: 'settingsState', state: produce(state, s => {
          s.sfxVolume = action.val;
          s.effects.push({ t: 'realizeSoundSettings', musicVolume: state.musicVolume, sfxVolume: action.val });
        })
      };
    }
    case 'setDebugImpetus': {
      return {
        t: 'settingsState', state: produce(state, s => {
          s.debugImpetus = action.val;
        })
      };
    }
  }
}

function stringOfKeyBindableAction(action: KeyBindableAction): string {
  switch (action.t) {
    case 'doCommand': return action.command;
    case 'doMove': return action.move;
    case 'setCurrentToolState': return action.toolState.t;
  }
}

export function Settings(props: SettingsProps): JSX.Element {
  const { dispatch } = props;
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6a0d35',
    flexDirection: 'column',
  };

  function debugSettings(): JSX.Element | undefined {
    if (!DEBUG.debugSettings)
      return undefined;
    return <>
      <div style={{ height: '1em' }} />
      <div>  <input id="debugImpetusCheck" type="checkbox" checked={props.state.debugImpetus}
        onChange={e => { dispatch({ t: 'setDebugImpetus', val: e.currentTarget.checked }) }} />
        <label htmlFor="debugImpetusCheck"><b>Debug Impetus</b></label>
      </div>
    </>;
  }

  function keySettings(): JSX.Element | undefined {
    const bindings = props.state.bindings;
    const keyWidgets = Object.keys(bindings).map(x => <tr><td><span className="keycap">{x}</span></td><td> {stringOfKeyBindableAction(bindings[x])} </td></tr>);
    return <>
      <div style={{ height: '3em' }} />
      <b>Key Bindings</b><br />
      <table><tbody>{keyWidgets}</tbody></table>
    </>;
  }

  return <div style={{ ...containerStyle, width: '100%', height: '100%' }}>
    <div style={{ ...containerStyle, backgroundColor: '#fff', padding: '2em' }}>
      <h2>Settings</h2>
      <b>Music Volume</b> <input type="range" value={props.state.musicVolume * 100} min={0} max={100}
        onChange={e => { dispatch({ t: 'setMusicVolume', val: parseInt(e.currentTarget.value) / 100 }) }} />
      <b>Sfx Volume</b> <input type="range" value={props.state.sfxVolume * 100} min={0} max={100}
        onChange={e => { dispatch({ t: 'setSfxVolume', val: parseInt(e.currentTarget.value) / 100 }) }} />
      {debugSettings()}
      {keySettings()}
      <div style={{ height: '2em' }} />
      <button style={{ fontSize: '1.2em' }} onClick={() => { dispatch({ t: 'ok' }); }}>Ok</button>
      <button style={{ fontSize: '1.2em' }} onClick={() => { dispatch({ t: 'cancel' }); }}>Cancel</button>
    </div>
  </div>;
}
