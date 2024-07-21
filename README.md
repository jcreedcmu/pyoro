zplat
=====
[![run tests](https://github.com/jcreedcmu/zplat/actions/workflows/run-tests.yml/badge.svg?branch=main)](https://github.com/jcreedcmu/zplat/actions/workflows/run-tests.yml)

This is an old game idea I've been tinkering with from time to time.
The premise is: puzzle-platformer, but time is discrete, so there's
no need to have good twitch skills.

## Notes

- mouse drag to paint tiles
buffer keypresses during animation
sounds?

### 2022.07.22

mechanics:
- double jump
- wall jump
- dash
- gravity reverse
- walls that only horizontally block

### 2022.10.01

Interesting corner cases:

Diagonal-up pushing of a button
Diagonal-crossing of a block
Skimming just behind a phased transient block

impetus bug: shouldn't be able to jump just after clearing solid
ground over into empty space.

### 2022.10.23

further information about above impetus bug: it only happens if I have
$>0$ impetus before "jumping off the cliff" horizontally. Fixed now.
