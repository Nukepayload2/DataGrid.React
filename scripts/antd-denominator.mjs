#!/usr/bin/env node
// scripts/antd-denominator.mjs — 黑盒镜像片「分母恒等式门」（G-2，BAT-0 0-E 落地；设计＝步骤 51 §4.2，main 裁定）
//
// 两种模式：
//   node scripts/antd-denominator.mjs --regen [clonePath]
//     从上游 ant-design 克隆（默认 G:/Projects/ant-design，工作树＝6.5.2，`git show 6.4.4:...` 取裁判版）
//     重算参照用例名单，重写 tests/fixtures/antd-denominator.json（**只重写 cases 段，ledger 段原样保留**）。
//     上游升级后跑一次即可；CI/别的机器没有克隆也能跑 --check（只读仓内 fixture）。
//   node scripts/antd-denominator.mjs --check
//     运行期分母门（**只能在 main 独占窗口跑**，P-069：并发会漂数——rowSelection 一小时内 77→78→79 是实锤）。
//     逐片 `vitest run --reporter=json` 取**运行名单**，校验：
//       ① passed + skipped ＝ ledger.total（direct + skipped ＝ 台账 total）；
//       ② aligned ＝ fixture 按**已安装裁判版**重算的名单长度（不接受人手写——ledger.aligned 与 fixture 长度不符即红）；
//       ③ 版本双写：6.4.4 与 6.5.2 两份名单都在 fixture 里，两者不等时逐行列出差集（extra652 必须与重算差集一致）；
//       ④ 每个运行期 skipped 名字必须在本片源码里字面出现（工厂展开名除外，工厂展开名按调用点模板解析），
//          堵住 P-033/P-037 的名单-源行错配。
//     比对口径＝**名单差集**而非总数；差集（孤儿/缺行）逐条打印供人工复核。
//
// 计数口径（与 tmp/denominator-audit.mjs 的 R/D 口径一致，P-033 实锤过静态双计）：
//   - 用例＝`it(` / `test(` 声明行（`.skip`/`.only`/`.each` 变体同计）；`describe` 不计；
//   - 工厂体（`function test(name){…}` 体内的声明）只算 1 行声明，**真正条数＝调用点个数**，
//     名字按调用点实参展开（filter 的 `can be controlled by ${propName}` ×2 就是这么来的）；
//   - `Table.test.tsx` 的 `mountTest(Table)` / `rtlTest(Table)` 各展开 1 条，名字取自 antd
//     `tests/shared/mountTest.tsx` / `rtlTest.tsx`（6.4.4 与 6.5.2 两版已核同名，见 fixture provenance）；
//   - 参数化模板名（`${…}`）归一为 `*`（非工厂场景）。
//
// 为什么**不**建 G-1（锚点可追溯门）——设计裁定（步骤 51 §4.1，main 采纳）：
//   锚点覆盖率 267/349＝76%，32 行无锚；空依据/语义依据不挂锚；本轮 4 条假主张它**一条都抓不到**
//   （filterDropdownVisible 那条锚真、名字模板也对得上）；且 5 个真实反例（pagination:260 改名、
//   sorter:1799 交叉引用锚、rowSelection:2443 锚到别的 it、empty:76 describe>it 压平、semantic 1 拆 3）
//   ⇒ 必须配白名单＋拆片计数法，否则首轮 6+ 条假阳性。分母恒等式（本门）＋G-3 附注（字段存在性只查
//   已安装版）是零假阳性路线。
//
// G-3 附注（字段存在性小查）：**只查已安装版** `node_modules/antd/es/**`（6.4.4）。
//   已知假阴性：`sorter:182` 的 `baseColumns` 在 6.5.2 上游真实存在（InternalTable.tsx:472-476），
//   "任一侧命中即可"的写法会放过版本混标 ⇒ 上游命中不能豁免。本脚本 --check 不做 G-3（那是逐条
//   人工回读项，见 tmp/vortex-logs/fix-real-bugs/51-analyst-denominator-integrity.md §4.3），
//   此处只把口径钉死在注释里，防止将来有人加"任一侧命中"的自动版。

import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')
const FIXTURE = path.join(REPO, 'tests', 'fixtures', 'antd-denominator.json')
const DEFAULT_CLONE = 'G:/Projects/ant-design'

