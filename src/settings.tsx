import { produce } from 'immer';
import * as React from 'react';
import { DEBUG } from './debug';
import { MainState, SettingsState } from './state';
import { KeyBindableAction } from './action';
import { actionOfExternalKeyBind, allKeyBinds, ExternalKeyBind } from './bindings';
import { key } from './key';
import { initSettingsState } from './init-state';

type Dispatch = (action: SettingsAction) => void;

export type SettingsAction =
  | { t: 'cancel' }
  | { t: 'ok' }
  | { t: 'reset' }
  | { t: 'setMusicVolume', val: number }
  | { t: 'setSfxVolume', val: number }
  | { t: 'setDebugImpetus', val: boolean }
  | { t: 'removeKeyBind', keysym: string }
  | { t: 'openChooseKey', ekb: ExternalKeyBind }
  | { t: 'addKeyBind', keysym: string, ekb: ExternalKeyBind }
  ;

export type SettingsProps = {
  prev: MainState,
  state: SettingsState,
  dispatch: Dispatch,
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
    case 'removeKeyBind': {
      return {
        t: 'settingsState', state: produce(state, s => {
          delete s.bindings[action.keysym];
        })
      };
    }
    case 'openChooseKey': {
      return {
        t: 'settingsState', state: produce(state, s => {
          s.keyModal = action.ekb;
        })
      };
    }
    case 'addKeyBind': {
      const newAction = actionOfExternalKeyBind(action.ekb);
      return {
        t: 'settingsState', state: produce(state, s => {
          s.keyModal = undefined;
          s.bindings[action.keysym] = newAction;
        })
      };
    }
    case 'reset': {
      return {
        t: 'settingsState', state: initSettingsState,
      };
    }
  }
}

function stringOfKeyBindableAction(action: KeyBindableAction): ExternalKeyBind {
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
    const bindingsReverse: { [K in ExternalKeyBind]?: string[] } = {};
    for (const k of Object.keys(bindings)) {
      const bind = stringOfKeyBindableAction(bindings[k]);
      if (bindingsReverse[bind] == undefined) {
        bindingsReverse[bind] = [];
      }
      bindingsReverse[bind].push(k);
    }
    function bindingsFor(x: ExternalKeyBind): JSX.Element[] | undefined {
      if (bindingsReverse[x] == undefined) return [<em>no binding</em>];
      return bindingsReverse[x].map(keysym => <KeyCap extraClassName={'deleter'} key={keysym} keysym={keysym} onClick={() => { dispatch({ t: 'removeKeyBind', keysym }) }} />);

    }
    function addBinding(binding: ExternalKeyBind): JSX.Element {
      return <KeyCap extraClassName={'adder'} keysym={'+'} onClick={() => { dispatch({ t: 'openChooseKey', ekb: binding }) }} />;
    }
    const keyWidgets = allKeyBinds.map(ekb => <tr><td>{ekb}</td><td>{bindingsFor(ekb)}{addBinding(ekb)} </td></tr>);
    return <>
      <div style={{ height: '3em' }} />
      <b>Key Bindings</b><br />
      <table><tbody>{keyWidgets}</tbody></table>
    </>;
  }

  function KeyModal(props: { dispatch: Dispatch, ekb: ExternalKeyBind }): JSX.Element {
    React.useEffect(() => {
      const keydown = (e: KeyboardEvent) => {
        const keysym = key(e);
        if (!keysym.match(/\[/)) {
          // this is kind of hacky --- the intent is to not react to
          // mere modifier keys, and I know my keysym generator adds
          // add least a bracket for such events.
          dispatch({ t: 'addKeyBind', keysym: key(e), ekb: props.ekb })
        }
      };
      document.addEventListener('keydown', keydown);
      return () => {
        document.removeEventListener('keydown', keydown);
      }
    });
    return <div className="choose-key-container" >
      <div className="choose-key-modal" >
        <center>
          Type a key to bind...
        </center>
      </div>
    </div>;
  }

  const keyModal = props.state.keyModal != undefined ? <KeyModal dispatch={dispatch} ekb={props.state.keyModal} /> : undefined;
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
      <button style={{ fontSize: '1.2em' }} onClick={() => { dispatch({ t: 'reset' }); }}>Reset to Defaults</button>
      <button style={{ fontSize: '1.2em' }} onClick={() => { dispatch({ t: 'cancel' }); }}>Cancel</button>
    </div>
    {keyModal}
  </div>;
}

type KeyCapProps = {
  extraClassName?: string,
  onClick: () => void,
  keysym: string,
}

function KeyCap(props: KeyCapProps): JSX.Element {
  const className = props.extraClassName == undefined ? "keycap" : `keycap ${props.extraClassName}`;
  return <span onClick={() => (props.onClick)()} className={className}>{props.keysym}</span>;
}
