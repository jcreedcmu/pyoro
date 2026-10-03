import * as React from 'react';
import { Dispatch } from './action';
import { ControlPadSetting } from './state';
import { TouchButton } from './touch-button';
import { Move } from './types';

/**
 * Whether to show the pad, given the player's preference. 'auto' asks
 * the browser whether the primary pointer is a finger.
 */
export function useShowControlPad(setting: ControlPadSetting): boolean {
  const [coarse, setCoarse] = React.useState(
    () => typeof matchMedia == 'function' && matchMedia('(pointer: coarse)').matches);

  React.useEffect(() => {
    if (typeof matchMedia != 'function')
      return;
    const mq = matchMedia('(pointer: coarse)');
    const onChange = () => { setCoarse(mq.matches); };
    mq.addEventListener('change', onChange);
    return () => { mq.removeEventListener('change', onChange); };
  }, []);

  switch (setting) {
    case 'on': return true;
    case 'off': return false;
    case 'auto': return coarse;
  }
}

/**
 * The directional pad, at the bottom of the screen where a thumb
 * reaches it. Nothing else lives here: actions a misplaced thumb
 * shouldn't trigger are up in the menu bar instead.
 */
export function ControlPad(props: { dispatch: Dispatch }): JSX.Element {
  const { dispatch } = props;

  function dir(move: Move, label: string): JSX.Element {
    return <TouchButton className="pad-button" repeat={true}
      press={() => dispatch({ t: 'doMove', move })}>{label}</TouchButton>;
  }

  return <div className="control-pad">
    <div className="control-pad-dirs">
      {dir('up-left', '↖')}
      {dir('up', '↑')}
      {dir('up-right', '↗')}
      {dir('left', '←')}
      {dir('down', '↓')}
      {dir('right', '→')}
    </div>
  </div>;
}
