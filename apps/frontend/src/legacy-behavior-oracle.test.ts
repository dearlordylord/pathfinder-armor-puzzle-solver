import fc from 'fast-check'
import { describe, expect, test } from 'vitest'
import {
  applyMove,
  isAllFalse,
  isAllTrue,
  solution,
  type GameState,
  type PossibleMoves,
  type Solution,
} from '@app/solver'

import { deriveGameView } from './derived'
import {
  ClickedCustomTile,
  ClickedReset,
  ClickedTile,
  ClickedToggleCustomSetup,
  ClickedToggleSolution,
} from './message'
import {
  decodeTileIndex,
  initialGameState,
  initialModel,
  possibleMoves,
  type Model,
  type TileIndex,
} from './model'
import { update } from './update'

type LegacyPhase = 'initial' | 'phase_one' | 'phase_two' | 'completed'

interface LegacyState {
  gameState: GameState
  phase: LegacyPhase
  moveHistory: Array<number>
  showSolution: boolean
  isCustomSetupMode: boolean
}

type UserAction =
  | { readonly type: 'tile'; readonly index: TileIndex }
  | { readonly type: 'toggle-solution' }
  | { readonly type: 'reset' }
  | { readonly type: 'toggle-custom' }
  | { readonly type: 'custom-tile'; readonly index: TileIndex }

// Frozen from the pre-Foldkit implementation at f590aeb. This intentionally
// framework-free model remains an independent differential regression oracle.
const legacyNextPhase = (
  phase: LegacyPhase,
  gameState: GameState,
  moveHistory: ReadonlyArray<number>,
): LegacyPhase => {
  const allSame = legacyIsAllSame(gameState)
  if (allSame && phase === 'initial') {
    return 'phase_one'
  } else if (
    allSame &&
    (phase === 'phase_one' || phase === 'phase_two')
  ) {
    return 'phase_two'
  } else if (!allSame && phase === 'phase_two') {
    return 'phase_one'
  } else if (allSame && moveHistory.length > 0 && phase === 'phase_two') {
    return 'completed'
  }
  return phase
}

const legacyApplyMove = (state: GameState, move: ReadonlyArray<number>): GameState =>
  state.map((value, index) => (move.includes(index) ? !value : value))

const legacyIsAllTrue = (state: GameState): boolean =>
  state.every(value => value === true)

const legacyIsAllFalse = (state: GameState): boolean =>
  state.every(value => value === false)

const legacyIsAllSame = (state: GameState): boolean =>
  legacyIsAllTrue(state) || legacyIsAllFalse(state)

const legacyFindPath = (
  initialState: GameState,
  moves: PossibleMoves,
  isTarget: (state: GameState) => boolean,
): Solution => {
  const queue: Array<{ state: GameState; path: Array<number> }> = [
    { state: [...initialState], path: [] },
  ]
  const visited = new Set([JSON.stringify(initialState)])

  while (queue.length > 0) {
    const current = queue.shift()
    if (current === undefined) break
    if (isTarget(current.state)) return current.path

    for (let moveIndex = 0; moveIndex < moves.length; moveIndex += 1) {
      const move = moves[moveIndex]
      if (move === undefined) continue
      const nextState = legacyApplyMove(current.state, move)
      const key = JSON.stringify(nextState)
      if (!visited.has(key)) {
        visited.add(key)
        queue.push({ state: nextState, path: [...current.path, moveIndex] })
      }
    }
  }

  return []
}

const legacySolution = (
  state: GameState,
  moves: PossibleMoves,
): readonly [Solution, Solution] => {
  const first = legacyFindPath(state, moves, legacyIsAllSame)
  const afterFirst = first.reduce<GameState>(
    (current, moveIndex) =>
      legacyApplyMove(current, moves[moveIndex] ?? []),
    [...state],
  )
  const second = legacyFindPath(
    afterFirst,
    moves,
    legacyIsAllTrue(afterFirst) ? legacyIsAllFalse : legacyIsAllTrue,
  )
  return [first, second]
}

const initialLegacyState = (): LegacyState => ({
  gameState: [...initialGameState],
  phase: 'initial',
  moveHistory: [],
  showSolution: false,
  isCustomSetupMode: false,
})

