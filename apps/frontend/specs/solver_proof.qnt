module solver_proof {
  import puzzle.* from "./puzzle"

  // Choose every board and every kind of guidance target symbolically. This
  // isolates the finite solver theorem from the temporal puzzle-state proof.
  var board: List[bool]
  var phase: Phase

  action solverInit: bool = {
    nondet b0 = Set(false, true).oneOf()
    nondet b1 = Set(false, true).oneOf()
    nondet b2 = Set(false, true).oneOf()
    nondet b3 = Set(false, true).oneOf()
    nondet b4 = Set(false, true).oneOf()
    nondet b5 = Set(false, true).oneOf()
    nondet selectedPhase = Set(
      Initial,
      PhaseOne(false),
      PhaseOne(true),
      PhaseTwo(false),
      PhaseTwo(true),
    ).oneOf()
    all {
      board' = List(b0, b1, b2, b3, b4, b5),
      phase' = selectedPhase,
    }
  }

  action solverStep: bool = all {
    board' = board,
    phase' = phase,
  }

  val distanceIsExact: bool = solutionDistanceObeysBellman(board, phase)
}
