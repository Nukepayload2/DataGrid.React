/**
 * docs 站点构建的公共配置工厂。
 *
 * 三个档位共用同一份插件/分块策略，只差三件事：
 * - `vite.docs.config.ts`       自托管（默认）：多文件 + 内容哈希 + 可长缓存。
 * - `vite.docs.single.config.ts` 离线单文件：`viteSingleFile()` 内联一切，便于整包分发/本地 file:// 打开。
 * - `vite.docs.cdn.config.ts`   第三方 CDN：react/react-dom/antd 走 `external` + import map（esm.sh）。
 *
 * ## 为什么默认档不再是 singlefile
 * 单文件把 4.98 MB 压成一个 HTML：无缓存、无分包、4.8 MB 内联脚本必须先下完才能解析。
 * 实测（docs 站点首屏，见 `tmp/docs-perf-cdn-analysis.md`）：单文件 1 311 KB(gzip) → 多文件首屏 1 061 KB(gzip)，
 * 且重复访问因为内容哈希变为 ≈0；再叠加 P1–P5 的按需加载后首屏 ≈280 KB(gzip)。
 */
import { defineConfig, type Plugin, type PluginOption, type UserConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import reactPkg from 'react/package.json'
import antdPkg from 'antd/package.json'

export interface DocsBuildOptions {
  /** 产物目录（相对仓库根）。 */
  outDir: string
  /** 站点 base。GitHub Pages 项目站点是 `/<repo>/`，用户站点是 `/`。 */
  base?: string
  /** true 时走 `viteSingleFile()`（离线单文件档）。 */
  singleFile?: boolean
  /** 第三方 CDN 档：把 react/react-dom/antd 交给 import map。 */
  cdn?: 'esmsh'
}

/**
 * 读环境变量。
 *
 * 经 `globalThis` 取值而不是用 `process`：本仓 `tsconfig.node.json` 刻意不引 `@types/node`
 * （库源码不依赖 Node 类型面），与 `vite.config.ts` 里同一取舍。
 */
export function envVar(name: string): string | undefined {
  const nodeProcess = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
  return nodeProcess?.env?.[name]
}

/** CDN 档外置的包：只放"必须全局单例且由 import map 解析"的那几个。 */
export const CDN_EXTERNALS: readonly string[] = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  'antd',
]

/**
 * esm.sh 的 import map。
 *
 * - `?external=react,react-dom` **不能省**：这是唯一能保证"页面上只有一份 React"的开关。
 *   实测（`tmp/docs-analyze/esmsh-peer-leak.mjs`）：`@ant-design/icons?external=react` 会把
 *   它的 peer `react-dom >=16.0.0` 编成**绝对 URL**，浏览器解析成当时的最新版（19.3.1），
 *   import map 拦不住绝对 URL ⇒ 双实例 ⇒ React error #527。所以每个包都要列全共享集。
 * - `&bundle`：不 bundle 时 antd 会拆成 1 163 个模块请求（实测），40 KB/s 链路上必死；
 *   bundle 之后是 1 个请求 1 501 KB raw / 380 KB br（代价：没有 tree-shaking，就是全量）。
 * - 版本一律取**本地安装版本**，与 `pnpm-lock.yaml` 对齐，避免 CDN 侧漂移。
 */
export function createEsmShImportMap(): Record<string, string> {
  const reactVersion = (reactPkg as { version: string }).version
  const antdVersion = (antdPkg as { version: string }).version
  return {
    react: `https://esm.sh/react@${reactVersion}`,
    'react/jsx-runtime': `https://esm.sh/react@${reactVersion}/jsx-runtime`,
    'react-dom': `https://esm.sh/react-dom@${reactVersion}?external=react`,
    'react-dom/client': `https://esm.sh/react-dom@${reactVersion}/client?external=react`,
    antd: `https://esm.sh/antd@${antdVersion}?external=react,react-dom&bundle`,
  }
}

/**
 * 把 import map 插到 `<head>` 最前面。
 *
 * 浏览器规则：import map 必须出现在**任何 module script 之前**，晚于入口模块就无效。
 * Vite 会把入口 `<script type="module">` 注入 head，因此这里用 `head-prepend` + `order: 'pre'`。
 */
