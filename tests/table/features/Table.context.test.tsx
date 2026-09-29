/**
 * 29-A（ConfigProvider `table` 上下文三项消费）+ 29-H（树形 expandRowByClick / spaced 图标）
 * 双侧并排黑盒用例 —— BAT-29 第 3 片 / 步骤 56 / 片段 E-158。
 *
 * **参照版本**：已安装的 **antd 6.4.4**（`node_modules/antd/es/table`），不是记忆里的 antd v5。
 * 每条断言的期望值都来自**本轮实测**（读数由 `collect()` 打到 stdout，存档
 * `tmp/56-vitest-final*.log`），不是抄工单文字。
 *
 * 参照锚点（本轮逐行实读 `node_modules/antd/es/table/InternalTable.js`）：
 * - `:83-86` `const { locale, table } = React.useContext(ConfigContext)` ⇒ `table` 段挂在 ConfigContext 上。
 * - `:136-139` `mergedExpandable.expandIcon = expandable?.expandIcon ?? table?.expandable?.expandIcon`
 *   ⇒ **嵌套**路径（参照**没有**顶层 `table.expandIcon`），props 赢。
 * - `:165` `rowKey = customizeRowKey || table?.rowKey || 'key'` ⇒ props > 上下文 > 内置（`||`）。
 * - `:167` `mergedScroll = scroll ?? table?.scroll` ⇒ **整对象** `??`（props 给了 scroll 就整体赢，
 *   上下文其余子字段不再参与）。
 * - 本版本 `InternalTable.js` 内 `expandRowByClick` / `needExpandColumn` **零命中**
 *   ⇒ 参照**没有** `table.expandRowByClick` 这条上下文兜底（H2 向量的期望值来源）。
 *
 * ⚠️ 为什么两侧用**不同**的 ConfigProvider 入口（见日志 5c，本轮实测踩到的探针假象）：
 *   本仓 vitest 下 `import { ConfigProvider } from 'antd'`（桶入口）与 `import X from 'antd/es/…'`（深路径）
 *   解析成**两份 ConfigContext 实例**：桶侧 Provider 包深侧 Table 时读数全假
 *   （三档都读成"参照不消费上下文"）。`src/table/Table.tsx:26` 用的是桶入口，
 *   `antd/es/table/InternalTable.js:13` 用的是深路径 ⇒ 各按各的实际读取面包。
 */
import { fireEvent, render } from '@testing-library/react'
import { ConfigProvider } from 'antd'
import CfgProvider from 'antd/es/config-provider'
import AntdTable from 'antd/es/table'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { Table as DgTable } from '../../../src/table/index'

// ------------------------------------------------------------------ 夹具 ----

interface Row {
  id: string
  name: string
  children?: Row[]
}

const rows: Row[] = [
  { id: 'a', name: 'Ann' },
  { id: 'b', name: 'Bob' },
]

const treeRows: Row[] = [
  { id: 'p', name: 'Parent', children: [{ id: 'c', name: 'Child' }] },
  { id: 'q', name: 'Solo' },
]

const keyedRows: Row[] = rows.map((r) => ({ ...r, key: r.id }))
const keyedTreeRows: Row[] = treeRows.map((r) => ({ ...r, key: r.id }))

const columns: any[] = [
  { title: 'ID', dataIndex: 'id' },
  { title: 'Name', dataIndex: 'name' },
]

type Impl = 'dg' | 'antd'

const REFERENCE_VERSION = 'antd 6.4.4'

/** 双侧读数台账：每条向量记 `dg` / `antd` 两条，断言消息里也带，失败即可直接复盘。 */
const ledger: Record<string, { dg: unknown; antd: unknown }> = {}

function record(label: string, dg: unknown, antd: unknown): void {
  ledger[label] = { dg, antd }
  // eslint-disable-next-line no-console
  console.info(`[56-读数] ${label}\n    dg   = ${JSON.stringify(dg)}\n    ${REFERENCE_VERSION} = ${JSON.stringify(antd)}`)
}

function pair(label: string): string {
  const e = ledger[label] ?? ({} as { dg: unknown; antd: unknown })
  return `${label}\n    dg   = ${JSON.stringify(e.dg)}\n    antd = ${JSON.stringify(e.antd)}  (${REFERENCE_VERSION})`
}

// ------------------------------------------------------------- 选择器桥 ----

function Provider({ impl, table, children }: { impl: Impl; table: unknown; children: ReactNode }) {
  return impl === 'dg' ? (
    <ConfigProvider table={table as any}>{children}</ConfigProvider>
  ) : (
    <CfgProvider table={table as any}>{children}</CfgProvider>
  )
}

/**
 * P-102（本仓实测坑）：探针选择器点了不存在的目标时，读数会"过度自洽"
 * （`querySelector` 返回 null → 一堆 false → 看起来像"两侧一致"）。
 * ⇒ **每个探针读数前**先断言目标数 > 0，打空就地炸，不许静默通过。
 */
function requireTarget(count: number, label: string): void {
  if (!(count > 0)) {
    throw new Error(`[P-102] ${label}：目标数=${count} ⇒ 选择器打空，本次读数无意义`)
  }
}