/** 镜像片 → 上游件（null＝该片自述「antd 无同名源文件」，不进 antd 分母，不进本 fixture） */
const MAP = {
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
const REF_DIR = 'components/table/__tests__'
// 上游共享 helper 的展开名（两版已核同名：6.4.4 tag 与工作树 6.5.2 的 tests/shared/{mountTest,rtlTest}.tsx）
const HELPER_NAMES = {
  'Table.test.tsx': [
    'component could be updated and unmounted without errors', // mountTest
    'component should be rendered correctly in RTL direction', // rtlTest
  ],
}

const DECL = /^\s*(?:it|test)((?:\.\w+)*)(?:\s*\([^)]*\))?\s*\(/
const NAME = /(['"`])((?:\\.|(?!\1)[^\\])*)\1/

/** 体边界：从定义行下一行起，到缩进回落到 <= 定义行缩进的第一非空行。 */
function bodyEnd(lines, start) {
  const base = (lines[start].match(/^\s*/)?.[0] ?? '').length
  for (let j = start + 1; j < lines.length; j += 1) {
    const t = lines[j]
    if (t.trim() === '') continue
    if ((t.match(/^\s*/)?.[0] ?? '').length <= base) return j
  }
  return lines.length
}

/** `${typeof x}` 的机械求值：x 的字面量取值（number/string/boolean/null/对象/数组）。 */
function evalTemplate(template, values) {
  return template.replace(/\$\{typeof\s+(\w+)\}/g, (_, p) => {
    const v = values[p]
    if (v === null) return 'object'
    if (v === undefined) return '*'
    if (Array.isArray(v)) return 'object'
    return typeof v
  }).replace(/\$\{[^}]*\}/g, '*')
}

/**
 * 解析一份上游件源码 → 用例名单（按声明顺序；工厂按调用点展开）。
 * 两类工厂（P-033 口径）：
 *   F1 `function test(name){…}`：体声明 1 行 → 调用点 `test('字面量');` 每处 1 条，名字按实参展开；
 *   F2 `[…].forEach((…)=>{…})` 且**体内有用例声明**：体声明 1 行 → 数组条目数 N → N 条，
 *     模板名按条目的字面量求值（`${typeof x}` 可解，其余 `${…}` 归一 `*`）。
 *     （实测 11 件里只有 Table.filter.test.tsx L795 一处 F2：`[['Light',93],['Bamboo',false]]`
 *       → `number type` / `boolean type`；其余 `.forEach` 都是测试体内的 DOM 迭代，体内无声明行。）
 */
function collect(src, file) {
  const lines = src.split(/\r?\n/)
  const names = []
  let skips = 0
  const factoryBodies = new Set()
  const expansions = [] // { template, values[] }

  // F1：function test(
  const fnStart = lines.findIndex((l) => /^\s*function\s+test\s*\(/.test(l))
  if (fnStart !== -1) {
    const end = bodyEnd(lines, fnStart)
    let template = null
    for (let j = fnStart + 1; j < end; j += 1) {
      if (DECL.test(lines[j])) {
        factoryBodies.add(j)
        const m = lines[j].match(NAME)
        if (m) template = m[2]
      }
    }
    if (template !== null) {
      const args = []
      for (let j = 0; j < lines.length; j += 1) {
        const m = lines[j].match(/^\s*test\s*\(\s*(['"`])([^'"`]*)\1\s*\)\s*;?\s*$/)
        if (m) {
          args.push(m[2])
          factoryBodies.add(j) // 调用点行本身不是用例（无自己的用例名），条数/名字由模板展开给出
        }
      }
      for (const a of args) expansions.push(template.replace(/\$\{[^}]*\}/g, a))
    }
  }
  // F2：语句级 .forEach( 且体内有声明行
  lines.forEach((l, i) => {
    if (!/^\s*(?:[^\n[]*\[)?[^\n]*\]\.forEach\s*\(/.test(l) && !/^\s*\.forEach\s*\(/.test(l)) return
    const end = bodyEnd(lines, i)
    let template = null
    for (let j = i + 1; j < end; j += 1) {
      if (DECL.test(lines[j])) {
        factoryBodies.add(j)
        const m = lines[j].match(NAME)
        if (m) template = m[2]
      }
    }
    if (template === null) return // DOM 迭代，不是用例工厂
    // 数组条目：从 forEach 行回溯数组开括号。只认两种形状（11 件实测只有 filter 一处 F2，
    // 形状＝多行裸 `[` 开 + 每行一个 `[…],` 条目）；认不出就**硬失败**（P-091：宁可红不猜）。
    const tForEach = lines[i].trim()
    let open = -1
    if (/^\[.*\]\.forEach/.test(tForEach)) {
      open = i // 单行数组
    } else {
      for (let j = i - 1; j >= Math.max(0, i - 12); j -= 1) {
        const t = lines[j].trim()
        if (/^\[\s*$/.test(t)) {
          open = j
          break
        }
        if (/^\}\s*$/.test(t) || DECL.test(lines[j])) break // 结构边界：认不出
      }
    }
    if (open === -1) {
      console.error(`[denominator] 红：${file} L${i + 1} 的 forEach 用例工厂认不出数组形状（本脚本不猜，人工处理后重跑 --regen）`)
      process.exit(1)
    }
    const dm = lines[i].match(/\.forEach\s*\(\s*\(\s*\[?([\w\s,]+)\]?\s*\)\s*=>/)
    const params = dm ? dm[1].split(',').map((s) => s.trim()) : []
    const entries = []
    const entryRe = open === i ? /^\[\s*(.*?)\s*\]\.forEach/ : /^\s*\[\s*(.*?)\]\s*,?\s*$/
    for (let j = open; j <= (open === i ? i : i - 1); j += 1) {
      const m = lines[j].match(entryRe)
      if (m) {
        const parts = m[1].split(',').map((s) => s.trim())
        const vals = {}
        params.forEach((p, k) => {
          const raw = parts[k]
          vals[p] =
            raw === undefined ? undefined :
            raw === 'null' ? null :
            raw === 'true' ? true :
            raw === 'false' ? false :
            /^["'`].*["'`]$/.test(raw) ? raw.slice(1, -1) :
            raw !== '' && !Number.isNaN(Number(raw)) ? Number(raw) :
            raw
        })
        entries.push(vals)
      }
    }
    if (entries.length === 0) {
      console.error(`[denominator] 红：${file} L${i + 1} 的 forEach 用例工厂数不到数组条目（不猜，人工处理后重跑 --regen）`)
      process.exit(1)
    }
    expansions.push(...entries.map((v) => evalTemplate(template, v)))
  })
  lines.forEach((l, i) => {
    if (!DECL.test(l)) return
    if (factoryBodies.has(i)) return // 工厂体声明：条数由调用点/条目决定，上面已展开
    const m = l.match(NAME)
    let name = m ? m[2] : '(non-literal)'
    if (/\$\{/.test(name)) name = name.replace(/\$\{[^}]*\}/g, '*')
    if (/\.skip\(/.test(l)) skips += 1
    names.push(name)
  })
  names.push(...expansions)
  const extra = HELPER_NAMES[file]
  if (extra) names.push(...extra)
  return { names, skips }
}

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

function regen(clone) {
  const fixture = JSON.parse(readFileSync(FIXTURE, 'utf8'))
  const versions = {}
  const describe = execFileSync('git', ['-C', clone, 'describe', '--tags'], { encoding: 'utf8' }).trim()
  for (const ref of Object.values(MAP)) {
    const cur = readFileSync(path.join(clone, REF_DIR, ref), 'utf8')
    const old = execFileSync('git', ['-C', clone, 'show', `6.4.4:${REF_DIR}/${ref}`], { encoding: 'utf8' })
    const c652 = collect(cur, ref)
    const c644 = collect(old, ref)
    versions[ref] = {
      '6.4.4': c644.names,
      '6.5.2': c652.names,
      refSkips: { '6.4.4': c644.skips, '6.5.2': c652.skips },
    }
  }
  fixture.cases = versions
  fixture.provenance.generated =
    `2026-09-30 起由本脚本 --regen 生成（上游 ${describe}；6.4.4 经 git show，只读）`
  writeFileSync(FIXTURE, JSON.stringify(fixture, null, 2) + '\n')
  for (const [ref, v] of Object.entries(versions)) {
    console.log(`${ref}: 6.4.4=${v['6.4.4'].length} 6.5.2=${v['6.5.2'].length} refSkips=${v.refSkips['6.4.4']}/${v.refSkips['6.5.2']}`)
  }
}

/** --check：运行期分母门（独占窗口）。 */
function check() {
  if (!existsSync(FIXTURE)) {
    console.error(`[denominator] 红：fixture 缺失 ${path.relative(REPO, FIXTURE)}（缺 fixture 即红，不许 skip——P-043 载体不存在假绿）`)
    process.exit(1)
  }
  const fixture = JSON.parse(readFileSync(FIXTURE, 'utf8'))
  const installed = fixture.versions.installed
  if (!fixture.cases || !installed) {
    console.error('[denominator] 红：fixture 结构不完整（versions.installed / cases 缺失）')
    process.exit(1)
  }
  let red = 0
  const fail = (msg) => {
    red += 1
    console.error(`[denominator] 红：${msg}`)
  }
  console.log('=== 分母恒等式门（G-2 运行期，独占窗口）===')
  for (const [slice, ref] of Object.entries(MAP)) {
    const entry = fixture.cases?.[ref]
    if (!entry || !Array.isArray(entry[installed]) || !Array.isArray(entry['6.5.2'])) {
      fail(`${slice}：fixture 缺 ${ref} 或版本双写不全（6.4.4/6.5.2 两份名单必须都在）`)
      continue
    }
    const ledger = fixture.ledger?.[slice] ?? {}
    const aligned = entry[installed].length
    const extra652 = entry['6.5.2'].filter((n) => !entry[installed].some((x) => norm(x) === norm(n)))
    // ② aligned 必须由 fixture 重算（不接受人手写）
    if (ledger.aligned !== undefined && ledger.aligned !== aligned) {
      fail(`${slice}：ledger.aligned=${ledger.aligned} ≠ fixture 重算 ${aligned}（${installed}）`)
    }
    // ③ 版本双写差集（逐行）
    if (extra652.length && JSON.stringify(ledger.extra652 ?? []) !== JSON.stringify(extra652)) {
      fail(`${slice}：ledger.extra652 与 fixture 重算差集不一致（重算：${extra652.join(' / ')}）`)
    }
    // 运行名单
    const out = path.join(REPO, 'tmp', `denominator-json-${ref.replace(/[^A-Za-z0-9.]/g, '_')}.json`)
    try {
      execFileSync(
        process.execPath,
        [
          path.join(REPO, 'node_modules', 'vitest', 'vitest.mjs'),
          'run',
          slice,
          '--reporter=json',
          `--outputFile=${out}`,
        ],
        { cwd: REPO, stdio: 'pipe', env: { ...process.env, CI: 'true' } },
      )
    } catch (e) {
      fail(`${slice}：vitest run 失败（EXIT=${e.status ?? '?'}）——独占窗口内仍失败才算红，先排除并发/30s 超时抖动（重跑一次再判）`)
      continue
    }
    const json = JSON.parse(readFileSync(out, 'utf8'))
    const file = json.testResults?.[0]
    if (!file) {
      fail(`${slice}：json 报告里没有该文件`)
      continue
    }
    // 比对用**标题**（最后一个 ` > ` 段）：参照名单不含 describe 链，运行期 fullName 含；
    // 同标题跨 describe 撞名按集合语义处理（本仓 11 片实测无跨 describe 同标题歧义）。
    const runtime = file.assertionResults.map((a) => ({
      name: [...a.ancestorTitles, a.title].join(' > '),
      title: a.title,
      status: a.status,
    }))
    const passed = runtime.filter((r) => r.status === 'passed').length
    const skipped = runtime.filter((r) => r.status === 'skipped').length
    const failed = runtime.filter((r) => r.status === 'failed').length
    const total = passed + skipped
    // ① direct + skipped ＝ 台账 total
    if (ledger.total !== undefined && total !== ledger.total) {
      fail(`${slice}：运行 ${passed}+${skipped}=${total} ≠ ledger.total=${ledger.total}`)
    }
    if (failed) fail(`${slice}：运行期 failed=${failed}（分母门前先修红）`)
    // 名单差集（P-069：比差集不比总数）
    const refKeys = new Set(entry[installed].map(norm))
    const extraKeys = new Set(extra652.map(norm))
    const renameKeys = new Set(Object.keys(ledger.renames ?? {}).map(norm))
    const renameVals = new Set(Object.values(ledger.renames ?? {}).map(norm))
    const splitVals = new Set(Object.values(ledger.splits ?? {}).flat().map(norm))
    const splitKeys = new Set(Object.keys(ledger.splits ?? {}).map(norm))
    const runtimeKeys = new Set(runtime.map((r) => norm(r.title)))
    const orphans = runtime.filter((r) => {
      const k = norm(r.title)
      return !refKeys.has(k) && !extraKeys.has(k) && !renameKeys.has(k) && !splitVals.has(k)
    })
    const missing = [...entry[installed], ...extra652].filter(
      (n) => !runtimeKeys.has(norm(n)) && !renameVals.has(norm(n)) && !splitKeys.has(norm(n)),
    )
    // ④ 每个运行期 skipped 标题必须有源码落点：本片源码 或 tests/shared/**（helper 展开，
    //    如 directionTest）字面出现，或工厂展开名（源码里有模板 `it(`…${x}…`)` + 调用点 `test('实参')`）。
    const src = readFileSync(path.join(REPO, slice), 'utf8')
    const sharedDir = path.join(REPO, 'tests', 'shared')
    const sharedSrc = existsSync(sharedDir)
      ? readdirSync(sharedDir)
          .filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'))
          .map((f) => readFileSync(path.join(sharedDir, f), 'utf8'))
          .join('\n')
      : ''
    const srcLower = (src + '\n' + sharedSrc).toLowerCase()
    const templates = [...src.matchAll(/(['"`])((?:\\.|(?!\1)[^\\])*)\1/g)]
      .map((m) => m[2])
      .filter((t) => /\$\{/.test(t))
    const callArgs = [...src.matchAll(/^\s*test\s*\(\s*(['"`])([^'"`]*)\1\s*\)\s*;?\s*$/gm)]
      .map((m) => m[2])
    const factoryNames = new Set(
      templates.flatMap((t) => callArgs.map((a) => t.replace(/\$\{[^}]*\}/g, a))),
    )
    const badSkip = runtime.filter((r) => {
      if (r.status !== 'skipped') return false
      if (srcLower.includes(r.title.toLowerCase())) return false
      if (factoryNames.has(r.title)) return false
      return true
    })
    const splitsExtra = Object.values(ledger.splits ?? {}).reduce((n, v) => n + Math.max(0, v.length - 1), 0)
    console.log(
      `== ${slice} → ${ref}: 运行 ${passed}直测|${skipped}skip(${total}) ` +
        `aligned(${installed})=${aligned} 6.5.2=${entry['6.5.2'].length} extra652=${extra652.length} ` +
        `supplements=${ledger.supplements ?? '?'} splits+${splitsExtra} 孤儿=${orphans.length} 缺行=${missing.length} skip无源码落点=${badSkip.length}`,
    )
    for (const r of orphans) console.log(`   [孤儿·候选补测/漏账] ${r.status} "${r.name}"`)
    for (const k of missing) console.log(`   [缺行·参照有本仓无] "${k}"`)
    for (const r of badSkip) console.log(`   [skip 无源码落点] "${r.name}"`)
    if (orphans.length !== (ledger.supplements ?? orphans.length) && ledger.supplements !== undefined) {
      fail(`${slice}：孤儿 ${orphans.length} ≠ ledger.supplements=${ledger.supplements}（差集逐条见上，人工确认后同步台账）`)
    }
    if (missing.length) fail(`${slice}：缺行 ${missing.length} 条（参照有、本仓无同名且无 renames 落点）`)
    if (badSkip.length) fail(`${slice}：${badSkip.length} 条 skip 名字在本片源码无字面落点（P-033/P-037 名单-源行错配）`)
  }
  console.log(red ? `=== 红：${red} 处 ===` : '=== 全绿 ===')
  process.exit(red ? 1 : 0)
}

const arg = process.argv[2] ?? '--check'
if (arg === '--regen') {
  const clone = process.argv[3] ?? DEFAULT_CLONE
  if (!existsSync(path.join(clone, REF_DIR))) {
    console.error(`[denominator] 上游克隆不存在：${clone}/${REF_DIR}（--regen 需要可读的 ant-design 克隆）`)
    process.exit(1)
  }
  regen(clone)
} else {
  check()
}
