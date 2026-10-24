/**
 * 给 `dist/**` 下的 `.d.ts` 相对 specifier 补 `.js` 扩展名。
 *
 * ## 为什么需要
 * 包是 `"type": "module"`，因此 `dist/*.d.ts` 被 TypeScript 当作 ESM 声明文件。
 * `moduleResolution: node16 | nodenext` 要求 ESM 的相对导入带显式扩展名，而 `tsc` 不会自动补
 * （TS2834）。缺扩展名时整条 re-export 链解析失败；若消费端开了默认的 `skipLibCheck`，
 * 这些错误被吞掉，结果是 `ColumnsType` 等类型**静默退化成 any**，报错反而落到用户代码上（TS7006）。
 *
 * ## 做法
 * 先把注释屏蔽成等长空白（`.d.ts` 的注释里有 `from './x'` 这类字样，不能当导入处理），
 * 再对真实导入/导出语句替换相对 specifier，按磁盘实际文件判定：
 * - `<spec>.d.ts` 存在 → `<spec>.js`
 * - `<spec>/index.d.ts` 存在 → `<spec>/index.js`
 * - 纯资源后缀（`.css` 等）→ 原样保留
 * - 其余解析不到 → 计入 unresolved 并让脚本非零退出，避免把坏树发布出去
 *
 * 对打包器（`moduleResolution: bundler`）无影响：TS 与 Vite 都能把 `./x.js` 对回 `x.d.ts` / 源文件。
 *
 * 用法：`node scripts/fix-dts-extensions.mjs`（`build:types` 内紧随 `tsc` 之后执行）
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const distDir = join(repoRoot, 'dist')

/** d.ts 里需要补扩展名的三类相对引用（`d`：带匹配下标，便于在原串上拼接）。 */
const SPECIFIER_PATTERNS = [
  // `import { x } from './x'` / `export * from './x'` / `export type { x } from './x'`
  /(\bfrom\s+)(['"])(\.{1,2}\/[^'"]*)\2/gd,
  // 副作用导入 `import './x'`
  /(\bimport\s+)(['"])(\.{1,2}\/[^'"]*)\2/gd,
  // 动态导入 `import('./x')`
  /(\bimport\(\s*)(['"])(\.{1,2}\/[^'"]*)\2/gd,
]

const ALREADY_EXTENDED = /\.(js|mjs|cjs|json)$/
const ASSET_EXTENSION = /\.(css|json|svg|png|jpe?g|gif|webp|wasm)$/

/** 递归收集 `dist/**\/*.d.ts`。 */
function collectDeclarationFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      collectDeclarationFiles(full, out)
    } else if (entry.isFile() && entry.name.endsWith('.d.ts')) {
      out.push(full)
    }
  }
  return out
}

/**
 * 把注释替换成等长空白（保留换行），字符串/模板串原样保留 —— specifier 都在字符串里。
 */
function maskComments(source) {
  let out = ''
  let i = 0
  while (i < source.length) {
    const char = source[i]
    const next = source[i + 1]
    if (char === '/' && next === '*') {
      const end = source.indexOf('*/', i + 2)
      const stop = end === -1 ? source.length : end + 2
      out += source.slice(i, stop).replace(/[^\n]/g, ' ')
      i = stop
    } else if (char === '/' && next === '/') {
      const end = source.indexOf('\n', i)
      const stop = end === -1 ? source.length : end
      out += ' '.repeat(stop - i)
      i = stop
    } else if (char === '"' || char === "'" || char === '`') {
      let j = i + 1
      while (j < source.length) {
        if (source[j] === '\\') {
          j += 2
          continue
        }
        if (source[j] === char) {
          j += 1
          break
        }
        j += 1
      }
      out += source.slice(i, j)
      i = j
    } else {
      out += char
      i += 1
    }
  }
  return out
}

/** 按磁盘实际文件补扩展名；无法判定时返回 null。 */
function withExtension(filePath, specifier) {
  if (ALREADY_EXTENDED.test(specifier)) return specifier
  if (ASSET_EXTENSION.test(specifier)) return specifier
  const absolute = resolve(dirname(filePath), specifier)
  if (isFile(`${absolute}.d.ts`)) return `${specifier}.js`
  if (isFile(join(absolute, 'index.d.ts'))) return `${specifier}/index.js`
  return null
}

function isFile(path) {
  try {
    return statSync(path).isFile()
  } catch {
    return false
  }
}

function relative(file) {
  return file.slice(repoRoot.length + 1).replaceAll('\\', '/')
}

const summary = { files: 0, changed: 0, rewritten: 0, unresolved: [] }

for (const file of collectDeclarationFiles(distDir)) {
  summary.files += 1
  const source = readFileSync(file, 'utf8')
  const masked = maskComments(source)
  const edits = []

  for (const pattern of SPECIFIER_PATTERNS) {
    pattern.lastIndex = 0
    let match
    while ((match = pattern.exec(masked)) !== null) {
      const specifier = match[3]
      const resolved = withExtension(file, specifier)
      if (resolved === null) {
        summary.unresolved.push(`${relative(file)} -> ${specifier}`)
        continue
      }
      if (resolved === specifier) continue
      const [start, end] = match.indices[3]
      edits.push({ start, end, text: resolved })
    }
  }

  if (edits.length === 0) continue

  let next = source
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    next = `${next.slice(0, edit.start)}${edit.text}${next.slice(edit.end)}`
  }
  writeFileSync(file, next)
  summary.changed += 1
  summary.rewritten += edits.length
}

console.log(
  `fix-dts-extensions: ${summary.files} 个 .d.ts，改写 ${summary.changed} 个文件 / ${summary.rewritten} 处 specifier`,
)

if (summary.unresolved.length > 0) {
  console.error('fix-dts-extensions: 以下相对引用找不到对应 .d.ts，请检查声明产物：')
  for (const item of summary.unresolved) console.error(`  - ${item}`)
  process.exitCode = 1
}
