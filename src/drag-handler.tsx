import * as React from 'react';
import { logger } from './debug';
import { Dispatch } from './action';

export function DragHandler(props: { dispatch: Dispatch }): JSX.Element {
  const { dispatch } = props;
  function handlePointerMove(e: PointerEvent) {
    if (!e.isPrimary)
      return;
    dispatch({ t: 'mouseMove', point: { x: e.clientX, y: e.clientY } });
  }
  function handlePointerUp(e: PointerEvent) {
    if (!e.isPrimary)
      return;
    dispatch({ t: 'mouseUp' });
  }
  React.useEffect(() => {
    logger('chatty', 'installing drag event handlers');
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    // A touch can be taken away from us by the browser or the system,
    // which ends the drag with no pointerup to match the pointerdown.
    document.addEventListener('pointercancel', handlePointerUp);
    return () => {
      logger('chatty', 'uninstalling drag event handlers');
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);
    }
  }, []);
  return <span />;
}
