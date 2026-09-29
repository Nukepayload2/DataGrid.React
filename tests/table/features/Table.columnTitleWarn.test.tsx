// 黑盒 feature-slice：函数式 `column.title` 的**开发态告警**（BAT-23 23-E）。
//
// 现状（本批**只加告警、不改渲染行为**，以下四条都是实测）：
//   - 参照把它当公开能力：`antd 6.4.4 es/table/interface.d.ts:72` 的
//     `ColumnTitle = React.ReactNode | ((props) => React.ReactNode)`，
//     `es/table/util.js:14-19` 的 `renderColumnTitle` 遇到函数直接调用 ⇒ 参照每档都渲染出标题。
//   - 我方只收 `ReactNode`：函数被当 React child ⇒ 表头格 `textContent=""`、
//     函数返回的元素在 DOM 里不存在、**不抛错**（框架对"函数当 React child"只写一条 console.error、
//     按父组件名去重、永不抛）。
//   - 开 `ellipsis` 时**连原生 `title` 悬浮提示属性也一起丢**（`toEllipsisTitle` 对函数返回 undefined）。
//   - 本批起：上述静默失效在开发态有一条 `[data-grid]` 告警定位到具体列。
//
// 告警落点（判据一份，出口一份）：判据在 `src/table/columnAdapter.ts` 的 `warnFunctionTitleOnce`，
//   由 `toEngineColumns` 的递归 `build()` 调用 ⇒ flat 路径（`engine/FlatColumnCells.tsx`）与
//   前缀拼接、按 key 去重与"仅非 production 才发"的环境门都在出口 `src/table/devWarn.ts`。
//   multi 路径（`engine/HeaderCell.tsx`）读的是同一份列树，两条路径天然都覆盖且不各吼一遍。
//
// ⚠ 两条已登记坑（本文件的断言形状就是为绕开它们）：
//   - **P-096**：React 自己那条 "Functions are not valid as a React child" 的 console.error
//     按父组件名去重 ⇒ 裸数 console 次数会读到"去重假象"。故本文件**只按消息前缀过滤**后再计数，
//     且不对 React 侧的 error 条数下任何断言。
//   - 本仓测试里 `console.error` 常被别的用例异步漏出 ⇒ 同样用前缀过滤，不用裸次数。
//   - 告警的去重是**模块级**（`Set`，按列路径键），本文件内所有用例各用**独占的列 key**，
//     避免用例之间互相吃掉对方的告警。
import type { ReactNode } from 'react'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'

import { Table, type TableProps } from '../../../src/table/index'
import { customRender } from '../../shared/render'

/** 本批告警的消息前缀（前缀由出口 `src/table/devWarn.ts` 拼，本层消息以 `column.title` 开头 ⇒ 这里按它过滤计数）。 */
const WARN_MARK = '[data-grid] `column.title`'

const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

afterEach(() => {
  warnSpy.mockClear()
  errSpy.mockClear()
})

afterAll(() => {
  warnSpy.mockRestore()
  errSpy.mockRestore()
})

type Rec = { key: string; name: string; age: number }

const data: Rec[] = [
  { key: 'r1', name: 'Jack', age: 38 },
  { key: 'r2', name: 'Lucy', age: 30 },
]

/**
 * 函数式 title：参照的公开能力、我方**类型面**拒绝 ⇒ 用例按 JS 用户的实际姿势强转
 * （这正是缺陷成立的前提：TypeScript 用户被拦住，JS 用户静默中招）。
 */
const fnTitle = (label: string): ReactNode =>
  (() => <span className="dg-probe-t1">{label}</span>) as unknown as ReactNode

/** 只取本批告警（过滤掉仓库其他 `[data-grid]` 告警与 React/antd 自己的输出）。 */
function titleWarnTexts(): Array<string> {
  return warnSpy.mock.calls
    .map((args) => args.join(' '))
    .filter((text) => text.includes(WARN_MARK))
}

/** 本批告警里点名了某个列键的那几条（"能定位到那一列"的判据）。 */
function titleWarnTextsFor(columnKey: string): Array<string> {
  return titleWarnTexts().filter((text) => text.includes(`key=\`${columnKey}\``))
}

