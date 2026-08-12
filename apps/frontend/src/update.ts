import { Match } from 'effect'
import { Command } from 'foldkit'
import { applyMove, isAllSame } from '@app/solver'

import type { Message } from './message'
import type { GamePhase, Model, TileIndex } from './model'
import {
  decodeGameState,
  GamePhase as GamePhaseSchema,
  initialModel,
  possibleMoves,
  startRun,
} from './model'

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const nextPhase = (
  model: Model,
  gameState: Model['gameState'],
): GamePhase => {
  if (!isAllSame(gameState)) {
    return model.phase
  }

  const uniformValue = gameState[0]
  if (model.phase._tag === 'SeekingFirstUniform') {
    return GamePhaseSchema.cases.SeekingOpposite.make({
      firstUniformValue: uniformValue,
    })
  }

  if (
    model.phase._tag === 'SeekingOpposite' &&
    uniformValue !== model.phase.firstUniformValue
  ) {
    return GamePhaseSchema.cases.Completed.make({
      firstUniformValue: model.phase.firstUniformValue,
    })
  }

  return model.phase
}

const clickTile = (model: Model, index: TileIndex): UpdateReturn => {
  const move = possibleMoves[index]
  if (move === undefined) {
    return [model, []]
  }

  const gameState = decodeGameState(applyMove(model.gameState, move))
  return [
    {
      ...model,
      gameState,
      moveHistory: [...model.moveHistory, index],
      phase: nextPhase(model, gameState),
    },
    [],
  ]
}

const clickCustomTile = (model: Model, index: TileIndex): UpdateReturn => {
  if (model.gameState[index] === undefined) {
    return [model, []]
  }

  const gameState = decodeGameState(
    model.gameState.map((value, tileIndex) =>
      tileIndex === index ? !value : value,
    ),
  )

  return [{ ...model, ...startRun(gameState) }, []]
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
      ClickedReset: () => [initialModel, []],
      ClickedToggleCustomSetup: () => [
        { ...model, isCustomSetupMode: !model.isCustomSetupMode },
        [],
      ],
      ClickedCustomTile: ({ index }) => clickCustomTile(model, index),
      ClickedApplyCustomSetup: () => [
        { ...model, isCustomSetupMode: false },
        [],
      ],
      ClickedPlayAgain: () => [initialModel, []],
    }),
  )
