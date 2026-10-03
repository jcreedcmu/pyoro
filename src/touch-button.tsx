import * as React from 'react';

// A player move animation is 4 frames, so repeating a bit slower than
// that gives each move time to land before the next one starts.
const REPEAT_DELAY_MS = 350;
const REPEAT_INTERVAL_MS = 150;

type TouchButtonProps = {
  /** What the button does. Called once per press, and again per repeat. */
  press: () => void,
  className: string,
  title?: string,
  repeat?: boolean,
  children: React.ReactNode,
};

/**
 * A button that fires on pointerdown rather than click, so that it
 * answers a touch immediately, and that takes the pointer so a finger
 * sliding off it still counts as a release.
 */
export function TouchButton(props: TouchButtonProps): JSX.Element {
  const { press, className, title, repeat, children } = props;
  const timers = React.useRef<{ delay?: number, repeat?: number }>({});
  const [pressed, setPressed] = React.useState(false);

  function cancelTimers() {
    clearTimeout(timers.current.delay);
    clearInterval(timers.current.repeat);
    timers.current = {};
  }

  React.useEffect(() => cancelTimers, []);

  function release(e: React.PointerEvent) {
    e.stopPropagation();
    cancelTimers();
    setPressed(false);
  }

  function begin(e: React.PointerEvent) {
    // Suppressing the default keeps focus on the canvas, which is where
    // keydowns have to arrive for the keyboard to keep working. Stopping
    // propagation keeps the tap away from the game's own document-level
    // pointerdown listener.
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setPressed(true);
    press();
    if (repeat) {
      timers.current.delay = window.setTimeout(() => {
        timers.current.repeat = window.setInterval(press, REPEAT_INTERVAL_MS);
      }, REPEAT_DELAY_MS);
    }
  }

  return <button
    className={pressed ? `${className} pressed` : className}
    title={title}
    onPointerDown={begin}
    onPointerUp={release}
    onPointerCancel={release}
    onLostPointerCapture={release}
    onContextMenu={e => { e.preventDefault(); }}
  >{children}</button>;
}
