/** 用 sucrase 将 demo TSX 编译成可执行的 CJS 字符串。 */
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
