Mobile Support Plan
===================

Goal: make the game playable on a phone through the browser, with no
native build. Target is portrait orientation, with the play field in
the upper part of the screen and an on-screen direction pad filling the
space below it.

Mobile supports play mode only. Every route into the editor (`Shift+D`,
`n`, `h`, and rebinding through the settings dialog) requires a physical
keyboard, so on a touch device the game comes up in play mode and stays
there. Editor and debug code stays in the bundle.

Desktop behavior is unchanged throughout. On a screen with room to
spare the field draws at `SCALE` with the camera at its default scale,
exactly as it does now.

Background
----------

The play field is `NUM_TILES` 24x18 tiles of `TILE_SIZE` 16 game pixels
drawn at `SCALE` 2, so it occupies 768x576 canvas units. `ViewData`
carries `origin`, `wsize`, and `zoom`, all in canvas units, where `zoom`
is css pixels per canvas unit. `resizeView` sizes the canvas to the
window and places the field inside an available rect. `drawView`
applies a single `scale(devicePixelRatio * zoom)` and everything inside
`drawScaled` works in canvas units. Pointer coordinates arrive in css
pixels and are divided by `zoom` by `canvasPointOfClientPoint`.

`world_from_view` is the camera: an SE2 mapping field pixels to world
tiles, with scale `1/TILE_SIZE` and a translation giving the world
coordinate of the field's top left corner. `drawField` derives the
visible world cells by transforming `viewRectInView` through it and
draws each cell through `getCanvasFromWorld`, so the camera can carry
any scale and any fractional translation and the field still draws.
The editor's hand tool already produces fractional translations this way
(`src/model.ts:494`).

Gameplay input is six `MotiveMove` directions (`up`, `down`, `left`,
`right`, `up-left`, `up-right`) plus `reset` and `recenter`. One input
produces one move; time is discrete. `animateViewPort` nudges the camera
when the player approaches the field edge, and `RecenterAnimation` lerps
the camera to center on the player over 4 frames.

Input uses pointer events, which cover mouse, touch, and stylus
uniformly. `src/main-comp.tsx` listens for `pointerdown` on the
document and `src/drag-handler.tsx` for `pointermove`, `pointerup`, and
`pointercancel`. `src/control-pad.tsx` is a React overlay in regular
DOM, rendered below the field, whose buttons dispatch the existing
`{ t: 'doMove', move }` actions.

The play field is not called upon to do anything with gameplay input.
Touch on the field moves the camera, and the pad is the only source of
moves. That split is what keeps the gesture handling free of thresholds
and finger-count arbitration.

Step 1: camera zoom
-------------------

Fitting all 24x18 tiles across a phone leaves each tile about 16 css
pixels wide, half its size on desktop. The field shows fewer world
tiles instead, drawn larger, by scaling the camera rather than the
screen. The field rect keeps its position and size, so screen layout,
the clip rect, and the inventory anchored below the field are all
untouched.

The zoom lives in `world_from_view.scale`, which becomes
`vdiag(1 / (TILE_SIZE * z))` for a camera zoom `z`. No new state is
needed. Two sites currently hardcode the scale and need `z`:

- `src/init-state.ts:42`, the initial camera.
- `centeredWorldFromView` in `src/animation.ts:78`, which also
  hardcodes the centering offset as `NUM_TILES / 2`; at zoom `z` that
  becomes `NUM_TILES / (2 * z)`. Drop its `int()` and center exactly.

Zoom is continuous. The default is expressed as a visible tile count,
`z = NUM_TILES.x / DEFAULT_TILES_VISIBLE_X` with
`DEFAULT_TILES_VISIBLE_X` of 16, so every device shows the same 16x12
tiles of level regardless of screen size and level fairness does not
vary by hardware. On a 390x844 phone that puts a tile at 24 css pixels.
Desktop keeps `z` of 1.

Clamp zoom between a value that frames the current level's `boundRect`
(`getBoundRect`, which handles the 47x36 `prev_start`) and about 4,
where a tile covers 64 field pixels.

Because the camera scale is continuous, the chain from source pixel to
device pixel is non-integer, so the integer floor in `zoomOfAvailSize`
no longer buys anything. Remove it and let `zoom` take the exact fit
value. Keep the cap at `SCALE * devicePixelRatio`, which is what binds
on desktop, so desktop rendering does not change. Removing the floor
also removes a cliff on dpr 2 phones, where a `fit` of 1.95 floored to
1 and drew the field at half the screen width.

Fractional camera scale does need one guard that fractional translation
did not. `cell_rect_in_canvas` (`src/view.ts:215`) computes each cell's
destination rect independently, and at fractional scale adjacent rects
round apart, leaving hairline gaps with stage background showing
through. Round the two edges of each rect to the device pixel lattice
rather than rounding position and size separately: for a canvas-unit
coordinate `v`, use `round(v * devicePixelRatio * zoom) / (devicePixelRatio * zoom)`.
A cell's right edge and its neighbor's left edge then come from the same
expression and meet exactly. Individual tiles land a device pixel wider
or narrower than their neighbors, which is the expected look for pixel
art at fractional scale.

