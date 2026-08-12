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
    ],
  ),
})
