import * as React from 'react';
import { FRAME_DURATION_MS } from './constants';
import { DragHandler } from './drag-handler';
import { keyFromCode } from './key';
import { bootstrapComplexLayer } from './layer';
import { logger } from './logger';
import { getOverlayForSave } from './model';
import { Dispatch, Effect, reduce } from './reduce';
import { init_state, State, ToolState } from './state';
import { CanvasInfo, useCanvas } from './use-canvas';
import { useEffectfulReducer } from './use-effectful-reducer';
import { imgProm } from './util';
import { drawView, resizeView } from './view';
import * as CSS from 'csstype';

type CanvasProps = {
  main: State,
  spriteImg: HTMLImageElement | null
};

function doEffect(state: State, dispatch: Dispatch, e: Effect) {
  switch (e.t) {
    case 'scheduleFrame':
      setTimeout(() => { dispatch({ t: 'nextFrame' }); }, FRAME_DURATION_MS);
      break;
    case 'saveOverlay':
      const req = new Request('/save', {
        method: 'POST',
        body: JSON.stringify(getOverlayForSave(state.game)),
        headers: {
          'Content-Type': 'application/json',
        }
      });
      fetch(req).then(r => r.json())
        .then(x => logger('networkRequest', x))
        .catch(console.error);
      break;
  }
}

function passthrough(k: string): boolean {
  return k == 'C-r';
}

function cursorOfToolState(toolState: ToolState): CSS.Property.Cursor {
  switch (toolState.t) {
    case 'hand_tool': return 'grab';
    case 'pencil_tool': return 'cell';
    case 'modify_tool': return 'url(/assets/modify-tool.png) 16 16, auto';
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

  function handleKeyDown(e: KeyboardEvent) {
    const name = keyFromCode(e);
    logger('keys', 'keydown: [keycode, key, code, name]', e.keyCode, e.key, e.code, name);
    if (!passthrough(name)) {
      e.stopPropagation();
      e.preventDefault();
    }
    dispatch({ t: 'keyDown', key: e.key, code: e.code, name: name });
  }

  function handleKeyUp(e: KeyboardEvent) {
    const k = keyFromCode(e);
    logger('keys', 'keyup: [keycode, key, code, name]', e.keyCode, e.key, e.code, k);
    dispatch({ t: 'keyUp', key: e.key, code: e.code, name: k });
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
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('resize', handleResize);
    return () => {
      logger('chatty', 'uninstalling global event handlers');
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('resize', handleResize);
    }
  }, []);

  const dragHandler = (state.iface.mouse.t == 'tileDrag' || state.iface.mouse.t == 'panDrag')
    ? <DragHandler dispatch={dispatch} />
    : undefined;

  const cursor = cursorOfToolState(state.iface.toolState);
  return <div><canvas style={{ cursor }} ref={cref} />{dragHandler}</div>;
}
