import { Command, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import {
  ClickedApplyCustomSetup,
  ClickedCustomTile,
  ClickedReset,
  ClickedTile,
  ClickedToggleCustomSetup,
  ClickedToggleSolution,
} from './message'
import { GamePhase, initialGameState, initialModel, startRun } from './model'
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
        expect(initialModel.gameState).toEqual(initialGameState)
      }),
    )
  })

  test('the first uniform board establishes its opposite target', () => {
    story(
      update,
      given({
        ...initialModel,
        gameState: [false, false, true, false, true, true],
      }),
      message(ClickedTile({ index: 0 })),
      model(next => {
        expect(next.gameState).toEqual([true, true, true, true, true, true])
        expect(next.phase).toEqual(
          GamePhase.cases.SeekingOpposite.make({ targetValue: false }),
        )
      }),
    )
  })

  test('the opposite target remains stable while the board is mixed', () => {
    story(
      update,
      given({
        ...initialModel,
        gameState: [false, false, false, false, false, false],
        phase: GamePhase.cases.SeekingOpposite.make({ targetValue: true }),
      }),
      message(ClickedTile({ index: 0 })),
      model(next => {
        expect(next.phase).toEqual(
          GamePhase.cases.SeekingOpposite.make({ targetValue: true }),
        )
      }),
    )
  })

  test('reaching the opposite board establishes the next opposite target', () => {
    story(
      update,
      given({
        ...initialModel,
        gameState: [true, true, false, true, false, false],
        phase: GamePhase.cases.SeekingOpposite.make({ targetValue: false }),
      }),
      message(ClickedTile({ index: 0 })),
      model(next => {
        expect(next.gameState).toEqual([false, false, false, false, false, false])
        expect(next.phase).toEqual(
          GamePhase.cases.SeekingOpposite.make({ targetValue: true }),
        )
      }),
    )
  })

  test('custom editing changes one tile and resets game progress', () => {
    story(
      update,
      given({
        ...initialModel,
        phase: GamePhase.cases.SeekingOpposite.make({ targetValue: false }),
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
        expect(next.isCustomSetupMode).toBe(true)
      }),
    )
  })

  test('a uniform custom state immediately targets its opposite', () => {
    expect(startRun([false, false, false, false, false, false])).toEqual({
      gameState: [false, false, false, false, false, false],
      phase: GamePhase.cases.SeekingOpposite.make({ targetValue: true }),
      moveHistory: [],
    })
  })

  test('Reset preserves component UI state like React', () => {
    const changedModel = {
      ...initialModel,
      gameState: [true, true, true, true, true, true] as const,
      phase: GamePhase.cases.SeekingOpposite.make({ targetValue: false }),
      moveHistory: [1, 2],
      showSolution: true,
      isCustomSetupMode: true,
    }

    story(
      update,
      given(changedModel),
      message(ClickedReset()),
      model(next => {
        expect(next.gameState).toEqual(initialGameState)
        expect(next.phase).toEqual(
          GamePhase.cases.SeekingFirstUniform.make({}),
        )
        expect(next.moveHistory).toEqual([])
        expect(next.showSolution).toBe(true)
        expect(next.isCustomSetupMode).toBe(true)
      }),
    )
  })

  test('UI toggles only update their local-equivalent fields', () => {
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
    )
  })
})
