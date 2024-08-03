import * as React from 'react';
import { logger } from './logger';
import { Dispatch } from './action';

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
