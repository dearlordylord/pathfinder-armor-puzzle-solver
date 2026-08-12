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
  const allSame = isAllSame(gameState)
  if (allSame && model.phase._tag === 'Initial') {
    return GamePhaseSchema.cases.PhaseOne.make({})
  } else if (
    allSame &&
    (model.phase._tag === 'PhaseOne' || model.phase._tag === 'PhaseTwo')
  ) {
    return GamePhaseSchema.cases.PhaseTwo.make({})
  } else if (!allSame && model.phase._tag === 'PhaseTwo') {
    return GamePhaseSchema.cases.PhaseOne.make({})
  }
  return model.phase
}

const clickTile = (model: Model, index: TileIndex): UpdateReturn => {
  const move = possibleMoves[index]
  if (move === undefined) {
    return [model, []]
  }

  const gameState = decodeGameState(applyMove(model.gameState, move))
  const moveHistory = [...model.moveHistory, index]
  return [
    {
      ...model,
      gameState,
      moveHistory,
      phase: nextPhase({ ...model, moveHistory }, gameState),
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
      ClickedReset: () => [
        { ...model, ...startRun(initialModel.gameState) },
        [],
      ],
      ClickedToggleCustomSetup: () => [
        { ...model, isCustomSetupMode: !model.isCustomSetupMode },
        [],
      ],
      ClickedCustomTile: ({ index }) => clickCustomTile(model, index),
      ClickedApplyCustomSetup: () => [
        { ...model, isCustomSetupMode: false },
        [],
      ],
    }),
  )
