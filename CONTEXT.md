# Pathfinder Armor Puzzle

The puzzle is a run-based tile game whose progress remembers which uniform
board was reached first and whether its opposite has subsequently been reached.

## Language

**Puzzle Run**:
One attempt beginning from a chosen board and continuing through gameplay moves
until reset or custom setup establishes another run.

**Starting Board**:
The board from which a puzzle run begins.
_Avoid_: Initial board, when referring to a custom run

**Move History**:
The ordered gameplay moves made during the current puzzle run. Custom setup
changes are not gameplay moves.

**Seeking First Uniform**:
Progress before the run has reached either the all-ON or all-OFF board.
_Avoid_: Initial phase, Phase One

**Opposite Target**:
The uniform board opposite the first uniform board reached during a run.

**Seeking Opposite**:
Progress after the first uniform board has been reached but before the opposite
target has been reached.
_Avoid_: Phase One

**Opposite Reached**:
The historical fact that the opposite target has been reached during the run.
It remains true if later moves disturb that board.
_Avoid_: Completed, Phase Two

**Custom Setup**:
Editing that establishes the resulting board as the starting board of a new
puzzle run.
