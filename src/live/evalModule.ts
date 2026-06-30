/**
 * evalModule：执行 CJS 编译产物，取出 default 导出的组件函数。
 *
 * === 执行模型 ===
 * sucrase `imports` transform 把 `import X from 'mod'` 转成 `require('mod')`、
 * `export default Foo` 转成 `module.exports.default = Foo`（实际经 `Object.defineProperty`
 * 或直接赋值）。这里用 `new Function('module','exports','require','React', js)` 包一个 CJS 沙箱，
 * 传入预先注入好的 `scope`（见 scope.ts），让 demo 子文件的 `require('../table')` 等命中文中模块。
 *
 * === React 闭包注入（classic jsx 兼容）===
 * compile.ts 用 `jsxRuntime: 'classic'`，产物是 `React.createElement(...)`。项目 tsconfig 是
 * `jsx: 'react-jsx'`（automatic），所以 demo 子文件**不显式 `import React`**，产物里引用的裸
 * `React` 在 factory 闭包内若不注入就会 ReferenceError。这里把 `scope['react']` 作为具名参数
 * `React` 传给 factory，让 classic jsx 裸引用可达——与子文件「automatic jsx 风格、无需 import React」
 * 的开发态约定一致（requireFn 仍兜底：子文件若显式 `import * as React`，require('react') 也命中）。
 *
 * === 设计点 ===
 * - 不预渲染：evalModule 只取组件引用，不调用它。antd 6 在 SSR/非 Provider 上下文渲染会产出
 *   噪音警告；真正的渲染交给 LiveEditor 外层（已在 ThemeProvider + ConfigProvider +
 *   VirtualizationProvider 树内）+ LiveErrorBoundary 兜渲染期错误。
 * - 校验 `typeof Comp === 'function'`：default 必须是函数组件，否则给明确错误。
 * - 失败不抛——返回 `{ ok: false, error }`。
 */
import type { ComponentType } from 'react'

export type EvalResult =
  | { ok: true; Comp: ComponentType<Record<string, unknown>> }
  | { ok: false; error: string }

export function evalModule(
  js: string,
  scope: Record<string, unknown>,
): EvalResult {
  try {
    const module = { exports: {} as Record<string, unknown> }
    const requireFn = (s: string): unknown => {
      if (s in scope) return scope[s]
      throw new Error(`模块未注入到 live scope：${s}`)
    }
    // React 注入 factory 闭包：classic jsx 产物的裸 React 引用可达。
    const React = scope['react']
    // eslint-disable-next-line no-new-func
    const factory = new Function('module', 'exports', 'require', 'React', js)
    factory(module, module.exports, requireFn, React)
    const Comp = module.exports.default
    if (typeof Comp !== 'function') {
      return { ok: false, error: '编译产物未导出 default 组件函数' }
    }
    return { ok: true, Comp: Comp as ComponentType<Record<string, unknown>> }
  } catch (e) {
    return { ok: false, error: (e as Error)?.message ?? String(e) }
  }
}
