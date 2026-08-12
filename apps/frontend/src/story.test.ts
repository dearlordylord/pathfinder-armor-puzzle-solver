import { Command, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'
import { solution } from '@app/solver'

import {
  ClickedApplyCustomSetup,
  ClickedCustomTile,
  ClickedReset,
  ClickedTile,
  ClickedToggleCustomSetup,
  ClickedToggleSolution,
} from './message'
import {
  GamePhase,
  decodeTileIndex,
  initialGameState,
  initialModel,
  possibleMoves,
  startRun,
} from './model'
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

  test('the first uniform board advances Initial to PhaseOne', () => {
    story(
      update,
      given({
        ...initialModel,
        gameState: [false, false, true, false, true, true],
      }),
      message(ClickedTile({ index: 0 })),
      model(next => {
        expect(next.gameState).toEqual([true, true, true, true, true, true])
        expect(next.phase).toEqual(GamePhase.cases.PhaseOne.make({}))
      }),
    )
  })

  test('leaving a uniform board in PhaseOne stays in PhaseOne', () => {
    story(
      update,
      given({
        ...initialModel,
        gameState: [true, true, true, true, true, true],
        phase: GamePhase.cases.PhaseOne.make({}),
      }),
      message(ClickedTile({ index: 0 })),
      model(next => {
        expect(next.phase).toEqual(GamePhase.cases.PhaseOne.make({}))
      }),
    )
  })

  test('a later uniform board advances PhaseOne to PhaseTwo', () => {
    story(
      update,
      given({
        ...initialModel,
        gameState: [false, false, true, false, true, true],
        phase: GamePhase.cases.PhaseOne.make({}),
      }),
      message(ClickedTile({ index: 0 })),
      model(next => {
        expect(next.phase).toEqual(GamePhase.cases.PhaseTwo.make({}))
      }),
    )
  })

  test('leaving a uniform board in PhaseTwo returns to PhaseOne', () => {
    story(
      update,
      given({
        ...initialModel,
        gameState: [false, false, false, false, false, false],
        phase: GamePhase.cases.PhaseTwo.make({}),
      }),
      message(ClickedTile({ index: 0 })),
      model(next => {
        expect(next.phase).toEqual(GamePhase.cases.PhaseOne.make({}))
      }),
    )
  })

  test('the React completion branch remains unreachable through play', () => {
    const [firstPath, oppositePath] = solution(initialGameState, possibleMoves)
    const finalModel = [...firstPath, ...oppositePath].reduce(
      (current, index) =>
        update(current, ClickedTile({ index: decodeTileIndex(index) }))[0],
      initialModel,
    )

    expect(finalModel.phase).toEqual(GamePhase.cases.PhaseTwo.make({}))
  })

  test('custom editing changes one tile and resets game progress', () => {
    story(
      update,
      given({
        ...initialModel,
        phase: GamePhase.cases.PhaseTwo.make({}),
        moveHistory: [2, 4],
        isCustomSetupMode: true,
      }),
      message(ClickedCustomTile({ index: 1 })),
      model(next => {
        expect(next.gameState).toEqual([false, false, false, true, false, true])
        expect(next.phase).toEqual(GamePhase.cases.Initial.make({}))
        expect(next.moveHistory).toEqual([])
        expect(next.isCustomSetupMode).toBe(true)
      }),
    )
  })

  test('even a uniform custom state starts in Initial', () => {
    expect(startRun([false, false, false, false, false, false])).toEqual({
      gameState: [false, false, false, false, false, false],
      phase: GamePhase.cases.Initial.make({}),
      moveHistory: [],
    })
  })

  test('Reset preserves component UI state like React', () => {
    const changedModel = {
      ...initialModel,
      gameState: [true, true, true, true, true, true] as const,
      phase: GamePhase.cases.PhaseTwo.make({}),
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
        expect(next.phase).toEqual(GamePhase.cases.Initial.make({}))
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
