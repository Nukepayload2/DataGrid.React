// stripComments：从源码字符串里剥离双斜杠行注释和 斜杠星...星斜杠 块注释（显示层用）。
//
// === 为什么需要 ===
// prism 高亮本身能正确着色注释，但部分下游消费方（如行数统计、纯文本 diff）需要「无注释」
// 的代码；本工具提供一个保守的、保留字符串字面量内容的去注释视图。子文件本身的开发注释
// **不被修改**——只影响这里的展示派生数据。
//
// === 状态机规则 ===
// - 遇双斜杠 → 跳到行尾（保护 URL 内 http://...，因为只要在字符串里就走字符串分支）。
// - 遇「斜杠星」开头 → 跳到「星斜杠」。
// - 遇单引号 / 双引号 / 反引号 → 整段字符串原样输出（含其中看起来像注释的双斜杠）；
//   处理反斜杠转义（'\n'、"\\\"" 等不会提前闭合）。
// - 其它字符原样累加。
//
// === 已知局限（可接受）===
// - 不处理正则字面量（/abc/）——试点 demo 子文件无正则；若后续 demo 引入正则需扩展。
// - 不处理 JSX 大括号-斜杠星-星斜杠-右大括号 的特殊语义——按普通块注释处理已足够
//   （JSX 注释本质上就是 斜杠星 ... 星斜杠）。
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