/** 表体单元格数（行渲染确实发生的最小证据；两侧各用各的原生 class）。 */
function bodyCellCount(container: HTMLElement, impl: Impl): number {
  return container.querySelectorAll(
    impl === 'dg' ? '.dg-cell-body' : '.ant-table-tbody .ant-table-cell',
  ).length
}

/** 表体第一个勾选框（跳过表头全选；dg `.dg-cell-body` / antd `tbody .ant-table-cell`）。 */
function firstBodyCheckbox(container: HTMLElement, impl: Impl): HTMLInputElement | null {
  const all = container.querySelectorAll<HTMLInputElement>(
    impl === 'dg' ? '.dg-cell-body input[type="checkbox"]' : '.ant-table-tbody input[type="checkbox"]',
  )
  requireTarget(all.length, `${impl} 表体勾选框`)
  return all[0] ?? null
}

/** 展开图标格（只看"默认图标 vs props 图标 vs 上下文图标"三选一，别用裸 `button`——分页按钮也算）。 */
function iconMarkers(container: HTMLElement, impl: Impl): { custom: boolean; ctx: boolean; defBtn: boolean } {
  return {
    custom: !!container.querySelector('[data-prop-icon]'),
    ctx: !!container.querySelector('[data-ctx-icon]'),
    defBtn:
      impl === 'dg'
        ? !!container.querySelector('button.dg-expand-icon')
        : !!container.querySelector('button.ant-table-row-expand-icon'),
  }
}

/** 滚动生效位（语义化，不跨实现比原始 class）：横向被撑开 / 纵向被限高。 */
function scrollBits(container: HTMLElement, impl: Impl): { x: boolean; y: boolean; raw: string } {
  if (impl === 'dg') {
    const grid = container.querySelector<HTMLElement>('.dg-grid')
    const box = container.querySelector<HTMLElement>('[class*="dg-scroll"]')
    const raw = `${grid?.style.minWidth || grid?.style.width || ''}|${box?.style.maxHeight || box?.style.height || ''}|${box ? getComputedStyle(box).overflowY : 'NO-EL'}`
    return { x: !!grid?.style.minWidth, y: !!box?.style.maxHeight, raw }
  }
  const tableEl =
    container.querySelector<HTMLElement>('.ant-table-body table') ??
    container.querySelector<HTMLElement>('.ant-table-content table')
  const body = container.querySelector<HTMLElement>('.ant-table-body')
  const raw = `${tableEl?.style.width || tableEl?.style.minWidth || ''}|${body?.style.maxHeight || ''}|${body?.style.overflowY ?? (body ? 'NO-Y-STYLE' : 'NO-ant-table-body')}`
  return { x: !!tableEl?.style.width || !!tableEl?.style.minWidth, y: !!body?.style.maxHeight, raw }
}

/** 树形/展开行的展开态读数：两侧都以"图标 aria-expanded"为准（不依赖行元素）。 */
function expandedBits(container: HTMLElement, impl: Impl): { aria: (string | null)[]; rows: number } {
  const btns =
    impl === 'dg'
      ? Array.from(container.querySelectorAll<HTMLElement>('button.dg-expand-icon'))
      : Array.from(container.querySelectorAll<HTMLElement>('button.ant-table-row-expand-icon'))
  const rows =
    impl === 'dg'
      ? container.querySelectorAll('.dg-row-expanded').length
      : container.querySelectorAll('.ant-table-expanded-row').length
  return { aria: btns.map((b) => b.getAttribute('aria-expanded')), rows }
}

/** 一条向量的双侧执行器：`act` 里可以点、可以读，返回值就是读数。 */
function both(
  label: string,
  table: unknown,
  props: Record<string, unknown>,
  act: (container: HTMLElement, impl: Impl) => unknown,
): void {
  const out: Record<Impl, unknown> = { dg: undefined, antd: undefined }
  ;(Object.keys(out) as Impl[]).forEach((impl) => {
    const Comp = impl === 'dg' ? (DgTable as any) : (AntdTable as any)
    const { container, unmount } = render(
      <Provider impl={impl} table={table}>
        <Comp dataSource={props.dataSource ?? keyedRows} columns={columns} {...props} />
      </Provider>,
    )
    // P-102：先确认"表体真的渲染了"，否则后面所有 false 读数都可能是选择器打空。
    requireTarget(bodyCellCount(container, impl), `${label} · ${impl} 表体单元格`)
    out[impl] = act(container, impl)
    unmount()
  })
  record(label, out.dg, out.antd)
}

afterEach(() => {
  // 每条向量结束后清 DOM，避免上一臂的节点被下一臂 querySelector 命中。
  document.body.innerHTML = ''
})

// ============================================================ 29-A rowKey ====

