// skip 纪律门（BAT-0 0-C）：tests/** 下每一处 skip 必须带紧邻注释，且注释里含**可核验锚点**。
//
// 来历：`tmp/check-skips.mjs` 是一次性验收脚本（自声明「不进仓库」），且只扫**单层**
//   `tests/table/features`、只认 `.test.tsx?` 文件名 ⇒ `tests/shared/**`、
//   `tests/table/<子目录>/**`、非 `.test.` 命名文件里的 skip 全部漏检，且只查「有没有注释」
//   不查「注释能不能核验」。本门把口径升级为：
//   · 作用域：`tests/**` 递归（含 `tests/shared/**`——那里是被 vitest include 排除的共享件，
//     恰恰是「skip 混进 helper 却无人过问」的高危区）；
//   · 判据：skip 行的紧邻注释块（上一非空行起向上连续的 `//`/`/*`/`*`/`*/` 行）必须存在，
//     且其中至少含一个可核验锚点——
//       ① `文件路径:行号`（如 `src/table/compat/filter.ts:89`、`antd/es/table/InternalTable.js:244`、
//          同文件引用 `Table.pagination.test.tsx:127`）；
//       ② 参照测试行引用（如 `antd L116`，规约源 = 上游 checkout 的 Table.*.test.tsx 行号）。
//     只有散文（「data-grid 不支持」「见上文」）不算锚点——锚点必须能被 grep / 打开文件核验。
//   · 只查不修：本门**不改**任何既有 skip 注释。历史欠账（无锚点）登记在下方
//     `KNOWN_REDS`（**自清理**：注释补上锚点后对应条目自动变红、逼着删条目；
//     条目指向 96 报告 §5 的红清单，由后续批次补锚点——本批写面不含对应文件）。
//
// 自证（BAT-0 0-C，改前红 / 删后绿，见 96 报告 §4）：
//   · 无注释 skip ⇒ 红；`tests/shared/**` 下 skip ⇒ 红；删除探针 ⇒ 绿。
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// vitest 以仓库根为 cwd 运行（与 tests/docs-reference.test.ts 同口径）。
const repoRoot = process.cwd()
const testsDir = join(repoRoot, 'tests')

/** 递归收集 tests/** 下全部源码文件（.ts/.tsx/.jsx/.js）。 */
function collectFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) collectFiles(p, out)
    else if (/\.(tsx?|jsx?)$/.test(name)) out.push(p)
  }
  return out
}

/** skip 形态：`it.skip(` / `test.skip(` / `describe.skip(` / `xit(` / `xdescribe(`。
 *  注释行整体排除（文档里提到 `it.skip(` 不算 skip）。 */
const SKIP_RE = /(^|\s)(it|test|describe)\.skip\s*\(|(^|\s)(xit|xdescribe)\s*\(/
const COMMENT_LINE_RE = /^(\/\/|\/\*|\*)/
const COMMENT_END_RE = /\*\//

/** 锚点：① 文件路径:行号；② antd 参照测试行。 */
const FILE_LINE_RE = /[\w@./-]+\.(tsx?|js|mjs|css|json|md|snap):\d+/g
const ANTD_L_RE = /antd\s+L\d+/g

interface SkipViolation {
  file: string
  line: number
  kind: 'no-comment' | 'no-anchor'
  snippet: string
}

/**
 * 历史红登记（BAT-0 0-C 首扫，红清单全文见 96 报告 §5；只减不增）。
 * 自清理：对应 skip 注释补上锚点后，本条目找不到匹配 ⇒ 红，逼着删条目。
 */
const KNOWN_REDS: Array<{ file: string; line: number; kind: SkipViolation['kind']; note: string }> = [
  {
    file: 'tests/table/features/Table.sorter.test.tsx',
    line: 531,
    kind: 'no-anchor',
    note: '依据块（:524-530）含 `src/table/compat/filter.ts`（无行号）+ grep 零命中声明 + 同文件兄弟用例名引用，' +
      '无 file:line / antd L<num> 锚点。补法：给 `src/table/compat/filter.ts` 补行号或改引兄弟用例行。' +
      '（行号 2026-09-30 因 96 报告 B30 头部对账编辑 523→531 重登记。）',
  },
]

/** 扫描一个文件，返回全部 skip 违规。 */
function scanFile(file: string): SkipViolation[] {
  // 统一为 POSIX 分隔符（Windows 下 join 产出反斜杠，与 KNOWN_REDS 登记口径对齐）。
  const rel = file.slice(repoRoot.length + 1).split(/[\\/]/).join('/')
  const lines = readFileSync(file, 'utf8').split(/\r?\n/)
  const violations: SkipViolation[] = []
  lines.forEach((line, i) => {
    const trimmed = line.trim()
    if (COMMENT_LINE_RE.test(trimmed)) return
    if (!SKIP_RE.test(line)) return
    // 紧邻注释块：跳过空行后，从上一非空行向上收连续注释行。
    let j = i - 1
    while (j >= 0 && lines[j].trim() === '') j -= 1
    const blockEnd = j
    while (j >= 0) {
      const t = lines[j].trim()
      if (COMMENT_LINE_RE.test(t) || t.endsWith('*/')) j -= 1
      else break
    }
    if (blockEnd < 0 || !COMMENT_LINE_RE.test(lines[blockEnd].trim()) && !lines[blockEnd].trim().endsWith('*/')) {
      violations.push({ file: rel, line: i + 1, kind: 'no-comment', snippet: trimmed.slice(0, 80) })
      return
    }
    const block = lines.slice(j + 1, blockEnd + 1).join('\n')
    const anchors = [...new Set([...(block.match(FILE_LINE_RE) ?? []), ...(block.match(ANTD_L_RE) ?? [])])]
    if (anchors.length === 0) {
      violations.push({ file: rel, line: i + 1, kind: 'no-anchor', snippet: trimmed.slice(0, 80) })
    }
  })
  return violations
}

function matchesKnownRed(v: SkipViolation): boolean {
  return KNOWN_REDS.some((k) => k.file === v.file && k.line === v.line && k.kind === v.kind)
}

describe('skip discipline (BAT-0 0-C)', () => {
  it('every skip under tests/** has an adjacent comment with a verifiable anchor', () => {
    const violations = collectFiles(testsDir).flatMap(scanFile)
    const fresh = violations.filter((v) => !matchesKnownRed(v))
    expect(
      fresh,
      '新违规（未登记）：\n' +
        fresh.map((v) => `${v.file}:${v.line} [${v.kind}] ${v.snippet}`).join('\n'),
    ).toEqual([])
  })

  it('KNOWN_REDS 全部仍然在场（注释补上锚点后必须删对应条目）', () => {
    const violations = collectFiles(testsDir).flatMap(scanFile)
    const stale = KNOWN_REDS.filter(
      (k) => !violations.some((v) => v.file === k.file && v.line === k.line && v.kind === k.kind),
    )
    expect(
      stale,
      '已失效的历史红（skip 注释已补锚点，删掉对应 KNOWN_REDS 条目）：\n' +
        stale.map((k) => `${k.file}:${k.line} [${k.kind}] ${k.note}`).join('\n'),
    ).toEqual([])
  })
})
