import * as CSS from 'csstype';
import * as React from 'react';
import { FRAME_DURATION_MS } from './constants';
import { DragHandler } from './drag-handler';
import { keyFromCode } from './key';
import { logger } from './logger';
import { complexTileOfState, getOverlayForSave } from './model';
import { Dispatch, Effect, reduce } from './reduce';
import { init_state, State, ToolState } from './state';
import { TimedBlockComplexTile } from './types';
import { CanvasInfo, useCanvas } from './use-canvas';
import { useEffectfulReducer } from './use-effectful-reducer';
import { imgProm } from './util';
import { drawView, resizeView } from './view';

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

function renderTimedBlockEditor(ct: TimedBlockComplexTile, dispatch: Dispatch): JSX.Element {
  return <span>
    <label>
      Phase: <input type="text" value={ct.phase}
        onChange={e => dispatch({ t: 'setPhase', value: parseInt(e.target.value) })} />
    </label><br />
    <label>
      On for: <input type="text" value={ct.on_for}
        onChange={e => dispatch({ t: 'setOnFor', value: parseInt(e.target.value) })} />
    </label><br />
    <label>
      Off for: <input type="text" value={ct.off_for}
        onChange={e => dispatch({ t: 'setOffFor', value: parseInt(e.target.value) })} />
    </label>
  </span>;
}

function renderModifyPanel(state: State, dispatch: Dispatch): JSX.Element | null {
  const toolState = state.iface.toolState;
  if (toolState.t == 'modify_tool' && toolState.modifyCell !== null) {
    const style: React.CSSProperties = {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      backgroundColor: '#ddd',
      width: '300px',
    };
    let content: JSX.Element = <span>No properties to edit</span>;
    const ct = complexTileOfState(state, toolState.modifyCell);
    if (ct.t == 'timed') {
      content = renderTimedBlockEditor(ct, dispatch);
    }
    return <div style={style}>{content}</div>;
  }
  else {
    return null;
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

  function handleKeyDown(e: React.KeyboardEvent) {
    console.log('keydown');
    const name = keyFromCode(e.nativeEvent);
    logger('keys', 'keydown: [keycode, key, code, name]', e.keyCode, e.key, e.code, name);
    if (!passthrough(name) && !(state.iface.toolState.t == 'modify_tool')) {
      e.stopPropagation();
      e.preventDefault();
    }
    dispatch({ t: 'keyDown', key: e.key, code: e.code, name: name });
  }

  function handleKeyUp(e: React.KeyboardEvent) {
    const k = keyFromCode(e.nativeEvent);
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
      ci.c.focus();
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
    document.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('resize', handleResize);
    return () => {
      logger('chatty', 'uninstalling global event handlers');
      document.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('resize', handleResize);
    }
  }, []);

  const dragHandler = (state.iface.mouse.t == 'tileDrag' || state.iface.mouse.t == 'panDrag')
    ? <DragHandler dispatch={dispatch} />
    : undefined;

  const canvasCursor = cursorOfToolState(state.iface.toolState);
  const modifyPanel = renderModifyPanel(state, dispatch);
  return <div>
    <canvas style={{ cursor: canvasCursor }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      ref={cref} />
    {dragHandler}
    {modifyPanel}
  </div>;
}