describe('29-A 上下文 rowKey（参照 :165 `customizeRowKey || table?.rowKey || "key"`）', () => {
  it('V1 上下文给 rowKey、props 未给 ⇒ 生效（记录无 key 字段时不再全撞）', () => {
    const readSide = (impl: Impl): unknown => {
      const seen: unknown[] = []
      const Comp = impl === 'dg' ? (DgTable as any) : (AntdTable as any)
      const { container, unmount } = render(
        <Provider impl={impl} table={{ rowKey: 'id' }}>
          <Comp
            dataSource={rows}
            columns={columns}
            rowSelection={{ onChange: (k: unknown) => seen.push(k) }}
          />
        </Provider>,
      )
      const cb = firstBodyCheckbox(container, impl)
      if (cb) fireEvent.click(cb)
      const out = { clicked: !!cb, keys: seen[0] ?? 'NO-CHANGE' }
      unmount()
      return out
    }
    const dg = readSide('dg')
    const antd = readSide('antd')
    record('V1 上下文 rowKey', dg, antd)
    expect(dg, pair('V1 上下文 rowKey')).toEqual({ clicked: true, keys: ['a'] })
    expect(antd, `参照（${REFERENCE_VERSION}）应同为 ['a']（上下文 rowKey 生效）`).toEqual({
      clicked: true,
      keys: ['a'],
    })
  })
  it('V2 props rowKey 与上下文同时给 ⇒ props 赢', () => {
    const readSide = (impl: Impl): unknown => {
      const seen: unknown[] = []
      const Comp = impl === 'dg' ? (DgTable as any) : (AntdTable as any)
      const { container, unmount } = render(
        <Provider impl={impl} table={{ rowKey: 'id' }}>
          <Comp
            dataSource={rows}
            columns={columns}
            rowKey="name"
            rowSelection={{ onChange: (k: unknown) => seen.push(k) }}
          />
        </Provider>,
      )
      const cb = firstBodyCheckbox(container, impl)
      if (cb) fireEvent.click(cb)
      const out = { keys: seen[0] ?? 'NO-CHANGE' }
      unmount()
      return out
    }
    const dg = readSide('dg')
    const antd = readSide('antd')
    record('V2 props 赢上下文 rowKey', dg, antd)
    expect(dg, pair('V2 props 赢上下文 rowKey')).toEqual({ keys: ['Ann'] })
    expect(antd, `参照（${REFERENCE_VERSION}）应同为 ['Ann']`).toEqual({ keys: ['Ann'] })
  })

  it('V2b props rowKey 给空串：参照是 `||` ⇒ 空串不算"已给"，继续落到上下文', () => {
    const readSide = (impl: Impl): unknown => {
      const seen: unknown[] = []
      const Comp = impl === 'dg' ? (DgTable as any) : (AntdTable as any)
      const { container, unmount } = render(
        <Provider impl={impl} table={{ rowKey: 'id' }}>
          <Comp
            dataSource={rows}
            columns={columns}
            rowKey=""
            rowSelection={{ onChange: (k: unknown) => seen.push(k) }}
          />
        </Provider>,
      )
      const cb = firstBodyCheckbox(container, impl)
      if (cb) fireEvent.click(cb)
      const out = { keys: seen[0] ?? 'NO-CHANGE' }
      unmount()
      return out
    }
    const dg = readSide('dg')
    const antd = readSide('antd')
    record('V2b 空串 rowKey', dg, antd)
    expect(dg, pair('V2b 空串 rowKey')).toEqual(antd)
  })
})

// ======================================================= 29-A expandIcon ====

const ctxIcon = () => <i data-ctx-icon="1">CTX</i>
const propIcon = () => <i data-prop-icon="1">PROP</i>
const expandedRowRender = (r: Row) => <span>exp-{r.id}</span>

describe('29-A 上下文 expandIcon（参照 :138 嵌套路径 + `??`）', () => {
  it('V3 上下文嵌套 expandIcon 生效（props 未给图标）', () => {
    both(
      'V3 上下文 expandIcon',
      { expandable: { expandIcon: ctxIcon } },
      { expandable: { expandedRowRender } },
      (c, impl) => iconMarkers(c, impl),
    )
    expect(ledger['V3 上下文 expandIcon'].dg, pair('V3 上下文 expandIcon')).toEqual({
      custom: false,
      ctx: true,
      defBtn: false,
    })
    expect(ledger['V3 上下文 expandIcon'].antd, `参照（${REFERENCE_VERSION}）同臂读数`).toEqual({
      custom: false,
      ctx: true,
      defBtn: false,
    })
  })

  it('V4 props expandIcon 与上下文同时给 ⇒ props 赢', () => {
    both(
      'V4 props 赢 expandIcon',
      { expandable: { expandIcon: ctxIcon } },
      { expandable: { expandIcon: propIcon, expandedRowRender } },
      (c, impl) => iconMarkers(c, impl),
    )
    expect(ledger['V4 props 赢 expandIcon'].dg, pair('V4 props 赢 expandIcon')).toEqual(
      ledger['V4 props 赢 expandIcon'].antd,
    )
    expect(ledger['V4 props 赢 expandIcon'].dg, pair('V4 props 赢 expandIcon')).toEqual({
      custom: true,
      ctx: false,
      defBtn: false,
    })
  })

  it('V5 上下文**顶层** expandIcon（参照没有这条读法）⇒ 两侧都不生效', () => {
    both(
      'V5 顶层 expandIcon',
      { expandIcon: ctxIcon } as any,
      { expandable: { expandedRowRender } },
      (c, impl) => iconMarkers(c, impl),
    )
    expect(ledger['V5 顶层 expandIcon'].dg, pair('V5 顶层 expandIcon')).toEqual(
      ledger['V5 顶层 expandIcon'].antd,
    )
    expect(ledger['V5 顶层 expandIcon'].antd, `参照（${REFERENCE_VERSION}）不读顶层 table.expandIcon`).toMatchObject({
      ctx: false,
    })
  })
})

