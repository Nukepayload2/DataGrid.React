import { defineConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  test: {
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    include: [
      'tests/**/*.{ts,tsx}',
    ],
    exclude: [...configDefaults.exclude, 'e2e/**', 'tests/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/table/**/*.{ts,tsx}'],
      exclude: [
        'src/table/**/types.ts',
        'src/table/**/*Types.ts',
        'src/table/index.ts',
        'src/table/**/*.d.ts',
      ],
      reporter: ['text', 'text-summary', 'html', 'lcov'],
      reportsDirectory: './coverage',
    },
  },
})
