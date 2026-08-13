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
  ClickedApplyCustomSetup,
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

type ReactPhase = 'initial' | 'phase_one' | 'phase_two' | 'completed'

interface ReactState {
  gameState: GameState
  phase: ReactPhase
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
  | { readonly type: 'apply-custom' }

// Frozen from the React implementation at f590aeb. Keeping this imperative and
// separate from Foldkit makes it an independent differential oracle.
const reactNextPhase = (
  phase: ReactPhase,
  gameState: GameState,
  moveHistory: ReadonlyArray<number>,
): ReactPhase => {
  const allSame = reactIsAllSame(gameState)
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

const reactApplyMove = (state: GameState, move: ReadonlyArray<number>): GameState =>
  state.map((value, index) => (move.includes(index) ? !value : value))

const reactIsAllTrue = (state: GameState): boolean =>
  state.every(value => value === true)

const reactIsAllFalse = (state: GameState): boolean =>
  state.every(value => value === false)

const reactIsAllSame = (state: GameState): boolean =>
  reactIsAllTrue(state) || reactIsAllFalse(state)

const reactFindPath = (
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
      const nextState = reactApplyMove(current.state, move)
      const key = JSON.stringify(nextState)
      if (!visited.has(key)) {
        visited.add(key)
        queue.push({ state: nextState, path: [...current.path, moveIndex] })
      }
    }
  }

  return []
}

const reactSolution = (
  state: GameState,
  moves: PossibleMoves,
): readonly [Solution, Solution] => {
  const first = reactFindPath(state, moves, reactIsAllSame)
  const afterFirst = first.reduce<GameState>(
    (current, moveIndex) =>
      reactApplyMove(current, moves[moveIndex] ?? []),
    [...state],
  )
  const second = reactFindPath(
    afterFirst,
    moves,
    reactIsAllTrue(afterFirst) ? reactIsAllFalse : reactIsAllTrue,
  )
  return [first, second]
}

const initialReactState = (): ReactState => ({
  gameState: [...initialGameState],
  phase: 'initial',
  moveHistory: [],
  showSolution: false,
  isCustomSetupMode: false,
})

const reactStep = (state: ReactState, action: UserAction): ReactState => {
  switch (action.type) {
    case 'tile': {
      const gameState = reactApplyMove(
        state.gameState,
        possibleMoves[action.index] ?? [],
      )
      const moveHistory = [...state.moveHistory, action.index]
      return {
        ...state,
        gameState,
        moveHistory,
        phase: reactNextPhase(state.phase, gameState, moveHistory),
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
    case 'apply-custom':
      return state.isCustomSetupMode
        ? { ...state, isCustomSetupMode: false }
        : state
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
    case 'apply-custom':
      return model.isCustomSetupMode
        ? update(model, ClickedApplyCustomSetup())[0]
        : model
  }
}

const phaseFromFoldkit = (model: Model): ReactPhase => {
  switch (model.phase._tag) {
    case 'Initial':
      return 'initial'
    case 'PhaseOne':
      return 'phase_one'
    case 'PhaseTwo':
      return 'phase_two'
  }
}

const reactSolutionsByBoard = new Map<
  string,
  readonly [Solution, Solution]
>()

const cachedReactSolution = (
  gameState: GameState,
): readonly [Solution, Solution] => {
  const key = JSON.stringify(gameState)
  const cached = reactSolutionsByBoard.get(key)
  if (cached !== undefined) return cached
  const solved = reactSolution(gameState, possibleMoves)
  reactSolutionsByBoard.set(key, solved)
  return solved
}

const reactObservable = (state: ReactState) => {
  const solutions = cachedReactSolution(state.gameState)
  return {
    gameState: state.gameState,
    phase: state.phase,
    moveHistory: state.moveHistory,
    showSolution: state.showSolution,
    isCustomSetupMode: state.isCustomSetupMode,
    isAllSame: reactIsAllSame(state.gameState),
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
  const key = JSON.stringify([model.gameState, model.phase._tag])
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

const assertParity = (react: ReactState, foldkit: Model): void => {
  expect(foldkitObservable(foldkit)).toEqual(reactObservable(react))
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
  { type: 'apply-custom' },
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
  fc.constant({ type: 'apply-custom' as const }),
)

describe('React migration differential oracle', () => {
  test('preserves the React solver result for every six-tile board', () => {
    for (let mask = 0; mask < 64; mask += 1) {
      const state = Array.from(
        { length: 6 },
        (_, index) => (mask & (1 << index)) !== 0,
      )
      expect(applyMove(state, possibleMoves[0] ?? [])).toEqual(
        reactApplyMove(state, possibleMoves[0] ?? []),
      )
      expect(isAllTrue(state)).toBe(reactIsAllTrue(state))
      expect(isAllFalse(state)).toBe(reactIsAllFalse(state))
      expect(solution(state, possibleMoves)).toEqual(
        reactSolution(state, possibleMoves),
      )
    }
  })

  test('recommends React’s recomputed shortest path after a partial Step 2 path', () => {
    const uniformReact: ReactState = {
      ...initialReactState(),
      gameState: [true, true, true, true, true, true],
      phase: 'phase_one',
    }
    const uniformFoldkit: Model = {
      ...initialModel,
      gameState: [true, true, true, true, true, true],
      phase: { _tag: 'PhaseOne' },
    }

    expect(reactObservable(uniformReact).nextSolution).toEqual([0, 5])

    const action: UserAction = { type: 'tile', index: 0 }
    const nextReact = reactStep(uniformReact, action)
    const nextFoldkit = foldkitStep(uniformFoldkit, action)

    expect(reactObservable(nextReact).currentSolution).toEqual([0])
    assertParity(nextReact, nextFoldkit)
  })

  test('matches React through every reachable observable state and action', () => {
    const queue: Array<{ react: ReactState; foldkit: Model }> = [
      { react: initialReactState(), foldkit: initialModel },
    ]
    const visited = new Set<string>()

    while (queue.length > 0) {
      const pair = queue.shift()
      if (pair === undefined) break
      assertParity(pair.react, pair.foldkit)

      const key = JSON.stringify({
        gameState: pair.react.gameState,
        phase: pair.react.phase,
        showSolution: pair.react.showSolution,
        isCustomSetupMode: pair.react.isCustomSetupMode,
      })
      if (visited.has(key)) continue
      visited.add(key)

      for (const action of allActions) {
        const react = reactStep(pair.react, action)
        const foldkit = foldkitStep(pair.foldkit, action)
        assertParity(react, foldkit)
        queue.push({ react, foldkit })
      }
    }

    expect(visited.size).toBe(520)
  })

  test('matches React across long fuzzed user paths', () => {
    fc.assert(
      fc.property(
        fc.array(actionArbitrary, { minLength: 0, maxLength: 200 }),
        actions => {
          let react = initialReactState()
          let foldkit = initialModel
          assertParity(react, foldkit)

          for (const action of actions) {
            react = reactStep(react, action)
            foldkit = foldkitStep(foldkit, action)
            assertParity(react, foldkit)
          }
        },
      ),
      { numRuns: 1_000, seed: 590_083 },
    )
  })
})
