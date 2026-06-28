/**
 * compile：用 sucrase 把 demo 源码（TSX 字符串）编译成 CJS 可执行 JS。
 *
 * === 设计点 ===
 * - transforms 顺序 `['typescript', 'jsx', 'imports']`：
 *   1) typescript：剥离 type/interface/import type（demo 子文件大量类型注解/泛型被去掉了）。
 *   2) jsx：classic runtime——产物是 `React.createElement(...)`，因此作用域只需注入 React。
 *   3) imports：把 ES `import`/`export` 转成 CJS `require`/`module.exports`，配合 evalModule
 *      的 `new Function('module','exports','require', js)` 执行模型。
 * - jsxRuntime: 'classic' + disableESTransforms: true：保留 ES 语法特性给浏览器原生处理，
 *   只做 TS/JSX/import 三件事，最小化产物改动（与 dumi/svte 一致）。
 * - 失败不抛——返回 `{ ok: false, error }`，让 LiveEditor 在 Alert 里展示，不打断编辑。
 *
 * 调用方：LiveEditor.handleApply 内 **dynamic import** 此模块，确保默认渲染路径不加载 sucrase。
 */
import { transform } from 'sucrase'

export type CompileResult =
  | { ok: true; js: string }
  | { ok: false; error: string }

export function compile(code: string): CompileResult {
  try {
    const { code: js } = transform(code, {
      transforms: ['typescript', 'jsx', 'imports'],
      jsxRuntime: 'classic',
      disableESTransforms: true,
    })
    return { ok: true, js }
  } catch (e) {
    return { ok: false, error: (e as Error)?.message ?? String(e) }
  }
}
