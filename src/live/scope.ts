/**
 * live 编辑的 require 注入表：按源码里**真实出现**的 specifier 懒加载。
 *
 * ## 为什么不是一张静态 import 表
 * 历史版本这里是 10 个顶层 `import * as`（antd / @ant-design/icons / dnd / data-grid / highlight-words），
 * 静态边把它们全钉在首屏：实测 docs 首屏 3 745 KB(min) 里有 ≈2 600 KB 只是
 * 「用户**可能**点开编辑器」——全量 antd 1 464 KB、全量图标 968 KB、CodeMirror 480 KB。
 * 现在顶层只剩这张「specifier → 动态 import」的表（≈1 KB），真正的加载发生在
 * 点击「应用」或 docs 代码块 seed 的那一刻，且只加载代码里用到的模块。
 *
 * ## 为什么要按 specifier 筛
 * 一次全量 `Promise.all([antd, icons, …])` 也能"懒加载"，但用户只改一行 Table 数据时
 * 仍要下全量 antd。按 `require("x")` 筛过之后，quick-start 的最小表格示例只需要
 * `react` + `@nukepayload2/data-grid`（≈60 KB gz），而不是 antd 全家。
 *
 * ## 未知名要报错，但要报得能改
 * `evalModule` 的 require 缺模块时只会说"模块未注入"，编辑者不知道能注入哪些名字。
 * 这里把**可用名字**一起抛出去。
 */
import type { ComponentType } from 'react'

/** require 注入表的值：通常是模块命名空间，个别 key 换成定制对象（如图标白名单）。 */
export type LiveScope = Record<string, unknown>

/**
 * 固定注入表。键**字面对齐** demo 源码里的 import specifier —— `evalModule` 的 `require(s)`
 * 按 key 查表，写错一个字母就是"模块未注入"。
 */
const moduleLoaders: Record<string, () => Promise<unknown>> = {
  react: () => import('react'),
  'react-dom': () => import('react-dom'),
  'react-highlight-words': () => import('react-highlight-words'),
  // antd 与图标都走白名单（见 ./antdScope.ts / ./icons.ts）：
  // `import('antd')` 的命名空间会把整包 80+ 组件拖进首屏 chunk（实测 1 638 KB eager）。
  antd: () => import('./antdScope').then((m) => m.liveAntdScope),
  '@ant-design/icons': () => import('./icons').then((m) => m.liveIconScope),
  '@dnd-kit/core': () => import('@dnd-kit/core'),
  '@dnd-kit/sortable': () => import('@dnd-kit/sortable'),
  '@dnd-kit/modifiers': () => import('@dnd-kit/modifiers'),
  '@dnd-kit/utilities': () => import('@dnd-kit/utilities'),
  // 库内源码与发布名指向同一份命名空间。
  '@nukepayload2/data-grid': () => import('../table'),
  '../table': () => import('../table'),
}

/** `./_compare/<name>.shared` 这类每个 demo 独有的共享模块（懒加载，避免全部预载）。 */
const sharedModuleLoaders = import.meta.glob('../demos/_compare/*.shared.ts')

/** 编译产物里的 `require("x")`（sucrase 的 `imports` 变换会产出这种形态）。 */
const REQUIRE_PATTERN = /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g

/** 原始 ESM 源码里的 `from "x"`（未编译的源码直接喂进来时也能用）。 */
const IMPORT_PATTERN = /(?:^|[;\s])from\s*['"]([^'"]+)['"]/g

/** specifier → 已加载的模块 Promise（失败即摘除，允许重试）。 */
const loaded = new Map<string, Promise<unknown>>()

/** 固定表里的键，供报错文案与测试引用。 */
export const LIVE_SCOPE_KEYS: readonly string[] = Object.keys(moduleLoaders)

function loaderFor(specifier: string): (() => Promise<unknown>) | null {
  const direct = moduleLoaders[specifier]
  if (direct) return direct
  if (specifier.startsWith('./_compare/')) {
    // './_compare/x.shared' → '../demos/_compare/x.shared.ts'
    return sharedModuleLoaders[`../demos/${specifier.slice(2)}.ts`] ?? null
  }
  return null
}

/** 某个 specifier 是否可注入（不看是否已加载）。 */
export function isLiveSpecifier(specifier: string): boolean {
  return loaderFor(specifier) !== null
}

/** 加载单个 specifier；同一 specifier 只加载一次。 */
export function loadLiveModule(specifier: string): Promise<unknown> {
  const loader = loaderFor(specifier)
  if (!loader) {
    return Promise.reject(new Error(`模块未注入到 live scope：${specifier}`))
  }
  const cached = loaded.get(specifier)
  if (cached) return cached
  const pending = loader().catch((error: unknown) => {
    loaded.delete(specifier)
    throw error
  })
  loaded.set(specifier, pending)
  return pending
}

/** 从源码或编译产物里抓出 require/import 到的 specifier（去重、保序）。 */
export function scanLiveSpecifiers(code: string): string[] {
  const found = new Set<string>()
  for (const match of code.matchAll(REQUIRE_PATTERN)) found.add(match[1])
  for (const match of code.matchAll(IMPORT_PATTERN)) found.add(match[1])
  return [...found]
}

/**
 * 按 specifier 列表构造 require 注入表。
 *
 * `react` 永远注入：`evalModule` 把 scope.react 当第四参数传给工厂函数，
 * 而 classic JSX 运行时产出的是裸 `React.createElement` 调用。
 */
export async function loadLiveScope(specifiers: readonly string[]): Promise<LiveScope> {
  const wanted = new Set(specifiers)
  wanted.add('react')

  const known: string[] = []
  const unknown: string[] = []
  for (const specifier of wanted) {
    if (loaderFor(specifier)) known.push(specifier)
    else unknown.push(specifier)
  }

  if (unknown.length > 0) {
    throw new Error(
      `模块未注入到 live scope：${unknown.join('、')}。` +
        `可注入：${LIVE_SCOPE_KEYS.join('、')}、./_compare/<demo>.shared`,
    )
  }

  const modules = await Promise.all(known.map((specifier) => loadLiveModule(specifier)))
  const scope: LiveScope = {}
  known.forEach((specifier, index) => {
    scope[specifier] = modules[index]
  })
  return scope
}

/** 一步到位：从源码/编译产物解析出 specifier 再构造注入表。 */
export function resolveLiveScope(code: string): Promise<LiveScope> {
  return loadLiveScope(scanLiveSpecifiers(code))
}

/** `evalModule` 的产出类型，供调用方（LiveEditor / docs 代码块）复用。 */
export type LiveComponent = ComponentType<Record<string, unknown>>
