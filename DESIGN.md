# Mount Pyoro Design Doc

## Elevator Pitch

Mount Pyoro is a puzzle platformer with discrete time and space.

## Influences

### Platforming

- [Celeste](https://store.steampowered.com/app/504230/Celeste/)
- [Leap Year](https://store.steampowered.com/app/2951770/Leap_Year/)
- Classic platformers like Mario, Sonic, etc.

### Puzzles

- [Isles of Sea and Sky](https://store.steampowered.com/app/1233070/Isles_of_Sea_and_Sky/)
- [Baba is You](https://store.steampowered.com/app/736260/Baba_Is_You/)
- [Stephen's Sausage Roll](https://store.steampowered.com/app/353540/Stephens_Sausage_Roll/)
- [Escape](http://escape.spacebar.org/)

### Misc

- [Time Badgers](https://github.com/gwillen/timebadgers)

## Goals

### Narrative Structure

- The world is broken up into "rooms".

- The game should feel somewhat "open-world". It may be linear-ish in
  parts, but there should be some branching freely chosen by the
  player.

- The game is won by gaining access to the final room.

### Physics/"Feel"

- There is a notion of gravity, and therefore a notion of "up". It
  should be challenging --- and therefore rewarding --- to get to
  "high-up" stuff.

- There should ways the player can move that feel "fun" or "exciting"
  or "surprising" in and of themselves, even when performed in
  discrete steps of time. A core motivation for this game is that I
  want to be able feel the cool feelings of playing Celeste --- the
  feeling of making just the right dash or dodge or getting a tricky
  long jump perfect --- despite the fact that I suck at
  platformers.

- This is a difficult constraint, because one thing that makes Celeste
  exciting is the skill gap between planning and execution of a plan.
  I don't want to make it actually hard to execute a plan, but I do
  want to cultivate the *illusion* of drama, (tension,
  time-sensitiveness, the player being in danger) as much as possible.

### Puzzles

- Puzzles ideally come from unexpected interactions between puzzle
  mechanisms, unexpected corner cases thereof. Some of my favorite
  puzzles in Stephen's Sausage Roll and Baba is You were of this form.

- <details>
    <summary>🚨 Spoilers 🚨 for Leap Year</summary>

    Leap Year's treatment of fall damage is especially relevant to
    this point: players *expect* monotonicity in that if falling from
    height X kills them, then surely falling from height 2X will as
    well. I find Leap Year's violation of this assumption very clever.

  </details>

- Mechanisms are taught ideally wordlessly, by demonstration.

### Legibility

- Invisible state is not entirely forbidden, but as much as possible,
  prefer mechanisms where all the information a player needs to
  understand is on the screen.

- For example, we prefer alternative 2 to alternative 1:
  - alternative 1 is a button could come equipped with data of a destination
    tile that it affects, or tiles could conversely come equipped with
    data of which button controls them
  - alternative 2 is a series of buttons of different colors, which affect
    the solidity of all tiles of the same color (which are still visible in
    some form, even when not solid)

- Where invisible data remains, try to minimize the amount and complexity
  of experimentation needed to reveal the data. For example, doors have
  invisible data of what their destination room is, but it only requires
  passing through the door to find out where it goes.

### Animation

- We show animations to transition from one discrete-time game state
  to the next, but they are just there to make things more
  understandable to the player. The game is mechanically the same game
  without animations. The code should be structured to make this
  separation reasonably clear.

- If a player tries to make a move during the playing of an animation,
  we should skip to the end of the animation and start the next move.
  An alternative considered and implemented was buffering moves, but
  the above approach feels snappier.

- No animations should be playing passively while the player is not
  inputting moves. I had considered showing conveyor belts animating,
  but I think I would find it distracting.

### Player Choices

- The number of per-move player choices available at any given time
  should be fairly small, probably fewer than 10.

- Player choices should for the most part, be limited to choosing a
  direction of motion (or, perhaps, standing still and waiting) This
  could be augmented with a small set of "modifiers". For example, a
  "dash" move-right might be distinct from a normal move-right.

- OPEN: Should single-move undo be supported?
    - Argument for supporting: most puzzle games do
    - Argument for not supporting: might enhance "drama" if mistakes are a little consequential.

### Intra-Room Geometry

- Each room is of a finite size.

- The exterior of a room should feel more like "impassable blocks"
  rather than "empty space". This is to support the well-definedness
  of mechanics that involve an object moving as many times as possible
  until a collision occurs.

### Inter-Room Geometry

- OPEN: Should room edges cause transitions?

- It's okay for room navigation to be a *little* confusing, but shouldn't
  be completely baffling. It's okay if the player needs to keep a map.
  The geometry of IoSaS's air island was a bit more disjointed than I'd like.

- Some breadcrumbs should be provided to help mapping. Perhaps:
  - every room has a unique name.
  - doors tend to be close to the cardinal directions.
  - graphics suggests coherent "biomes" which help memorability.

### Room State

- As much as possible, a room's state is entirely reset if you leave and come back.

- Exceptions to "a room's state is entirely reset" are intentionally
  limited, but they are the foundation of all progress in the game.
  Isles of Sea and Sky represents a good standard here.

- A player may decide to reset a room's state at any time.

- In IoSaS, certain barriers may be removed, and certain items may be acquired,
  which survive the room being reset. These are perceived by the player as
 *monotonic progress forward* in the game.

- The "barriers being removed is unambiguously progress" is more subtle for
  a game with "gravity" compared to a top-down puzzler like IoSaS, because
  a block's *presence* might mean a platform that can be jumped on to
  gain access elsewhere. Care should be taken during puzzle design
  to ensure this doesn't happen in practice.

### Development

- Game levels/rooms should serve as integration tests.

- There should be pretty well-covering unit tests for the game
  mechanics, at a finer resolution than that.

## Non-Goals

- At least for now, I'm not planning on managing a repository of user-designed levels.
