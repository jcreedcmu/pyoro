import { GameState, Level, TestToolState } from "./state";
import { motionTestSuite, testInitialGameState } from "./test-motion";

export function getTestState(levels: Record<string, Level>, testToolState: TestToolState): GameState {
  // XXX should incorporate test time
  return testInitialGameState(motionTestSuite[testToolState.testIx].levelName);
}
