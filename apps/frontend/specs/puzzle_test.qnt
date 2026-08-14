module puzzle_test {
  import puzzle.* from "./puzzle"

  run oppositePathTest =
    init
      .then(PressWith(0))
      .then(PressWith(3))
      .then(PressWith(4))
      .expect(puzzleState.progress == SeekingOpposite(true))
      .then(PressWith(0))
      .expect(puzzleState.progress == SeekingOpposite(true))
      .then(PressWith(5))
      .expect(puzzleState.progress == OppositeReached(true))
      .then(PressWith(0))
      .expect(and {
        puzzleState.progress == OppositeReached(true),
        not(isUniform(puzzleState.board)),
      })

  action PressWith(tile: int): bool = all {
    isTile(tile),
    puzzleState' = applyPress(puzzleState, tile),
  }

  run customUniformStartsOppositeTest =
    init
      .then(CustomTileWith(1))
      .then(CustomTileWith(3))
      .then(CustomTileWith(5))
      .expect(puzzleState.progress == SeekingOpposite(true))

  run customTrueUniformTargetsFalseTest =
    init
      .then(CustomTileWith(0))
      .then(CustomTileWith(2))
      .then(CustomTileWith(4))
      .expect(puzzleState.progress == SeekingOpposite(false))

  run resetReturnsToInitialTest =
    init
      .then(PressWith(0))
      .then(Reset)
      .expect(and {
        puzzleState.board == INITIAL_BOARD,
        puzzleState.progress == SeekingFirstUniform,
        not(isAtProgressGoal(puzzleState.board, puzzleState.progress)),
      })

  action CustomTileWith(tile: int): bool = all {
    isTile(tile),
    puzzleState' = applyCustomTile(puzzleState, tile),
  }
}
