import * as React from 'react';
import { Dispatch } from './action';

// We have only *click* to continue not "hit any key to continue" because
// firefox doesn't recognize all keydown events as user intent to create
// AudioContext, see
// https://bugzilla.mozilla.org/show_bug.cgi?id=1897649
// for more details.

export function TitleCard(props: { dispatch: Dispatch }): JSX.Element {
  const { dispatch } = props;
  return <div
    tabIndex={-1}
    ref={e => { if (e != null) { e.focus() } }}
    style={{
      width: '100%', height: '100%', display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#6a0d35',
      cursor: 'pointer',
    }}
    onMouseDown={e => dispatch({ t: 'mouseDown', point: { x: 0, y: 0 } })}>
    <img style={{ width: 722, imageRendering: 'crisp-edges' }} src="assets/title.png" />
  </div>
}