// ============================================================ 29-A scroll ====

describe('29-A 上下文 scroll（参照 :167 `scroll ?? table?.scroll` 整对象）', () => {
  it('V6 上下文 scroll 与同名 props scroll 产生同一读数（"被消费"的判据）', () => {
    both('V6a 上下文 scroll', { scroll: { x: 888, y: 300 } }, {}, (c, impl) => scrollBits(c, impl))
    both('V6b props scroll', undefined, { scroll: { x: 888, y: 300 } }, (c, impl) => scrollBits(c, impl))
    const ctx = ledger['V6a 上下文 scroll']
    const props = ledger['V6b props scroll']
    expect(ctx.dg, pair('V6 上下文 scroll')).toEqual(props.dg)
    expect(ctx.antd, pair('V6 上下文 scroll')).toEqual(props.antd)
    // 横向：两侧都该撑开轨道（这一条是真正的 dg ↔ antd 并排等值）。
    expect((ctx.dg as { x: boolean }).x, pair('V6 上下文 scroll · x 生效')).toBe(true)
    expect((ctx.antd as { x: boolean }).x, pair('V6 上下文 scroll · x 生效')).toBe(true)
    // 纵向：本仓 `scroll.y` 只认 `true`（数据区域模式，`src/table/publicTypes.ts:176` `y?: true`），
    // 参照认数值限高 ⇒ 既有结构性差异，**与 29-A 无关**（props 同形已证：V6 两臂各自相等）。
    // 这里只登记读数，不跨侧断言；见日志 5e。
  })

  it('V7 props.scroll 只给 x ⇒ 上下文整对象（含 y）被丢弃（参照 :167 整对象 ??）', () => {
    both(
      'V7 props 赢整对象',
      { scroll: { x: 888, y: 300 } },
      { scroll: { x: 500 } },
      (c, impl) => scrollBits(c, impl),
    )
    both('V7b props x:500 单跑', undefined, { scroll: { x: 500 } }, (c, impl) => scrollBits(c, impl))
    const mixed = ledger['V7 props 赢整对象']
    const only = ledger['V7b props x:500 单跑']
    expect(mixed.dg, pair('V7 props 赢整对象')).toEqual(only.dg)
    expect(mixed.antd, pair('V7 props 赢整对象')).toEqual(only.antd)
    expect((mixed.dg as { raw: string }).raw.startsWith('500px'), pair('V7 props 赢整对象')).toBe(true)
    expect((mixed.antd as { raw: string }).raw.startsWith('500px'), pair('V7 props 赢整对象')).toBe(true)
  })

  it('V8 props.scroll 显式 x:0 不被上下文覆盖（`??` 只在 null/undefined 落兜底）', () => {
    both(
      'V8 显式 0 不被覆盖',
      { scroll: { x: 888, y: 300 } },
      { scroll: { x: 0 } },
      (c, impl) => scrollBits(c, impl),
    )
    const e = ledger['V8 显式 0 不被覆盖']
    // 两侧都应停在 props 的 0（上下文 888 不参与）。`raw` 首段 = 横向宽度读数。
    expect((e.dg as { raw: string }).raw.split('|')[0], pair('V8 显式 0 不被覆盖')).toBe('0px')
    expect((e.antd as { raw: string }).raw.split('|')[0], pair('V8 显式 0 不被覆盖')).toBe('0px')
    // 注：提示词里的"props 显式 `false`"这一支**两类型都不接受**
    // （antd `TableProps['scroll']['x']` 与本仓 `publicTypes.ts:176` 都无 `false`）⇒ 不可测，已按实测登记。
  })

  /**
   * V8b：**唯一能区分"整对象 `??`"与"逐字段合并"的输入形状**。
   * V8 那类 `x:0` 分不开二者（`{x:0}` 对象本身是truthy，整对象 `??` 与逐字段合并都停在 props）
   * ⇒ 必须造"上下文只给 y、props 只给 x"的错开形状：逐字段合并会把上下文的 y **漏进**结果，
   * 整对象 `??` 则整体不采纳上下文。
   * y 的合法值两侧不同（本仓 `publicTypes.ts:176` `y?: true`；antd `y?: number|string`）
   * ⇒ 逐侧用各侧自己的合法值 + 各侧自己的 y 读出信号，三臂含**阳性对照**（探测器不空转）。
   */
  it('V8b 上下文只给 y、props 只给 x ⇒ 上下文的 y 不得漏进（整对象 ?? 的真判据 + 阳性对照）', () => {
    // 各侧"y 生效"的直接读出：
    //   dg ＝ .dg-wrapper 上的 dg-data-area（`Table.tsx` `dataAreaClassEnabled = scroll?.y === true`）
    //   antd ＝ .ant-table-body 容器（参照只在有 scroll.y 时才分 content/body 容器）
    const yLive = (container: HTMLElement, impl: Impl): boolean =>
      impl === 'dg'
        ? !!container.querySelector('.dg-wrapper.dg-data-area')
        : !!container.querySelector('.ant-table-body')
    const ctxY = { dg: { y: true }, antd: { y: 300 } } as const

    const read = (impl: Impl, withCtxY: boolean, propsScroll: unknown) => {
      const Comp = impl === 'dg' ? (DgTable as any) : (AntdTable as any)
      const { container, unmount } = render(
        <Provider impl={impl} table={withCtxY ? { scroll: ctxY[impl] } : undefined}>
          <Comp
            dataSource={keyedRows}
            columns={columns}
            {...(propsScroll === undefined ? {} : { scroll: propsScroll })}
          />
        </Provider>,
      )
      requireTarget(bodyCellCount(container, impl), `V8b ${impl} 表体单元格`)
      const out = { yLive: yLive(container, impl), x: scrollBits(container, impl).x }
      unmount()
      return out
    }

    const a: Record<Impl, unknown> = {} as Record<Impl, unknown>
    const b: Record<Impl, unknown> = {} as Record<Impl, unknown>
    const c: Record<Impl, unknown> = {} as Record<Impl, unknown>
    ;(['dg', 'antd'] as Impl[]).forEach((impl) => {
      a[impl] = read(impl, true, undefined) // A 臂：只有上下文 y ⇒ 探测器必须 ON（阳性对照）
      b[impl] = read(impl, true, { x: 500 }) // B 臂：上下文 y + props x ⇒ 整对象 ?? ⇒ y 不该漏
      c[impl] = read(impl, false, { x: 500 }) // C 臂：无上下文，只有 props x ⇒ 与 B 全等
    })
    record('V8b A 臂（上下文单独给 y）', a.dg, a.antd)
    record('V8b B 臂（上下文 y + props x）', b.dg, b.antd)
    record('V8b C 臂（无上下文，只有 props x）', c.dg, c.antd)

    // 阳性对照：上下文单独给 y 时两侧都该生效（否则 B/C 的"没漏"是假自洽）。
    expect((a.dg as { yLive: boolean }).yLive, pair('V8b A 臂 dg 阳性对照')).toBe(true)
    expect((a.antd as { yLive: boolean }).yLive, pair('V8b A 臂 antd 阳性对照')).toBe(true)
    // B 臂：props 给了 scroll 对象 ⇒ 上下文的 y 整体不参与；x 来自 props。
    for (const impl of ['dg', 'antd'] as Impl[]) {
      expect(b[impl], `V8b B 臂 ${impl}（上下文 y 不得漏进）`).toMatchObject({ yLive: false, x: true })
      // B 与"根本没有上下文"的 C 臂逐字段全等 ⇒ 上下文在 props 覆盖后完全不参与。
      expect(b[impl], `V8b B vs C · ${impl}`).toEqual(c[impl])
    }
  })
})

