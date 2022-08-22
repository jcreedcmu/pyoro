import * as React from 'react';
import { commandBindings, moveBindings } from './bindings';
import { DEBUG } from './constants';
import { keyFromCode } from './key';
import { Dispatch, Effect, reduce } from './reduce';
import { init_state, State } from './state';
import { CanvasInfo, useCanvas } from './use-canvas';
import { useEffectfulReducer } from './use-effectful-reducer';
import { imgProm } from './util';
import { drawView, resizeView } from './view';

type CanvasProps = {
  vestigial: string,
  main: State,
  spriteImg: HTMLImageElement | null
};

function resize(ci: CanvasInfo | undefined): void {
  if (ci == undefined) {
    return;
  }
  console.log('resize', ci);
  resizeView(ci.c);
}

export function App(props: { dispatch: Dispatch, msg: string }): JSX.Element {
  const { msg } = props;

  console.log('rendering App');

  function render(ci: CanvasInfo, props: CanvasProps) {
    console.log('rendering small canvas');
    const { d, size: { x, y } } = ci;
    d.fillStyle = 'white';
    d.fillRect(0, 0, x, y);
    d.fillStyle = 'red';
    d.fillText(props.vestigial, 12, 24);
    if (props.spriteImg !== null && props.main.iface.vd !== null) {
      console.log('got to drawing');
      drawView({ d, spriteImg: props.spriteImg, vd: props.main.iface.vd }, props.main);
    }
    else {
      console.log('not fully loaded:', props.spriteImg, props.main.iface.vd);
    }
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

  function handleResize(e: UIEvent) {
    console.log('resize event');
    dispatch({ t: 'resize', vd: resizeView(mc.current!.c) });
  }

  // State 

  function doEffect(effect: Effect): void {

  }
  const [spriteImg, setSpriteImg] = React.useState(null as (null | HTMLImageElement));
  const [state, dispatch] = useEffectfulReducer(init_state, reduce, doEffect);
  const [canvasState, setCanvasState] = React.useState('hello');
  const [cref, mc] = useCanvas({ vestigial: canvasState, main: state, spriteImg: spriteImg }, render, [canvasState, state, spriteImg, state.iface.vd]);

  React.useEffect(() => {
    (async () => {
      console.log('loading sprite sheet');
      setSpriteImg(await imgProm('assets/sprite.png'));
      console.log('loaded sprite sheet');
    })().catch(console.error);
  }, []);

  // Event handlers
  React.useEffect(() => {
    console.log('installing');
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('resize', handleResize);
    return () => {
      console.log('uninstalling');
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('resize', handleResize);
    }
  }, []);

  return <div><canvas ref={cref} /></div>;
}
