import {
  findPath,
  isAllFalse,
  isAllSame,
  isAllTrue,
  type Solution,
  solution,
} from '@app/solver'

import type { Model } from './model'
import { possibleMoves, replayRun } from './model'

export interface GameView {
  readonly isAllSame: boolean
  readonly isAtProgressGoal: boolean
  readonly currentSolution: Solution
  readonly nextSolution: Solution | null
}

export const deriveGameView = (model: Model): GameView => {
  const { gameState, progress } = replayRun(model.run)
  if (progress._tag !== 'SeekingFirstUniform') {
    const allSame = isAllSame(gameState)
    const targetSolution = findPath(
      gameState,
      possibleMoves,
      progress.targetValue ? isAllTrue : isAllFalse,
    )

    return {
      isAllSame: allSame,
      isAtProgressGoal:
        allSame && gameState[0] === progress.targetValue,
      currentSolution: targetSolution,
      nextSolution:
        progress._tag === 'SeekingOpposite' ? targetSolution : null,
    }
  }

  const solutions = solution(gameState, possibleMoves)

  return {
    isAllSame: isAllSame(gameState),
    isAtProgressGoal: isAllSame(gameState),
    currentSolution: solutions[0],
    nextSolution: solutions[1],
  }
}