// ================================================================ 29-H 向量 ====

describe('29-H 树形 expandRowByClick / 上下文 expandRowByClick', () => {
  const clickRowBody = (container: HTMLElement, impl: Impl): unknown => {
    const cell =
      impl === 'dg'
        ? container.querySelector<HTMLElement>('.dg-cell-body')
        : container.querySelector<HTMLElement>('.ant-table-tbody td.ant-table-cell')
    const before = expandedBits(container, impl)
    if (cell) fireEvent.click(cell)
    return { before, after: expandedBits(container, impl) }
  }

  it('H1 树形 + props expandable.expandRowByClick ⇒ 两侧读数并排（47 的"参照不展开"是否成立）', () => {
    const readSide = (impl: Impl): unknown => {
      const Comp = impl === 'dg' ? (DgTable as any) : (AntdTable as any)
      const { container, unmount } = render(
        <Provider impl={impl} table={undefined}>
          <Comp
            dataSource={keyedTreeRows}
            columns={columns}
            expandable={{ expandRowByClick: true }}
          />
        </Provider>,
      )
      const out = clickRowBody(container, impl)
      unmount()
      return out
    }
    const dg = readSide('dg') as { before: { aria: string[] }; after: { aria: string[] } }
    const antd = readSide('antd') as { before: { aria: string[] }; after: { aria: string[] } }
    record('H1 树形 props expandRowByClick', dg, antd)
    const expandedCount = (s: { aria: string[] }) => s.aria.filter((v) => v === 'true').length
    // 语义判据：点行体后**被点的树节点**展开（两侧展开数一致，且从 0 变 1）。
    expect(
      { before: expandedCount(dg.before), after: expandedCount(dg.after) },
      pair('H1 树形 props expandRowByClick'),
    ).toEqual({
      before: expandedCount(antd.before),
      after: expandedCount(antd.after),
    })
    expect(expandedCount(dg.after), pair('H1 树形 props expandRowByClick')).toBe(1)
    // 30-A 登记（**不在本片修**）：展开后的图标**总数**两侧不同
    // ——参照给每个树行（含叶子）都出一个 `visibility:hidden` 的 spaced 图标，我们不给叶子出图标：
    //   读数见 `dg.after.aria.length` vs `antd.after.aria.length`（本例 2 vs 3）。
    //   修它会新增 DOM 节点（每行一个按钮），违"改法不许新增 DOM 节点"⇒ 只登记。
  })

  it('H2 树形 + 上下文 expandable.expandRowByClick ⇒ 参照**无此读法**（InternalTable.js 零命中）', () => {
    const readSide = (impl: Impl): unknown => {
      const Comp = impl === 'dg' ? (DgTable as any) : (AntdTable as any)
      const { container, unmount } = render(
        <Provider impl={impl} table={{ expandable: { expandRowByClick: true } }}>
          <Comp dataSource={keyedTreeRows} columns={columns} />
        </Provider>,
      )
      const out = clickRowBody(container, impl)
      unmount()
      return out
    }
    const dg = readSide('dg')
    const antd = readSide('antd')
    record('H2 树形上下文 expandRowByClick', dg, antd)
    expect(dg, pair('H2 树形上下文 expandRowByClick')).toEqual(antd)
  })

  it('H3 spaced（不可展开行）图标形态：两侧并排 visibility / 可达性', () => {
    const readSide = (impl: Impl): unknown => {
      const Comp = impl === 'dg' ? (DgTable as any) : (AntdTable as any)
      const { container, unmount } = render(
        <Provider impl={impl} table={undefined}>
          <Comp
            dataSource={keyedRows}
            columns={columns}
            expandable={{ expandedRowRender, rowExpandable: (r: Row) => r.id === 'a' }}
          />
        </Provider>,
      )
      const btns = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).map((b) => ({
        cls: b.className.replace(/ant-table-row-expand-icon/g, 'X').replace(/dg-expand-icon/g, 'X'),
        disabled: b.disabled,
        vis: getComputedStyle(b).visibility,
        ariaExpanded: b.getAttribute('aria-expanded'),
      }))
      unmount()
      return btns
    }
    const dg = readSide('dg') as { cls: string; disabled: boolean }[]
    const antd = readSide('antd') as { cls: string; disabled: boolean }[]
    record('H3 spaced 图标', dg, antd)
    const dgExpandBtns = dg.filter((b) => b.cls.startsWith('X'))
    const antdExpandBtns = antd.filter((b) => b.cls.startsWith('X'))
    expect(dgExpandBtns.length, pair('H3 spaced 图标')).toBe(antdExpandBtns.length)
    // 可展开那一行：两侧都是 enabled 的 collapsed 图标。
    expect(dgExpandBtns[0].disabled, pair('H3 spaced 图标')).toBe(antdExpandBtns[0].disabled)
    // ⚠️ 30-A 登记（实测，**本片不改**）：不可展开行的 spaced 图标两侧机制不同——
    //   参照 `disabled=false` + CSS `visibility:hidden`；我们 `disabled=true`（CSS 里也另有 hidden 规则
    //   `src/table/style/table.css:698`，但 vitest 不加载静态 CSS ⇒ 本用例 `vis` 列只有参照侧可信）。
    //   用户可达性结论相同（都点不到），差别在属性与 a11y 树（disabled 会被朗读为"灰显"）。
    //   改成与参照同形要拿掉 `disabled`，会牵动步骤 40 的 BAT-26 图标冒泡用例（同域在飞）⇒ 只登记。
    expect(dgExpandBtns[1].disabled, pair('H3 spaced 图标')).toBe(true)
    expect(antdExpandBtns[1].disabled, pair('H3 spaced 图标')).toBe(false)
  })
})

