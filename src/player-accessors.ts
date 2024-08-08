import { Player } from "./state";

export function getVerticalImpetus(player: Player): number {
  return player.impetus.y;
}
