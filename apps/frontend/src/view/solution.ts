import type { Html, HtmlBuilder } from 'foldkit/html'
import type { Solution } from '@app/solver'

import { deriveGameView } from '../derived'
import type { Message } from '../message'
import type { Model } from '../model'
import { possibleMoves } from '../model'

const solutionInfo = (model: Model, allSame: boolean): string => {
  switch (model.phase._tag) {
    case 'Initial':
      return 'First make all tiles the same, then make them all the opposite'
    case 'PhaseOne':
      return allSame
        ? 'All tiles are now the same. Next, make them all the opposite'
        : `Continue making all tiles ${model.phase.targetValue ? 'ON' : 'OFF'}`
    case 'PhaseTwo':
      return allSame
        ? 'All tiles are now the same again. Complete the puzzle!'
        : `Restore all tiles ${model.phase.targetValue ? 'ON' : 'OFF'} to complete the puzzle`
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

const currentSolutionHeading = (model: Model): string => {
  switch (model.phase._tag) {
    case 'Initial':
      return 'Step 1: Make all tiles the same'
    case 'PhaseTwo':
      return 'Step 3: Make all tiles the same again'
    case 'PhaseOne':
      return 'Step 2: Make all tiles opposite'
  }
}

const nextSolutionHeading = (model: Model): string => {
  switch (model.phase._tag) {
    case 'Initial':
    case 'PhaseOne':
      return 'Step 2: Make all tiles opposite'
    case 'PhaseTwo':
      return 'Step 4: Complete the puzzle!'
  }
}

export const solutionView = (
  model: Model,
  h: HtmlBuilder<Message>,
): Html => {
  const derived = deriveGameView(model)
  const parts: Array<Html> = []

  if (!derived.isAllSame) {
    parts.push(
      h.div(
        [h.Class('solution-part')],
        [
          h.h4([], [currentSolutionHeading(model)]),
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

  if (derived.isAllSame) {
    parts.push(
      h.div(
        [h.Class('solution-part')],
        [
          h.h4([], [nextSolutionHeading(model)]),
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
        [solutionInfo(model, derived.isAllSame)],
      ),
      h.div([h.Class('solution-steps')], parts),
    ],
  )
}
