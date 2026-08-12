import { defineConfig } from 'vite'
import { foldkit } from '@foldkit/vite-plugin'
import { resolve } from 'node:path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [foldkit()],
  resolve: {
    alias: {
      '@app/solver': resolve(
        import.meta.dirname,
        '../../packages/solver/src/index.ts',
      ),
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  optimizeDeps: {
    entries: ['src/entry.ts'],
  },
})
