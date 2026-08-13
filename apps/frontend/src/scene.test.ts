import { click, expect, given, role, scene, text } from 'foldkit/scene'
import { describe, test } from 'vitest'
import { applyMove, solution, type GameState } from '@app/solver'

import { initialGameState, initialModel, possibleMoves } from './model'
import { update } from './update'
import { view } from './view'

describe('Pathfinder puzzle view', () => {
  test('continues toward the opposite board after a partial Step 2 path', () => {
    scene(
      { update, view },
      given(initialModel),
      click(role('button', { name: 'Show Solution' })),
      click(role('button', { name: 'Tile 0, off, affects 0, 1, 3' })),
      click(role('button', { name: 'Tile 3, off, affects 3, 0, 4' })),
      click(role('button', { name: 'Tile 4, on, affects 4, 5, 3' })),
      expect(text('Step 2: Make all tiles opposite')).toExist(),
      expect(text('Press tile 0 (affects tiles 0, 1, 3)')).toExist(),
      expect(text('Press tile 5 (affects tiles 5, 4, 2)')).toExist(),
      click(role('button', { name: 'Tile 0, off, affects 0, 1, 3' })),
      expect(text('Step 2: Make all tiles opposite')).toExist(),
      expect(text('Press tile 0 (affects tiles 0, 1, 3)')).not.toExist(),
      expect(text('Press tile 5 (affects tiles 5, 4, 2)')).toExist(),
      click(role('button', { name: 'Tile 5, off, affects 5, 4, 2' })),
      expect(text('Step 4: Complete the puzzle!')).toExist(),
      expect(text('No solution needed')).toExist(),
    )
  })

  test('renders six accessible tile buttons and applies a move', () => {
    scene(
      { update, view },
      given(initialModel),
      expect(
        role('button', { name: 'Tile 0, off, affects 0, 1, 3' }),
      ).toHaveAttr('type', 'button'),
      expect(role('button', { name: 'Tile 1, on, affects 1, 0' })).toExist(),
      expect(role('button', { name: 'Tile 2, off, affects 2, 5' })).toExist(),
      expect(role('button', { name: 'Tile 3, on, affects 3, 0, 4' })).toExist(),
      expect(role('button', { name: 'Tile 4, off, affects 4, 5, 3' })).toExist(),
      expect(role('button', { name: 'Tile 5, on, affects 5, 4, 2' })).toExist(),
      click(role('button', { name: 'Tile 0, off, affects 0, 1, 3' })),
      expect(role('button', { name: 'Tile 0, on, affects 0, 1, 3' })).toExist(),
      expect(role('button', { name: 'Tile 1, off, affects 1, 0' })).toExist(),
      expect(role('button', { name: 'Tile 3, off, affects 3, 0, 4' })).toExist(),
    )
  })

  test('shows and hides the solution', () => {
    scene(
      { update, view },
      given(initialModel),
      expect(role('button', { name: 'Show Solution' })).toHaveAttr(
        'aria-pressed',
        'false',
      ),
      click(role('button', { name: 'Show Solution' })),
      expect(
        text(
          'First make all tiles the same, then make them all the opposite',
        ),
      ).toExist(),
      expect(role('button', { name: 'Hide Solution' })).toHaveAttr(
        'aria-pressed',
        'true',
      ),
      click(role('button', { name: 'Hide Solution' })),
      expect(
        text(
          'First make all tiles the same, then make them all the opposite',
        ),
      ).not.toExist(),
    )
  })

  test('custom setup applies changes immediately and exits with its toggle', () => {
    scene(
      { update, view },
      given(initialModel),
      click(role('button', { name: 'Custom Setup' })),
      click(role('button', { name: 'Custom tile 0, off' })),
      expect(role('button', { name: 'Custom tile 0, on' })).toExist(),
      expect(role('button', { name: 'Custom tile 1, on' })).toExist(),
      expect(role('button', { name: 'Apply Custom Setup' })).not.toExist(),
      click(role('button', { name: 'Exit Custom Setup' })),
      expect(text('Custom Setup Mode')).not.toExist(),
    )
  })

  test('links to the public GitHub repository', () => {
    scene(
      { update, view },
      given(initialModel),
      expect(role('link', { name: 'View source on GitHub' })).toHaveAttr(
        'href',
        'https://github.com/dearlordylord/pathfinder-armor-puzzle-solver',
      ),
    )
  })

  test('reset restores the board without closing custom setup or solution', () => {
    scene(
      { update, view },
      given(initialModel),
      click(role('button', { name: 'Show Solution' })),
      click(role('button', { name: 'Custom Setup' })),
      click(role('button', { name: 'Tile 0, off, affects 0, 1, 3' })),
      click(role('button', { name: 'Reset Game' })),
      expect(role('button', { name: 'Tile 0, off, affects 0, 1, 3' })).toExist(),
      expect(role('button', { name: 'Tile 1, on, affects 1, 0' })).toExist(),
      expect(role('button', { name: 'Hide Solution' })).toExist(),
      expect(text('Custom Setup Mode')).toExist(),
    )
  })

  test('following both solution paths completes and can be restored after another move', () => {
    const [firstPath, oppositePath] = solution(initialGameState, possibleMoves)
    let state: GameState = initialGameState
    const moveSteps = [...firstPath, ...oppositePath].map(moveIndex => {
      const move = possibleMoves[moveIndex] ?? []
      const step = click(
        role('button', {
          name: `Tile ${moveIndex}, ${state[moveIndex] ? 'on' : 'off'}, affects ${move.join(', ')}`,
        }),
      )
      state = applyMove(state, move)
      return step
    })

    scene(
      { update, view },
      given(initialModel),
      click(role('button', { name: 'Show Solution' })),
      ...moveSteps,
      expect(
        text('All tiles are now the same again. Complete the puzzle!'),
      ).toExist(),
      expect(text('Puzzle completed! 🎉')).not.toExist(),
      expect(text('🎉 Solution Reached!')).not.toExist(),
      click(
        role('button', {
          name: `Tile 0, ${state[0] ? 'on' : 'off'}, affects 0, 1, 3`,
        }),
      ),
      expect(text('Restore all tiles ON to complete the puzzle')).toExist(),
      expect(text('Step 3: Make all tiles the same again')).toExist(),
      expect(text('Press tile 0 (affects tiles 0, 1, 3)')).toExist(),
      click(
        role('button', {
          name: 'Tile 5, on, affects 5, 4, 2',
        }),
      ),
      expect(text('Restore all tiles ON to complete the puzzle')).toExist(),
      expect(text('Step 3: Make all tiles the same again')).toExist(),
      expect(text('Step 4: Complete the puzzle!')).not.toExist(),
      expect(text('Press tile 0 (affects tiles 0, 1, 3)')).toExist(),
      expect(text('Press tile 5 (affects tiles 5, 4, 2)')).toExist(),
      expect(text('Puzzle completed! 🎉')).not.toExist(),
    )
  })
})
