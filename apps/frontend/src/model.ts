import { Schema } from 'effect'
import { applyMove, isAllSame, type GameState } from '@app/solver'

export const initialGameState = [false, true, false, true, false, true] as const

export const TileIndex = Schema.Literals([0, 1, 2, 3, 4, 5])
export type TileIndex = typeof TileIndex.Type
export const decodeTileIndex = Schema.decodeUnknownSync(TileIndex)

export const tiles = [
  { id: 0, move: [0, 1, 3], gridColumn: '1 / 2', gridRow: '1 / 2' },
  { id: 1, move: [1, 0], gridColumn: '2 / 3', gridRow: '1 / 2' },
  { id: 2, move: [2, 5], gridColumn: '3 / 4', gridRow: '1 / 2' },
  { id: 3, move: [3, 0, 4], gridColumn: '6 / 7', gridRow: '1 / 2' },
  { id: 4, move: [4, 5, 3], gridColumn: '4 / 5', gridRow: '2 / 3' },
  { id: 5, move: [5, 4, 2], gridColumn: '5 / 6', gridRow: '2 / 3' },
] as const

export const possibleMoves = tiles.map(tile => tile.move)

export const GameStateSchema = Schema.Tuple([
  Schema.Boolean,
  Schema.Boolean,
  Schema.Boolean,
  Schema.Boolean,
  Schema.Boolean,
  Schema.Boolean,
])

export const decodeGameState = Schema.decodeUnknownSync(GameStateSchema)

export const GameProgress = Schema.TaggedUnion({
  SeekingFirstUniform: {},
  // The target is opposite the first uniform board: first false means target
  // true, and first true means target false. Both directions are tested.
  SeekingOpposite: { targetValue: Schema.Boolean },
  OppositeReached: { targetValue: Schema.Boolean },
})
export type GameProgress = typeof GameProgress.Type

export const GameRun = Schema.Struct({
  startingBoard: GameStateSchema,
  moveHistory: Schema.Array(TileIndex),
})
export type GameRun = typeof GameRun.Type

export const Model = Schema.Struct({
  run: GameRun,
  showSolution: Schema.Boolean,
  isCustomSetupMode: Schema.Boolean,
})
export interface Model extends Schema.Schema.Type<typeof Model> {}

export const startRun = (gameState: GameState): GameRun => {
  if (gameState.length !== 6) {
    throw new Error(`Expected a six-tile game state, received ${gameState.length}`)
  }

  return {
    startingBoard: decodeGameState(gameState),
    moveHistory: [],
  }
}

export interface ReplayedRun {
  readonly gameState: typeof GameStateSchema.Type
  readonly progress: GameProgress
}

const progressForNewRun = (gameState: typeof GameStateSchema.Type): GameProgress =>
  isAllSame(gameState)
    ? GameProgress.cases.SeekingOpposite.make({
        targetValue: !gameState[0],
      })
    : GameProgress.cases.SeekingFirstUniform.make({})

const advanceProgress = (
  progress: GameProgress,
  gameState: typeof GameStateSchema.Type,
): GameProgress => {
  if (
    progress._tag === 'SeekingFirstUniform' &&
    isAllSame(gameState)
  ) {
    return GameProgress.cases.SeekingOpposite.make({
      targetValue: !gameState[0],
    })
  }
  if (
    progress._tag === 'SeekingOpposite' &&
    isAllSame(gameState) &&
    gameState[0] === progress.targetValue
  ) {
    return GameProgress.cases.OppositeReached.make({
      targetValue: progress.targetValue,
    })
  }
  return progress
}

export const replayRun = (run: GameRun): ReplayedRun =>
  run.moveHistory.reduce<ReplayedRun>(
    (current, index) => {
      const move = possibleMoves[index]
      if (move === undefined) {
        throw new Error(`No move exists for tile ${index}`)
      }
      const gameState = decodeGameState(
        applyMove(current.gameState, move),
      )
      return {
        gameState,
        progress: advanceProgress(current.progress, gameState),
      }
    },
    {
      gameState: run.startingBoard,
      progress: progressForNewRun(run.startingBoard),
    },
  )

export const initialModel: Model = {
  run: startRun(initialGameState),
  showSolution: false,
  isCustomSetupMode: false,
}
