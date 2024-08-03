import { FRAME_DURATION_MS } from './constants';
import { logger } from './logger';
import { getOverlayForSave } from './model';
import { Dispatch, Effect } from './reduce';
import { State } from './state';

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
