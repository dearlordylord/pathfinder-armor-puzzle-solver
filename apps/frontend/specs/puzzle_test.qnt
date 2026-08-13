module puzzle_test {
  import puzzle.* from "./puzzle"

  run oppositePathTest =
    init
      .then(PressWith(0))
      .then(PressWith(3))
      .then(PressWith(4))
      .expect(puzzleState.phase == PhaseOne(true))
      .then(PressWith(0))
      .expect(puzzleState.phase == PhaseOne(true))
      .then(PressWith(5))
      .expect(puzzleState.phase == PhaseTwo(true))
      .then(PressWith(0))
      .expect(and {
        puzzleState.phase == PhaseTwo(true),
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
      .expect(puzzleState.phase == PhaseOne(true))

  run resetReturnsToInitialTest =
    init
      .then(PressWith(0))
      .then(Reset)
      .expect(and {
        puzzleState.board == INITIAL_BOARD,
        puzzleState.phase == Initial,
        not(puzzleState.atPhaseGoal),
      })

  action CustomTileWith(tile: int): bool = all {
    isTile(tile),
    puzzleState' = applyCustomTile(puzzleState, tile),
  }
}
