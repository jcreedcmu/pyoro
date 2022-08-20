import * as React from 'react';
import { commandBindings, moveBindings } from './bindings';
import { DEBUG } from './constants';
import { keyFromCode } from './key';
import { Dispatch } from './reduce';
import { init_state, State } from './state';
import { CanvasInfo, useCanvas } from './use-canvas';
import { drawView } from './view';

type CanvasProps = {
  vestigial: string,
  main: State,
  spriteImg: HTMLImageElement | null
};

export function App(props: { dispatch: Dispatch, msg: string }): JSX.Element {
  const { dispatch, msg } = props;

  function render(ci: CanvasInfo, props: CanvasProps) {
    const { d, size: { x, y } } = ci;
    d.fillStyle = 'white';
    d.fillRect(0, 0, x, y);
    d.fillStyle = 'red';
    d.fillText(props.vestigial, 12, 24);
    if (props.spriteImg !== null && props.main.iface.vd !== null)
      drawView({ d, spriteImg: props.spriteImg, vd: props.main.iface.vd }, props.main);
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

  function handleMouseDown(e: MouseEvent) {
    dispatch({ t: 'click', point: { x: e.clientX, y: e.clientY } });
  }

  // State
  const [spriteImg, setSpriteImg] = React.useState(null as (null | HTMLImageElement));
  const [state, setState] = React.useState(init_state);
  const [canvasState, setCanvasState] = React.useState('hello');
  const [cref, mc] = useCanvas({ vestigial: canvasState, main: state, spriteImg: spriteImg }, render);

  // Event handlers
  React.useEffect(() => {
    console.log('installing');
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      console.log('uninstalling');
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleMouseDown);
    }
  }, []);

  return <span><canvas ref={cref} /></span>;
}
