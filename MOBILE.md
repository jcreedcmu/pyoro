Mobile Support Plan
===================

Goal: make the game playable on a phone through the browser, with no
native build. Target is portrait orientation: a menu bar across the
top, the play field in the middle, and an on-screen direction pad along
the bottom.

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
carries `origin`, `wsize`, and `zoom`, where `zoom` is css pixels per
canvas unit, plus `clientOrigin`, where the canvas sits in the window.
`resizeView` sizes the canvas to the box it has been given and centers
the field in it. `drawView` applies a single
`scale(devicePixelRatio * zoom)` and everything inside `drawScaled`
works in canvas units. Pointer coordinates arrive in css pixels, and
`canvasPointOfClientPoint` takes off `clientOrigin` and divides by
`zoom`.

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
`pointercancel`. `src/touch-button.tsx` has the one button both touch
overlays are built from: it fires on `pointerdown` so it answers a
touch at once, takes the pointer so a finger sliding off still counts
as a release, and suppresses the default to leave focus on the canvas.

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

Clamp zoom between `MIN_CAMERA_ZOOM` of a half, which shows 48x36
tiles, enough for the whole of the largest level, and
`MAX_CAMERA_ZOOM` of 4, where a tile covers 64 field pixels.

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
the reducer stays pure and `clampCamera` decides what is in range.

The only thing the clamp insists on is that the cell the player stands
in is fully on screen. Where that leaves the view relative to the
level's bounds is not its business, so a player can look at as much
empty space as they like.

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

`recenter`, bound to `c` and to a menu bar button, also restores the
default zoom. That needs `lerpTranslates` in `src/transforms.ts`
generalized to interpolate scale as well, since it currently keeps the
first argument's scale and asserts the two match.

Step 4: the bands
-----------------

The window divides into bands, stacked top to bottom:

- the menu bar, `--topbar-height` of 48px plus `--safe-area-top`,
- the play field, which stretches,
- the player's status, `--status-height` of 32px,
- the control pad, `--pad-fraction` of 20% plus `--safe-area-bottom`.

On anything but a touch device only the middle two appear, which leaves
the status bar pinned along the bottom of the window.

`.app-root` is `position: fixed` with all four sides pinned, which is
the viewport itself, so there is no choice of height unit to get wrong.
A flex column divides it, `flex: 1 1 0` with `min-height: 0` on the
play band and a `flex-basis` on each of the others, so the bands always
add up to the window and the fixed ones cannot be pushed off the end of
it.

Nothing reads a window height. `resizeView` is handed the play band's
own `getBoundingClientRect`, measured by a `ResizeObserver` on the
band, which covers every reason that box can change: the window
resizing, the url bar sliding, the orientation turning, a band coming
or going. The canvas is `position: absolute` inside the band, so its
own size cannot feed back into the band's and set the observer off
again.

Mixing two notions of window height is what went wrong before this.
The canvas was sized from `innerHeight` while the bars were positioned
inside a box that was `100dvh`, and those are not the same number while
the url bar is moving or a window is being resized, so the pad came
adrift of the bottom of the screen and the field overran its share.
Measuring one element removes the second opinion.

The play band is also the positioning frame for everything drawn over
the field: the editor's panels and level picker, the test tools, the
github banner, the desktop settings gear. Their `top` and `bottom` mean
the field's edges rather than the window's, so the level picker sits
above the status bar rather than behind it. Modals are the exception
and stay outside the bands, `position: fixed` so they cover the
viewport.

The status bar is its own canvas, drawn by `drawStatus`. The inventory
used to be a strip of the play field, drawn one tile below it and
scaled with the field's zoom, which on a phone left it about 16 css
pixels tall. On its own canvas its slots are as tall as the band, so
they are legible whatever the field is zoomed to. Only `teal_fruit` and
`coin` exist, so 2 of the `NUM_INVENTORY_ITEMS` slots are ever drawn,
and the number beside the fruit is its remaining ticks counting down
from 30 rather than a quantity.

The six directions divide up the pad: a grid of three `1fr` columns by
two `1fr` rows filling its content box, with 6px of padding and the
home indicator counted as extra height on the band rather than taken
out of the pad's share. They come out wider than tall, which is what a
short wide band gives, rather than square with the width left over.
Glyphs are `3.5dvh`.

Menu bar buttons keep a fixed 40 pixels, since they are chrome rather
than controls. The gear art is a flat `#777` shape, so in the menu bar
it is flattened and lifted to the buttons' own foreground with
`filter: brightness(0) invert(0.93)`. The desktop gear, which is not in
a button, keeps its original color.

What is in which band matters. The pad holds the six directions and
nothing else, so a thumb aiming for a direction cannot land on
something that restarts the level. `reset`, `recenter`, and the
settings gear go in the menu bar instead, at the far end of the screen
from where the thumbs are. The github banner is hidden on touch
entirely; it sits exactly where the menu bar goes and is not worth a
tap target on a phone.

Step 5: platform details
------------------------

- Audio. iOS only permits an `AudioContext` to start inside a user
  gesture handler, and `useEffectfulReducer` runs effects in a microtask
  after the handler has returned. So `startAudio` in `src/sound.ts`
  resumes the context and starts the music, and the title card calls it
  straight from its click, before dispatching. The `startSound` effect
  calls the same function, which does nothing the second time.
- Viewport height. iOS Safari changes `innerHeight` as the url bar
  shows and hides, so `visualViewport` gets a resize listener alongside
  the one on `window`.
- Home screen. `public/manifest.json` declares `display: standalone` and
  portrait orientation, with the apple-specific meta tags for the same,
  and `black-translucent` so the game draws under the status bar. The
  icons are nearest-neighbor upscales of `assets/icon.png`, which is
  16x16, at 12x and 32x; replace them with real artwork if the pixel
  look is not wanted at that size.
- Device testing. `make serve-lan` binds the dev server to all
  interfaces and prints the address to browse to from a phone on the
  same network. Note that this exposes the `/save` endpoint, which
  rewrites `src/level-data.ts`, to everything on that network.

Status
------

All of the above is implemented. What is left is verifying it on real
hardware, which is the part nothing here can settle.

Testing
-------

Chrome device emulation covers layout and the camera math. Check both a
390x844 dpr 3 and a 375x667 dpr 2 profile, since those used to land on
opposite sides of the zoom cliff. Look for seams between tiles while
pinching slowly, which is the failure mode the lattice rounding in step
1 prevents.

On a real device, over the local network:

- Music starts on the title card tap, and sound effects play.
- One finger pans the field, two pinch it, and a pad press brings the
  player back into view.
- The view can be panned well off the level and the player's cell still
  stays on screen.
- The bands keep their proportions as the url bar shows and hides, and
  after the window is resized.
- The status bar shows the fruit's countdown at a legible size.
- Added to the home screen, the game opens without browser chrome and
  the top of the field clears the notch.