// ================================ 步骤 60 补：V9 缺省态回归钉 / V10 上下文图标不造 DOM ====

/**
 * V9（验收向量表的「回归钉」）：三档都**没有**上下文时，行为必须与今日缺省态**逐字一致**
 * —— 29-A 只准"多认一份上下文"，不准在上下文缺席时改任何东西。
 * 三臂：`none`（不包 Provider）/ `undefinedTable`（包了但 `table` 段缺省）/ `emptyTable`（`table={{}}`）。
 * 判据形状：同 impl 内三臂**全等**（含 raw 串）＋ 跨侧只比**语义等价**字段（keys/x/y）——
 * `raw` 是各家 class/样式，跨侧比就是拿实现细节当契约。
 */
type CtxMode = 'none' | 'undefinedTable' | 'emptyTable'

function wrapMode(impl: Impl, mode: CtxMode, children: React.ReactElement): React.ReactElement {
  if (mode === 'none') return children
  const value = mode === 'undefinedTable' ? undefined : {}
  return impl === 'dg' ? (
    <ConfigProvider table={value as any}>{children}</ConfigProvider>
  ) : (
    <CfgProvider table={value as any}>{children}</CfgProvider>
  )
}

function readNoContext(impl: Impl, mode: CtxMode): {
  keys: unknown
  x: boolean
  y: boolean
  raw: string
} {
  const seen: unknown[] = []
  const Comp = impl === 'dg' ? (DgTable as any) : (AntdTable as any)
  const { container, unmount } = render(
    wrapMode(
      impl,
      mode,
      <Comp
        dataSource={keyedRows}
        columns={columns}
        rowSelection={{ onChange: (k: unknown) => seen.push(k) }}
      />,
    ),
  )
  // P-102：读数前先确认目标存在（打空的选择器会让 false 读数看着"两侧自洽"）。
  requireTarget(bodyCellCount(container, impl), `V9 ${mode} · ${impl} 表体单元格`)
  const cb = firstBodyCheckbox(container, impl)
  if (cb) fireEvent.click(cb)
  const bits = scrollBits(container, impl)
  const out = { keys: seen[0] ?? 'NO-CHANGE', x: bits.x, y: bits.y, raw: bits.raw }
  unmount()
  return out
}

