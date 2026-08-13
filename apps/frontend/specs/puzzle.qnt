// Grounding model for apps/frontend/src/model.ts, update.ts, and derived.ts.
//
// Covers the six-tile board, remembered opposite target, reset/custom-run
// semantics, completion/restoration phase, and the derived phase-goal flag.
// UI controls, rendering mechanics, and move-history storage are intentionally
// outside this model because they do not affect puzzle transitions.
//
// Source correspondence:
//   puzzle state/transitions <-> apps/frontend/src/model.ts and update.ts
//   atPhaseGoal/guidance     <-> apps/frontend/src/derived.ts
//   move effects             <-> packages/solver/src/index.ts
//
// Update this spec before changing those production modules, then rerun the
// Quint proof and quint-connect replay checks.
module puzzle {
  type Phase = Initial | PhaseOne(bool) | PhaseTwo(bool)

  type PuzzleState = {
    board: List[bool],
    phase: Phase,
    atPhaseGoal: bool,
    solutionDistance: int,
  }

  pure val TILES = 0.to(5)
  pure val INITIAL_BOARD = List(false, true, false, true, false, true)

  pure def isTile(tile: int): bool = tile.in(TILES)

  pure def isUniform(board: List[bool]): bool =
    board.length() == 6 and board.indices().forall(i => board.nth(i) == board.nth(0))

  pure def affects(tile: int, position: int): bool =
    if (tile == 0) position.in(Set(0, 1, 3))
    else if (tile == 1) position.in(Set(1, 0))
    else if (tile == 2) position.in(Set(2, 5))
    else if (tile == 3) position.in(Set(3, 0, 4))
    else if (tile == 4) position.in(Set(4, 5, 3))
    else if (tile == 5) position.in(Set(5, 4, 2))
    else false

  pure def toggleMove(board: List[bool], tile: int): List[bool] =
    List(
      if (affects(tile, 0)) not(board.nth(0)) else board.nth(0),
      if (affects(tile, 1)) not(board.nth(1)) else board.nth(1),
      if (affects(tile, 2)) not(board.nth(2)) else board.nth(2),
      if (affects(tile, 3)) not(board.nth(3)) else board.nth(3),
      if (affects(tile, 4)) not(board.nth(4)) else board.nth(4),
      if (affects(tile, 5)) not(board.nth(5)) else board.nth(5),
    )

  pure def toggleCustom(board: List[bool], tile: int): List[bool] =
    board.replaceAt(tile, not(board.nth(tile)))

  pure def phaseForNewRun(board: List[bool]): Phase =
    if (isUniform(board)) PhaseOne(not(board.nth(0))) else Initial

  pure def advancePhase(phase: Phase, board: List[bool]): Phase =
    match phase {
      | Initial =>
          if (isUniform(board)) PhaseOne(not(board.nth(0))) else Initial
      | PhaseOne(target) =>
          if (isUniform(board) and board.nth(0) == target)
          PhaseTwo(target)
          else PhaseOne(target)
      | PhaseTwo(target) => PhaseTwo(target)
    }

  pure def isAtPhaseGoal(board: List[bool], phase: Phase): bool =
    match phase {
      | Initial => isUniform(board)
      | PhaseOne(target) => isUniform(board) and board.nth(0) == target
      | PhaseTwo(target) => isUniform(board) and board.nth(0) == target
    }

  // Independently tabulated graph distances for all 2^6 boards, indexed by
  // their bit encoding. The Bellman laws below prove these are exact shortest
  // distances: zero exactly at a goal, every positive distance has a descending
  // edge, and no edge can decrease the distance by more than one.
  pure val DISTANCE_TO_FALSE = List(
    0,5,4,1,4,3,4,3,2,3,4,1,2,5,4,3,2,3,2,3,4,3,4,3,4,1,2,3,2,5,4,3,
    5,2,3,4,1,4,3,2,3,4,3,4,3,2,3,2,3,4,5,2,1,4,3,2,1,6,5,2,3,2,3,2,
  )
  pure val DISTANCE_TO_TRUE = List(
    2,3,2,3,2,5,6,1,2,3,4,1,2,5,4,3,2,3,2,3,4,3,4,3,2,3,4,1,4,3,2,5,
    3,4,5,2,3,2,1,4,3,4,3,4,3,2,3,2,3,4,5,2,1,4,3,2,3,4,3,4,1,4,5,0,
  )
  pure val DISTANCE_TO_UNIFORM = List(
    0,3,2,1,2,3,4,1,2,3,4,1,2,5,4,3,2,3,2,3,4,3,4,3,2,1,2,1,2,3,2,3,
    3,2,3,2,1,2,1,2,3,4,3,4,3,2,3,2,3,4,5,2,1,4,3,2,1,4,3,2,1,2,3,0,
  )

  pure def boardCode(board: List[bool]): int =
    (if (board.nth(0)) 1 else 0) +
    (if (board.nth(1)) 2 else 0) +
    (if (board.nth(2)) 4 else 0) +
    (if (board.nth(3)) 8 else 0) +
    (if (board.nth(4)) 16 else 0) +
    (if (board.nth(5)) 32 else 0)

