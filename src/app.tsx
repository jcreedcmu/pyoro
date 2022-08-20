import * as React from 'react';
import { commandBindings, moveBindings } from './bindings';
import { DEBUG } from './constants';
import { keyFromCode } from './key';
import { Dispatch } from './reduce';
import { CanvasInfo, useCanvas } from './use-canvas';

export function App(props: { dispatch: Dispatch, msg: string }): JSX.Element {
  const { dispatch, msg } = props;

  function render(ci: CanvasInfo, s: string) {
    const { d, size: { x, y } } = ci;
    d.fillStyle = 'white';
    d.fillRect(0, 0, x, y);
    d.fillStyle = 'red';
    d.fillText(msg, 12, 24);
  }

  function handleKey(e: KeyboardEvent) {
    if (DEBUG.keys) {
      console.log(e.keyCode);
      console.log(e.code);
    }
    const k = keyFromCode(e);
    const f = commandBindings[k];
    if (f !== undefined) {
      e.stopPropagation();
      e.preventDefault();
      dispatch({ t: 'changeState', f });
    }
    else {
      const move = moveBindings[k];
      if (move) {
        e.stopPropagation();
        e.preventDefault();
        dispatch({ t: 'startAnim', m: move });
      }
    }
  }

  React.useEffect(() => {
    console.log('installing');
    document.addEventListener('keydown', handleKey);
    return () => {
      console.log('uninstalling');
      document.removeEventListener('keydown', handleKey);
    }
  }, []);

  const [canvasState, setCanvasState] = React.useState('hello');
  const [cref, mc] = useCanvas(canvasState, render)
  return <span><canvas ref={cref} /></span>;
}
