/** 从源码字符串中移除行注释和块注释，保留字符串字面量内容。 */
export function stripComments(code: string): string {
  let out = '',
    i = 0
  const n = code.length
  while (i < n) {
    const c = code[i],
      next = code[i + 1]
    // 行注释：跳到行尾
    if (c === '/' && next === '/') {
      while (i < n && code[i] !== '\n') i++
      continue
    }
    // 块注释：跳到 */
    if (c === '/' && next === '*') {
      i += 2
      while (i < n && !(code[i] === '*' && code[i + 1] === '/')) i++
      i += 2
      continue
    }
    // 字符串字面量：原样输出，处理转义
    if (c === '"' || c === "'" || c === '`') {
      const q = c
      out += c
      i++
      while (i < n && code[i] !== q) {
        if (code[i] === '\\') {
          out += code[i] + (code[i + 1] ?? '')
          i += 2
          continue
        }
        out += code[i]
        i++
      }
      out += code[i] ?? '' // 闭合引号（或末尾缺引号的兜底）
      i++
      continue
    }
    out += c
    i++
  }
  return out
}
