// demo 遍历 harness（antd tests/shared/demoTest 机制的 data-grid 版）。
//
// 数据源：src/demos/index.ts 单源注册表（66 条，.antd.tsx 对照版天然排除，不用 import.meta.glob）。
// 每个 demo 必须包 VirtualizationProvider——demo 分发器 useVirtualization() 无 provider 会 throw。
//
// 4 类 runner（每个接受 { skip?: string[] }，按 demo name 跳过）：
// - mountAll：遍历渲染，断言不抛错且 unmount 不抛（文件：demo.test.tsx）
// - snapshotDemos：按传入 demo 列表渲染并快照**结构摘要**；调用方按 registry 类目切片
//   （文件：demo-snapshot.<slug>.test.tsx，抽片表见 demoGroups.ts）
// - extendDemos：渲染后点击全部筛选触发器 / 行选择菜单按钮，快照 portal 到 document.body 的弹窗层
//   + console.warn/error 收集（文件：demo-extend.<slug>.test.tsx，同抽片）
// - axeAll：渲染后断言 0 axe 违规（文件：a11y.test.tsx）
// - skip 注册（BAT-0 0-E，main 裁定）：被排除出直测的 demo（axeAll 7 条 / snapshotDemos 1 条）
//   登记为 it.skip（形状＝antd 上游 accessibilityTest.tsx:191-204 的 describe.skip），
//   不 `continue` 静默移出可计数清单；snapshotDemos/axeAll 各带「分母＝清单全量」计数断言。
//
// mount/axe 保持全量单文件（断言面与快照无关、无 diff 体积问题）；
// 快照与弹窗层按类目拆文件，理由见 snapshotDemos 注释。
import { expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
import { demos } from '../../src/demos/index'
import type { DemoMeta } from '../../src/demos/registry'
import { VirtualizationProvider } from '../../src/demos/VirtualizationContext'
import { customRender } from './render'
import { expectNoAxeViolations } from './axe'

export interface DemoHarnessOptions {
  /** 按 demo name 跳过的用例清单。 */
  skip?: string[]
}

// 纯 antd 对照 demo：无 .dg-* DOM、无 data-grid 交互面，快照 / a11y 默认跳过。
const ANTD_CONTROL_DEMO = 'dom-recycled-virtual-list-antd'

/**
 * axeAll 的逐 demo skip：违规根因是已知架构边界，不是待修缺陷。
 *
 * 根因（2026-09-21 实测）：data-grid 的格子与排序表头格都是**无 role 的 div**
 * （`engine/BodyGrid.tsx:208-209` 的 aria-colspan/aria-rowspan、`engine/HeaderCell.tsx:260` 的
 * aria-sort），而这三个属性只对 `role=cell/gridcell/columnheader` 合法。
 * 补 role 会立刻变成 `aria-required-parent`（缺 `role=row` 祖先），因为 CSS Grid 的行不是容器元素
 * ——格子是网格的直接子节点，没有可挂 role=row 的行 wrapper。
 * 合法化需要整条 ARIA 链（table > rowgroup > row > gridcell/columnheader），属结构级改动，
 * 与 known-limitations 的 semantic-dom 边界同源（不能完整复刻 thead/tbody/tr 层级）。
 * 用户裁定：本次不修，留作独立任务；用例保留 skip + 本条依据。
 *
 * 注：受影响的是「对辅助技术的语义播报」，不是键盘/视觉行为——现状未被浏览器播报，
 * 故 skip 不掩盖任何回归。
 */
const A11Y_ROOT_CAUSE_SKIP: Record<string, string> = {
  'merged-cells': '格子 div 上的 aria-colspan/aria-rowspan 需 role=cell/gridcell（见 A11Y_ROOT_CAUSE_SKIP 注释）',
  'merged-expand-tree': '同上',
  'expand-column-position': '同上',
  'virtual-list': '同上',
  'custom-selection-cell': '同上',
  'sorting-and-filtering': '排序表头格 div 上的 aria-sort 需 role=columnheader 且需 role=row 祖先（同上注释）',
}

// rc-motion 的过渡态类（`ant-slide-up-appear` / `-appear-active` / `-enter` / `-leave` …）。
// jsdom 不触发 transitionend，这些类**永不脱落**（实测静置 2.4s 仍挂着 appear-active），
// 挂在哪一档由「点击间的耗时」决定 —— 同一测试两次运行可得到不同档位，直接进快照就是抖动源。
// 快照前统一剥掉这些类，只保留弹窗的稳定结构与内容。
const MOTION_STATE_CLASS = /\bant-[a-z-]+-(?:appear|enter|leave)(?:-active|-prepare)?\b\s*/g

function normalizeMotionClasses(html: string): string {
  return html.replace(/class="([^"]*)"/g, (_m, cls: string) => {
    const cleaned = cls.replace(MOTION_STATE_CLASS, '').replace(/\s+/g, ' ').trim()
    return `class="${cleaned}"`
  })
}

