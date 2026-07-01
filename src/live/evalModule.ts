/** 执行编译后的 CJS 模块并取出 default 导出的组件。 */
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
