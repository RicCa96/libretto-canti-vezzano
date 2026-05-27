// vitest.config.ts is intentionally excluded from tsconfig.node.json:
// vitest bundles vite 7.x while the project uses vite 8.x, causing a
// dual-instance type mismatch for module augmentations. This file is
// processed by vitest's own esbuild loader (no tsc), so the build is unaffected.
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugins: [react() as any],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})
