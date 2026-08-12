import type { Html, HtmlBuilder } from 'foldkit/html'

import {
  ClickedApplyCustomSetup,
  ClickedCustomTile,
  ClickedReset,
  ClickedToggleCustomSetup,
  type Message,
} from '../message'
import type { Model } from '../model'
import { tiles } from '../model'

const customSetupView = (
  model: Model,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class('custom-setup')],
    [
      h.h3([], ['Custom Setup Mode']),
      h.p(
        [h.Class('setup-info')],
        ['Toggle tiles without affecting their neighbors'],
      ),
      h.div(
        [h.Class('custom-grid')],
        tiles.map(tile => {
          const isActive = model.gameState[tile.id]
          return h.button(
            [
              h.Key(String(tile.id)),
              h.Type('button'),
              h.Class(`custom-tile${isActive ? ' active' : ''}`),
              h.AriaLabel(`Custom tile ${tile.id}, ${isActive ? 'on' : 'off'}`),
              h.AriaPressed(isActive ? 'true' : 'false'),
              h.OnClick(ClickedCustomTile({ index: tile.id })),
            ],
            [
              h.span([h.Class('custom-index')], [String(tile.id)]),
              h.span([h.Class('custom-status')], [isActive ? 'ON' : 'OFF']),
            ],
          )
        }),
      ),
      h.button(
        [
          h.Type('button'),
          h.Class('apply-custom-button'),
          h.OnClick(ClickedApplyCustomSetup()),
        ],
        ['Apply Custom Setup'],
      ),
    ],
  )

export const controlsView = (
  model: Model,
  h: HtmlBuilder<Message>,
): Html =>
  h.section(
    [h.Class('controls')],
    [
      h.h2([], ['Controls']),
      h.div(
        [h.Class('control-buttons')],
        [
          h.button(
            [
              h.Type('button'),
              h.Class('reset-button'),
              h.OnClick(ClickedReset()),
            ],
            ['Reset Game'],
          ),
          h.button(
            [
              h.Type('button'),
              h.Class(
                `custom-button${model.isCustomSetupMode ? ' active' : ''}`,
              ),
              h.AriaPressed(model.isCustomSetupMode ? 'true' : 'false'),
              h.OnClick(ClickedToggleCustomSetup()),
            ],
            [model.isCustomSetupMode ? 'Exit Custom Setup' : 'Custom Setup'],
          ),
        ],
      ),
      ...(model.isCustomSetupMode ? [customSetupView(model, h)] : []),
    ],
  )