describe('29-A V9 上下文缺席 ⇒ 与缺省态零差异（回归钉）', () => {
  const modes: CtxMode[] = ['none', 'undefinedTable', 'emptyTable']

  it('V9a 三臂同 impl 全等；跨侧 keys/x/y 全等（rowKey 仍走内置 "key"）', () => {
    const byImpl: Record<Impl, Record<CtxMode, unknown>> = {
      dg: {} as Record<CtxMode, unknown>,
      antd: {} as Record<CtxMode, unknown>,
    }
    ;(Object.keys(byImpl) as Impl[]).forEach((impl) => {
      modes.forEach((mode) => {
        byImpl[impl][mode] = readNoContext(impl, mode)
      })
      record(`V9a ${impl} 上下文缺席三臂`, byImpl[impl].none, byImpl[impl].emptyTable)
      // 上下文缺席不许改任何行为（含原始 class/样式串）。
      expect(byImpl[impl].undefinedTable, `${impl} · table 段缺省 ≠ 不包 Provider`).toEqual(
        byImpl[impl].none,
      )
      expect(byImpl[impl].emptyTable, `${impl} · table={{}} ≠ 不包 Provider`).toEqual(byImpl[impl].none)
    })
    const pick = (v: unknown) => {
      const e = v as { keys: unknown; x: boolean; y: boolean }
      return { keys: e.keys, x: e.x, y: e.y }
    }
    // 跨侧语义等值：无上下文时两侧都按内置 'key' 取键、都不撑滚动。
    expect(pick(byImpl.dg.none), pair('V9a dg vs antd')).toEqual(pick(byImpl.antd.none))
    expect(byImpl.dg.none, pair('V9a dg vs antd')).toMatchObject({ keys: ['a'], x: false, y: false })
    expect(byImpl.antd.none, pair('V9a dg vs antd')).toMatchObject({ keys: ['a'], x: false, y: false })
  })

  it('V9b 上下文给了 `table` 段的**其他**字段 ⇒ 本片三项都不受影响', () => {
    const read = (impl: Impl): unknown => {
      const seen: unknown[] = []
      const Comp = impl === 'dg' ? (DgTable as any) : (AntdTable as any)
      const { container, unmount } = render(
        <Provider impl={impl} table={{ expandRowByClick: true, rowSelection: { columnWidth: 99 } } as any}>
          <Comp
            dataSource={keyedRows}
            columns={columns}
            rowSelection={{ onChange: (k: unknown) => seen.push(k) }}
          />
        </Provider>,
      )
      requireTarget(bodyCellCount(container, impl), `V9b · ${impl} 表体单元格`)
      const cb = firstBodyCheckbox(container, impl)
      if (cb) fireEvent.click(cb)
      const out = { keys: seen[0] ?? 'NO-CHANGE', x: scrollBits(container, impl).x }
      unmount()
      return out
    }
    const dg = read('dg')
    const antd = read('antd')
    record('V9b 上下文无关字段', dg, antd)
    // `table` 段里非本片三项的字段 ⇒ 两侧行为都不变（仍内置 'key'、仍不撑滚动）。
    // 参照 `InternalTable.js` 全文 `grep -n "table?\."` 穷举只有 3 处（本棒实读）
    //   ⇒ 上下文里的 `expandRowByClick` / `rowSelection` 段参照**不读**，我们也不许读。
    expect(dg, pair('V9b 上下文无关字段')).toEqual(antd)
    expect(dg, pair('V9b 上下文无关字段')).toEqual({ keys: ['a'], x: false })
  })
})

/**
 * V10（本次改动**唯一可能新增 DOM** 的臂）：上下文给了 `expandable.expandIcon`、
 * props **完全没给** `expandable` ⇒ 归一层此时会凭空造一个 `{ expandIcon }` 对象
 * （见 `contextDefaults.ts` 的「有意差异」注释）。
 * 实测（本棒 DOM 取证，`tmp/60-probe-dom.log`）：参照该臂把图标**内联**进每行第一个既有数据格
 * （不加列、不加行），我方该臂**一个节点都不加**、也不渲染该图标。
 * ⇒ 本用例钉两件事：① 我方该臂 DOM 增量必须为 0（改动不新增节点）；② 分叉本身**登记**，
 * 对齐要复刻参照侧一个被其作者标注"将来会删"的私有后门 ⇒ 交回 main，不在 29-A 自决。
 */
