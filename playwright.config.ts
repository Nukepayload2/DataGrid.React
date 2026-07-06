import { defineConfig } from '@playwright/test'

// Default 5173 (matches `pnpm dev` and user workflow).
// Set E2E_PORT to override (e.g. when 5173 is occupied by a stale server).
const PORT = process.env.E2E_PORT ? Number(process.env.E2E_PORT) : 5173

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: `http://localhost:${PORT}`,
    launchOptions: {
      executablePath: 'G:\\Program Files\\ChromeCon\\chrome.exe',
    },
  },
  projects: [{ name: 'chromium', use: {} }],
  webServer: {
    command: process.env.E2E_PORT ? `pnpm dev --port ${process.env.E2E_PORT}` : 'pnpm dev',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
