import type { Html, HtmlBuilder } from 'foldkit/html'

import { deriveGameView } from '../derived'
import { type Message } from '../message'
import type { Model } from '../model'
import { possibleMoves } from '../model'

export const solutionView = (
  model: Model,
  h: HtmlBuilder<Message>,
): Html => {
  const derived = deriveGameView(model)
  const moveOccurrences = new Map<number, number>()

  return h.div(
    [h.Class('solution-display')],
    [
      h.h3([], ['Solution']),
      h.p([h.Class('solution-info')], [derived.solutionInfo]),
      ...(model.phase._tag === 'Completed'
        ? []
        : [
            h.div(
              [h.Class('solution-steps')],
              [
                h.div(
                  [h.Class('solution-part')],
                  [
                    h.h4([], ['Next moves']),
                    h.div(
                      [h.Class('solution-moves')],
                      derived.solution.length === 0
                        ? [h.p([], ['No move needed for this step.'])]
                        : [
                            h.ol(
                              [],
                              derived.solution.map(moveIndex => {
                                const move = possibleMoves[moveIndex] ?? []
                                const occurrence = moveOccurrences.get(moveIndex) ?? 0
                                moveOccurrences.set(moveIndex, occurrence + 1)
                                return h.li(
                                  [h.Key(`${moveIndex}-${occurrence}`)],
                                  [
                                    'Press tile ',
                                    h.strong([], [String(moveIndex)]),
                                    ` (affects tiles ${move.join(', ')})`,
                                  ],
                                )
                              }),
                            ),
                          ],
                    ),
                  ],
                ),
              ],
            ),
          ]),
    ],
  )
}
