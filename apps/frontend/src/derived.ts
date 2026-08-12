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
}

export const deriveGameView = (model: Model): GameView => {
  if (model.phase._tag === 'Completed') {
    return {
      isAllSame: true,
      solution: [],
      solutionInfo: 'Puzzle completed! 🎉',
    }
  }

  if (model.phase._tag === 'SeekingFirstUniform') {
    return {
      isAllSame: isAllSame(model.gameState),
      solution: findPath(model.gameState, possibleMoves, isAllSame),
      solutionInfo: 'First make all tiles the same.',
    }
  }

  const target = model.phase.firstUniformValue ? isAllFalse : isAllTrue

  return {
    isAllSame: isAllSame(model.gameState),
    solution: findPath(model.gameState, possibleMoves, target),
    solutionInfo: 'Now make all tiles the opposite of your first uniform board.',
  }
}
