/**
 * 永久门：文档 / 注释 / demo 正文里的**路径引用存在性**。
 *
 * 起因（本仓真实事故，两类各发作过一次）：
 *   1. `docs/design-notes` 这个目录**从未存在过**，却被 230 处注释与 demo 正文当依据引用
 *      （条数读数 `tmp/anchor-audit-step46-before.out`，口径=路径出现次数，非 grep 行数），
 *      其中 42 处直接渲染进 demo 站点正文，用户在页面上被指着去读一个不存在的文件（ledger E-041 / E-043）。
 *   2. 有交付拿 `COMPATIBILITY.md`（本仓无此文件）当「该差异已登记」的依据（ledger E-029，pitfalls P-043）。
 * 只要指针腐烂时**没有任何门会响**，就必须有这一条（S-004）。
 *
 * 判据是通用的「引用面存在性」，不针对 `docs/design-notes` 这个字符串：
 *   A 型 仓内前缀路径（`src/` `tests/` `docs/` `e2e/` `scripts/`）+ 已知扩展名 ⇒ 必须 existsSync。
 *       要求匹配串前一个字符不是路径字符 ⇒ `react-component/table/src/Table.tsx`、
 *       `ant-design/components/table/...` 这类**上游仓路径**不会被误当本仓路径（工单归类表第 3 类）。
 *   B 型 markdown 相对链接（圆括号里的 .md 目标，如「方括号 close 圆括号 open + <相对路径>.md」）
 *       与反引号里的 ./、../ 前缀 .md 路径 ⇒ 相对宿主文件目录解析后必须存在（工单归类表未覆盖、但同一族）。
 *
 * 反「静默零」：门自己数抽到的引用条数，低于地板值即判定**仪表坏了**并抛错，
 * 防止「扫描面配错 → 0 命中 → 全绿」这种假干净（同一族坑连错两次，见 ledger E-044②）。
 *
 * 豁免是**逐条具名**的（宿主 + 目标 + 理由），并要求每条豁免都仍然真的命中一次——
 * 失效豁免判红，防止这里变成长期停车场。
 */
