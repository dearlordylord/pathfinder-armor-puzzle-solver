import type { Document, HtmlBuilder } from 'foldkit/html'

import { ClickedToggleSolution, type Message } from './message'
import type { Model } from './model'
import { controlsView } from './view/controls'
import { gameBoardView } from './view/gameBoard'
import { solutionView } from './view/solution'

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Pathfinder Puzzle Solver',
  body: h.main(
    [h.Class('app')],
    [
      h.h1([], ['Pathfinder Puzzle Solver']),
      h.div(
        [h.Class('top-solution-container')],
        [
          h.button(
            [
              h.Type('button'),
              h.Class(
                `top-solution-button${model.showSolution ? ' active' : ''}`,
              ),
              h.AriaPressed(model.showSolution ? 'true' : 'false'),
              h.OnClick(ClickedToggleSolution()),
            ],
            [model.showSolution ? 'Hide Solution' : 'Show Solution'],
          ),
          ...(model.showSolution ? [solutionView(model, h)] : []),
        ],
      ),
      h.div(
        [h.Class('game-container')],
        [gameBoardView(model, h), controlsView(model, h)],
      ),
      h.footer(
        [h.Class('app-footer')],
        [
          h.a(
            [
              h.Class('github-link'),
              h.Href(
                'https://github.com/dearlordylord/pathfinder-armor-puzzle-solver',
              ),
              h.Target('_blank'),
              h.Rel('noreferrer noopener'),
              h.AriaLabel('View source on GitHub'),
              h.Title('View source on GitHub'),
            ],
            [
              h.svg(
                [
                  h.Class('github-mark'),
                  h.ViewBox('0 0 16 16'),
                  h.AriaHidden(true),
                  h.Fill('currentColor'),
                ],
                [
                  h.path(
                    [
                      h.D(
                        'M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82A7.15 7.15 0 0 1 8 3.86c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8 8 0 0 0 8 0Z',
                      ),
                    ],
                  ),
                ],
              ),
              h.span([], ['GitHub']),
            ],
          ),
        ],
      ),
    ],
  ),
})
