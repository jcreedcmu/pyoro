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

- There is a notion of gravity, and therefore a notion of "up". It
  should be challenging --- and therefore rewarding --- to get to
  "high-up" stuff. Like Celeste, success is about *climbing*.

- Puzzles ideally come from unexpected interactions between puzzle
  mechanisms, unexpected corner cases thereof. Some of my favorite
  puzzles in Stephen's Sausage Roll and Baba is You were of this form.

- <details>
    <summary>Spoilers for Leap Year</summary>

    Leap Year's treatment of fall damage is especially relevant to
    this point: player's *expect* monotonicity in that if falling from
    height X kills them, then surely falling from height 2X will as
    well. I find Leap Year's violation of this assumption very clever.

  </details>

- Mechanisms are taught ideally wordlessly, by demonstration.
