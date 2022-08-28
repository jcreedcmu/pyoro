import * as React from 'react';
import { commandBindings, moveBindings } from './bindings';
import { DEBUG, FRAME_DURATION_MS, logger } from './constants';
import { keyFromCode } from './key';
import { Dispatch, Effect, reduce } from './reduce';
import { init_state, State } from './state';
import { CanvasInfo, useCanvas } from './use-canvas';
import { useEffectfulReducer } from './use-effectful-reducer';
import { imgProm } from './util';
import { drawView, resizeView } from './view';
import { DragHandler } from './drag-handler';
type CanvasProps = {
  main: State,
  spriteImg: HTMLImageElement | null
};

function doEffect(dispatch: Dispatch, e: Effect) {
  switch (e.t) {
    case 'scheduleFrame':
      setTimeout(() => { dispatch({ t: 'nextFrame' }); }, FRAME_DURATION_MS);
      break;
  }
}

export function App(props: {}): JSX.Element {
  function render(ci: CanvasInfo, props: CanvasProps) {
    const { d, size: { x, y } } = ci;
    if (props.spriteImg !== null && props.main.iface.vd !== null) {
      drawView({ d, spriteImg: props.spriteImg, vd: props.main.iface.vd }, props.main);
    }
    else {
      logger('chatty', 'not fully loaded yet:', props.spriteImg, props.main.iface.vd);
    }
  }

  function handleKey(e: KeyboardEvent) {
    logger('keys', 'keycode', e.keyCode);
    logger('keys', 'code', e.code);
    const k = keyFromCode(e);
    const cmd = commandBindings[k];
    if (cmd !== undefined) {
      e.stopPropagation();
      e.preventDefault();
      dispatch({ t: 'commandKey', cmd });
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
    dispatch({ t: 'mouseDown', point: { x: e.clientX, y: e.clientY } });
  }

  function handleResize(e: UIEvent) {
    dispatch({ t: 'resize', vd: resizeView(mc.current!.c) });
  }

  // State
  const [spriteImg, setSpriteImg] = React.useState(null as (null | HTMLImageElement));
  const [state, dispatch] = useEffectfulReducer(init_state, reduce, doEffect);
  const [cref, mc] = useCanvas(
    { main: state, spriteImg: spriteImg }, render,
    [state, spriteImg, state.iface.vd],
    ci => {
      dispatch({ t: 'resize', vd: resizeView(ci.c) });
    }
  );

  React.useEffect(() => {
    (async () => {
      setSpriteImg(await imgProm('assets/sprite.png'));
    })().catch(console.error);
  }, []);

  // Event handlers
  React.useEffect(() => {
    logger('chatty', 'installing global event handlers');
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('resize', handleResize);
    return () => {
      logger('chatty', 'uninstalling global event handlers');
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('resize', handleResize);
    }
  }, []);

  const dragHandler = state.iface.mouse.t == 'tileDrag'
    ? <DragHandler dispatch={dispatch} />
    : undefined;

  return <div><canvas ref={cref} />{dragHandler}</div>;
}
