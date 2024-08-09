import { DynamicLayer } from "./layer";
import { getEmptyOverlay, Level } from "./state";
import { Brect } from "./types";

/**
 * The type of level data "at rest", as returned by {@link getAllLevels}.
 */
export type LevelData = {
  initOverlay: DynamicLayer,
  boundRect: Brect,
}

/**
 * @returns An empty level.
 */
export function emptyLevel(): Level {
  return mkLevel({
    initOverlay: getEmptyOverlay(),
    boundRect: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
  });
}

/**
 * Given a level "at rest", create the data structure that represents
 * level state during play.
 */
export function mkLevel(ld: LevelData): Level {
  return {
    boundRect: ld.boundRect,
    initOverlay: ld.initOverlay,
    overlay: getEmptyOverlay(),
  }
}