// ── `@types/node` 缺失的三处抑制（本仓既定写法）────────────────────────────────
// 本仓刻意不装 `@types/node`：`tsconfig.lib.json` 的 `types` 只有 `vite/client`（`src/vite-env.d.ts`
// 同款），理由见 `src/table/devWarn.ts:51`。故 `node:fs` / `node:path` / `process` 运行期存在、类型面缺声明。
// 本件按其**职责**（S-004 永久门：扫真实磁盘、检查仓内路径引用是否存在）无法避开文件系统 API——
// `readdirSync(withFileTypes)` / `existsSync` 在浏览器与 `?raw` / `import.meta.glob` 面上都没有等价物，
// 改写会动到这道永久门的扫描面，故此处沿用本仓既有约定（同款见
// `tests/table/engine/header/sortDirectionsWiring.tsx:25` 与 `tests/table/features/Table.sorter.test.tsx:96`）。
// 抑制是**自校验**的：日后一旦装上 `@types/node`，这三行会因「抑制未被使用」而红（TS2578），是提醒而非隐患。
// @ts-expect-error TS2591：本仓无 @types/node，'node:fs' 无类型声明（运行时可用）
import { existsSync, readFileSync, readdirSync } from 'node:fs'
// @ts-expect-error TS2591：本仓无 @types/node，'node:path' 无类型声明（运行时可用）
import { dirname, join, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

// @ts-expect-error TS2591：本仓无 @types/node，'process' 无类型声明（运行时可用）
const ROOT = process.cwd()

/** 读哪些宿主文件。`.json` 刻意不读：`src/docs/generated/api.json` 与 doctor 的 dump 是产物，
 *  真源分别是 src JSDoc 与工具运行环境，红在同一条真源上；读它们只会双计并引入 stale 噪声。 */
const HOST_EXT = /\.(?:ts|tsx|js|jsx|mjs|cjs|css|md|html)$/
const SCAN_DIRS = ['src', 'tests', 'docs', 'e2e', 'scripts']
const SCAN_FILES = ['README.md']
const SKIP_DIR_NAMES = new Set(['node_modules', '.git', 'coverage', 'tmp', 'playwright-report', '.qoder'])

const TARGET_EXT = 'ts|tsx|js|jsx|mjs|cjs|css|md|html|json'
/** A 型：仓内前缀路径引用。前面必须不是路径字符，否则那只是上游仓路径的后缀。 */
const REPO_PATH_RE = new RegExp(
  `(?:^|[^\\w./\\\\-])((?:src|tests|docs|e2e|scripts)/[\\w./-]+?\\.(?:${TARGET_EXT}))(?![\\w-])`,
  'g',
)
/** B 型：相对 markdown 链接，或反引号里带 `./`、`../` 前缀的相对 .md 路径。 */
const REL_LINK_RE = /\]\(((?:[\w.-]+\/)*[\w.-]+\.md)(?:#[^)]*)?\)|`(\/?(?:\.\.?\/)[\w./-]+\.md)`/g

interface Exemption {
  /** 宿主文件（仓内相对路径，正斜杠） */
  host: string
  /** 目标引用串 */
  target: RegExp
  /** 为什么允许它不满足存在性 */
  reason: string
}

/**
 * 逐条具名豁免。能进这里的只有两种：它本来就不是本仓路径；或它不是存在性断言（变更日志 / 拟新增清单）。
 * 不许用通配宿主，新增必须带理由。
 */
const EXEMPTIONS: Exemption[] = [
  {
    host: 'docs/tasks/antd-style-system-migration-progress.md',
    target: /design-notes/,
    reason:
      '该行是变更日志，字面在说「已把该假路径换成 docs/features/styling/theme-tokens.md」；' +
      '把假路径改掉等于销毁这条记录，且句子会退化成「把 X 换成 X」的废话。',
  },
  {
    host: 'tests/shared/fakeTimers.ts',
    target: /^tests\/utils\.tsx$/,
    reason: '行首已写明 antd，指上游仓 tests 目录下那份 utils 件，不是本仓路径。',
  },
  {
    host: 'tests/shared/render.tsx',
    target: /^tests\/utils\.tsx$/,
    reason: '同上：上游仓 tests 目录那份 utils 件里的 customRender，本仓等价物就在本文件里。',
  },
  {
    host: 'tests/table/features/a11y.test.tsx',
    target: /^tests\/shared\/accessibilityTest\.tsx$/,
    reason: '指 antd 上游仓测试件；同段下一行给的是 `{{AntDesign}}` Portal key 形态的相对路径（不写机器绝对路径），本仓等价物是 tests/shared/demoHarness.tsx。',
  },
  {
    host: 'tests/table/features/demo.test.tsx',
    target: /^tests\/shared\/demoTest\.tsx$/,
    reason: '指 antd 上游仓测试件；同段下一行给的是 `{{AntDesign}}` Portal key 形态的相对路径（不写机器绝对路径）。',
  },
  {
    host: 'docs/recycling-virtualization-plan.md',
    target: /useRecyclingReactSlots/,
    reason:
      '「## 实现建议 · 新增或调整模块」清单里的**拟新增**文件名，不是存在性断言；同组另 3 个已落地、未落这个方案。',
  },
]

function walk(dir: string, out: string[] = []): string[] {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch (err) {
    if ((err as { code?: string }).code === 'ENOENT') return out
    throw err
  }
  for (const e of entries) {
    if (SKIP_DIR_NAMES.has(e.name) || e.name === 'dist' || e.name.startsWith('dist-')) continue
    const p = join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (HOST_EXT.test(e.name)) out.push(p.split(sep).join('/'))
  }
  return out
}

function hostFiles(): string[] {
  const list: string[] = []
  for (const d of SCAN_DIRS) list.push(...walk(d))
  for (const f of SCAN_FILES) if (existsSync(join(ROOT, f))) list.push(f)
  return list
}

interface Violation {
  host: string
  line: number
  target: string
  kind: 'repo' | 'relative'
}

const REPO_PREFIX_RE = /^(?:src|tests|docs|e2e|scripts)\//

/** markdown 链接有三种写法：仓根绝对（前导斜杠）、以仓内前缀从根算起（如 docs/<子目录>/<页>.md）、
 *  以及真相对（./ 或 ../ 前缀、以及裸文件名）。只有最后一组要按宿主文件目录解析，
 *  前两组若也按目录解析会造出根本不存在的假悬空链接。 */
function resolveRelative(host: string, raw: string): string {
  const clean = raw.replace(/^\//, '')
  if (raw.startsWith('/') || REPO_PREFIX_RE.test(raw)) return clean
  return join(dirname(host), raw).split(sep).join('/')
}

function collect() {
  const violations: Violation[] = []
  const exemptionHits = new Map<Exemption, number>()
  let total = 0
  for (const host of hostFiles()) {
    const lines = readFileSync(join(ROOT, host), 'utf8').split(/\r?\n/)
    for (let i = 0; i < lines.length; i++) {
      const text = lines[i]
      const note = (target: string, kind: Violation['kind']) => {
        total++
        if (existsSync(join(ROOT, target))) return
        const ex = EXEMPTIONS.find((e) => e.host === host && e.target.test(target))
        if (ex) exemptionHits.set(ex, (exemptionHits.get(ex) ?? 0) + 1)
        else violations.push({ host, line: i + 1, target, kind })
      }
      REPO_PATH_RE.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = REPO_PATH_RE.exec(text))) note(m[1], 'repo')
      REL_LINK_RE.lastIndex = 0
      while ((m = REL_LINK_RE.exec(text))) {
        const raw = m[1] ?? m[2]
        if (!raw) continue
        note(resolveRelative(host, raw), 'relative')
      }
    }
  }
  return { violations, total, exemptionHits }
}

function format(v: Violation): string {
  return `  ${v.host}:${v.line} -> ${v.target}`
}

const collected = collect()

describe('文档/注释路径引用存在性门（BAT-21）', () => {
  it('仪表是活的：扫描面非空且抽到足量路径引用', () => {
    // 地板值取自实测：BAT-21 落库前后本仓引用面稳定在 1400+ 条量级
    // （读数 tmp/anchor-audit-step46-before.out：1450 条 / 695 文件）。
    // 掉到地板以下说明扫描面或正则坏了，此时「零违规」毫无意义，必须先红。
    expect(collected.total).toBeGreaterThan(800)
    expect(hostFiles().length).toBeGreaterThan(400)
  })

  it('每条具名豁免都仍然命中（防失效豁免变成停车场）', () => {
    const dead = EXEMPTIONS.filter((e) => (collected.exemptionHits.get(e) ?? 0) === 0)
    expect(dead.map((d) => `${d.host} :: ${d.reason.slice(0, 40)}`)).toEqual([])
  })

  it('仓内路径引用与相对链接全部指向磁盘上真实存在的文件', () => {
    expect(
      collected.violations.map(format).join('\n'),
      `发现 ${collected.violations.length} 条指向不存在文件的引用（逐条 宿主:行 -> 目标）`,
    ).toBe('')
  })
})
