import * as CSS from 'csstype';
import * as React from 'react';
import { DragHandler } from './drag-handler';
import { keyFromCode } from './key';
import { logger } from './logger';
import { Dispatch, reduce } from './reduce';
import { ButtonedTileFields, DoorTileFields, init_state, State, TimedTileFields, ToolState } from './state';
import { CanvasInfo, useCanvas } from './use-canvas';
import { useEffectfulReducer } from './use-effectful-reducer';
import { imgProm } from './util';
import { drawView, resizeView } from './view';

type CanvasProps = {
  main: State,
  spriteImg: HTMLImageElement | null
};

function passthrough(k: string): boolean {
  return k == 'C-r';
}

function cursorOfToolState(toolState: ToolState): CSS.Property.Cursor {
  switch (toolState.t) {
    case 'play_tool': return 'pointer';
    case 'hand_tool': return 'grab';
    case 'pencil_tool': return 'cell';
    case 'modify_tool': return 'url(/assets/modify-tool.png) 16 16, auto';
  }
}

function renderTimedBlockEditor(ttf: TimedTileFields, dispatch: Dispatch): JSX.Element {
  return <span>
    <label>
      Phase: <input type="text" value={ttf.phase}
        onChange={e => dispatch({ t: 'setPanelStateField', key: 'phase', value: e.target.value })} />
    </label><br />
    <label>
      On for: <input type="text" value={ttf.on_for}
        onChange={e => dispatch({ t: 'setPanelStateField', key: 'on_for', value: e.target.value })} />
    </label><br />
    <label>
      Off for: <input type="text" value={ttf.off_for}
        onChange={e => dispatch({ t: 'setPanelStateField', key: 'off_for', value: e.target.value })} />
    </label><br />
    <button onClick={e => dispatch({ t: 'saveModifyPanel' })}>Apply</button>
  </span>;
}

function renderButtonedBlockEditor(ttf: ButtonedTileFields, dispatch: Dispatch): JSX.Element {
  return <span>
    <label>
      X-coord <input type="text" value={ttf.x}
        onChange={e => dispatch({ t: 'setPanelStateField', key: 'x', value: e.target.value })} />
    </label><br />
    <label>
      Y-coord <input type="text" value={ttf.y}
        onChange={e => dispatch({ t: 'setPanelStateField', key: 'y', value: e.target.value })} />
    </label><br />
    <button onClick={e => dispatch({ t: 'saveModifyPanel' })}>Apply</button>
  </span>;
}

function renderDoorEditor(ttf: DoorTileFields, dispatch: Dispatch): JSX.Element {
  return <span>
    <label>
      Destination <input type="text" value={ttf.destinationLevel}
        onChange={e => dispatch({ t: 'setPanelStateField', key: 'destinationLevel', value: e.target.value })} />
    </label><br />
    <button onClick={e => dispatch({ t: 'saveModifyPanel' })}>Apply</button>
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
    const ps = toolState.panelState;
    if (ps.t == 'timed') {
      content = renderTimedBlockEditor(ps, dispatch);
    }
    else if (ps.t == 'buttoned') {
      content = renderButtonedBlockEditor(ps, dispatch);
    }
    else if (ps.t == 'door') {
      content = renderDoorEditor(ps, dispatch);
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

  const levelPicker = <div className="level-picker">
    <b>{state.game.currentLevel}</b>
    <input onKeyDown={(e) => {
      if (e.code == 'Enter') {
        dispatch({ t: 'setCurrentLevel', name: e.currentTarget.value });
      }
    }} ></input>
    <em>{JSON.stringify(state.iface.bufferedMoves)}</em>
  </div>;

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
    {levelPicker}
  </div>;
}
