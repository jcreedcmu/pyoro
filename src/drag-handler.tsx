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

export function DragHandler(props: { dispatch: Dispatch }): JSX.Element {
  const { dispatch } = props;
  function handleMouseMove(e: MouseEvent) {
    dispatch({ t: 'mouseMove', point: { x: e.clientX, y: e.clientY } });
  }
  function handleMouseUp(e: MouseEvent) {
    dispatch({ t: 'mouseUp' });
  }
  React.useEffect(() => {
    logger('chatty', 'installing drag event handlers');
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      logger('chatty', 'uninstalling drag event handlers');
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
  }, []);
  return <span />;
}
