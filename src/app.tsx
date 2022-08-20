import * as React from 'react';
import { Dispatch } from './reduce';
import { CanvasInfo, useCanvas } from './use-canvas';

export function App(props: { dispatch: Dispatch, msg: string }): JSX.Element {
  function render(ci: CanvasInfo, s: string) {
    const { d, size: { x, y } } = ci;
    d.fillStyle = 'white';
    d.fillRect(0, 0, x, y);
    d.fillStyle = 'red';
    d.fillText(props.msg, 12, 24);
  }

  function handle_key(e: KeyboardEvent) {
    console.log(e.code);
  }
  React.useEffect(() => {
    console.log('installing');
    document.addEventListener('keydown', handle_key);
    return () => {
      console.log('uninstalling');
      document.removeEventListener('keydown', handle_key);
    }
  }, []);
  const [canvasState, setCanvasState] = React.useState('hello');
  const [cref, mc] = useCanvas(canvasState, render)
  return <span><canvas ref={cref} /></span>;
}
