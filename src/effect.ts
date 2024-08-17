import { Dispatch } from './action';
import { FRAME_DURATION_MS } from './constants';
import { LevelData } from './level';
import { logger } from './logger';
import { getAllLevels } from './model';
import { getSoundService } from './sound';
import { MainState, State } from './state';

export type Effect =
  | { t: 'scheduleFrame' }
  | { t: 'saveOverlay' }
  | { t: 'startSound' }
  | { t: 'soundEffect', sound: SoundEffect };
;

export function doEffect(state: State, dispatch: Dispatch, effect: Effect) {
  switch (state.t) {
    case 'main':
      const mstate = state.state;
      switch (effect.t) {
        case 'scheduleFrame':
          setTimeout(() => { dispatch({ t: 'nextFrame' }); }, FRAME_DURATION_MS);
          break;
        case 'saveOverlay':
          const levels: Record<string, LevelData> = getAllLevels(mstate.game);
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
        case 'startSound': getSoundService(); return;
      }
  }
}

export type SoundEffect =
  | { t: 'click' }
  | { t: 'beep' }
  | { t: 'setGain', gain: number }
  ;

export function doSoundEffect(se: SoundEffect): void {
  switch (se.t) {
    case 'click': getSoundService().click(); return;
    case 'beep': getSoundService().beep(); return;
    case 'setGain': getSoundService().setGain(se.gain); return;
  }
}
