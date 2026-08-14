module solver_proof {
  import puzzle.* from "./puzzle"

  // Choose every board and every kind of guidance target symbolically. This
  // isolates the finite solver theorem from the temporal puzzle-state proof.
  var board: List[bool]
  var progress: Progress

  action solverInit: bool = {
    nondet b0 = Set(false, true).oneOf()
    nondet b1 = Set(false, true).oneOf()
    nondet b2 = Set(false, true).oneOf()
    nondet b3 = Set(false, true).oneOf()
    nondet b4 = Set(false, true).oneOf()
    nondet b5 = Set(false, true).oneOf()
    nondet selectedProgress = Set(
      SeekingFirstUniform,
      SeekingOpposite(false),
      SeekingOpposite(true),
      OppositeReached(false),
      OppositeReached(true),
    ).oneOf()
    all {
      board' = List(b0, b1, b2, b3, b4, b5),
      progress' = selectedProgress,
    }
  }

  action solverStep: bool = all {
    board' = board,
    progress' = progress,
  }

  val distanceIsExact: bool = solutionDistanceObeysBellman(board, progress)
}
