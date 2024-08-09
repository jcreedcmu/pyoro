import { DynamicLayer } from "./layer";
import { Brect } from "./types";

/**
 * The type of level data "at rest", as returned by {@link getAllLevels}.
 */
export type LevelData = {
  initOverlay: DynamicLayer,
  boundRect: Brect,
}
