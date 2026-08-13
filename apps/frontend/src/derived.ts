import {
  findPath,
  isAllFalse,
  isAllSame,
  isAllTrue,
  type Solution,
  solution,
} from '@app/solver'

import type { Model } from './model'
import { possibleMoves } from './model'

export interface GameView {
  readonly isAllSame: boolean
  readonly isAtPhaseGoal: boolean
  readonly currentSolution: Solution
  readonly nextSolution: Solution | null
}

export const deriveGameView = (model: Model): GameView => {
  if (model.phase._tag !== 'Initial') {
    const allSame = isAllSame(model.gameState)
    const targetSolution = findPath(
      model.gameState,
      possibleMoves,
      model.phase.targetValue ? isAllTrue : isAllFalse,
    )

    return {
      isAllSame: allSame,
      isAtPhaseGoal:
        allSame && model.gameState[0] === model.phase.targetValue,
      currentSolution: targetSolution,
      nextSolution:
        model.phase._tag === 'PhaseOne' ? targetSolution : null,
    }
  }

  const solutions = solution(model.gameState, possibleMoves)

  return {
    isAllSame: isAllSame(model.gameState),
    isAtPhaseGoal: isAllSame(model.gameState),
    currentSolution: solutions[0],
    nextSolution: solutions[1],
  }
}
