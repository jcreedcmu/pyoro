import * as React from 'react';
import { Dispatch } from './action';
import { LoadState, loadAssets } from './assets';
import { startAudio } from './sound';

// We start on *click* rather than "hit any key to continue" because
// firefox doesn't recognize all keydown events as user intent to create
// AudioContext, see
// https://bugzilla.mozilla.org/show_bug.cgi?id=1897649
// for more details.

function LoadingBar(props: { loaded: number, total: number }): JSX.Element {
  const frac = props.total == 0 ? 0 : Math.min(1, props.loaded / props.total);
  return <div className="title-status">
    <div className="title-progress">
      <div className="title-progress-fill" style={{ width: `${frac * 100}%` }} />
    </div>
    <div className="title-progress-label">Loading… {Math.round(frac * 100)}%</div>
  </div>;
}

/** The container is rendered even when empty, so that the title image
 * doesn't shift when loading finishes. */
function status(loadState: LoadState): JSX.Element {
  switch (loadState.t) {
    case 'loading':
      return <LoadingBar loaded={loadState.loaded} total={loadState.total} />;
    case 'error':
      return <div className="title-status">
        <div className="title-error">Could not load: {loadState.msg}</div>
        <button className="title-button" onClick={() => loadAssets()}>Retry</button>
      </div>;
    case 'done':
      return <div className="title-status" />;
  }
}

export function TitleCard(props: { loadState: LoadState, dispatch: Dispatch }): JSX.Element {
  const { loadState, dispatch } = props;
  const ready = loadState.t == 'done';
  return <div
    tabIndex={-1}
    ref={e => { if (e != null) { e.focus() } }}
    className={ready ? 'title-card ready' : 'title-card'}
    onClick={() => {
      if (!ready)
        return;
      // Before dispatching, so that this still counts as happening
      // inside the gesture handler.
      startAudio();
      dispatch({ t: 'startGame' });
    }}>
    <img className="title-image" src="assets/title.png" />
    {status(loadState)}
  </div>
}
