import { Player } from "./state";

export function getVerticalImpetus(player: Player): number {
  return player._impetus;
}

export function setVerticalImpetus(player: Player, impetus: number): void {
  player._impetus = impetus;
}
