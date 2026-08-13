import * as path from 'node:path'
import { readFileSync } from 'node:fs'
import { defineDriver, stateCheck } from '@firfi/quint-connect'
import { quintTest } from '@firfi/quint-connect/vitest-simple'
import { ITFBigInt } from '@firfi/quint-connect/zod'
import { describe, expect, test } from 'vitest'
import { z } from 'zod'
import { applyMove, isAllSame, type GameState } from '@app/solver'

import { deriveGameView } from '../../frontend/src/derived'
import {
  ClickedCustomTile,
  ClickedReset,
  ClickedTile,
} from '../../frontend/src/message'
import type { Message } from '../../frontend/src/message'
import {
  decodeTileIndex,
  initialModel,
  possibleMoves,
  type Model,
  type TileIndex,
} from '../../frontend/src/model'
import { update } from '../../frontend/src/update'

const Board = z.tuple([
  z.boolean(),
  z.boolean(),
  z.boolean(),
  z.boolean(),
  z.boolean(),
  z.boolean(),
])

const puzzleSpecPath = path.join(
  import.meta.dirname,
  '..',
  '..',
  'frontend',
  'specs',
  'puzzle.qnt',
)

const puzzleSpec = readFileSync(puzzleSpecPath, 'utf8')
const distanceTable = (name: string): ReadonlyArray<number> => {
  const match = puzzleSpec.match(
    new RegExp(`pure val ${name} = List\\(([\\s\\S]*?)\\n  \\)`),
  )
  if (match?.[1] === undefined) {
    throw new Error(`Could not read ${name} from the Quint model`)
  }

  const values = [...match[1].matchAll(/\d+/g)].map(value => Number(value[0]))
  if (values.length !== 64) {
    throw new Error(`Expected 64 entries in ${name}, received ${values.length}`)
  }
  return values
}

const distanceToFalse = distanceTable('DISTANCE_TO_FALSE')
const distanceToTrue = distanceTable('DISTANCE_TO_TRUE')
const distanceToUniform = distanceTable('DISTANCE_TO_UNIFORM')

const AbstractPhase = z.discriminatedUnion('_tag', [
  z.object({ _tag: z.literal('Initial') }),
  z.object({ _tag: z.literal('PhaseOne'), targetValue: z.boolean() }),
  z.object({ _tag: z.literal('PhaseTwo'), targetValue: z.boolean() }),
])

const AbstractPuzzleState = z.object({
  board: Board,
  phase: AbstractPhase,
  atPhaseGoal: z.boolean(),
  solutionDistance: z.number().int().min(0).max(6),
})

type AbstractPuzzleState = z.infer<typeof AbstractPuzzleState>

const QuintPuzzleState = z.object({
  board: Board,
  atPhaseGoal: z.boolean(),
  solutionDistance: ITFBigInt,
  phase: z.object({
    tag: z.enum(['Initial', 'PhaseOne', 'PhaseTwo']),
    value: z.unknown(),
  }),
})

const tileIndexFromBigInt = (value: bigint): TileIndex =>
  decodeTileIndex(Number(value))

const applySolution = (
  gameState: GameState,
  moves: ReadonlyArray<number>,
): GameState =>
  moves.reduce(
    (state, moveIndex) =>
      applyMove(state, possibleMoves[moveIndex] ?? []),
    gameState,
  )

const assertGuidanceReachesModeledGoal = (model: Model): void => {
  const view = deriveGameView(model)
  const destination = applySolution(model.gameState, view.currentSolution)

  if (model.phase._tag === 'Initial') {
    expect(isAllSame(destination)).toBe(true)
    return
  }

  const { targetValue } = model.phase
  expect(destination.every(value => value === targetValue)).toBe(true)
}

const formalSolutionDistance = (model: Model): number => {
  const code = model.gameState.reduce(
    (encoded, value, index) => encoded + (value ? 2 ** index : 0),
    0,
  )
  if (model.phase._tag === 'Initial') return distanceToUniform[code] ?? -1
  const table = model.phase.targetValue ? distanceToTrue : distanceToFalse
  return table[code] ?? -1
}

const abstractState = (model: Model): AbstractPuzzleState => {
  assertGuidanceReachesModeledGoal(model)
  return {
    board: [...model.gameState],
    phase: model.phase,
    atPhaseGoal: deriveGameView(model).isAtPhaseGoal,
    solutionDistance: deriveGameView(model).currentSolution.length,
  }
}

