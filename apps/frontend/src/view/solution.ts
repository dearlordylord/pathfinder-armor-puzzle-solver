import type { Html, HtmlBuilder } from 'foldkit/html'
import type { Solution } from '@app/solver'

import { deriveGameView } from '../derived'
import type { Message } from '../message'
import type { Model } from '../model'
import { possibleMoves } from '../model'

const moveList = (
  moves: Solution,
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
        [h.Key(`${moveIndex}-${occurrence}`)],
        [
          'Press tile ',
          h.strong([], [String(moveIndex)]),
          ` (affects tiles ${move.join(', ')})`,
        ],
      )
    }),
  )
}

export const solutionView = (
  model: Model,
  h: HtmlBuilder<Message>,
): Html => {
  const derived = deriveGameView(model)

  return h.div(
    [h.Class('solution-display')],
    [
      h.h3([], ['Solution']),
      h.p([h.Class('solution-info')], [derived.solutionInfo]),
      h.div(
        [h.Class('solution-steps')],
        [
          h.div(
            [h.Class('solution-part')],
            [
              h.h4([], [derived.solutionHeading]),
              h.div(
                [h.Class('solution-moves')],
                derived.solution.length > 0
                  ? [moveList(derived.solution, h)]
                  : [h.p([], ['No solution needed'])],
              ),
            ],
          ),
        ],
      ),
    ],
  )
}
