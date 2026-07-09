/** 从源码字符串中移除行注释和块注释，保留字符串字面量内容。 */
function compactCodeBlankLines(code: string, protectedChars: boolean[]): string {
  const rawLines = code.split('\n')
  const lineProtected: boolean[] = []
  let cursor = 0

  for (const line of rawLines) {
    const end = cursor + line.length
    lineProtected.push(protectedChars.slice(cursor, end).some(Boolean))
    cursor = end + 1
  }

  const isBlankCodeLine = (index: number) =>
    !lineProtected[index] && rawLines[index].trim() === ''

  let start = 0
  let end = rawLines.length
  while (start < end && isBlankCodeLine(start)) start += 1
  while (end > start && isBlankCodeLine(end - 1)) end -= 1

  const lines: string[] = []
  let previousBlank = false
  for (let index = start; index < end; index += 1) {
    if (isBlankCodeLine(index)) {
      if (!previousBlank) lines.push('')
      previousBlank = true
      continue
    }
    lines.push(rawLines[index])
    previousBlank = false
  }

  return lines.join('\n')
}

export function stripComments(code: string): string {
  let out = '',
    i = 0
  const protectedChars: boolean[] = []
  const n = code.length
  const append = (text: string, protectedChar = false) => {
    out += text
    for (let j = 0; j < text.length; j += 1) protectedChars.push(protectedChar)
  }

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
      append(c, true)
      i++
      while (i < n && code[i] !== q) {
        if (code[i] === '\\') {
          append(code[i] + (code[i + 1] ?? ''), true)
          i += 2
          continue
        }
        append(code[i], true)
        i++
      }
      append(code[i] ?? '', true) // 闭合引号（或末尾缺引号的兜底）
      i++
      continue
    }
    append(c)
    i++
  }
  return compactCodeBlankLines(out, protectedChars)
}