const decodeQuintState = (raw: unknown): AbstractPuzzleState => {
  const state = QuintPuzzleState.parse(raw)
  switch (state.phase.tag) {
    case 'Initial':
      return {
        board: state.board,
        phase: { _tag: 'Initial' },
        atPhaseGoal: state.atPhaseGoal,
        solutionDistance: Number(state.solutionDistance),
      }
    case 'PhaseOne':
      return {
        board: state.board,
        phase: {
          _tag: 'PhaseOne',
          targetValue: z.boolean().parse(state.phase.value),
        },
        atPhaseGoal: state.atPhaseGoal,
        solutionDistance: Number(state.solutionDistance),
      }
    case 'PhaseTwo':
      return {
        board: state.board,
        phase: {
          _tag: 'PhaseTwo',
          targetValue: z.boolean().parse(state.phase.value),
        },
        atPhaseGoal: state.atPhaseGoal,
        solutionDistance: Number(state.solutionDistance),
      }
  }
}

const phasesEqual = (
  left: AbstractPuzzleState['phase'],
  right: AbstractPuzzleState['phase'],
): boolean => {
  if (left._tag !== right._tag) return false
  if (left._tag === 'Initial' || right._tag === 'Initial') return true
  return left.targetValue === right.targetValue
}

const puzzleDriver = defineDriver(
  {
    init: {},
    Press: { tile: ITFBigInt },
    CustomTile: { tile: ITFBigInt },
    Reset: {},
  },
  () => {
    let model = initialModel

    return {
      init: () => {
        model = initialModel
      },
      Press: ({ tile }) => {
        model = update(
          model,
          ClickedTile({ index: tileIndexFromBigInt(tile) }),
        )[0]
      },
      CustomTile: ({ tile }) => {
        model = update(
          model,
          ClickedCustomTile({ index: tileIndexFromBigInt(tile) }),
        )[0]
      },
      Reset: () => {
        model = update(model, ClickedReset())[0]
      },
      getState: () => abstractState(model),
      config: () => ({ statePath: ['puzzleState'] }),
    }
  },
)

describe('Puzzle Quint model', () => {
  quintTest(
    test,
    'replays modeled actions through the production reducer and solver',
    {
      spec: puzzleSpecPath,
      driver: puzzleDriver,
      stateCheck: stateCheck(
        decodeQuintState,
        (spec, implementation) =>
          AbstractPuzzleState.safeParse(implementation).success &&
          spec.board.every(
            (value, index) => implementation.board[index] === value,
          ) &&
          spec.atPhaseGoal === implementation.atPhaseGoal &&
          spec.solutionDistance === implementation.solutionDistance &&
          phasesEqual(spec.phase, implementation.phase),
      ),
      nTraces: 50,
      maxSteps: 20,
      maxSamples: 2_000,
      seed: '590083',
      backend: 'typescript',
    },
    120_000,
  )

  test('production guidance is valid across every reachable core state', () => {
    const actions: ReadonlyArray<Message> = [
      ...possibleMoves.map((_, index) =>
        ClickedTile({ index: decodeTileIndex(index) }),
      ),
      ...possibleMoves.map((_, index) =>
        ClickedCustomTile({ index: decodeTileIndex(index) }),
      ),
      ClickedReset(),
    ]
    const queue: Array<{ model: Model; distance: number }> = [
      { model: initialModel, distance: 0 },
    ]
    const visited = new Set<string>()
    let maximumDistance = 0

    while (queue.length > 0) {
      const current = queue.shift()
      if (current === undefined) break
      const key = JSON.stringify({
        gameState: current.model.gameState,
        phase: current.model.phase,
      })
      if (visited.has(key)) continue

      visited.add(key)
      maximumDistance = Math.max(maximumDistance, current.distance)
      assertGuidanceReachesModeledGoal(current.model)
      expect(deriveGameView(current.model).currentSolution.length).toBe(
        formalSolutionDistance(current.model),
      )

      for (const action of actions) {
        queue.push({
          model: update(current.model, action)[0],
          distance: current.distance + 1,
        })
      }
    }

    expect(visited.size).toBe(316)
    expect(maximumDistance).toBe(11)
    expect(maximumDistance).toBeLessThan(20)
  })
})
