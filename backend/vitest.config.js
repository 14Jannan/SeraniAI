// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // 1. Specifies the testing environment (default is 'node' for Express)
    environment: 'node',
    
    // 2. Makes 'describe', 'it', 'expect' globally available like in Jest
    globals: true,
    
    // 3. Optional: setup file for things like database connections
    // setupFiles: ['./tests/setup.ts'],
    
    // 4. Automatically loads .env files
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
  },
})