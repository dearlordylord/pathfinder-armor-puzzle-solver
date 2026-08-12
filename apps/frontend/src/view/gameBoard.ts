import type { Html, HtmlBuilder } from 'foldkit/html'

import { ClickedTile, type Message } from '../message'
import type { Model } from '../model'
import { tiles } from '../model'

export const gameBoardView = (
  model: Model,
  h: HtmlBuilder<Message>,
): Html =>
  h.section(
    [h.Class('game-board')],
    [
      h.h2([], ['Game Board']),
      h.div(
        [h.Class('game-grid')],
        tiles.map(tile => {
          const isActive = model.gameState[tile.id]
          const label = `Tile ${tile.id}, ${isActive ? 'on' : 'off'}, affects ${tile.move.join(', ')}`

          return h.button(
            [
              h.Key(String(tile.id)),
              h.Type('button'),
              h.Class(`game-tile${isActive ? ' active' : ''}`),
              h.Style({
                gridColumn: tile.gridColumn,
                gridRow: tile.gridRow,
              }),
              h.AriaLabel(label),
              h.AriaPressed(isActive ? 'true' : 'false'),
              h.OnClick(ClickedTile({ index: tile.id })),
            ],
            [
              h.span(
                [h.Class('tile-content')],
                [
                  h.span([h.Class('tile-index')], [String(tile.id)]),
                  h.span(
                    [h.Class('tile-status')],
                    [isActive ? 'ON' : 'OFF'],
                  ),
                ],
              ),
              h.span(
                [h.Class('tile-moves')],
                [`Affects: ${tile.move.join(', ')}`],
              ),
            ],
          )
        }),
      ),
      h.div(
        [h.Class('instructions')],
        [
          h.h3([], ['How to Play:']),
          h.p([], ['Click on a tile to toggle it and its connected tiles.']),
          h.p([], [
            `For example, clicking on tile ${tiles[0].id} will toggle tiles ${tiles[0].move.join(', ')}.`,
          ]),
          h.p([], ['Your goal is to make all tiles either ON or OFF.']),
        ],
      ),
    ],
  )