Step 2: touch gestures
----------------------

One finger on the field pans, two pinch to zoom. Both only under
`play_tool`, which is the same guard `useShowControlPad` and
`cursorOfToolState` already use, and which degrades correctly if a
keyboard is paired with a tablet.

Handlers go directly on the `<canvas>` element in `src/main-comp.tsx`
as React pointer props, with a `Map<pointerId, Point>` in a ref. Canvas
level rather than document level means pad taps, which stop propagation
and take pointer capture, never reach them. The document-level
`pointerdown` listener keeps its `isPrimary` filter; the canvas handlers
do not, since the second finger is the point.

Both gestures are the composition already written for the hand tool's
`panDrag` at `src/model.ts:494`, which maps the camera through
`view_from_canvas`, a correction in canvas space, and `canvas_from_view`.
For one finger that correction is the existing `translate`. For two it
is a scale and translate solved from the two pointer pairs: uniform
scale from the ratio of the distances between the fingers, translation
from where the midpoint moved. Replacing `translate(...)` with that
similarity is the only difference between the two cases.

The canvas takes pointer capture so a finger sliding off it keeps
reporting. Gestures dispatch `{ t: 'setCamera', world_from_view }`;
the reducer stays pure. Clamp the resulting camera so the visible world
rect stays inside `boundRect` plus a tile or two of margin, centering
instead on any axis where the level is smaller than the view.

No inertia. It would fight a game whose time is discrete.

Step 3: keeping the player in view
----------------------------------

Panning away from the player and then pressing a direction would move
the player somewhere off screen. Any pad input first brings the player
back: if the player is outside the visible rect inset by a tile or two,
ease the camera the minimum amount that fixes it. Panning then costs
nothing, because the next move undoes it.

`animateViewPort` (`src/model.ts:319`) already implements this rule for
walking off the edge, but it emits fixed steps of one world tile, and
after a manual pan the correction can be many tiles. Change it to
compute the delta and store that in the `ViewPortAnimation`, which
already scales whatever it is given by the frame parameter.

`recenter`, already bound to `c` and to a pad button, also restores the
default zoom. That needs `lerpTranslates` in `src/transforms.ts`
generalized to interpolate scale as well, since it currently keeps the
first argument's scale and asserts the two match.

Step 4: layout split
--------------------

The field takes the top of the window and the pad takes the rest. Give
the pad a minimum height, subtract it from `innerHeight` to get the
field's available rect, and place the field at the top of the window
below `env(safe-area-inset-top)` rather than centered vertically. Pass
the field's bottom edge down to the pad, which spans from there to the
bottom of the window.

This replaces the `ResizeObserver` that measures the pad and the
`padHeightRef` that exists to keep the window resize listener from
closing over a stale height (`src/main-comp.tsx:181-210`). Information
flows one way, from the field's size to the pad's box, instead of
through a measure-then-resize loop.

With the pad owning everything below the field it has considerably more
room than the 176 to 210 css pixels it claims now, so raise
`--pad-button` from `min(72px, 20vw)` to something like
`min(96px, 26vw)` and leave the pad centered in its box. Keep the
settings gear above the pad.

The 4:3 field in a portrait window still leaves vertical space over, but
levels run 4 to 9 tiles tall against the view's 12, so there is no level
content to show there. The pad is the right use of it.

Step 5: platform details
------------------------

- Audio. `getSoundService` constructs the `AudioContext` and calls
  `music.play()` on music the title screen has already downloaded. iOS
  only permits this inside a user gesture handler. The title card click
  supplies the gesture, but the call happens in the effect handler that
  runs after the reducer. If audio does not start on iOS, call
  `audio_context.resume()` directly in the click handler.
- Viewport height. iOS Safari changes `innerHeight` as the URL bar
  shows and hides. The existing `window.resize` handler covers most of
  it; add a `visualViewport` resize listener as well.
- PWA manifest. A small `manifest.json` pointing at the existing
  `public/assets/icon.png`, with `display: standalone`, allows adding
  the game to the home screen and running without browser chrome, which
  is worth real vertical space on a phone.
- Device testing. `make serve-lan` binds the dev server to all
  interfaces and prints the address to browse to from a phone on the
  same network. Note that this exposes the `/save` endpoint, which
  rewrites `src/level-data.ts`, to everything on that network.

Order of work
-------------

Screen zoom, pointer events, the control pad, and steps 1 through 4 are
in place. Step 5 remains.

Testing
-------

Chrome device emulation covers layout and the camera math. Check both a
390x844 dpr 3 and a 375x667 dpr 2 profile, since those used to land on
opposite sides of the zoom cliff. Look for seams between tiles while
pinching slowly, which is the failure mode the lattice rounding in step
1 prevents.

Touch behavior, audio autoplay policy, and URL bar resizing need a real
device, reached over the local network.