/** 当前 body 内全部弹窗的归一化 HTML（顺序 = DOM 顺序）。 */
function currentPopupHtml(): string[] {
  return Array.from(document.body.querySelectorAll<HTMLElement>('.ant-dropdown')).map((popup) =>
    normalizeMotionClasses(popup.outerHTML),
  )
}

// rc-motion 还有一类在 `motionDeadline` 之后才移除的标记（实测 `ant-dropdown -start` 在
// 点击后 ~300ms 内消失，之后稳定）。它不是过渡态类，剥不掉，只能等。
// 轮询「连续两次取值相同」等它收敛——不用固定 sleep（固定等待在冷启动/并行下会不够）。
const POPUP_SETTLE_TIMEOUT_MS = 5_000
const POPUP_SETTLE_POLL_MS = 50
// 要求连续 N 次取值一致才认定稳定：留出容错余量，避免恰好落在单次静默窗口上。
const POPUP_SETTLE_STABLE_TICKS = 3

/**
 * 等弹窗层收敛，返回它**最后一次非空**的归一化 HTML。
 *
 * 收敛判据＝「连续 POPUP_SETTLE_STABLE_TICKS 次取值相同」（不变），但**空层不是可接受的收敛值**：
 * 读到空层时返回等的是 `lastNonEmpty`（从无非空读数时才返回空数组）。
 *
 * 为什么（2026-09-30 实测，`.ant-dropdown` 生存期探针 ＋ 反事实批：同一份**改前**码 16 路并发
 * 插桩跑 12/16 红、16 路重负载跑 5/16 红；改后码 16 路并发插桩跑 16/16 绿，`tmp/94-*.log`）：
 * - 弹窗的**生存期**由 demo 自身的异步数据回填决定，不由本用例决定。
 *   `remote-data` 的 mock 远程源是 `queryData` 里的 `setTimeout(800)`
 *   （`src/demos/_compare/remote-data.shared.ts:78`），回填引发的重渲染会把已打开的
 *   筛选弹窗整个销毁（探针读数：点击后 t=741ms 还有弹窗，t=869ms 起恒为 0，`rows` 同时 0→40）。
 * - 插桩档把「等收敛」拖过这条 800ms 边界，于是收敛读到的是**销毁后的空层**：
 *   正常档 settle 在 t≈305ms 收工（6 读，popups=1）；16 路并发插桩档的典型红跑是
 *   读#1..#5 拿到弹窗（t=3/76/147/206/265ms，第 2 个 stable tick），
 *   **读#5→#6 之间那个 50ms 定时器被插桩下的重渲染阻塞了 501ms**（t=265→766ms），
 *   弹窗在阻塞期间被销毁；随后 3 读连续同值（空层）⇒ 旧判据把「空」当成收敛值返回 `[]` ⇒ 快照红。
 * - 只把空层判成「未收敛、等 deadline 再回退」也能修，但代价是每次命中都白等满 5s；
 *   这里取「空层连续 N 次即视为弹窗已被销毁、终止等待并回退到销毁前捕获的那一份」，
 *   既对插桩变慢鲁棒，又不在命中路径上多花时间（实测 ~150ms），正常路径零行为变化。
 *
 * 权衡（如实登记）：本层断言的是**弹窗层的内容**（结构/文案/控件），不是它的生存期；
 * 若某天出现「弹窗打开后立即被产品缺陷永久销毁」的真实回归，本判据会取销毁前的快照而放过它。
 * 生存期面另有 `tests/table/features/Table.filter.test.tsx` 等功能用例覆盖，不靠本夹具守。
 */