const legacyStep = (state: LegacyState, action: UserAction): LegacyState => {
  switch (action.type) {
    case 'tile': {
      const gameState = legacyApplyMove(
        state.gameState,
        possibleMoves[action.index] ?? [],
      )
      const moveHistory = [...state.moveHistory, action.index]
      return {
        ...state,
        gameState,
        moveHistory,
        phase: legacyNextPhase(state.phase, gameState, moveHistory),
      }
    }
    case 'toggle-solution':
      return { ...state, showSolution: !state.showSolution }
    case 'reset':
      return {
        ...state,
        gameState: [...initialGameState],
        phase: 'initial',
        moveHistory: [],
      }
    case 'toggle-custom':
      return { ...state, isCustomSetupMode: !state.isCustomSetupMode }
    case 'custom-tile':
      if (!state.isCustomSetupMode) return state
      return {
        ...state,
        gameState: state.gameState.map((value, index) =>
          index === action.index ? !value : value,
        ),
        phase: 'initial',
        moveHistory: [],
      }
  }
}

const foldkitStep = (model: Model, action: UserAction): Model => {
  switch (action.type) {
    case 'tile':
      return update(model, ClickedTile({ index: action.index }))[0]
    case 'toggle-solution':
      return update(model, ClickedToggleSolution())[0]
    case 'reset':
      return update(model, ClickedReset())[0]
    case 'toggle-custom':
      return update(model, ClickedToggleCustomSetup())[0]
    case 'custom-tile':
      return model.isCustomSetupMode
        ? update(model, ClickedCustomTile({ index: action.index }))[0]
        : model
  }
}

const phaseFromFoldkit = (model: Model): LegacyPhase => {
  switch (model.phase._tag) {
    case 'Initial':
      return 'initial'
    case 'PhaseOne':
      return 'phase_one'
    case 'PhaseTwo':
      return 'phase_two'
  }
}

const legacySolutionsByBoard = new Map<
  string,
  readonly [Solution, Solution]
>()

const cachedLegacySolution = (
  gameState: GameState,
): readonly [Solution, Solution] => {
  const key = JSON.stringify(gameState)
  const cached = legacySolutionsByBoard.get(key)
  if (cached !== undefined) return cached
  const solved = legacySolution(gameState, possibleMoves)
  legacySolutionsByBoard.set(key, solved)
  return solved
}

const legacyObservable = (state: LegacyState) => {
  const solutions = cachedLegacySolution(state.gameState)
  return {
    gameState: state.gameState,
    phase: state.phase,
    moveHistory: state.moveHistory,
    showSolution: state.showSolution,
    isCustomSetupMode: state.isCustomSetupMode,
    isAllSame: legacyIsAllSame(state.gameState),
    currentSolution:
      state.phase === 'phase_two' || state.phase === 'completed'
        ? solutions[1]
        : solutions[0],
    nextSolution:
      state.phase === 'initial' || state.phase === 'phase_one'
        ? solutions[1]
        : null,
  }
}

const foldkitViews = new Map<string, ReturnType<typeof deriveGameView>>()

const foldkitObservable = (model: Model) => {
  const key = JSON.stringify([model.gameState, model.phase])
  let derived = foldkitViews.get(key)
  if (derived === undefined) {
    derived = deriveGameView(model)
    foldkitViews.set(key, derived)
  }
  return {
    gameState: model.gameState,
    phase: phaseFromFoldkit(model),
    moveHistory: model.moveHistory,
    showSolution: model.showSolution,
    isCustomSetupMode: model.isCustomSetupMode,
    isAllSame: derived.isAllSame,
    currentSolution: derived.currentSolution,
    nextSolution: derived.nextSolution,
  }
}

const unchangedLegacyObservable = (state: LegacyState) => ({
  gameState: state.gameState,
  moveHistory: state.moveHistory,
  showSolution: state.showSolution,
  isCustomSetupMode: state.isCustomSetupMode,
})

const unchangedFoldkitObservable = (model: Model) => ({
  gameState: model.gameState,
  moveHistory: model.moveHistory,
  showSolution: model.showSolution,
  isCustomSetupMode: model.isCustomSetupMode,
})

const assertUnchangedParity = (legacy: LegacyState, foldkit: Model): void => {
  expect(unchangedFoldkitObservable(foldkit)).toEqual(
    unchangedLegacyObservable(legacy),
  )
}

const assertTargetSolution = (model: Model): void => {
  if (model.phase._tag === 'Initial') return
  const { targetValue } = model.phase

  const solved = deriveGameView(model).currentSolution.reduce<GameState>(
    (state, moveIndex) =>
      applyMove(state, possibleMoves[moveIndex] ?? []),
    model.gameState,
  )
  expect(solved.every(value => value === targetValue)).toBe(true)
}

