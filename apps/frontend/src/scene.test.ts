import { click, expect, given, role, scene, text } from 'foldkit/scene'
import { describe, test } from 'vitest'
import { applyMove, solution, type GameState } from '@app/solver'

import { initialGameState, initialModel, possibleMoves } from './model'
import { update } from './update'
import { view } from './view'

describe('Pathfinder puzzle view', () => {
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
      expect(text('First make all tiles the same.')).toExist(),
      expect(role('button', { name: 'Hide Solution' })).toHaveAttr(
        'aria-pressed',
        'true',
      ),
      click(role('button', { name: 'Hide Solution' })),
      expect(text('First make all tiles the same.')).not.toExist(),
    )
  })

  test('custom setup toggles only the chosen tile and closes when applied', () => {
    scene(
      { update, view },
      given(initialModel),
      click(role('button', { name: 'Custom Setup' })),
      click(role('button', { name: 'Custom tile 0, off' })),
      expect(role('button', { name: 'Custom tile 0, on' })).toExist(),
      expect(role('button', { name: 'Custom tile 1, on' })).toExist(),
      click(role('button', { name: 'Apply Custom Setup' })),
      expect(text('Custom Setup Mode')).not.toExist(),
    )
  })

  test('reset restores the initial board', () => {
    scene(
      { update, view },
      given(initialModel),
      click(role('button', { name: 'Tile 0, off, affects 0, 1, 3' })),
      click(role('button', { name: 'Reset Game' })),
      expect(role('button', { name: 'Tile 0, off, affects 0, 1, 3' })).toExist(),
      expect(role('button', { name: 'Tile 1, on, affects 1, 0' })).toExist(),
    )
  })

  test('following both solution paths completes the puzzle and Play Again resets it', () => {
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
      ...moveSteps,
      expect(text('🎉 Solution Reached!')).toExist(),
      click(
        role('button', {
          name: `Tile 0, ${state[0] ? 'on' : 'off'}, affects 0, 1, 3`,
        }),
      ),
      expect(text('🎉 Solution Reached!')).toExist(),
      click(role('button', { name: 'Play Again' })),
      expect(text('🎉 Solution Reached!')).not.toExist(),
      expect(role('button', { name: 'Tile 0, off, affects 0, 1, 3' })).toExist(),
    )
  })
})