  pure def shortestSolutionDistance(board: List[bool], phase: Phase): int =
    match phase {
      | Initial => DISTANCE_TO_UNIFORM.nth(boardCode(board))
      | PhaseOne(target) =>
          if (target) DISTANCE_TO_TRUE.nth(boardCode(board))
          else DISTANCE_TO_FALSE.nth(boardCode(board))
      | PhaseTwo(target) =>
          if (target) DISTANCE_TO_TRUE.nth(boardCode(board))
          else DISTANCE_TO_FALSE.nth(boardCode(board))
    }

  pure def solutionDistanceObeysBellman(board: List[bool], phase: Phase): bool = {
    val distance = shortestSolutionDistance(board, phase)
    and {
      distance >= 0 and distance <= 6,
      (distance == 0) == isAtPhaseGoal(board, phase),
      distance == 0 or TILES.exists(tile =>
        shortestSolutionDistance(toggleMove(board, tile), phase) == distance - 1),
      TILES.forall(tile =>
        shortestSolutionDistance(toggleMove(board, tile), phase) >= distance - 1),
    }
  }

  pure def applyPress(state: PuzzleState, tile: int): PuzzleState = {
    val nextBoard = toggleMove(state.board, tile)
    val nextPhase = advancePhase(state.phase, nextBoard)
    {
      board: nextBoard,
      phase: nextPhase,
      atPhaseGoal: isAtPhaseGoal(nextBoard, nextPhase),
      solutionDistance: shortestSolutionDistance(nextBoard, nextPhase),
    }
  }

  pure def applyCustomTile(state: PuzzleState, tile: int): PuzzleState = {
    val nextBoard = toggleCustom(state.board, tile)
    val nextPhase = phaseForNewRun(nextBoard)
    {
      board: nextBoard,
      phase: nextPhase,
      atPhaseGoal: isAtPhaseGoal(nextBoard, nextPhase),
      solutionDistance: shortestSolutionDistance(nextBoard, nextPhase),
    }
  }

  pure def sameRememberedTarget(before: Phase, after: Phase): bool =
    match before {
      | Initial => true
      | PhaseOne(target) =>
          match after {
            | PhaseOne(nextTarget) => target == nextTarget
            | PhaseTwo(nextTarget) => target == nextTarget
            | Initial => false
          }
      | PhaseTwo(target) =>
          match after {
            | PhaseTwo(nextTarget) => target == nextTarget
            | _ => false
          }
    }

  var puzzleState: PuzzleState

  action init: bool =
    puzzleState' = {
      board: INITIAL_BOARD,
      phase: phaseForNewRun(INITIAL_BOARD),
      atPhaseGoal: false,
      solutionDistance: shortestSolutionDistance(INITIAL_BOARD, phaseForNewRun(INITIAL_BOARD)),
    }

  action Press: bool = {
    nondet tile = TILES.oneOf()
    val nextState = applyPress(puzzleState, tile)
    puzzleState' = nextState
  }

  action CustomTile: bool = {
    nondet tile = TILES.oneOf()
    puzzleState' = applyCustomTile(puzzleState, tile)
  }

  action Reset: bool =
    puzzleState' = {
      board: INITIAL_BOARD,
      phase: phaseForNewRun(INITIAL_BOARD),
      atPhaseGoal: false,
      solutionDistance: shortestSolutionDistance(INITIAL_BOARD, phaseForNewRun(INITIAL_BOARD)),
    }

  action step: bool = any {
    Press,
    CustomTile,
    Reset,
  }

  val stateIsWellFormed: bool = and {
    puzzleState.board.length() == 6,
    puzzleState.board.indices().forall(i => i.in(TILES)),
  }

  val phaseStateIsConsistent: bool =
    match puzzleState.phase {
      | Initial => not(isUniform(puzzleState.board))
      | PhaseOne(target) =>
          not(isUniform(puzzleState.board)) or puzzleState.board.nth(0) != target
      | PhaseTwo(_) => true
    }

  val phaseGoalIsCorrect: bool =
    puzzleState.atPhaseGoal == isAtPhaseGoal(puzzleState.board, puzzleState.phase)

  val solutionDistanceIsMinimal: bool =
    puzzleState.solutionDistance == shortestSolutionDistance(puzzleState.board, puzzleState.phase)

  val solutionIsReachable: bool = puzzleState.solutionDistance <= 6

  val rememberedTargetIsStable: bool =
    TILES.forall(tile => {
      val nextState = applyPress(puzzleState, tile)
      sameRememberedTarget(puzzleState.phase, nextState.phase)
    })

  val puzzleInvariant: bool = and {
    stateIsWellFormed,
    phaseStateIsConsistent,
    phaseGoalIsCorrect,
    solutionDistanceIsMinimal,
    solutionIsReachable,
    rememberedTargetIsStable,
  }

  val firstUniformReached: bool =
    match puzzleState.phase {
      | PhaseOne(_) => isUniform(puzzleState.board)
      | _ => false
    }

  val oppositeReached: bool =
    match puzzleState.phase {
      | PhaseTwo(target) => isUniform(puzzleState.board) and puzzleState.board.nth(0) == target
      | _ => false
    }

  val restorationNeeded: bool =
    match puzzleState.phase {
      | PhaseTwo(_) => not(isUniform(puzzleState.board))
      | _ => false
    }
}