const allActions: ReadonlyArray<UserAction> = [
  ...possibleMoves.map((_, index) => ({
    type: 'tile' as const,
    index: decodeTileIndex(index),
  })),
  { type: 'toggle-solution' },
  { type: 'reset' },
  { type: 'toggle-custom' },
  ...possibleMoves.map((_, index) => ({
    type: 'custom-tile' as const,
    index: decodeTileIndex(index),
  })),
]

const actionArbitrary: fc.Arbitrary<UserAction> = fc.oneof(
  fc.record({
    type: fc.constant('tile' as const),
    index: fc.integer({ min: 0, max: 5 }).map(decodeTileIndex),
  }),
  fc.constant({ type: 'toggle-solution' as const }),
  fc.constant({ type: 'reset' as const }),
  fc.constant({ type: 'toggle-custom' as const }),
  fc.record({
    type: fc.constant('custom-tile' as const),
    index: fc.integer({ min: 0, max: 5 }).map(decodeTileIndex),
  }),
)

describe('Legacy behavior differential oracle', () => {
  test('preserves the Legacy solver result for every six-tile board', () => {
    for (let mask = 0; mask < 64; mask += 1) {
      const state = Array.from(
        { length: 6 },
        (_, index) => (mask & (1 << index)) !== 0,
      )
      expect(applyMove(state, possibleMoves[0] ?? [])).toEqual(
        legacyApplyMove(state, possibleMoves[0] ?? []),
      )
      expect(isAllTrue(state)).toBe(legacyIsAllTrue(state))
      expect(isAllFalse(state)).toBe(legacyIsAllFalse(state))
      expect(solution(state, possibleMoves)).toEqual(
        legacySolution(state, possibleMoves),
      )
    }
  })

  test('intentionally keeps the opposite target where Legacy abandons it', () => {
    const uniformLegacy: LegacyState = {
      ...initialLegacyState(),
      gameState: [true, true, true, true, true, true],
      phase: 'phase_one',
    }
    const uniformFoldkit: Model = {
      ...initialModel,
      gameState: [true, true, true, true, true, true],
      phase: { _tag: 'PhaseOne', targetValue: false },
    }

    expect(legacyObservable(uniformLegacy).nextSolution).toEqual([0, 5])

    const action: UserAction = { type: 'tile', index: 0 }
    const nextLegacy = legacyStep(uniformLegacy, action)
    const nextFoldkit = foldkitStep(uniformFoldkit, action)

    expect(legacyObservable(nextLegacy).currentSolution).toEqual([0])
    expect(foldkitObservable(nextFoldkit).currentSolution).toEqual([5])
    assertUnchangedParity(nextLegacy, nextFoldkit)
    assertTargetSolution(nextFoldkit)
  })

  test('preserves non-solution Legacy behavior through every reachable path pair', () => {
    const queue: Array<{ legacy: LegacyState; foldkit: Model }> = [
      { legacy: initialLegacyState(), foldkit: initialModel },
    ]
    const visited = new Set<string>()

    while (queue.length > 0) {
      const pair = queue.shift()
      if (pair === undefined) break
      assertUnchangedParity(pair.legacy, pair.foldkit)
      assertTargetSolution(pair.foldkit)

      const key = JSON.stringify({
        gameState: pair.legacy.gameState,
        phase: pair.legacy.phase,
        foldkitPhase: pair.foldkit.phase,
        showSolution: pair.legacy.showSolution,
        isCustomSetupMode: pair.legacy.isCustomSetupMode,
      })
      if (visited.has(key)) continue
      visited.add(key)

      for (const action of allActions) {
        const legacy = legacyStep(pair.legacy, action)
        const foldkit = foldkitStep(pair.foldkit, action)
        assertUnchangedParity(legacy, foldkit)
        assertTargetSolution(foldkit)
        queue.push({ legacy, foldkit })
      }
    }

    expect(visited.size).toBeGreaterThan(500)
  }, 15_000)

  test('preserves non-solution behavior and target correctness across fuzzed paths', () => {
    fc.assert(
      fc.property(
        fc.array(actionArbitrary, { minLength: 0, maxLength: 200 }),
        actions => {
          let legacy = initialLegacyState()
          let foldkit = initialModel
          assertUnchangedParity(legacy, foldkit)
          assertTargetSolution(foldkit)

          for (const action of actions) {
            legacy = legacyStep(legacy, action)
            foldkit = foldkitStep(foldkit, action)
            assertUnchangedParity(legacy, foldkit)
            assertTargetSolution(foldkit)
          }
        },
      ),
      { numRuns: 1_000, seed: 590_083 },
    )
  })
})
