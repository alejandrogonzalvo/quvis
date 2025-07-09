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
    exclude: ['node_modules', 'dist', 'build']
  }
}) 