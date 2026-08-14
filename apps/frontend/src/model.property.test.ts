import { Schema } from 'effect'
import fc from 'fast-check'
import { describe, expect, test } from 'vitest'
import { applyMove, isAllSame, type GameState } from '@app/solver'

import {
  decodeTileIndex,
  GameRun,
  possibleMoves,
  replayRun,
  startRun,
} from './model'

const boardArbitrary = fc.tuple(
  fc.boolean(),
  fc.boolean(),
  fc.boolean(),
  fc.boolean(),
  fc.boolean(),
  fc.boolean(),
)

const tileIndexArbitrary = fc
  .integer({ min: 0, max: possibleMoves.length - 1 })
  .map(decodeTileIndex)

describe('game run properties', () => {
  test('replay agrees with applying the recorded moves directly', () => {
    fc.assert(
      fc.property(
        boardArbitrary,
        fc.array(tileIndexArbitrary, { maxLength: 40 }),
        (startingBoard, moveHistory) => {
          const run = { ...startRun(startingBoard), moveHistory }
          const expectedBoard = moveHistory.reduce<GameState>(
            (board, index) => applyMove(board, possibleMoves[index] ?? []),
            startingBoard,
          )

          expect(replayRun(run).gameState).toEqual(expectedBoard)
        },
      ),
      { numRuns: 200 },
    )
  })

  test('appending a move advances exactly one board transition', () => {
    fc.assert(
      fc.property(
        boardArbitrary,
        fc.array(tileIndexArbitrary, { maxLength: 40 }),
        tileIndexArbitrary,
        (startingBoard, moveHistory, index) => {
          const run = { ...startRun(startingBoard), moveHistory }
          const before = replayRun(run)
          const after = replayRun({
            ...run,
            moveHistory: [...moveHistory, index],
          })

          expect(after.gameState).toEqual(
            applyMove(before.gameState, possibleMoves[index] ?? []),
          )
        },
      ),
      { numRuns: 200 },
    )
  })

  test('replayed progress never contradicts the current board', () => {
    fc.assert(
      fc.property(
        boardArbitrary,
        fc.array(tileIndexArbitrary, { maxLength: 40 }),
        (startingBoard, moveHistory) => {
          const { gameState, progress } = replayRun({
            ...startRun(startingBoard),
            moveHistory,
          })

          if (progress._tag === 'SeekingFirstUniform') {
            expect(isAllSame(gameState)).toBe(false)
          }
          if (progress._tag === 'SeekingOpposite' && isAllSame(gameState)) {
            expect(gameState[0]).not.toBe(progress.targetValue)
          }
        },
      ),
      { numRuns: 200 },
    )
  })

  test.each([-1, 6, 1.5])(
    'GameRun rejects invalid move index %s',
    invalidIndex => {
      expect(() =>
        Schema.decodeUnknownSync(GameRun)({
          startingBoard: [false, true, false, true, false, true],
          moveHistory: [invalidIndex],
        }),
      ).toThrow()
    },
  )
})
