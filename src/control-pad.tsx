import * as React from 'react';
import { Dispatch } from './action';
import { ControlPadSetting } from './state';
import { Move } from './types';

// A player move animation is 4 frames, so repeating a bit slower than
// that gives each move time to land before the next one starts.
const REPEAT_DELAY_MS = 350;
const REPEAT_INTERVAL_MS = 150;

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

type PadButtonProps = {
  move: Move,
  label: string,
  className: string,
  repeat: boolean,
  dispatch: Dispatch,
};

function PadButton(props: PadButtonProps): JSX.Element {
  const { move, label, className, repeat, dispatch } = props;
  const timers = React.useRef<{ delay?: number, repeat?: number }>({});
  const [pressed, setPressed] = React.useState(false);

  function release(e: React.PointerEvent) {
    e.stopPropagation();
    cancelTimers();
    setPressed(false);
  }

  function cancelTimers() {
    clearTimeout(timers.current.delay);
    clearInterval(timers.current.repeat);
    timers.current = {};
  }

  React.useEffect(() => cancelTimers, []);

  function press(e: React.PointerEvent) {
    // Suppressing the default keeps focus on the canvas, which is where
    // keydowns have to arrive for the keyboard to keep working. Stopping
    // propagation keeps the tap away from the game's own document-level
    // pointerdown listener.
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setPressed(true);
    dispatch({ t: 'doMove', move });
    if (repeat) {
      timers.current.delay = window.setTimeout(() => {
        timers.current.repeat = window.setInterval(
          () => { dispatch({ t: 'doMove', move }); }, REPEAT_INTERVAL_MS);
      }, REPEAT_DELAY_MS);
    }
  }

  return <button
    className={pressed ? `${className} pressed` : className}
    onPointerDown={press}
    onPointerUp={release}
    onPointerCancel={release}
    onLostPointerCapture={release}
    onContextMenu={e => { e.preventDefault(); }}
  >{label}</button>;
}

/**
 * The pad fills the window below the play field. `top` is the field's
 * bottom edge, and `height` is what is left under it, which is what
 * the button size is derived from in css.
 */
export function ControlPad(props: { dispatch: Dispatch, top: number, height: number }): JSX.Element {
  const { dispatch, top, height } = props;

  function dir(move: Move, label: string): JSX.Element {
    return <PadButton move={move} label={label} className="pad-button"
      repeat={true} dispatch={dispatch} />;
  }

  function util(move: Move, label: string, title: string): JSX.Element {
    return <PadButton move={move} label={label} className="pad-button pad-util"
      repeat={false} dispatch={dispatch} />;
  }

  const style = { top: `${top}px`, '--pad-height': `${height}px` } as React.CSSProperties;

  return <div className="control-pad" style={style}>
    <div className="control-pad-row">
      <div className="control-pad-dirs">
        {dir('up-left', '↖')}
        {dir('up', '↑')}
        {dir('up-right', '↗')}
        {dir('left', '←')}
        {dir('down', '↓')}
        {dir('right', '→')}
      </div>
      <div className="control-pad-utils">
        {util('reset', '⟳', 'restart level')}
        {util('recenter', '⊙', 'recenter view')}
      </div>
    </div>
  </div>;
}
