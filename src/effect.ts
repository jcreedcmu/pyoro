import { Dispatch } from './action';
import { FRAME_DURATION_MS } from './constants';
import { LevelData } from './level';
import { logger } from './logger';
import { getAllLevels } from './model';
import { State } from './state';

export type Effect =
  | { t: 'scheduleFrame' }
  | { t: 'saveOverlay' }
  ;

export function doEffect(state: State, dispatch: Dispatch, e: Effect) {
  switch (e.t) {
    case 'scheduleFrame':
      setTimeout(() => { dispatch({ t: 'nextFrame' }); }, FRAME_DURATION_MS);
      break;
    case 'saveOverlay':
      const levels: Record<string, LevelData> = getAllLevels(state.game);
      const req = new Request('/save', {
        method: 'POST',
        body: JSON.stringify(levels),
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