async function settlePopupHtml(): Promise<string[]> {
  const deadline = Date.now() + POPUP_SETTLE_TIMEOUT_MS
  let previous = ''
  let stableTicks = 0
  // 弹窗层最后一次非空读数：空层收敛（被无关重渲染销毁）时回退到这里。
  let lastNonEmpty: string[] | null = null
  for (;;) {
    const html = currentPopupHtml()
    const serialized = html.join('\u0000')
    if (html.length > 0) lastNonEmpty = html
    if (serialized === previous) {
      stableTicks += 1
      if (stableTicks >= POPUP_SETTLE_STABLE_TICKS) {
        return html.length > 0 ? html : (lastNonEmpty ?? html)
      }
    } else {
      previous = serialized
      stableTicks = 0
    }
    if (Date.now() >= deadline) {
      return html.length > 0 ? html : (lastNonEmpty ?? html)
    }
    await new Promise((resolve) => setTimeout(resolve, POPUP_SETTLE_POLL_MS))
  }
}

/**
 * CSS 自定义属性（`--ant-*` 主题变量）声明匹配。
 *
 * 主题张量规模参考：每张表的根元素都内联整份张量（450 个 token，含 `--ant-blue-1`…`--ant-red-10`
 * 全色阶与全部阴影/字体/间距变量，单块约 14.8KB），这也是全量 HTML 快照不可维护的主因之一。
 * 摘要方案不删 token，而是用 `collectThemeTokenDefaults` 取该次渲染的 token 基线、只把**与基线不同**
 * 的覆盖项写进摘要（见 buildDemoStructureDigest 的 themeOverrides）。
 */
const CUSTOM_PROPERTY_DECL = /(--[A-Za-z0-9_-]+)\s*:\s*([^;"]*)/g

/**
 * demo 快照基线 = **结构摘要**（确定性文本，非全量 DOM 文本）。
 *
 * 为什么不是全量 HTML：demo 的渲染规模本身很大——最重的 `fixed-columns-and-header`
 * 一个 demo 就有 2323 个 `dg-cell`（宽表 × 固定列 × 粘性表头的分层渲染），
 * 全量 HTML 快照 477KB；66 个 demo 合计 2.6MB。这类基线既 review 不了，
 * 回归时也只能给出「2323 个 cell 里哪一行变了」这种无法定位的 diff。
 *
 * 摘要只留可定位、可断言的结构事实：
 *   - 根节点标识（class 列表，按序）、列序身份（表头列键按 DOM 序）
 *   - 节点/行/格/表头格计数，网格轨道数，行索引游程
 *   - 跨列表头格（data-header-colspan）、合并格（aria-colspan/aria-rowspan）的跨度分布
 *   - 固定列、选择列、展开列、汇总行、滚动条等结构件计数
 *   - 与 token 基线取值不同的 CSS 变量（该 demo 主动覆盖的主题）
 *   - DOM 标签直方图（捕获意外包层）
 *
 * 有意不纳入：单元格文本内容、属性书写顺序、主题张量中各 token 的具体取值。
 * 前者属功能断言（由具体功能用例覆盖），后者与主题实现绑定、改动主题会全库噪声。
 */
export interface DemoStructureDigest {
  rootClasses: string[]
  nodes: number
  rows: number
  cells: number
  headerCells: number
  gridTracks: number | null
  columnKeys: string[]
  rowIndexRuns: string
  headerColspan: Record<string, number>
  mergedCells: Record<string, number>
  structuralCounts: Record<string, number>
  themeOverrides: Record<string, string>
  tagHistogram: Record<string, number>
}

/** 整数序列 → 游程文本（`0,1,2,7` → `0-2,7`）。 */
function runLengthEncode(values: number[]): string {
  if (values.length === 0) return '(none)'
  const sorted = [...values].sort((a, b) => a - b)
  const runs: string[] = []
  let start = sorted[0]
  let previous = sorted[0]
  for (const value of sorted.slice(1)) {
    if (value === previous + 1) {
      previous = value
      continue
    }
    runs.push(start === previous ? `${start}` : `${start}-${previous}`)
    start = value
    previous = value
  }
  runs.push(start === previous ? `${start}` : `${start}-${previous}`)
  return runs.join(',')
}

// 结构件探针：类名取自 src/table/style/table.css 的实际选择器（不猜）。
// 只统计「出现即有意义」的结构标记，计数进入摘要后可定位「某结构件消失/翻倍」类回归。
const STRUCTURAL_PROBES: Array<[string, string]> = [
  ['fixedStartCells', '.dg-cell-fixed-start'],
  ['fixedEndCells', '.dg-cell-fixed-end'],
  ['hiddenCells', '.dg-cell-hidden'],
  ['ellipsisCells', '.dg-cell-ellipsis'],
  ['rowSpanCells', '.dg-cell-rowspan'],
  ['rowScopeCells', '.dg-cell-rowscope'],
  ['summaryCells', '.dg-cell-summary'],
  ['headerGroupCells', '.dg-cell-header-group'],
  ['headerVStickyCells', '.dg-cell-header-vsticky'],
  ['floatingScrollBar', '.dg-scroll-floating'],
  ['stickyScrollBar', '.dg-sticky-scroll-bar'],
  ['stickyRoot', '.dg-sticky'],
  ['pagination', '.dg-pagination'],
  ['filterTrigger', '.dg-filter-trigger'],
  ['selectionTrigger', '.dg-selection-dropdown-trigger'],
  ['selectionInput', '.dg-selection-input'],
  ['expandIcon', '.dg-expand-icon'],
  ['columnResizer', '.dg-cell-header .dg-column-resizer'],
  ['sorterUp', '.dg-column-sorter-up'],
  ['sorterDown', '.dg-column-sorter-down'],
  ['sorterPriority', '.dg-column-sorter-priority'],
]

function tally(values: string[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const value of values) {
    out[value] = (out[value] ?? 0) + 1
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)))
}

