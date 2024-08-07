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

### Misc

- [Time Badgers](https://github.com/gwillen/timebadgers)

## Goals

### Physics

- There is a notion of gravity, and therefore a notion of "up". It
  should be challenging --- and therefore rewarding --- to get to
  "high-up" stuff. Like Celeste, success is about *climbing*.

- Puzzles ideally come from unexpected interactions between puzzle
  mechanisms, unexpected corner cases thereof. Some of my favorite
  puzzles in Stephen's Sausage Roll and Baba is You were of this form.

- <details>
    <summary>🚨 Spoilers 🚨 for Leap Year</summary>

    Leap Year's treatment of fall damage is especially relevant to
    this point: player's *expect* monotonicity in that if falling from
    height X kills them, then surely falling from height 2X will as
    well. I find Leap Year's violation of this assumption very clever.

  </details>

- Mechanisms are taught ideally wordlessly, by demonstration.

### Player Choices

- The number of player choices available at any given time should be
  fairly small, probably fewer than 10.

- Player choices should for the most part, be limited to choosing a
  direction of motion (or, perhaps, standing still and waiting) This
  could be augmented with a small set of "modifiers". For example, a
  "dash" move-right might be distinct from a normal move-right.

### Rooms

- The world should be broken up into "rooms", and for the most part
  any room's state is entirely reset if you leave and come back.

- Exceptions to "a room's state is entirely reset" are intentionally
  limited, but they are the foundation of all progress in the game.
  Isles of Sea and Sky represents a good standard here.

- In IoSaS, certain barriers may be removed, and certain items may be acquired,
  which survive the room being reset. These are perceived by the player as
 *monotonic progress forward* in the game.

- The "barriers being removed is unambiguously progress" is more subtle for
  a game with "gravity" compared to a top-down puzzler like IoSaS, because
  a block's *presence* might mean a platform that can be jumped on to
  gain access elsewhere. Care should be taken during puzzle design
  to ensure this doesn't happen in practice.

- Resetting a room's state is allowed at any time.

## Non-Goals

- At least for now, I'm not planning on managing a repository of user-designed levels.

## Open Questions

- Should single-move undo be supported?
    - Argument for supporting: most puzzle games do
    - Argument for not supporting: might enhance "drama" if mistakes are a little consequential.
