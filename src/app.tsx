import * as React from 'react';
import { CanvasInfo, useCanvas } from './use-canvas';

export function App(props: { msg: string }): JSX.Element {
  function render(ci: CanvasInfo, s: string) {
    const { d, size: { x, y } } = ci;
    d.fillStyle = 'white';
    d.fillRect(0, 0, x, y);
    d.fillStyle = 'red';
    d.fillText(props.msg, 12, 24);
  }
  const [canvasState, setCanvasState] = React.useState('hello');
  const [cref, mc] = useCanvas(canvasState, render)
  return <span><canvas ref={cref} /></span>;
}
