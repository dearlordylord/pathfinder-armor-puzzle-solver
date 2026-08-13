import { Schema } from 'effect'
import type { GameState } from '@app/solver'

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

export const GamePhase = Schema.TaggedUnion({
  Initial: {},
  PhaseOne: { targetValue: Schema.Boolean },
  PhaseTwo: { targetValue: Schema.Boolean },
})
export type GamePhase = typeof GamePhase.Type

export const Model = Schema.Struct({
  gameState: GameStateSchema,
  phase: GamePhase,
  moveHistory: Schema.Array(Schema.Number),
  showSolution: Schema.Boolean,
  isCustomSetupMode: Schema.Boolean,
})
export interface Model extends Schema.Schema.Type<typeof Model> {}

export const startRun = (
  gameState: GameState,
): Pick<Model, 'gameState' | 'phase' | 'moveHistory'> => {
  if (gameState.length !== 6) {
    throw new Error(`Expected a six-tile game state, received ${gameState.length}`)
  }

  const fixedGameState = decodeGameState(gameState)
  const isUniform = fixedGameState.every(value => value === fixedGameState[0])

  return {
    gameState: fixedGameState,
    phase: isUniform
      ? GamePhase.cases.PhaseOne.make({ targetValue: !fixedGameState[0] })
      : GamePhase.cases.Initial.make({}),
    moveHistory: [],
  }
}

export const initialModel: Model = {
  ...startRun(initialGameState),
  showSolution: false,
  isCustomSetupMode: false,
}