/** 按 data-column-key 取表头格（两条表头路径都挂这个属性）。 */
function headerCell(container: HTMLElement, columnKey: string): HTMLElement | null {
  return container.querySelector<HTMLElement>(`.dg-cell-header[data-column-key="${columnKey}"]`)
}

describe('Table.columnTitleWarn（函数式 column.title 的开发态告警）', () => {
  it('函数 title ⇒ 恰好一条告警，消息能定位到该列并说清后果', () => {
    customRender(
      <Table<Rec>
        rowKey="key"
        dataSource={data}
        columns={[
          { key: 'warn-flat-name', dataIndex: 'name', title: fnTitle('T') },
          { key: 'warn-flat-age', dataIndex: 'age', title: 'Age' },
        ]}
      />,
    )

    // 恰好一次：customRender 包 StrictMode（双渲染）+ 列树可能重建 ⇒ 靠按列去重压成 1。
    const texts = titleWarnTexts()
    expect(texts).toHaveLength(1)
    const text = texts[0]
    // ① 定位到列（key 优先，另两种身份见下面两个用例）。
    expect(text).toContain('key=`warn-flat-name`')
    // ② 明说"本包不吃函数式 title"。
    expect(text).toMatch(/is a function.*does not support/)
    // ③ 明说"标题会渲染为空"且不抛错。
    expect(text).toContain('renders **empty**')
    expect(text).toContain('nothing is thrown')
    // ④ 明说"开 ellipsis 时悬浮提示也会丢"。
    expect(text).toContain('`ellipsis`')
    expect(text).toContain('tooltip attribute is dropped')
    // ⑤ 不给没中招的列扣帽子（消息里只出现函数 title 那一列的身份）。
    expect(text).not.toContain('warn-flat-age')
  })

  it('普通 ReactNode title ⇒ 零告警（防"告警过吵"）', () => {
    const { container } = customRender(
      <Table<Rec>
        rowKey="key"
        dataSource={data}
        columns={[
          { key: 'node-name', dataIndex: 'name', title: <strong>Name</strong> },
          { key: 'node-age', dataIndex: 'age', title: 'Age' },
          { key: 'node-elem', dataIndex: 'age', title: <span>{'A'}{'B'}</span> },
        ]}
      />,
    )

    expect(titleWarnTexts()).toHaveLength(0)
    // 负例同时得是真渲染（否则"零告警"可能是因为根本没渲染表头）。
    expect(headerCell(container, 'node-name')?.textContent).toBe('Name')
    expect(headerCell(container, 'node-age')?.textContent).toBe('Age')
  })

  it('无 key 的列：告警退到 dataIndex，再退到列序号（三者有谁说哪个）', () => {
    const columns: TableProps<Rec>['columns'] = [
      // 只有 dataIndex ⇒ 点名 dataIndex。
      { dataIndex: 'name', title: fnTitle('T') },
      // key/dataIndex 都没有 ⇒ 点名列树路径（匿名列序号 col-N）。
      { title: fnTitle('T2') },
    ]
    customRender(<Table<Rec> rowKey="key" dataSource={data} columns={columns} />)

    const texts = titleWarnTexts()
    expect(texts).toHaveLength(2)
    expect(texts[0]).toContain('dataIndex=`name`')
    expect(texts[1]).toContain('no `key`/`dataIndex`')
    expect(texts[1]).toMatch(/column #`col-\d+`/)
  })

  it('同一列在两条表头路径下不重复告警（去重生效，且两路径都真的覆盖到）', () => {
    const fnCol: NonNullable<TableProps<Rec>['columns']>[number] = {
      key: 'dup-path',
      dataIndex: 'name',
      title: fnTitle('T'),
    }
    // 路径 A（flat 快速路径）：单层 columns、无强制条件。
    const flat = customRender(
      <Table<Rec> rowKey="key" dataSource={data} columns={[fnCol, { key: 'dup-age', dataIndex: 'age', title: 'Age' }]} />,
    )
    expect(flat.container.querySelector('.dg-cell-header-group')).toBeNull()
    expect(titleWarnTextsFor('dup-path')).toHaveLength(1)

    // 同一路径内的列树重建（selectionNode 变 ⇒ columnTree 重建）不重发。
    warnSpy.mockClear()
    flat.rerender(
      <Table<Rec>
        rowKey="key"
        dataSource={data}
        rowSelection={{ type: 'checkbox' }}
        columns={[fnCol, { key: 'dup-age', dataIndex: 'age', title: 'Age' }]}
      />,
    )
    expect(titleWarnTextsFor('dup-path')).toHaveLength(0)

    // 路径 B（multi 路径）：同一列键 + 分组列把 maxDepth 抬到 2 ⇒ 换一条表头渲染路径。
    warnSpy.mockClear()
    const multi = customRender(
      <Table<Rec>
        rowKey="key"
        dataSource={data}
        columns={[
          fnCol,
          {
            key: 'dup-group',
            title: 'Group',
            children: [{ key: 'dup-group-leaf', dataIndex: 'age', title: 'Age' }],
          },
        ]}
      />,
    )
    // 先证这条真的是 multi 路径（分组表头格存在），否则"没重发"是空断言。
    expect(multi.container.querySelector('.dg-cell-header-group')).not.toBeNull()
    expect(titleWarnTextsFor('dup-path')).toHaveLength(0)
    // 而 multi 路径自己的函数标题照样告警（覆盖，不是哑火）。
    const multiGroupFn: NonNullable<TableProps<Rec>['columns']>[number] = {
      key: 'dup-group-fn',
      title: fnTitle('G'),
      children: [{ key: 'dup-group-leaf2', dataIndex: 'age', title: 'Age' }],
    }
    customRender(<Table<Rec> rowKey="key" dataSource={data} columns={[multiGroupFn]} />)
    expect(titleWarnTextsFor('dup-group-fn')).toHaveLength(1)
  })

  it('渲染现状未被本批偷改：标题仍为空、函数产物不在 DOM、不抛错', () => {
    const { container } = customRender(
      <Table<Rec>
        rowKey="key"
        dataSource={data}
        columns={[
          { key: 'render-empty', dataIndex: 'name', title: fnTitle('T') },
          { key: 'render-ok', dataIndex: 'age', title: 'Age' },
        ]}
      />,
    )
    // 不抛错（渲染完成、DOM 结构与数据行都在）⇒ 本批只是显式化，没有把静默改成崩。
    expect(container.querySelector('.dg-wrapper')).not.toBeNull()
    expect(container.querySelectorAll('.dg-cell-body[data-row-index="0"]')).toHaveLength(2)
    // 现状 1：函数 title 的表头格**仍渲染为空**（本批不移植能力，别把它写成渲染出来了）。
    expect(headerCell(container, 'render-empty')?.textContent).toBe('')
    // 现状 2：函数返回的元素在 DOM 里不存在。
    expect(container.querySelectorAll('.dg-probe-t1')).toHaveLength(0)
    // 对照列正常渲染（否则"为空"是空断言）。
    expect(headerCell(container, 'render-ok')?.textContent).toBe('Age')
    // 告警确实发了（现状从静默变显式）。
    expect(titleWarnTextsFor('render-empty')).toHaveLength(1)
  })

  it('ellipsis 现状未变：函数 title 的表头格连原生 title 悬浮提示也一起丢', () => {
    const { container } = customRender(
      <Table<Rec>
        rowKey="key"
        dataSource={data}
        columns={[
          { key: 'ellipsis-fn', dataIndex: 'name', title: fnTitle('T'), ellipsis: true },
          // 正对照：字符串 title + ellipsis ⇒ 原生 title 在（证明"丢"不是这套机制根本没跑）。
          { key: 'ellipsis-str', dataIndex: 'age', title: 'Age', ellipsis: true },
        ]}
      />,
    )
    expect(headerCell(container, 'ellipsis-str')?.getAttribute('title')).toBe('Age')
    expect(headerCell(container, 'ellipsis-fn')?.getAttribute('title')).toBeNull()
    expect(headerCell(container, 'ellipsis-fn')?.textContent).toBe('')
    // 告警消息里点明了这一后果。
    expect(titleWarnTextsFor('ellipsis-fn')).toHaveLength(1)
  })
})
