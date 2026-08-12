import { Command, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import {
  ClickedApplyCustomSetup,
  ClickedCustomTile,
  ClickedPlayAgain,
  ClickedReset,
  ClickedTile,
  ClickedToggleCustomSetup,
  ClickedToggleSolution,
} from './message'
import { GamePhase, initialModel, startRun } from './model'
import { update } from './update'

describe('game update', () => {
  test('clicking a tile applies its move immutably and records it', () => {
    story(
      update,
      given(initialModel),
      message(ClickedTile({ index: 0 })),
      Command.expectNone(),
      model(next => {
        expect(next.gameState).toEqual([true, false, false, false, false, true])
        expect(next.moveHistory).toEqual([0])
        expect(initialModel.gameState).toEqual([false, true, false, true, false, true])
      }),
    )
  })

  test('a first uniform board records its value and seeks the opposite', () => {
    story(
      update,
      given({
        ...initialModel,
        gameState: [false, false, true, false, true, true],
      }),
      message(ClickedTile({ index: 0 })),
      model(next => {
        expect(next.phase).toEqual(
          GamePhase.cases.SeekingOpposite.make({ firstUniformValue: true }),
        )
      }),
    )
  })

  test('reaching the opposite uniform board completes the puzzle', () => {
    story(
      update,
      given({
        ...initialModel,
        gameState: [true, true, false, true, false, false],
        phase: GamePhase.cases.SeekingOpposite.make({
          firstUniformValue: true,
        }),
      }),
      message(ClickedTile({ index: 0 })),
      model(next => {
        expect(next.gameState).toEqual([false, false, false, false, false, false])
        expect(next.phase).toEqual(
          GamePhase.cases.Completed.make({ firstUniformValue: true }),
        )
      }),
    )
  })

  test('returning to the original uniform value does not complete the puzzle', () => {
    story(
      update,
      given({
        ...initialModel,
        gameState: [false, false, true, false, true, true],
        phase: GamePhase.cases.SeekingOpposite.make({
          firstUniformValue: true,
        }),
      }),
      message(ClickedTile({ index: 0 })),
      model(next => {
        expect(next.phase._tag).toBe('SeekingOpposite')
      }),
    )
  })

  test('custom editing and reset both start a fresh run', () => {
    story(
      update,
      given({
        ...initialModel,
        phase: GamePhase.cases.Completed.make({ firstUniformValue: false }),
        moveHistory: [2, 4],
        isCustomSetupMode: true,
      }),
      message(ClickedCustomTile({ index: 1 })),
      model(next => {
        expect(next.gameState).toEqual([false, false, false, true, false, true])
        expect(next.phase).toEqual(
          GamePhase.cases.SeekingFirstUniform.make({}),
        )
        expect(next.moveHistory).toEqual([])
      }),
      message(ClickedReset()),
      model(next => {
        expect(next).toEqual(initialModel)
      }),
    )
  })

  test('a uniform starting board begins by seeking its opposite', () => {
    expect(startRun([false, false, false, false, false, false])).toEqual({
      gameState: [false, false, false, false, false, false],
      phase: GamePhase.cases.SeekingOpposite.make({
        firstUniformValue: false,
      }),
      moveHistory: [],
    })
  })

  test('UI messages update only their owned model fields', () => {
    story(
      update,
      given(initialModel),
      message(ClickedToggleSolution()),
      model(next => {
        expect(next.showSolution).toBe(true)
        expect(next.gameState).toEqual(initialModel.gameState)
      }),
      message(ClickedToggleCustomSetup()),
      model(next => {
        expect(next.isCustomSetupMode).toBe(true)
      }),
      message(ClickedApplyCustomSetup()),
      model(next => {
        expect(next.isCustomSetupMode).toBe(false)
      }),
      message(ClickedPlayAgain()),
      model(next => {
        expect(next).toEqual(initialModel)
      }),
    )
  })

  test('completed-board clicks are ignored', () => {
    const completedModel = {
      ...initialModel,
      gameState: [false, false, false, false, false, false] as const,
      phase: GamePhase.cases.Completed.make({ firstUniformValue: true }),
    }

    story(
      update,
      given(completedModel),
      message(ClickedTile({ index: 0 })),
      model(next => {
        expect(next).toBe(completedModel)
      }),
    )
  })
})