describe('29-A V10 上下文 expandIcon 但 props 无 expandable ⇒ 不得凭空造展开列（无新 DOM）', () => {
  const readIconArm = (impl: Impl, withCtxIcon: boolean) => {
    const Comp = impl === 'dg' ? (DgTable as any) : (AntdTable as any)
    const { container, unmount } = render(
      <Provider impl={impl} table={withCtxIcon ? { expandable: { expandIcon: ctxIcon } } : undefined}>
        <Comp dataSource={keyedRows} columns={columns} />
      </Provider>,
    )
    const cells = bodyCellCount(container, impl)
    requireTarget(cells, `V10 ${withCtxIcon ? 'ctx' : 'base'} · ${impl} 表体单元格`)
    const out = {
      cells,
      // ⚠️ `cells` 用的是各家 class 计数，实测**照不出**参照本臂的变化
      //   ⇒ 结构增量另用裸 `tbody td/tr` + append 节点计数来判，
      //   免得"选择器数不到"被读成"没有新增节点"（P-102 的同族坑）。
      tds: container.querySelectorAll('tbody td').length,
      trs: container.querySelectorAll('tbody tr').length,
      // 参照把图标**内联**进既有格时用的那个 append 节点（见 V10 断言里的机制锚点）。
      indentSpans: container.querySelectorAll('[class*="row-indent"]').length,
      total: container.querySelectorAll('*').length,
      defaultIconBtns:
        impl === 'dg'
          ? container.querySelectorAll('button.dg-expand-icon').length
          : container.querySelectorAll('button.ant-table-row-expand-icon').length,
      ctxIconNodes: container.querySelectorAll('[data-ctx-icon]').length,
    }
    unmount()
    return out
  }

  it('V10 实测分叉（登记不修）：参照此臂出图标、我们不出；但我方 DOM 增量为 0', () => {
    const out: Record<Impl, { base: unknown; ctx: unknown }> = {
      dg: { base: undefined, ctx: undefined },
      antd: { base: undefined, ctx: undefined },
    }
    ;(Object.keys(out) as Impl[]).forEach((impl) => {
      out[impl].base = readIconArm(impl, false)
      out[impl].ctx = readIconArm(impl, true)
    })
    record('V10 上下文图标无 props.expandable', out.dg.ctx, out.antd.ctx)

    // 我方硬门：上下文图标**不得**凭空造出展开列 ⇒ 总元素数与基线臂逐 impl 完全相等。
    expect(out.dg.ctx, pair(`V10 dg ctx vs base`)).toEqual(out.dg.base)
    expect(out.dg.ctx, pair('V10 dg ctx')).toMatchObject({ defaultIconBtns: 0, ctxIconNodes: 0 })

    // P-102 反证选择器是活的：下面那条 `antdCtx.ctxIconNodes === antdBase.trs`（行数 2，非 0）
    // 一旦成立，就说明 `[data-ctx-icon]` 真的数得到节点 ⇒ 上面我方那个 `0` 是真 0，不是选择器打空。
    // 实测分叉（本棒**登记不修**）：参照在"只有上下文图标、props 完全没给 expandable"时，
    //   会把该图标**内联进第一个既有数据格**（不新增列、不新增行），每行一份；我方该臂零渲染。
    //   机制（本棒逐跳实读，非转述）：
    //     antd `es/table/InternalTable.js:317` `mergedExpandable.__PARENT_RENDER_ICON__ = mergedExpandable.expandIcon`
    //     ＋ `:319` `expandIcon = mergedExpandable.expandIcon || expandIcon || renderExpandIcon(tableLocale)`
    //       （上下文图标经 `:138` 已进入 mergedExpandable.expandIcon）
    //     → `@rc-component/table 1.10.2 es/hooks/useExpand.js:29-36` 的 nest 分支
    //       `props.expandable && internalHooks === INTERNAL_HOOKS && props.expandable.__PARENT_RENDER_ICON__`
    //       ⇒ `expandableType === 'nest'`（与记录有没有 children 无关）
    //     → `es/hooks/useRowInfo.js:22` `nestExpandable = expandableType === 'nest'`
    //     → `es/Body/BodyRow.js:33-46` 在 `colIndex === (expandIconColumnIndex || 0)` 的格里
    //       造 `<span class="-row-indent">` + `expandIcon({...})` 作 appendNode。
    //   ⇒ 结构读数（本用例实测）：参照 td 数**不变**、每行 +1 append span +1 图标节点。
    //   不修的理由（两条，缺一都不算登记）：① 对齐它要复刻一个 antd 自己标注
    //   "Do not use `__PARENT_RENDER_ICON__` in prod since we will remove this when refactor"
    //   的私有后门（`useExpand.js:26-34` 原注释）；② 会给每张在该上下文里的表的每一行
    //   新增 DOM 节点 ⇒ 超出"读一份上下文"的边界，按工单"能力缺失停手交回 main"处理。
    const antdBase = out.antd.base as { tds: number; trs: number; indentSpans: number; ctxIconNodes: number }
    const antdCtx = out.antd.ctx as { tds: number; trs: number; indentSpans: number; ctxIconNodes: number }
    expect(antdCtx.trs, pair('V10 antd 行数不变')).toBe(antdBase.trs)
    // 图标是**内联**进既有格 ⇒ 参照该臂 td 数也不变（新增的是格内节点，不是格）。
    expect(antdCtx.tds, pair('V10 antd td 数不变（内联而非新列）')).toBe(antdBase.tds)
    // 每行一份 append 节点 + 一份图标（`trs` 即行数，同时反证"目标数 > 0"）。
    expect(antdCtx.indentSpans - antdBase.indentSpans, pair('V10 antd 每行 +1 append 节点')).toBe(antdBase.trs)
    expect(antdCtx.ctxIconNodes, pair('V10 antd 每行 1 个上下文图标')).toBe(antdBase.trs)
  })
})