function docsImportMapPlugin(importMap: Record<string, string>): Plugin {
  return {
    name: 'docs:esmsh-import-map',
    transformIndexHtml: {
      order: 'pre',
      handler() {
        return [
          {
            tag: 'script',
            attrs: { type: 'importmap' },
            children: JSON.stringify({ imports: importMap }, null, 2),
            injectTo: 'head-prepend',
          },
        ]
      },
    },
  }
}

/**
 * CDN 档的构建期断言。
 *
 * 两条都是"曾经踩过"的形状：
 * 1. 产物里不许出现 `https://esm.sh/` 字面量 —— 出现说明某个依赖没走 external，
 *    运行时会绕过 import map 再拉一份 react/antd（双实例）。
 * 2. `index.html` 里必须有 `type="importmap"`，且必须在入口 script 之前。
 */
function docsCdnGuardPlugin(): Plugin {
  return {
    name: 'docs:cdn-guard',
    enforce: 'post',
    generateBundle(_options, bundle) {
      for (const [fileName, output] of Object.entries(bundle)) {
        if (output.type !== 'chunk') continue
        if (output.code.includes('https://esm.sh/')) {
          this.error(
            `[docs:cdn-guard] ${fileName} 里出现了 esm.sh 绝对 URL：` +
              '某个依赖没有走 external，运行时会绕过 import map（双实例风险）。',
          )
        }
      }
    },
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const importMapAt = html.indexOf('type="importmap"')
        const entryAt = html.indexOf('type="module"')
        if (importMapAt < 0) {
          throw new Error('[docs:cdn-guard] index.html 缺少 import map')
        }
        if (entryAt >= 0 && importMapAt > entryAt) {
          throw new Error('[docs:cdn-guard] import map 出现在入口 module script 之后，浏览器不会应用它')
        }
        return html
      },
    },
  }
}

/**
 * 显式分块（默认关闭，只收拢 react）。
 *
 * ## 为什么不敢按依赖图分组
 * 试过 `{vendor-antd}` / `{vendor-editor}` 两张组：**实测首屏从 768 KB 反弹到 2 791 KB**。
 * 原因是分组把「同一张依赖图里的 eager 与 lazy 模块」塞进同一 chunk，而 chunk 只要被
 * 任一 eager 模块引用就必须整体预载 —— 于是 `import('antd')` 才需要的全量 antd
 * （1 467 KB）和 `import('sucrase')` 才需要的编辑器栈（685 KB）全被拉回首屏。
 * 结论：**只收拢真正全员 eager 的 react 一族**，其余交给 rolldown 的自动切分。
 */
function docsChunkGroups() {
  const nm = String.raw`node_modules[\\/](?:\.pnpm[\\/][^\\/]+[\\/]node_modules[\\/])?`
  return {
    groups: [
      {
        name: 'vendor-react',
        // react/react-dom/scheduler 全部由首屏必需代码引用，收拢不会改变可达性。
        test: new RegExp(`${nm}(?:react|react-dom|scheduler)[\\/]`),
      },
    ],
  }
}

/** 三个档位的公共部分。 */
export function createDocsConfig(options: DocsBuildOptions): UserConfig {
  const plugins: PluginOption[] = [...react()]
  if (options.singleFile) plugins.push(viteSingleFile())
  if (options.cdn === 'esmsh') {
    plugins.push(docsImportMapPlugin(createEsmShImportMap()), docsCdnGuardPlugin())
  }

  return defineConfig({
    base: options.base ?? '/',
    plugins,
    build: {
      outDir: options.outDir,
      emptyOutDir: true,
      target: 'es2020',
      // docs 产物不需要 sourcemap；开了会让 dist 体积翻几倍。
      sourcemap: false,
      // 单文件档要把所有 CSS 内联，超过默认 500 KB 阈值是预期的。
      chunkSizeWarningLimit: options.singleFile ? 6000 : 1500,
      rolldownOptions: {
        external: options.cdn === 'esmsh' ? [...CDN_EXTERNALS] : undefined,
        output: {
          codeSplitting: docsChunkGroups(),
        },
      },
    },
  })
}
