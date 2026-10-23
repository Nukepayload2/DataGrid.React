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
// CDN 档的 import map 落地表（23 条映射 = react 族 4 + antd 1 + CodeMirror 闭包 18）。
// 由 `pnpm docs:cdn-map` 生成、提交进 git；生成原因与三种策略见
// scripts/gen-cdn-importmap.mjs 顶部注释。
import cdnImportMap from './src/docs/generated/cdn-importmap.json'

/** CDN 档的 import map 落地表形状（生成产物，见 scripts/gen-cdn-importmap.mjs）。 */
export interface CdnImportMapEntry {
  /** 浏览器里出现的裸 specifier，也是 import map 的键。 */
  specifier: string
  /** 落地策略：single / bundle / family，判据见生成脚本。 */
  strategy: 'single' | 'bundle' | 'family'
  /** 实际被解析的 npm 包名（`react-dom/client` → `react-dom`）。 */
  package: string
  /** 该包自己 package.json 里的版本。 */
  version: string
  /** 最终 URL（含 `?external=` / `&bundle`）。 */
  url: string
}

export interface CdnImportMap {
  externals: string[]
  entries: CdnImportMapEntry[]
}

export interface DocsBuildOptions {
  /** 产物目录（相对仓库根）。 */
  outDir: string
  /** 站点 base。GitHub Pages 项目站点是 `/<repo>/`，用户站点是 `/`。 */
  base?: string
  /** true 时走 `viteSingleFile()`（离线单文件档）。 */
  singleFile?: boolean
  /** 第三方 CDN 档：把生成表里的全部外置包（react / antd / CodeMirror）交给 import map。 */
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

/**
 * CDN 档外置的包 = 生成表里的全部 specifier。
 *
 * 全量而不是"只放源码 import 的那几个"：`family` 组（CodeMirror）的每个成员都进
 * `external`，以后有人在 `src/` 里直接 import 其中一个，也不会被静默打进本地 chunk
 * —— 那会造出第二份实例（`instanceof` 断裂）。
 */
export const CDN_EXTERNALS: readonly string[] = (cdnImportMap as CdnImportMap).externals

/**
 * esm.sh 的 import map：纯数据，来自 `src/docs/generated/cdn-importmap.json`。
 *
 * 这里不再手写任何 URL —— 三种落地策略（single / bundle / family）的差别全部在
 * 生成脚本那张 `CDN_ROOTS` 表里，本文件只负责"把表铺成 import map"。
 *
 * 仍然必须记住的两条语义（细节见 docs/decisions/0011-codemirror-cdn-externalization.md）：
 * - `?external=` 列全共享集是唯一能保证"页面上只有一份 react / @codemirror/state"的开关
 *   （esm.sh 会把没列进去的 peer 编成**绝对 URL**，import map 拦不住 ⇒ 双实例）。
 * - `&bundle` 只给"不跨模块做引用相等"的包（antd：1163 个请求 → 1 个）；
 *   给它 CodeMirror 会内联一份私有 `@codemirror/state`，必炸。
 */
export function createEsmShImportMap(): Record<string, string> {
  const importMap: Record<string, string> = {}
  for (const entry of (cdnImportMap as CdnImportMap).entries) {
    importMap[entry.specifier] = entry.url
  }
  return importMap
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
 * chunk 顶部的 import/export-from 前缀里出现的 specifier。
 *
 * **必须只扫前缀，不能扫全文。** docs 页面的代码示例是字符串字面量，里面有
 * `from '@nukepayload2/data-grid'`、`from '@dnd-kit/core'` 这类文本，`?raw` 导入的
 * demo 源码更是整篇代码字符串 —— minified 之后全文扫描会匹配 `from"…"`（实测这版
 * 守卫一次报了 11 个假阳性，含 `module`、`react-highlight-words`）。
 * 真实外部导入只出现在 chunk 顶部（rolldown 把静态 import 全部提升到开头）。
 */
const IMPORT_PREFIX =
  /^(?:\s*(?:import|export)\s*(?:\{[^{}]*\}|\*(?:\s*as\s*[\w$]+)?|[\w$]+)?\s*(?:from\s*)?["'][^"']+["'];?)+/

function collectPrefixSpecifiers(code: string): string[] {
  const prefix = code.match(IMPORT_PREFIX)?.[0] ?? ''
  return [...new Set([...prefix.matchAll(/["']([^"']+)["']/g)].map((match) => match[1]))].filter(
    (spec) => !spec.startsWith('.') && !spec.startsWith('/'),
  )
}

/**
 * `family` 组的包在 node_modules 里的路径形状（用于断言"没被就地打包"）。
 *
 * 只取 `family` 是因为它才是"本地一个字节都不许留"的那类：single / bundle 组
 * 若被就地打包，产物里会留下 `https://esm.sh/` 字面量或未映射的裸 specifier，被 1、2 抓住。
 */
function familyModulePattern(familyPackages: readonly string[]): RegExp | null {
  if (familyPackages.length === 0) return null
  const names = familyPackages.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  return new RegExp(
    String.raw`node_modules[\\/](?:\.pnpm[\\/][^\\/]+[\\/]node_modules[\\/])?(?:${names.join('|')})[\\/]`,
  )
}

/**
 * CDN 档的构建期断言。五条都是"曾经踩过 / 一定会踩"的形状：
 *
 * 1. 产物里不许出现 `https://esm.sh/` 字面量 —— 出现说明某个依赖没走 external，
 *    运行时会绕过 import map 再拉一份 react/antd/CodeMirror（双实例）。
 * 2. chunk 顶部的每个裸 specifier 必须能在 import map 里找到 —— 兜住"外置了但忘了映射"
 *    （运行时直接 404）。
 * 3. `family` 组的模块不许出现在任何本地产物里 —— 外置的意思是"本地一个字节都不留"。
 *    只靠 1、2 抓不到"被就地打包"（打包后既没有外部导入也没有 esm.sh 字面量）。
 * 4. `index.html` 里必须有 `type="importmap"`、必须在入口 script 之前，
 *    且每个 `family` 组的条目都必须带 `external=` 且不得带 `bundle`
 *    （见 createEsmShImportMap 的注释）。
 * 5. **守卫自身有效性**：整轮构建必须在 chunk 顶部扫到 `react`。扫不到说明产物形态变了
 *    （import 不再位于 chunk 开头），此时第 2 条会静默变成空跑 —— 必须红，而不是假装通过。
 */
function docsCdnGuardPlugin(cdnMap: CdnImportMap): Plugin {
  const mapped = new Set(cdnMap.entries.map((entry) => entry.specifier))
  const familyEntries = cdnMap.entries.filter((entry) => entry.strategy === 'family')
  const familyPackages = [...new Set(familyEntries.map((entry) => entry.package))]
  const familyModuleRe = familyModulePattern(familyPackages)
  return {
    name: 'docs:cdn-guard',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const seenSpecifiers = new Set<string>()
      for (const [fileName, output] of Object.entries(bundle)) {
        if (output.type !== 'chunk') continue
        if (output.code.includes('https://esm.sh/')) {
          this.error(
            `[docs:cdn-guard] ${fileName} 里出现了 esm.sh 绝对 URL：` +
              '某个依赖没有走 external，运行时会绕过 import map（双实例风险）。',
          )
        }
        const specifiers = collectPrefixSpecifiers(output.code)
        for (const specifier of specifiers) seenSpecifiers.add(specifier)
        const unmapped = specifiers.filter((spec) => !mapped.has(spec))
        if (unmapped.length > 0) {
          this.error(
            `[docs:cdn-guard] ${fileName} 引用了 import map 里没有的外部模块：` +
              `${unmapped.join(', ')}。运行时解析不到（404）。`,
          )
        }
        const bundledFamily = familyModuleRe
          ? Object.keys(output.modules).filter((id) => familyModuleRe.test(id))
          : []
        if (bundledFamily.length > 0) {
          this.error(
            `[docs:cdn-guard] ${fileName} 里打进了 family 组的模块（${bundledFamily.length} 个，` +
              `例如 ${bundledFamily[0]}）。CDN 档必须把它们整体交给 esm.sh：` +
              '检查 package.json 的 devDependencies 是否新增了该族的子包，然后重跑 `pnpm docs:cdn-map`。',
          )
        }
      }
      if (!seenSpecifiers.has('react')) {
        this.error(
          '[docs:cdn-guard] 整轮构建没在任何 chunk 顶部扫到 `react`：' +
            '说明产物形态变了（import 不再位于 chunk 开头），上面的 import map 校验会静默变成空跑。',
        )
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
        for (const entry of familyEntries) {
          if (!entry.url.includes('external=')) {
            throw new Error(
              `[docs:cdn-guard] ${entry.specifier} 的 URL 没带 ?external=：esm.sh 会把依赖编成绝对 URL，` +
                'import map 拦不住 ⇒ 双实例（instanceof 断裂）。',
            )
          }
          if (/[?&]bundle\b/.test(entry.url)) {
            throw new Error(
              `[docs:cdn-guard] ${entry.specifier} 的 URL 带了 ?bundle：family 组会内联一份私有实例，` +
                '必踩 "multiple instances ... breaking instanceof checks"。',
            )
          }
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
    const cdnMap = cdnImportMap as CdnImportMap
    plugins.push(docsImportMapPlugin(createEsmShImportMap()), docsCdnGuardPlugin(cdnMap))
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
