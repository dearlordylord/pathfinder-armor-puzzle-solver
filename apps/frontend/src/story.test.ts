import { Command, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'
import { solution } from '@app/solver'

import {
  ClickedCustomTile,
  ClickedReset,
  ClickedTile,
  ClickedToggleCustomSetup,
  ClickedToggleSolution,
} from './message'
import {
  decodeTileIndex,
  GameProgress,
  initialGameState,
  initialModel,
  possibleMoves,
  replayRun,
  startRun,
  type Model,
} from './model'
import { update } from './update'

const afterMoves = (
  moves: ReadonlyArray<number>,
  startingModel: Model = initialModel,
): Model =>
  moves.reduce(
    (current, index) =>
      update(current, ClickedTile({ index: decodeTileIndex(index) }))[0],
    startingModel,
  )

describe('game update', () => {
  test('clicking a tile appends its move and replay derives the board', () => {
    story(
      update,
      given(initialModel),
      message(ClickedTile({ index: 0 })),
      Command.expectNone(),
      model(next => {
        expect(replayRun(next.run).gameState).toEqual([
          true,
          false,
          false,
          false,
          false,
          true,
        ])
        expect(next.run.moveHistory).toEqual([0])
        expect(initialModel.run.startingBoard).toEqual(initialGameState)
      }),
    )
  })

  test('the first uniform board starts seeking its opposite', () => {
    const startingModel = {
      ...initialModel,
      run: startRun([false, false, true, false, true, true]),
    }

    story(
      update,
      given(startingModel),
      message(ClickedTile({ index: 0 })),
      model(next => {
        const replayed = replayRun(next.run)
        expect(replayed.gameState).toEqual([true, true, true, true, true, true])
        expect(replayed.progress).toEqual(
          GameProgress.cases.SeekingOpposite.make({ targetValue: false }),
        )
      }),
    )
  })

  test('leaving a first uniform board keeps seeking the same opposite', () => {
    const startingModel = {
      ...initialModel,
      run: startRun([true, true, true, true, true, true]),
    }

    story(
      update,
      given(startingModel),
      message(ClickedTile({ index: 0 })),
      model(next => {
        expect(replayRun(next.run).progress).toEqual(
          GameProgress.cases.SeekingOpposite.make({ targetValue: false }),
        )
      }),
    )
  })

  test('reaching the remembered target records that the opposite was reached', () => {
    const beforeTarget = afterMoves([0, 3, 4, 0])

    story(
      update,
      given(beforeTarget),
      message(ClickedTile({ index: 5 })),
      model(next => {
        expect(replayRun(next.run).progress).toEqual(
          GameProgress.cases.OppositeReached.make({ targetValue: true }),
        )
      }),
    )
  })

  test('leaving the opposite board preserves that it was reached', () => {
    const oppositeReached = afterMoves([0, 3, 4, 0, 5])

    story(
      update,
      given(oppositeReached),
      message(ClickedTile({ index: 0 })),
      model(next => {
        expect(replayRun(next.run).progress).toEqual(
          GameProgress.cases.OppositeReached.make({ targetValue: true }),
        )
      }),
    )
  })

  test('following both solution paths reaches the opposite board', () => {
    const [firstPath, oppositePath] = solution(initialGameState, possibleMoves)
    const finalModel = afterMoves([...firstPath, ...oppositePath])

    expect(replayRun(finalModel.run).progress).toEqual(
      GameProgress.cases.OppositeReached.make({ targetValue: true }),
    )
  })

  test('custom editing establishes a new starting board and clears moves', () => {
    const changedModel = {
      ...afterMoves([0, 3, 4, 0, 5]),
      isCustomSetupMode: true,
    }

    story(
      update,
      given(changedModel),
      message(ClickedCustomTile({ index: 1 })),
      model(next => {
        expect(next.run.startingBoard).toEqual([
          true,
          false,
          true,
          true,
          true,
          true,
        ])
        expect(next.run.moveHistory).toEqual([])
        expect(replayRun(next.run).progress).toEqual(
          GameProgress.cases.SeekingFirstUniform.make({}),
        )
        expect(next.isCustomSetupMode).toBe(true)
      }),
    )
  })

  test('uniform custom runs target the opposite polarity in both directions', () => {
    expect(replayRun(startRun([false, false, false, false, false, false]))).toEqual({
      gameState: [false, false, false, false, false, false],
      progress: GameProgress.cases.SeekingOpposite.make({ targetValue: true }),
    })
    expect(replayRun(startRun([true, true, true, true, true, true]))).toEqual({
      gameState: [true, true, true, true, true, true],
      progress: GameProgress.cases.SeekingOpposite.make({ targetValue: false }),
    })
  })

  test('Reset preserves display preferences and starts the default run', () => {
    const changedModel = {
      ...afterMoves([0, 3, 4, 0, 5]),
      showSolution: true,
      isCustomSetupMode: true,
    }

    story(
      update,
      given(changedModel),
      message(ClickedReset()),
      model(next => {
        expect(next.run).toEqual(startRun(initialGameState))
        expect(replayRun(next.run).progress).toEqual(
          GameProgress.cases.SeekingFirstUniform.make({}),
        )
        expect(next.showSolution).toBe(true)
        expect(next.isCustomSetupMode).toBe(true)
      }),
    )
  })

  test('UI toggles only update their owned model fields', () => {
    story(
      update,
      given(initialModel),
      message(ClickedToggleSolution()),
      model(next => {
        expect(next.showSolution).toBe(true)
        expect(next.run).toEqual(initialModel.run)
      }),
      message(ClickedToggleCustomSetup()),
      model(next => {
        expect(next.isCustomSetupMode).toBe(true)
      }),
      message(ClickedToggleCustomSetup()),
      model(next => expect(next.isCustomSetupMode).toBe(false)),
    )
  })
})
