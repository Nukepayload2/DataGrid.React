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
    exclude: [...configDefaults.exclude, 'e2e/**', 'tests/setup.ts', 'tests/shared/**'],
    // BAT-0 0-A：缺键快照在非 CI 也必须红（等价 CI=true 的判红行为）。
    // 读码依据（vitest 4.1.9，node_modules/vitest/dist/chunks/coverage.DM_a_rWm.js）：
    //   const UPDATE_SNAPSHOT = resolved.update || process.env.UPDATE_SNAPSHOT
    //   updateSnapshot = UPDATE_SNAPSHOT ∈ {'all','new','none'} ? UPDATE_SNAPSHOT
    //     : isCI && !UPDATE_SNAPSHOT ? 'none' : UPDATE_SNAPSHOT ? 'all' : 'new'
    // 即默认（不设 update）非 CI 落 'new' ⇒ 基线缺键被静默写入并判过（E-001/E-002/E-013 的成因）；
    // 显式 'none' 在 CI 与非 CI 下都判红，而 CLI `-u`（cac 合并后 resolved.update=true）仍覆盖为 'all'，
    // 开发者照常 `pnpm test -u` 更新基线。验红探针读数：96-implementer-bat0-testgates.md §1。
    // 设计意图（与 demoHarness 的超时预算同机制）：预算保留——`DEMO_TEST_TIMEOUT_MS`/
    // `A11Y_TEST_TIMEOUT_MS` 继续把失控渲染斩断成失败；本项让超时留下的半成品键因为
    // 「缺键必红」被暴露，而不是被静默接受。一个机制同时杀掉两个症状。
    update: 'none',
    // BAT-0 0-B：测试环境把裸 `antd` 对齐到 `antd/es`（与 src 的深路径 `antd/es/*` 同图）。
    // 成因（实读 antd 6.4.4 package.json）：无 `exports` 字段，`main: lib/index.js`（CJS）、
    // `module: es/index.js`（ESM）；vitest 对未 inline 的依赖走 Node CJS 解析 ⇒ 裸 `antd` 落
    // `lib` 实例，而 `antd/es/*` 深路径落 es 实例 ⇒ 两份 React context（步骤 28 实锤，E-037）。
    // 落点选 `test.alias`（vitest 专有测试作用域别名，类型定义
    // node_modules/vitest/dist/chunks/reporters.d.DtoKVV2s.d.ts:3113 `alias?: AliasOptions`，
    // 「merged with the default aliases inside resolve.alias」）⇒ **不碰** 顶层 `resolve.alias`，
    // 站点构建（vite build 走 `module` 字段本就全 es 单图）零影响。
    // 验红／自证读数：96-implementer-bat0-testgates.md §2（改前 bare===es false＋es ConfigConsumer
    // 读不到裸 ConfigProvider 注入的 prefixCls；改后相等＋读到）。
    alias: [
      { find: /^antd$/, replacement: 'antd/es' },
    ],
    // typecheck 必须显式指定 tsconfig：vitest 默认用根 `tsconfig.json`，而它是
    // `{"files": [], "references": [...]}` 的 solution 文件，交给 tsc 会编译 0 个文件
    // —— `pnpm test:types` 会「全绿但空跑」（实测：写入 `const x: number = 'string'` 仍报
    // `Type Errors  no errors`）。`tsconfig.test.json` 把 `src` 与 `tests` 纳入同一 program。
    typecheck: {
      tsconfig: './tsconfig.test.json',
    },
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
