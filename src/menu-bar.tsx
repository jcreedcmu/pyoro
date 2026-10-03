import * as React from 'react';
import { Dispatch } from './action';
import { TouchButton } from './touch-button';

/**
 * The bar across the top of the screen on a touch device. It holds the
 * actions that are not motion, so that a thumb aiming for a direction
 * cannot reach them: restarting the level, recentering the view, and
 * the settings dialog.
 */
export function MenuBar(props: { dispatch: Dispatch, gearUrl: string }): JSX.Element {
  const { dispatch, gearUrl } = props;

  return <div className="menu-bar">
    <div className="menu-bar-group">
      <TouchButton className="menu-button" title="restart level"
        press={() => dispatch({ t: 'doMove', move: 'reset' })}>⟳</TouchButton>
      <TouchButton className="menu-button" title="recenter view"
        press={() => dispatch({ t: 'doMove', move: 'recenter' })}>⊙</TouchButton>
    </div>
    <TouchButton className="menu-button" title="settings"
      press={() => dispatch({ t: 'openSettings' })}>
      <img className="menu-gear" src={gearUrl} />
    </TouchButton>
  </div>;
}
