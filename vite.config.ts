import { defineConfig, configDefaults } from 'vitest/config'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// dev watcher 忽略规则。写成函数而非目录 glob：chokidar 4 起不再内置 glob 匹配，
// 通配字符串会被当成字面路径而静默失效。
const ignoredDirNames = new Set([
  '.git',
  '.vs',
  'coverage',
  'dist',
  'dist-docs',
  'node_modules',
  'tmp',
])

// 编辑器原子保存留下的临时件（如 .HomePage.tsx.<pid>.<uuid>.tmpdir/HomePage.tsx.tmp）。
const ignoredNameSuffixes = [
  '.tmp',
  '.tmpdir',
  '.swp',
  '.swo',
  '.bak',
  '.orig',
  '.crswap',
  '.crdownload',
  '~',
]

// vite 从项目根启动；经 globalThis 取值以免依赖 @types/node。
function projectRoot(): string {
  const nodeProcess = (globalThis as { process?: { cwd?: () => string } }).process
  return typeof nodeProcess?.cwd === 'function' ? nodeProcess.cwd().replace(/\\/g, '/') : ''
}

function isIgnoredWatchPath(watchPath: string): boolean {
  const root = projectRoot()
  const normalized = watchPath.replace(/\\/g, '/')
  const relative = root && normalized.startsWith(`${root}/`) ? normalized.slice(root.length + 1) : normalized
  const segments = relative.split('/').filter(Boolean)

  if (segments.some((segment) => ignoredDirNames.has(segment))) return true

  const name = segments[segments.length - 1] ?? ''
  return ignoredNameSuffixes.some((suffix) => name.endsWith(suffix))
}

// watcher 的 error 事件无监听者会变成未捕获异常并结束 dev 进程，这里降级为警告。
function watchErrorGuard(): Plugin {
  return {
    name: 'data-grid:watch-error-guard',
    configureServer(server) {
      server.watcher.on('error', (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error)
        server.config.logger.warn(`[watch] watcher error ignored: ${message}`)
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), viteSingleFile(), watchErrorGuard()],
  server: {
    watch: {
      ignored: isIgnoredWatchPath,
    },
  },
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
