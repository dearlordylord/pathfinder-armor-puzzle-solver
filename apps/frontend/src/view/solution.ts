import type { Html, HtmlBuilder } from 'foldkit/html'
import type { Solution } from '@app/solver'

import { deriveGameView } from '../derived'
import type { Message } from '../message'
import type { Model } from '../model'
import { possibleMoves, replayRun, type GameProgress } from '../model'

const solutionInfo = (progress: GameProgress, allSame: boolean): string => {
  switch (progress._tag) {
    case 'SeekingFirstUniform':
      return 'First make all tiles the same, then make them all the opposite'
    case 'SeekingOpposite':
      return allSame
        ? 'All tiles are now the same. Next, make them all the opposite'
        : `Continue making all tiles ${progress.targetValue ? 'ON' : 'OFF'}`
    case 'OppositeReached':
      return allSame
        ? 'All tiles are now the same again. Complete the puzzle!'
        : `Restore all tiles ${progress.targetValue ? 'ON' : 'OFF'} to complete the puzzle`
  }
}

const moveList = (
  moves: Solution,
  keyPrefix: string,
  h: HtmlBuilder<Message>,
): Html => {
  const occurrences = new Map<number, number>()
  return h.ol(
    [],
    moves.map(moveIndex => {
      const move = possibleMoves[moveIndex] ?? []
      const occurrence = occurrences.get(moveIndex) ?? 0
      occurrences.set(moveIndex, occurrence + 1)
      return h.li(
        [h.Key(`${keyPrefix}-${moveIndex}-${occurrence}`)],
        [
          'Press tile ',
          h.strong([], [String(moveIndex)]),
          ` (affects tiles ${move.join(', ')})`,
        ],
      )
    }),
  )
}

const currentSolutionHeading = (progress: GameProgress): string => {
  switch (progress._tag) {
    case 'SeekingFirstUniform':
      return 'Step 1: Make all tiles the same'
    case 'OppositeReached':
      return 'Step 3: Make all tiles the same again'
    case 'SeekingOpposite':
      return 'Step 2: Make all tiles opposite'
  }
}

const nextSolutionHeading = (progress: GameProgress): string => {
  switch (progress._tag) {
    case 'SeekingFirstUniform':
    case 'SeekingOpposite':
      return 'Step 2: Make all tiles opposite'
    case 'OppositeReached':
      return 'Step 4: Complete the puzzle!'
  }
}

export const solutionView = (
  model: Model,
  h: HtmlBuilder<Message>,
): Html => {
  const derived = deriveGameView(model)
  const { progress } = replayRun(model.run)
  const parts: Array<Html> = []

  if (!derived.isAtProgressGoal) {
    parts.push(
      h.div(
        [h.Class('solution-part')],
        [
          h.h4([], [currentSolutionHeading(progress)]),
          h.div(
            [h.Class('solution-moves')],
            derived.currentSolution.length > 0
              ? [moveList(derived.currentSolution, 'current', h)]
              : [
                  h.p([], [
                    'No solution needed. Tiles are already all the same.',
                  ]),
                ],
          ),
        ],
      ),
    )
  }

  if (derived.isAtProgressGoal) {
    parts.push(
      h.div(
        [h.Class('solution-part')],
        [
          h.h4([], [nextSolutionHeading(progress)]),
          h.div(
            [h.Class('solution-moves')],
            derived.nextSolution !== null && derived.nextSolution.length > 0
              ? [moveList(derived.nextSolution, 'next', h)]
              : [h.p([], ['No solution needed'])],
          ),
        ],
      ),
    )
  }

  return h.div(
    [h.Class('solution-display')],
    [
      h.h3([], ['Solution']),
      h.p(
        [h.Class('solution-info')],
        [solutionInfo(progress, derived.isAtProgressGoal)],
      ),
      h.div([h.Class('solution-steps')], parts),
    ],
  )
}
