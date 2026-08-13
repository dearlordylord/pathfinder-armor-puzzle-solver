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
  readonly currentSolution: Solution
  readonly nextSolution: Solution | null
}

export const deriveGameView = (model: Model): GameView => {
  if (model.phase._tag !== 'Initial') {
    const targetSolution = findPath(
      model.gameState,
      possibleMoves,
      model.phase.targetValue ? isAllTrue : isAllFalse,
    )

    return {
      isAllSame: isAllSame(model.gameState),
      currentSolution: targetSolution,
      nextSolution:
        model.phase._tag === 'PhaseOne' ? targetSolution : null,
    }
  }

  const solutions = solution(model.gameState, possibleMoves)

  return {
    isAllSame: isAllSame(model.gameState),
    currentSolution: solutions[0],
    nextSolution: solutions[1],
  }
}