/**
 * 生成结构摘要。
 *
 * @param target 取摘要的子树（compare demo 传左栏 data-grid）。
 * @param baselineTokenValues 该次渲染观察到的 token 取值基线（`collectThemeTokenDefaults`）；
 *   与某元素上的取值不同的 token 即该 demo 的主题覆盖，进入 themeOverrides。
 */
export function buildDemoStructureDigest(
  target: HTMLElement,
  baselineTokenValues: Map<string, string>,
): DemoStructureDigest {
  const all = Array.from(target.querySelectorAll<HTMLElement>('*'))

  const dataGridCells = all.filter((el) => el.classList.contains('dg-cell'))
  const grid = target.querySelector<HTMLElement>('.dg-grid') ?? (target.classList.contains('dg-grid') ? target : null)

  const gridTracks = (() => {
    const template = grid?.style.gridTemplateColumns
    if (!template) return null
    // `repeat(N, ...)` 或空格分隔的轨道列表，统一折算成轨道数。
    const repeat = template.match(/^repeat\((\d+),/)
    if (repeat) return Number(repeat[1])
    return template.trim().split(/\s+/).filter(Boolean).length
  })()

  const themeOverrides = new Map<string, string>()
  for (const el of all) {
    for (const name of Array.from(el.style)) {
      if (!name.startsWith('--')) continue
      const value = el.style.getPropertyValue(name).trim()
      if (baselineTokenValues.get(name) === value) continue
      themeOverrides.set(name, value)
    }
  }

  const tagHistogram = tally(all.map((el) => el.tagName.toLowerCase()))
  const structuralCounts: Record<string, number> = {}
  for (const [label, selector] of STRUCTURAL_PROBES) {
    const count = target.querySelectorAll(selector).length
    if (count > 0) structuralCounts[label] = count
  }

  return {
    rootClasses: Array.from(target.classList),
    nodes: all.length,
    rows: new Set(dataGridCells.map((el) => el.dataset.rowIndex)).size,
    cells: dataGridCells.length,
    headerCells: target.querySelectorAll('.dg-cell-header').length,
    gridTracks,
    // 列序身份：表头格按 DOM 顺序的列键（含选择列 / 展开列哨兵键）。
    // 列定义顺序或哨兵列位置变化时，这里直接可见。
    columnKeys: Array.from(
      new Map(
        Array.from(target.querySelectorAll<HTMLElement>('.dg-cell-header[data-column-key]')).map(
          (el) => [el.dataset.columnKey ?? '', el.dataset.columnKey ?? ''],
        ),
      ).keys(),
    ),
    // 行序身份：行索引序列的游程压缩（如 `0-7,0-7` = 两批各 8 行，虚拟/回收模式的分层可见）。
    // 行排序、窗口规模或分层结构变化时，这里直接可见。
    rowIndexRuns: runLengthEncode(
      Array.from(
        new Set(
          dataGridCells
            .map((el) => el.dataset.rowIndex)
            .filter((value): value is string => value !== undefined),
        ),
      ).map(Number),
    ),
    headerColspan: tally(
      Array.from(target.querySelectorAll<HTMLElement>('[data-header-colspan]')).map(
        (el) => el.dataset.headerColspan ?? '',
      ),
    ),
    mergedCells: tally(
      [
        ...Array.from(target.querySelectorAll<HTMLElement>('[aria-colspan]')).map(
          (el) => `col${el.getAttribute('aria-colspan')}`,
        ),
        ...Array.from(target.querySelectorAll<HTMLElement>('[aria-rowspan]')).map(
          (el) => `row${el.getAttribute('aria-rowspan')}`,
        ),
      ].sort(),
    ),
    structuralCounts,
    themeOverrides: Object.fromEntries(
      [...themeOverrides.entries()].sort(([a], [b]) => a.localeCompare(b)),
    ),
    tagHistogram,
  }
}

/** 摘要 → 稳定文本（逐行输出，便于 diff 定位到具体字段）。 */
export function formatDemoStructureDigest(digest: DemoStructureDigest): string {
  const record = (label: string, value: Record<string, number | string>) => {
    const entries = Object.entries(value)
    const body = entries.length === 0 ? '(none)' : entries.map(([k, v]) => `${k}=${v}`).join(' ')
    return `${label}: ${body}`
  }

  return [
    `root: ${digest.rootClasses.join('.') || '(no class)'}`,
    `nodes: ${digest.nodes}`,
    `rows: ${digest.rows}`,
    `cells: ${digest.cells}`,
    `headerCells: ${digest.headerCells}`,
    `gridTracks: ${digest.gridTracks ?? '(none)'}`,
    `columnKeys: ${digest.columnKeys.join(' ') || '(none)'}`,
    `rowIndexRuns: ${digest.rowIndexRuns}`,
    record('headerColspan', digest.headerColspan),
    record('mergedCells', digest.mergedCells),
    record('structural', digest.structuralCounts),
    record('themeOverrides', digest.themeOverrides),
    record('tags', digest.tagHistogram),
  ].join('\n')
}

/**
 * 汇总一次渲染里观测到的 CSS 变量 → 取值（每个变量取首次出现的值），作为该次渲染的 token 基线。
 *
 * 用途：`buildDemoStructureDigest` 用它把「主题张量的默认取值」和「该 demo 主动覆盖的 token」区分开
 * ——只有与基线取值不同的 token 才进摘要。基线取自整个 container（含对照栏），
 * 因为张量值由主题层决定、与该 demo 是否覆盖无关。
 */
export function collectThemeTokenDefaults(html: string): Map<string, string> {
  const defaults = new Map<string, string>()
  for (const match of html.matchAll(CUSTOM_PROPERTY_DECL)) {
    if (!defaults.has(match[1])) defaults.set(match[1], match[2].trim())
  }
  return defaults
}

// a11y 单 demo 预算：渲染 + axe 全规则扫描。对照 demo 的扫描域可达 7000+ 节点
// （data-grid 与 antd 两张 23 列宽表），jsdom 下渲染与扫描都在秒级到十秒级；
// vitest 默认 5000ms 只够最小 demo，这里显式放宽避免把「慢」误报成「失败」。
const A11Y_TEST_TIMEOUT_MS = 120_000

// mount / snapshot / extend 单 demo 预算：文件首个用例要连带付 66 个 demo 模块的动态 import 成本
// （冷启动实测可超 vitest 默认 5000ms），单个 demo 渲染本身远低于此。
// 预算的意义不只是放宽：渲染失控（死循环）会在这里被斩断成失败，而不是把套件挂死。
const DEMO_TEST_TIMEOUT_MS = 30_000

// demo.element 是 () => import('./xxx') 动态导入分发器；取默认导出后包 provider 渲染。
async function renderDemo(demo: DemoMeta) {
  const mod = await demo.element()
  const Demo = mod.default
  return customRender(
    <VirtualizationProvider>
      <Demo />
    </VirtualizationProvider>,
  )
}

export function mountAll(options: DemoHarnessOptions = {}): void {
  for (const demo of demos) {
    if (options.skip?.includes(demo.name)) continue

    it(
      `mount ${demo.name}`,
      async () => {
        const { container, unmount } = await renderDemo(demo)
        expect(container.firstChild).not.toBeNull()
        expect(() => unmount()).not.toThrow()
      },
      DEMO_TEST_TIMEOUT_MS,
    )
  }
}

/**
 * 解析 demo 的快照目标子树。
 *
 * 判据按可靠性降序，不假定 `compare: true` 等于 SplitDemo 结构：
 *   1. compare demo 的 SplitDemo 布局（`.dg-compare__pane` × 2）→ 取左栏 data-grid pane 内的 .dg-wrapper，
 *      右栏 antd 表无 .dg-wrapper（data-grid 根 = `dg-wrapper ant-table-wrapper` 双类，antd 根只有 `ant-table*`）。
 *   2. compare 但自定义布局的 demo（data-grid 表与 antd 表叠在同一文档流，如 page-sticky-header /
 *      semantic-dom-slots）→ 取容器内首个 .dg-wrapper，仍是 data-grid 表本身，antd 表不会被选中。
 *   3. 非 compare demo → 原样返回 container（既有基线即 container 级快照，不收窄，避免无谓 churn）。
 */
export function resolveSnapshotTarget(container: HTMLElement, compare?: boolean): HTMLElement {
  if (!compare) return container
  return (
    container.querySelector<HTMLElement>('.dg-compare__pane .dg-wrapper') ??
    container.querySelector<HTMLElement>('.dg-wrapper') ??
    container
  )
}

/**
 * 按给定 demo 列表生成快照用例——供按类目拆分后的多个快照文件取用。
 *
 * 拆分粒度 = registry 的 `category`（一类目一文件一 `.snap`）。
 * 粒度按「定位成本」定：一个改动影响几个类目的 demo，就恰好几个文件对比不过，
 * 失败文件清单本身就是定位信息；单片过大则 review 与 prefill 都会被无关 diff 占用。
 * 类目 → demo 的抽片规则在 `tests/shared/demoGroups.ts`。
 *
 * 用例名用 `demo.name`（不含类目的仓库唯一主 id）：同一 demo 只会出现在一个片里，
 * 因此快照 key 仍与 demo 名一一对应，便于按 demo 名 grep 定位。
 */
// skip 注册口径（BAT-0 0-E，main 裁定；形状＝antd 上游 accessibilityTest.tsx:191-204 的
// describe.skip 同构）：被排除出直测的 demo 不 `continue` 静默移出可计数清单，而是登记为
// `it.skip`（运行报告可见、可计数；依据见各 skip 常量旁注释）。每个 runner 末尾附
// 「分母＝清单全量」计数断言，使「全量遍历」可机器验证（P-043 载体不存在假绿的镜像）。
export function snapshotDemos(list: readonly DemoMeta[], options: DemoHarnessOptions = {}): void {
  const skip = [...(options.skip ?? []), ANTD_CONTROL_DEMO]
  let emitted = 0

  for (const demo of list) {
    const shouldSkip = skip.includes(demo.name)
    const testMethod = shouldSkip ? it.skip : it
    emitted += 1
    testMethod(
      `snapshot ${demo.name}`,
      shouldSkip
        ? () => {}
        : async () => {
            const { container } = await renderDemo(demo)
            // 统计域 = 整个渲染（含对照栏）：筛主题覆盖时要拿全库默认值做参照。
            const tokenDefaults = collectThemeTokenDefaults(container.outerHTML)
            const target = resolveSnapshotTarget(container, demo.compare)
            expect(formatDemoStructureDigest(buildDemoStructureDigest(target, tokenDefaults))).toMatchSnapshot()
          },
      DEMO_TEST_TIMEOUT_MS,
    )
  }
  it(`snapshot 分母＝清单全量 ${list.length}（直测 ${list.length - skip.length} + skip ${skip.length}）`, () => {
    expect(emitted).toBe(list.length)
  })
}

/** 按给定 demo 列表生成弹窗展开用例——拆分粒度与理由同 snapshotDemos。 */
export function extendDemos(list: readonly DemoMeta[], options: DemoHarnessOptions = {}): void {
  for (const demo of list) {
    if (options.skip?.includes(demo.name)) continue

    it(
      `extend ${demo.name}`,
      async () => {
        const { container } = await renderDemo(demo)
        // compare demo 只交互左栏 data-grid（右栏 antd 有自己的触发器类名，不属本层断言面）。
        const pane = demo.compare ? container.querySelector('.dg-compare__pane') : null
        const scope: HTMLElement = (pane as HTMLElement | null) ?? container

        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        try {
          const triggers = Array.from(
            scope.querySelectorAll<HTMLElement>('.dg-filter-trigger, .dg-selection-dropdown-trigger'),
          )
          for (const trigger of triggers) {
            fireEvent.click(trigger)
            // antd Dropdown portal 到 document.body，popup 挂载异步（rc-motion），等它出现。
            await waitFor(() => {
              expect(document.body.querySelector('.ant-dropdown')).not.toBeNull()
            })
          }
          // 快照 portal 到 document.body 的弹窗层（outerHTML 序列化，规避 DOM 快照器差异）。
          // 取值前先等弹窗收敛——过渡态类见 MOTION_STATE_CLASS，`-start` 标记见 settlePopupHtml。
          const popups = triggers.length > 0 ? await settlePopupHtml() : currentPopupHtml()
          expect(popups).toMatchSnapshot()
          // console.warn/error 收集做快照基线（新 warning 回归可见）。
          const consoleMessages = [
            ...warnSpy.mock.calls.map((call) => `warn: ${call.join(' ')}`),
            ...errorSpy.mock.calls.map((call) => `error: ${call.join(' ')}`),
          ]
          expect(consoleMessages).toMatchSnapshot()
        } finally {
          warnSpy.mockRestore()
          errorSpy.mockRestore()
        }
      },
      DEMO_TEST_TIMEOUT_MS,
    )
  }
}

/**
 * 解析 a11y 断言的扫描域。
 *
 * 与 snapshotAll 同判据、同理据（compare demo 只断言 data-grid 侧）：右栏是 antd 对照表，
 * 不属本层断言面。若扫整个容器，antd 侧自身的可访问性问题会计到 data-grid 头上——
 * 实测 custom-filter-panel 的 3 条 aria-command-name 全部来自右栏 antd 表
 * （祖先链 `div.ant-table > ... > th.ant-table-filter-column`），左栏扫描为 clean。
 */
export function resolveA11yScope(container: HTMLElement, compare?: boolean): HTMLElement {
  if (!compare) return container
  return (
    container.querySelector<HTMLElement>('.dg-compare__pane .dg-wrapper') ??
    container.querySelector<HTMLElement>('.dg-wrapper') ??
    container
  )
}

export function axeAll(options: DemoHarnessOptions = {}): void {
  const skip = [...(options.skip ?? []), ANTD_CONTROL_DEMO, ...Object.keys(A11Y_ROOT_CAUSE_SKIP)]
  // 起始禁用规则：jsdom 计算样式受限假阳性，对齐 antd 测试基线。
  const disabledRules = ['label', 'empty-table-header', 'nested-interactive', 'button-name']
  let emitted = 0

  for (const demo of demos) {
    // 被排除的 demo 登记为 it.skip（不 continue 静默移出），依据见 A11Y_ROOT_CAUSE_SKIP 注释。
    const shouldSkip = skip.includes(demo.name)
    const testMethod = shouldSkip ? it.skip : it
    emitted += 1
    testMethod(
      `axe ${demo.name}`,
      shouldSkip
        ? () => {}
        : async () => {
            const { container } = await renderDemo(demo)
            await expectNoAxeViolations(resolveA11yScope(container, demo.compare), disabledRules)
          },
      A11Y_TEST_TIMEOUT_MS,
    )
  }
  it(`axe 分母＝注册表全量 ${demos.length}（直测 ${demos.length - skip.length} + skip ${skip.length}）`, () => {
    expect(emitted).toBe(demos.length)
  })
}
