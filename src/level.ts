import { produce } from "immer";
import { entityOfDynamicTile, EntityState, EntityType } from "./entity";
import { DynamicLayer, emptyTile, getItem, putItem } from "./layer";
import { Point, vdiag } from "./lib/point";
import { Brect } from "./lib/types";
import { getEmptyOverlay, Level } from "./state";
import { Bus } from "./types";
import { thickRectOfBrect } from "./util";

/**
 * The type of level data "at rest", as returned by {@link getAllLevels}.
 */
export type LevelData = {
  initOverlay: DynamicLayer,
  boundRect: Brect,
  busState: Record<Bus, boolean>,
}

/**
 * @returns An empty level.
 */
export function emptyLevel(): Level {
  return mkLevel(emptyLevelData());
}

/**
 * @returns An empty level data.
 */
export function emptyLevelData(): LevelData {
  return {
    initOverlay: getEmptyOverlay(),
    boundRect: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
    busState: { red: false, green: false, blue: false },
  };
}

/**
 * Given a level "at rest", create the data structure that represents
 * level state during play.
 */
export function mkLevel(ld: LevelData): Level {
  const level: Level = {
    overlay: getEmptyOverlay(),
    busState: ld.busState,
    entities: [],
  };

  const entityReplacements: { ent: EntityState, p: Point }[] = [];
  const rect = thickRectOfBrect(ld.boundRect);
  for (let y = ld.boundRect.min.y; y < ld.boundRect.max.y; y++) {
    for (let x = ld.boundRect.min.x; x < ld.boundRect.max.x; x++) {
      const tile = getItem(ld.initOverlay, { x, y })
      if (tile == undefined) continue;
      const etp = entityOfDynamicTile(tile);
      if (etp == undefined) continue;
      entityReplacements.push({ p: { x, y }, ent: { etp, impetus: vdiag(0), pos: { x, y } } });
    }
  }
  return produce(level, l => {
    entityReplacements.forEach(({ p, ent }) => {
      l.entities.push(ent);
      putItem(l.overlay, p, { t: 'static', tile: emptyTile() });
    });
  });
}
