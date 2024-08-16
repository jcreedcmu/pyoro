import { Dispatch } from './action';
import { FRAME_DURATION_MS } from './constants';
import { LevelData } from './level';
import { logger } from './logger';
import { getAllLevels } from './model';
import { soundService } from './sound';
import { State } from './state';

export type Effect =
  | { t: 'scheduleFrame' }
  | { t: 'saveOverlay' }
  | { t: 'soundEffect', sound: SoundEffect };
;

export function doEffect(state: State, dispatch: Dispatch, effect: Effect) {
  switch (effect.t) {
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
    case 'soundEffect': doSoundEffect(effect.sound); return;
  }
}

export type SoundEffect =
  | { t: 'click' }
  | { t: 'beep' }
  | { t: 'setGain', gain: number }
  ;

export function doSoundEffect(se: SoundEffect): void {
  switch (se.t) {
    case 'click': soundService.click(); return;
    case 'beep': soundService.beep(); return;
    case 'setGain': soundService.setGain(se.gain); return;
  }
}
