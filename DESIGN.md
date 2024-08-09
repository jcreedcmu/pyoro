# Mount Pyoro Design Doc

## Elevator Pitch

Mount Pyoro is a puzzle platformer with discrete time and space.

## Terms

MOSTLY means a prescription is not expected to be applicable without exception,
but exceptions probably should be justified by some other consideration.

## Influences

### Platforming

- [Celeste](https://store.steampowered.com/app/504230/Celeste/)
- [Leap Year](https://store.steampowered.com/app/2951770/Leap_Year/)
- [Spelunky](https://store.steampowered.com/app/239350/Spelunky/)
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

- The game is won by gaining access to the final room. In general, the
  carrot that is offered to players is gaining access to places. It is desirable
  to tease the existence of places before they're accessible.

### General Physics

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

- Barring discontinuous motion like teleporters, the player should
  only move one cell per "tick", (allowing diagonals) even when
  notionally they have high "velocity". This notion of "high velocity"
  should translate instead to a notion of "collision with high force"
  which could be advantageous (e.g. to break certain kinds of blocks)
  or disadvantageous (e.g. leading to fall damage).

- Physics should be invariant to left-right flipping, but is very much not
  required to be invariant to up-down flipping, because of gravity.

### Low-Level Physics

- All entities, player and otherwise, should MOSTLY have the same
  physics interactions with the rest of the world.

- Each entity has in its state a **impetus**, an integer valued vector
  relative to that entity. This isn't really a velocity vector, but it
  is somewhat like one.

#### How the Physics Update Works

- For each entity, the tick computation
  - takes as input the entity's **impetus**
  - takes as input where the entity is trying to move, if anywhere; call
    this its **motive**.
  - takes other data pertaining to the local neighborhood, e.g. whether
    the entity is currently **supported** beneath by a solid block.
  - returns a **destination**, a place where it can move
    if no other entities tried to move there.
  - returns what the entity's internal state is in the next
    step, including impetus.
  - returns some information about which tiles the entity's motion
    applies "forces" to. In MOST situations this should be at most one
    tile.

- After all entities have been moved to their destination, resolve
  collisions. Some types of entities might have precedence over
  another. "Bouncing" entities is not allowed at this stage, only
  entity destruction. Mutual destruction is always an option if there
  are equal-precedence entities colliding.

#### Some Constraints on Tick Update

The tick computation may have more internal structure, but the below
statements are about what the result is at the end.

- In the absence of any barriers, when an entity wants to move up,
  laterally, or up-diagonally from a normal supported state, with zero
  impetus, its destination coincides with its motive, with a
  resultant zero impetus.

- In the absence of any barriers, when an entity wants to move from a
  unsupported state, with zero horizontal impetus, its destination coincides
  horizontally with its motive, with a resultant zero horizontal impetus.
  - Its destination moves up if its prior vertical impetus was up
  - Its destination moves down if its prior vertical impetus was down or zero

- In order to resolve barriers, near the end of the tick update, we
  try the following destinations in order, looking for the first "clear" one:
  - the original motion
  - the original motion with the vertical component of motion and impetus zeroed
  - the original motion with the horizontal component of motion and impetus zeroed

- The original motion is not considered "clear" unless at least one of
  the projected motions is clear, i.e. we can't slip diagonally
  through cracks.

- OPEN: Do I want to say "The original motion is not considered
  "clear" unless the vertical motion is clear"?

- As a corollary to the above points, a player can walking continuously
  across a floor with at most one-tile gaps, with a constant impetus of (0,0).

### Puzzles

- Puzzles MOSTLY come from unexpected interactions between puzzle
  mechanisms, and/or unexpected corner cases thereof. Some of my
  favorite puzzles in Stephen's Sausage Roll and Baba is You were of
  this form.

- <details>
    <summary>🚨 Spoilers 🚨 for Leap Year</summary>

    Leap Year's treatment of fall damage is especially relevant to
    this point: players *expect* monotonicity in that if falling from
    height X kills them, then surely falling from height 2X will as
    well. I find Leap Year's violation of this assumption very clever.

  </details>

- Mechanisms are MOSTLY taught without explicit tutorial or description,
  by existing puzzles.

### Legibility

- State should MOSTLY be immediately legible from information on the screen.

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

- Exceptions can be made when there is a way for the player to
  methodically figure out what the current state is from careful
  observation. This can be an effective way of creating puzzles where
  the solution is getting into parts of state space that superficially
  resemble non-useful states, but where the hidden state is different.

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

- Player choices should MOSTLY be limited to choosing a
  direction of motion (or, perhaps, standing still and waiting) This
  could be augmented with a small set of "modifiers". For example, a
  "dash" move-right might be distinct from a normal move-right.

- OPEN: Should single-move undo be supported?
    - Argument for supporting: most puzzle games do
    - Argument for not supporting: might enhance "drama" if mistakes are a little consequential.

### Tiles and Entities

By "tiles" I mean things that are represented with a map from grid
locations to some type `Tile`. By "entities" I mean things whose
locations are represented with a map from some type `EntityId` to grid
locations.

- The game state should MOSTLY tiles. A limited amount of state at any
  given time should be entities.

- Physics should MOSTLY be invariant to any intrinsic notion of
  entity ordering, but this may be hard to achieve in practice.
  This is a corollary of the desire for legibility; the ordering
  of entities is typically invisible.
  - It is, however, ok to order entities by height in the world, if physics
    rules can be devised to be "horizontally concurrent" while having some
    vertical asymmetry.
  - It is somewhat ok to order entities by the order in which they were created,
    if they were created during play.

- It is ok for a logical "thing" in the game to change during play
  from tile to entity and back, perhaps even retaining the same visual
  representation.

- No two entities should occupy the same place at the same time.
  If this would occur, prefer deleting all such colocated entities and replacing
  them with some sort of generic "crash"/"collision"/"explosion" entity or tile.

- For the most part, tiles should obey a principle of subconservation.
  They may be moved or destroyed (i.e. replaced with empty) but not created.

### Intra-Room Geometry

- Each room is of a finite size.

- The exterior of a room should feel more like "impassable blocks"
  rather than "empty space". This is to support the well-definedness
  of mechanics that involve an object moving as many times as possible
  until a collision occurs. This also prevents having to deal with a
  player (or other entity) falling endlessly.

### Inter-Room Geometry

- OPEN: Should room edges cause transitions?

- Navigation should be MOSTLY straightforward and comprehensible. It's
  okay for room navigation to be a *little* confusing. It's okay if
  the player needs to keep a map. The geometry of IoSaS's air island
  was a bit more disjointed than I'd like.

- Breadcrumbs should be provided to help mapping. Perhaps:
  - every room has a unique name.
  - doors tend to be close to the cardinal directions.
  - graphics suggest coherent "biomes" which group rooms together to help memorability.

### Room State

- A room's state is MOSTLY reset to its original state if you leave and come back.

- A player may decide to reset a room's state (meaning: having the same effect as
  leaving and coming back) at any time.

- Exceptions to this are limited but crucial for progress in the game.
  Isles of Sea and Sky represents a good standard here.

- In IoSaS, certain barriers may be removed, and certain items may be acquired,
  which survive the room being reset. These are perceived by the player as
 *monotonic progress forward* in the game.

- One piece of state that is actually affected by these resets is the
  entrance through which you came into the room.

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

- There are no current plans to manage a repository of user-designed levels,
  though I would like to invite collaboration somehow.
