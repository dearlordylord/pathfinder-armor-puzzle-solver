import { Match } from 'effect'
import { Command } from 'foldkit'

import type { Message } from './message'
import type { Model, TileIndex } from './model'
import {
  decodeGameState,
  initialGameState,
  possibleMoves,
  replayRun,
  startRun,
} from './model'

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const clickTile = (model: Model, index: TileIndex): UpdateReturn => {
  const move = possibleMoves[index]
  if (move === undefined) {
    return [model, []]
  }

  return [
    {
      ...model,
      run: {
        ...model.run,
        moveHistory: [...model.run.moveHistory, index],
      },
    },
    [],
  ]
}

const clickCustomTile = (model: Model, index: TileIndex): UpdateReturn => {
  const { gameState } = replayRun(model.run)
  if (gameState[index] === undefined) {
    return [model, []]
  }

  const editedGameState = decodeGameState(
    gameState.map((value, tileIndex) =>
      tileIndex === index ? !value : value,
    ),
  )

  return [{ ...model, run: startRun(editedGameState) }, []]
}

export const update = (model: Model, message: Message): UpdateReturn =>
  Match.value(message).pipe(
    Match.withReturnType<UpdateReturn>(),
    Match.tagsExhaustive({
      ClickedTile: ({ index }) => clickTile(model, index),
      ClickedToggleSolution: () => [
        { ...model, showSolution: !model.showSolution },
        [],
      ],
      ClickedReset: () => [
        { ...model, run: startRun(initialGameState) },
        [],
      ],
      ClickedToggleCustomSetup: () => [
        { ...model, isCustomSetupMode: !model.isCustomSetupMode },
        [],
      ],
      ClickedCustomTile: ({ index }) => clickCustomTile(model, index),
    }),
  )
