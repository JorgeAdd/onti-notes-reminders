import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.{ts,tsx}'],
    setupFiles: ['test/polyfills.ts', 'test/setup.ts'],
    // Dummy values so modules that parse `env` can load; tests never hit the network.
    env: {
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'test-key',
      VITE_API_URL: 'http://localhost:3000',
    },
  },
})
