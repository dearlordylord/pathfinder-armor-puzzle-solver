import { Schema } from 'effect'
import { m } from 'foldkit/message'
import { TileIndex } from './model'

export const ClickedTile = m('ClickedTile', { index: TileIndex })
export const ClickedToggleSolution = m('ClickedToggleSolution')
export const ClickedReset = m('ClickedReset')
export const ClickedToggleCustomSetup = m('ClickedToggleCustomSetup')
export const ClickedCustomTile = m('ClickedCustomTile', {
  index: TileIndex,
})

export const Message = Schema.Union([
  ClickedTile,
  ClickedToggleSolution,
  ClickedReset,
  ClickedToggleCustomSetup,
  ClickedCustomTile,
])
export type Message = typeof Message.Type
