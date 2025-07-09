/// <reference types="vitest" />
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/quvis/', // Replace 'quvis' with your repository name if different
  // ... other configurations if you have them
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['**/*.test.{js,ts,tsx}', '**/*.spec.{js,ts,tsx}'],
    exclude: ['node_modules', 'dist', 'build'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'src/test/',
        '**/*.test.{js,ts,tsx}',
        '**/*.spec.{js,ts,tsx}',
        'vite.config.ts',
        'eslint.config.js'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    }
  }
}) 