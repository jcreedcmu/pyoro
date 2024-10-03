import * as CSS from 'csstype';
import * as React from 'react';
import { Dispatch } from './action';
import { DragHandler } from './drag-handler';
import { keyFromCode } from './key';
import { logger } from './debug';
import { ButtonedTileFields, DoorTileFields, MainState, TimedTileFields, ToolState } from './state';
import { renderTestTools } from './test-tools';
import { CanvasInfo, useCanvas } from './use-canvas';
import { imgProm } from './util';
import { drawView, resizeView } from './view';
import { RenameLevel } from './components/rename-level';

type CanvasProps = {
  main: MainState,
  spriteImg: HTMLImageElement | null
};

function passthrough(k: string): boolean {
  return k == 'C-r' || k == 'C-S-i';
}

function cursorOfToolState(toolState: ToolState): CSS.Property.Cursor {
  switch (toolState.t) {
    case 'play_tool': return 'auto';
    case 'hand_tool': return 'grab';
    case 'pencil_tool': return 'cell';
    case 'modify_tool': return 'url(/assets/modify-tool.png) 8 8, auto';
    case 'test_tool': return 'pointer';
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

function renderModifyPanel(state: MainState, dispatch: Dispatch): JSX.Element | null {
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

function renderLevelPicker(state: MainState, dispatch: Dispatch): JSX.Element | undefined {
  if (state.iface.toolState.t != 'pencil_tool')
    return undefined;
  const options = Object.keys(state.game.levels).sort().map(level => {
    return <option value={level}>{level}</option>;
  });
  const onChange: React.ChangeEventHandler<HTMLSelectElement> = e => {
    dispatch({ t: 'setCurrentLevel', name: e.currentTarget.value });
  };
  return <div className="level-picker">
    <select onChange={onChange} value={state.game.currentLevel}>{options}</select>
    <input onKeyDown={(e) => {
      if (e.code == 'Enter') {
        dispatch({ t: 'setCurrentLevel', name: e.currentTarget.value });
      }
    }} ></input>
    <button onMouseDown={e => dispatch({ t: 'openRenameLevel', src: state.game.currentLevel })}>Rename</button>
    <button style={{ marginLeft: '1em' }} onMouseDown={e => dispatch({ t: 'cropLevel', })}>Crop</button>
  </div>;
}

export function repoLink(): JSX.Element {
  const linkSvg = `<a href="https://github.com/jcreedcmu/pyoro" target="_blank">
<svg width="80" height="80"
   viewBox="0 0 250 250"
   style="z-index: 1000; fill:#000; position: absolute; top: 0; border: 0; right: 0;"
   aria-hidden="true">
<path d="M 0 0 L 36.80 36.80 C 36.76 36.83 37.98 37.27 38.33 36.92 L 40.66 34.60 C 36.53 31.71 38.08 28.67 38.08 28.67 C 39.04 26.46 38.56 25.15 38.56 25.15 C 38.14 23.04 39.48 24.41 39.48 24.41 C 40.73 25.88 40.16 27.93 40.16 27.93 C 39.43 30.80 41.20 32.21 42.48 32.81 L 42.78 32.51 C 43.80 31.74 44.76 31.48 45.50 31.55 C 42.81 28.16 40.79 23.80 46.01 18.56 C 47.51 17.08 49.27 16.38 51.10 16.32 C 51.29 15.80 52.22 13.95 54.84 12.83 C 54.84 12.83 56.35 13.60 57.21 17.98 C 58.59 18.75 59.90 19.77 61.08 20.92 C 62.23 22.07 63.26 23.42 64.03 24.83 C 68.41 25.66 69.21 27.16 69.21 27.16 C 68.06 29.79 66.20 30.72 65.72 30.91 C 65.63 32.76 64.95 34.49 63.45 36 C 58.20 41.24 53.85 39.19 50.46 36.51 C 50.52 37.40 50.14 38.68 48.86 39.96 L 45.11 43.67 C 44.73 44.06 45.31 45.40 45.37 45.37 L 80 80 L 80 0 L 0 0 z " transform="scale(3.125)"/></svg></a>`;
  return <div dangerouslySetInnerHTML={{ __html: linkSvg }}></div>;
}

export function MainComp(props: { state: MainState, dispatch: Dispatch }): JSX.Element {
  const { state, dispatch } = props;

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
    dispatch({ t: 'mouseDown', point: { x: e.clientX, y: e.clientY }, buttons: e.buttons });
  }

  function handleMouseWheel(e: WheelEvent) {
    dispatch({ t: 'mouseWheel', delta: e.deltaY });
  }

  function handleResize(e: UIEvent) {
    dispatch({ t: 'resize', vd: resizeView(mc.current!.c) });
  }

  // State
  const [spriteImg, setSpriteImg] = React.useState(null as (null | HTMLImageElement));
  const [cref, mc] = useCanvas(
    { main: state, spriteImg: spriteImg }, render,
    [
      state.game,
      state.iface,
      state.anim,
      // XXX state.effects used to be here. I think it was safe to remove?
      // It updates every time we reduce, now, which is too often for
      // mouse position caching.
      spriteImg,
      state.iface.vd
    ],
    ci => {
      // Not sure why I need to delay this. But if I don't,
      // clicking on the title card doesn't keep focus on the canvas.
      setTimeout(() => { ci.c.focus(); }, 0);
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
    document.addEventListener('wheel', handleMouseWheel);
    document.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); });
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

  const settingsButtonStyle: React.CSSProperties = {};
  if (state.iface.toolState.t == 'pencil_tool') {
    settingsButtonStyle.bottom = '3.5em';
  }
  else {
    settingsButtonStyle.bottom = '0';
  }

  const renameLevelModal = state.modals.renameLevel ? <RenameLevel dispatch={dispatch} data={state.modals.renameLevel} levels={Object.keys(state.game.levels)} /> : undefined;

  return <div>
    <canvas style={{ cursor: canvasCursor }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      ref={cref}
      onMouseMove={e => dispatch({ t: 'cacheMouse', p: { x: e.clientX, y: e.clientY } })}
    />
    {dragHandler}
    {renderModifyPanel(state, dispatch)}
    {renderLevelPicker(state, dispatch)}
    {renameLevelModal}
    {renderTestTools(state, action => dispatch({ t: 'testToolsAction', action }))}
    {state.iface.toolState.t == 'play_tool' ? repoLink() : undefined}
    <div className="settings-button" style={settingsButtonStyle} onMouseDown={() => { dispatch({ t: 'openSettings' }); }}><img src="assets/gear.svg" width="48px" /></div>
  </div>;
}
