import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@app/solver': resolve(
        import.meta.dirname,
        '../../packages/solver/src/index.ts',
      ),
    },
  },
  test: {
    environment: 'node',
    server: {
      deps: {
        inline: ['foldkit'],
      },
    },
  },
})
