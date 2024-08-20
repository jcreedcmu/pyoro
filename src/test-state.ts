import { LevelData } from "./level";
import { GameState, Level, TestToolState } from "./state";
import { motionTestResult, motionTestSuite, testInitialGameState } from "./test-motion";

export function getTestState(testToolState: TestToolState): GameState {
  // XXX We're computing the pass/fail state here but wasting it

  const { pass, state: gameState } = motionTestResult(motionTestSuite[testToolState.testIx], testToolState.testTime);

  return gameState;
}
