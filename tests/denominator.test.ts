// 分母恒等式门（G-2）**静态侧**（BAT-0 0-E；设计＝步骤 51 §4.2，main 裁定）。
//
// 本文件每次 `pnpm test` 都跑，只读仓内 fixture（tests/fixtures/antd-denominator.json），
// 零网络、零 vitest 子进程、零新依赖。运行期恒等式（① direct+skipped＝total、④ skip 落点、
// 名单差集）由 `node scripts/antd-denominator.mjs --check` 在 main 独占窗口跑（P-069：
// 并发会漂数，rowSelection 一小时内 77→78→79 是实锤）。
//
// 静态侧校验（属性 ②③ ＋结构完整性＋反停车场）：
//   S1 fixture 存在且结构完整（缺 fixture 即红——P-043「载体不存在假绿」的镜像：
//      分母门不许在载体缺失时静默通过）；
//   S2 裁判版本＝**已安装** antd 版本（node_modules/antd/package.json）——P-088：
//      升级 antd 不重算 fixture 会直接红，而不是拿旧分母判新裁判；
//   S3 版本双写：每个镜像片的 6.4.4 与 6.5.2 两份参照名单都在（P-088 强制双写）；
//   S4 aligned ＝ fixture 按已安装版**重算**的名单长度（不接受人手写——ledger 与 fixture
//      不符即红）；extra652 ＝ 两份名单的逐行差集（重算，顺序敏感）；
//   S5 total ＝ aligned + extra652 + supplements + splits 增量（恒等式静态可验部分）；
//   S6 反停车场：renames 的参照侧值、splits 的参照侧键必须真在参照名单里
//      （不许把「改名/拆片」用来挂靠不存在的参照用例）；
//   S7 每个镜像片源码存在，且头部 80 行内写明对齐参照件名（「对齐来源」可回读）。
//
// 为什么**不**建 G-1（锚点可追溯门）——设计裁定（步骤 51 §4.1，main 采纳）：
//   锚点覆盖率 267/349＝76%，32 行无锚；空依据/语义依据不挂锚；本轮 4 条假主张它
//   **一条都抓不到**（filterDropdownVisible 那条锚真、名字模板也对得上）；且 5 个真实
//   反例（pagination 改名、sorter 交叉引用锚、rowSelection 锚到别的 it、empty
//   describe>it 压平、semantic 1 拆 3）⇒ 必须配白名单＋拆片计数法，否则首轮 6+ 条
//   假阳性。分母恒等式（本门）＋G-3 附注（字段存在性只查已安装版）是零假阳性路线。
//
// G-3 附注口径（钉死在注释，防将来加自动版时走偏）：字段存在性**只查已安装版**
//   node_modules/antd/es/**（6.4.4）。已知假阴性：`sorter:182` 的 `baseColumns` 在
//   6.5.2 上游真实存在（InternalTable.tsx:472-476），「任一侧命中即可」会放过版本混标。

import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const REPO = process.cwd()
const FIXTURE = path.join(REPO, 'tests', 'fixtures', 'antd-denominator.json')

/** 镜像片 → 上游件（与 scripts/antd-denominator.mjs 的 MAP 同表；null＝无同名源，不进分母）。 */
const MAP: Record<string, string> = {
  'tests/table/features/Sorter.value.test.tsx': 'Sorter.value.test.tsx',
  'tests/table/features/Table.expand.test.tsx': 'Table.expand.test.tsx',
  'tests/table/features/Table.filter.test.tsx': 'Table.filter.test.tsx',
  'tests/table/features/Table.order.test.tsx': 'Table.order.test.tsx',
  'tests/table/features/Table.pagination.test.tsx': 'Table.pagination.test.tsx',
  'tests/table/features/Table.rowSelection.test.tsx': 'Table.rowSelection.test.tsx',
  'tests/table/features/Table.sorter.test.tsx': 'Table.sorter.test.tsx',
  'tests/table/features/Table.test.tsx': 'Table.test.tsx',
  'tests/table/features/Table.virtual.test.tsx': 'Table.virtual.test.tsx',
  'tests/table/features/empty.test.tsx': 'empty.test.tsx',
  'tests/table/features/semantic.test.tsx': 'semantic.test.tsx',
}
const VERSIONS = ['6.4.4', '6.5.2']
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

interface FixtureSlice {
  [version: string]: string[]
  refSkips?: Record<string, number>
}
interface LedgerSlice {
  aligned?: number
  extra652?: string[]
  supplements?: number
  total?: number
  renames?: Record<string, string>
  splits?: Record<string, string[]>
}
interface Fixture {
  versions?: { installed?: string; upstream?: string }
  cases?: Record<string, FixtureSlice>
  ledger?: Record<string, LedgerSlice>
}

