import {
  isAllSame,
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
  const solutions = solution(model.gameState, possibleMoves)
  const currentSolution =
    model.phase._tag === 'PhaseTwo' ? solutions[1] : solutions[0]
  const nextSolution =
    model.phase._tag === 'Initial' || model.phase._tag === 'PhaseOne'
      ? solutions[1]
      : null

  return {
    isAllSame: isAllSame(model.gameState),
    currentSolution,
    nextSolution,
  }
}
