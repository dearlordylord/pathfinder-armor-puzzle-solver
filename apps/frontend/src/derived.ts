import {
  findPath,
  isAllFalse,
  isAllSame,
  isAllTrue,
  type Solution,
} from '@app/solver'

import type { Model } from './model'
import { possibleMoves } from './model'

export interface GameView {
  readonly isAllSame: boolean
  readonly solution: Solution
  readonly solutionInfo: string
  readonly solutionHeading: string
}

export const deriveGameView = (model: Model): GameView => {
  if (model.phase._tag === 'SeekingFirstUniform') {
    return {
      isAllSame: isAllSame(model.gameState),
      solution: findPath(model.gameState, possibleMoves, isAllSame),
      solutionInfo:
        'First make all tiles the same, then make them all the opposite',
      solutionHeading: 'Step 1: Make all tiles the same',
    }
  }

  const targetLabel = model.phase.targetValue ? 'ON' : 'OFF'
  return {
    isAllSame: isAllSame(model.gameState),
    solution: findPath(
      model.gameState,
      possibleMoves,
      model.phase.targetValue ? isAllTrue : isAllFalse,
    ),
    solutionInfo: `Make all tiles ${targetLabel}, the opposite of the previous uniform board`,
    solutionHeading: 'Step 2: Make all tiles opposite',
  }
}