describe('分母恒等式门（G-2 静态侧）', () => {
  it('fixture 存在且结构完整（缺 fixture 即红，P-043 载体不存在假绿）', () => {
    expect(existsSync(FIXTURE), `tests/fixtures/antd-denominator.json 缺失——分母门载体不存在，不许静默通过`).toBe(true)
    const fixture = JSON.parse(readFileSync(FIXTURE, 'utf8')) as Fixture
    expect(fixture.versions?.installed, 'versions.installed 缺失（裁判版本未声明）').toBeTruthy()
    expect(fixture.versions?.upstream, 'versions.upstream 缺失（参照版本未声明）').toBeTruthy()
    expect(fixture.cases, 'cases 段缺失').toBeTruthy()
    for (const [slice, ref] of Object.entries(MAP)) {
      const entry = fixture.cases?.[ref]
      expect(entry, `${slice}：fixture 缺参照件 ${ref}`).toBeTruthy()
      for (const v of VERSIONS) {
        expect(
          Array.isArray(entry?.[v]) && entry[v].length > 0,
          `${slice}：${ref} 的 ${v} 名单缺失或为空（版本双写强制，P-088）`,
        ).toBe(true)
      }
      // 上游件内 it.skip/it.only 必须为 0（步骤 51 实测基线；上游加 skip 时强制人工复核）
      const skips = entry?.refSkips
      for (const v of VERSIONS) {
        expect(skips?.[v] ?? 0, `${slice}：${ref} 的 ${v} 出现 it.skip/it.only（参照侧 skip 需要人工处置）`).toBe(0)
      }
    }
  })

  it('裁判版本＝已安装 antd 版本（P-088：升级不重算 ⇒ 红）', () => {
    const fixture = JSON.parse(readFileSync(FIXTURE, 'utf8')) as Fixture
    const pkg = JSON.parse(readFileSync(path.join(REPO, 'node_modules', 'antd', 'package.json'), 'utf8')) as {
      version: string
    }
    expect(
      fixture.versions?.installed,
      `fixture 声明裁判 ${fixture.versions?.installed}，已安装 antd 是 ${pkg.version}——跑 scripts/antd-denominator.mjs --regen 重算`,
    ).toBe(pkg.version)
  })

  for (const [slice, ref] of Object.entries(MAP)) {
    it(`ledger 恒等式：${slice}`, () => {
      const fixture = JSON.parse(readFileSync(FIXTURE, 'utf8')) as Fixture
      const entry = fixture.cases?.[ref]
      const ledger = fixture.ledger?.[slice]
      expect(entry, 'fixture 缺该参照件').toBeTruthy()
      expect(ledger, 'ledger 缺该片的台账行').toBeTruthy()
      const installed = fixture.versions?.installed ?? '6.4.4'
      const aligned = entry[installed].length
      const extra652 = entry['6.5.2'].filter((n) => !entry[installed].some((x) => norm(x) === norm(n)))
      const splitsExtra = Object.values(ledger.splits ?? {}).reduce((n, v) => n + Math.max(0, v.length - 1), 0)
      // S4：aligned 由 fixture 重算（人手写不符即红）
      expect(ledger.aligned, `aligned 人手写 ${ledger.aligned} ≠ fixture 重算 ${aligned}（${installed}）`).toBe(aligned)
      // S4：extra652 ＝ 重算差集（顺序敏感，防漏行）
      expect(
        ledger.extra652 ?? [],
        'extra652 与 fixture 重算差集不一致（版本双写差集必须逐行在册）',
      ).toEqual(extra652)
      // S5：恒等式
      expect(
        ledger.total,
        `total=${ledger.total} ≠ aligned ${aligned} + extra652 ${extra652.length} + supplements ${ledger.supplements} + splits ${splitsExtra}`,
      ).toBe(aligned + extra652.length + (ledger.supplements ?? 0) + splitsExtra)
      // S6：反停车场
      const refSet = new Set([...entry[installed], ...extra652].map(norm))
      for (const [ours, refName] of Object.entries(ledger.renames ?? {})) {
        expect(refSet.has(norm(refName)), `renames「${ours}」挂靠的参照名「${refName}」不在参照名单里（停车场）`).toBe(true)
      }
      for (const refName of Object.keys(ledger.splits ?? {})) {
        expect(refSet.has(norm(refName)), `splits 键「${refName}」不在参照名单里（停车场）`).toBe(true)
      }
    })

    it(`片源码存在且头部写明对齐参照件：${slice}`, () => {
      const file = path.join(REPO, slice)
      expect(existsSync(file), `${slice} 不存在`).toBe(true)
      const head = readFileSync(file, 'utf8')
        .split(/\r?\n/)
        .slice(0, 80)
        .join('\n')
      expect(head, `${slice} 头部 80 行内未写明对齐参照件 ${ref}（「对齐来源」不可回读）`).toContain(ref)
    })
  }
})
