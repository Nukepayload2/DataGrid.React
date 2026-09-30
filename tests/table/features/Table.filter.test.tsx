// 黑盒 feature-slice 测试：**筛选域**，与 antd 自家 Table.filter 测试用例逐条对齐。
//
// 对齐来源: {{AntDesign}}/components/table/__tests__/Table.filter.test.tsx（3173 行）
//   antd 用例数 N = 90，实测计数过程（Select-String "^\s*it\(" 命中 88 行）：
//     · 静态 `it(` 行 88 处，其中 2 处位于「被调用多次的工厂」里：
//         - L309 `it(\`can be controlled by ${propName}\`)` 位于 `function test(propName)`，
//           L338/L339 调用 2 次（'filterDropdownOpen' / 'filterDropdownVisible'）→ 计 2
//         - L796 `it(\`${typeof value} type\`)` 位于 `[['Light',93],['Bamboo',false]].forEach` → 计 2
//       88 − 2 + 2 + 2 = **90**。antd 源内无 `it.skip` / `it.each` / `it.only` / `xit`（实测 grep 无命中），
//       故 N = 90（计划文档记的 90 与实测一致）。
//   本文件：**运行时口径 `91 passed | 8 skipped (99)`**（BAT-0 0-B 收工读数；历次 delta 见文件末尾
//     「skip 汇总」之后的 BAT-*／步骤段落，BAT-0 0-B 一条给了最近一次的对账）。
//     文件末尾的 skip 清单同步为 **8 条 ＝ 运行时 8**（6 条静态 `it.skip(` ＋ 工厂 `test('can be controlled by …')` 2 次调用）。
//     · 与 antd 逐条对齐的部分仍是 90（步骤 57 起 **76 直测 + 14 skip**：`should not trigger onChange when
//       blurring custom filterDropdown`（antd L1083）由 skip 转直测；步骤 75 起 **78 直测 + 12 skip**：
//       `fires pagination change event`（antd L673）与 `should keep pagination current after filter`
//       （antd L1411）两条的原依据被实测证伪后转直测；BAT-0 0-B 起 **79 直测 + 11 skip**：
//       `filterDropdown should not override customize Menu selectable`（antd L2719）的双实例
//       观测障碍被 `test.alias` 消除后转直测）；另有 **BAT-18 的 5 条补充直测**
//       （树形递归求值顺序例，见「can filter children by defaultFilteredValue」之后一段）
//       ＋ **BAT-23 23-D 的 2 条补充直测**（clearFilters 后果钉 + 内置面板负例钉），antd 无同名用例。
//     · 口径提醒：静态 `grep -c "^\s*(it|test)\("` 会把工厂**调用点**双计（本文件的
//       `test('filterDropdownOpen')` / `test('filterDropdownVisible')` 各 1 行 → 2 条 skip；
//       `[['Light',93],['Bamboo',false]].forEach` 内 1 行 `it(` → 2 条直测），故一律以
//       `CI=true npx vitest run` 的 `passed | skipped (total)` 为准。
//   （缺口 **#2** 修复批次 BAT-1：1 条 skip 转直测 → `should supports filterSearch has type of function`
//    （antd L2272），断言写成修复后行为；总数 95 不变。同批 src 落 `FilterBuiltinPanel.tsx` 两处 key。
//    缺口 **#3** 的 src 修法同批落地，用例当时因测试环境双实例（裸 `antd` → CJS `lib`）
//    观测不到而留 skip；**BAT-0 0-B** 落 `test.alias` 统一 es 单图后**转直测**，
//    依据与读数写在该用例的紧邻注释里。）
//   （缺口 #1 / #5 / #6a 修复批次：5 条 skip 转直测 → `can filter children by
//    defaultFilteredValue`、`should not fire change event when close [a filtered]
//    filterDropdown without changing anything` ×2、`should not trigger onChange when
//    filters is empty`、`should work as expected with complex custom filterDropdown`；
//    总数 90 不变，仍与 antd 用例逐条对齐。）
//
// 选择器重映射（data-grid 无 `<table>` 语义 DOM；**行不是容器元素**，用 data-row-index 取行）:
//   | antd | data-grid |
//   |---|---|
//   | `span.ant-dropdown-trigger`（漏斗触发器） | `.dg-filter-trigger`（激活态 `.dg-filter-trigger-active`；
//   |   |  Dropdown 展开态仍由 antd 的 `.ant-dropdown-open` 类标记，见 FilterDropdown.tsx:502-528） |
//   | `.ant-table-filter-dropdown`（面板根） | `.dg-filter-dropdown`（FilterBuiltinPanel.tsx:126-134）|
//   | 面板分区 | `.dg-filter-dropdown-menu` / `-search` / `-search-input` / `-tree` / `-checkall` /
//   |   | `.dg-filter-menu-tree` / `.dg-filter-checkbox-group` / `.dg-filter-menu-list` /
//   |   | `.dg-filter-menu-item` / `.dg-filter-radio-group` / `-btns` / `-empty`（FilterBuiltinPanel.tsx）|
//   | 自定义面板 | `.dg-filter-dropdown-custom`（FilterDropdown.tsx:468-487）|
//   | `li.ant-dropdown-menu-item`（筛选项） | `.dg-filter-menu-item`（内含 antd `Checkbox`/`Radio`，
//   |   |  勾选请点 `input.ant-checkbox-input` / `input.ant-radio-input`；menu 模式**扁平化**所有层级）|
//   | `.ant-btn-color-primary.ant-btn-variant-solid`（确定） | `.dg-filter-dropdown-btns` 内 **OK** 按钮 |
//   | `.ant-btn-link`（重置） | `.dg-filter-dropdown-btns` 内第 1 个按钮（default 按钮，**非 link**）|
//   | `tbody tr` / `.ant-table-row`（一行） | `.dg-cell-body` 的**唯一 `data-row-index`** 计数；
//   |   |  列文本用 `.dg-cell-body[data-column-key$="<key>"]`（分组列下 key 形如 `group.name`）|
//   | `.ant-table-tbody`（表体容器） | 无语义容器，直接查 `.dg-cell-body` |
//   | `.ant-empty`（面板空态） | `.dg-filter-dropdown-empty > .ant-empty` |
//   | `.ant-tree-checkbox` / `.ant-tree-node-content-wrapper` / `.ant-checkbox-indeterminate` | 同名（data-grid 用 antd `<Tree>` 渲染 tree 模式）|
//   | `.ant-select` / `.ant-select-item-option`（自定义面板内的 Select） | 同名（自定义面板原样渲染用户节点）|
//   | `container.querySelector(...)`（弹层） | 弹层 portal 到 `document.body`：用 `document.body` /
//   |   |  `screen` 查询；`.ant-dropdown-placement-*`（placement）在 body 上 |
//   | `.ant-table-column-title` / `-sorters` | `.dg-column-title` / `.dg-column-sorters`（同名别名）|
//
// 语义重映射（实测依据，非照抄 antd）:
//   - 分隔/确认/重置交互：data-grid 的确定按钮直接应用并关闭；重置按钮只清草稿、不关闭（filterReset 语义）。
//   - 「关闭」判定：用 `.ant-dropdown-open`（触发器上的 antd 类）。弹层**卸载时机**与 antd 不同——
//     应用（OK / confirm / filterOnClose 生效的关闭）后触发重渲染 → 弹层从 body 卸载；
//     仅点触发器关闭而无重渲染时，弹层节点仍留在 body（rc-motion 的 leave 在 jsdom 无 transitionend）。
//     故断言一律查 `.ant-dropdown-open` 与「最后一次出现的 `.dg-filter-dropdown`」。
//   - onChange 的 pagination 参数：data-grid 恒为 `{current,pageSize,total}`（antd 未开分页时 `{}`）。
//   - `onFilter` 收到的 value 不做字符串化（antd 会把 boolean 值转成 'true' 字符串）。
//
// skip 策略：data-grid 不支持 / 从未有的行为用 `it.skip`，**每个 skip 紧邻注释写明依据**
// （src 文件:行号 或 docs/pages/*.tsx 条目）。直测用例全部针对 data-grid 实际 DOM / 回调断言。
import { isValidElement, useEffect, useState } from 'react'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
import { Button, ConfigProvider, Input, Menu, Table as AntdTable, Tooltip } from 'antd'

import { Table } from '../../../src/table/index'
import { customRender } from '../../shared/render'
import { expectSnapshot } from '../../shared/snapshot'

const { Column } = Table

const filterFn = (value: any, record: any) => record.name.includes(value)
const column: any = {
  title: 'Name',
  dataIndex: 'name',
  filters: [
    { text: 'Boy', value: 'boy' },
    { text: 'Girl', value: 'girl' },
    {
      text: 'Title',
      value: 'title',
      children: [
        { text: 'Designer', value: 'designer' },
        { text: 'Coder', value: 'coder' },
      ],
    },
  ],
  onFilter: filterFn,
}

const data = [
  { key: 0, name: 'Jack' },
  { key: 1, name: 'Lucy' },
  { key: 2, name: 'Tom' },
  { key: 3, name: 'Jerry' },
]

const longData: Array<{ key: string; name: string }> = []
for (let i = 0; i < 100; i += 1) {
  longData.push({ key: i.toString(), name: 'name' })
}

function createTable(props: any = {}) {
  return <Table columns={[column]} dataSource={data} pagination={false} {...props} />
}

// === 断言辅助（弹层 portal 到 body，故按 body 查询）===

/** 触发器（漏斗）。 */
function triggerOf(container: HTMLElement) {
  return container.querySelector<HTMLElement>('.dg-filter-trigger')!
}

/** body 内全部筛选面板（可能残留已关闭的弹层节点，取最后一个＝最近一次渲染的）。 */
function panels(): HTMLElement[] {
  return Array.from(document.body.querySelectorAll<HTMLElement>('.dg-filter-dropdown'))
}

/** 当前筛选面板。 */
function panel(): HTMLElement {
  const all = panels()
  const found = all[all.length - 1]
  if (!found) throw new Error('filter dropdown panel not found (未打开或已卸载)')
  return found
}

function dropdownButtons(p: HTMLElement = panel()): HTMLElement[] {
  return Array.from(p.querySelectorAll<HTMLElement>('.dg-filter-dropdown-btns button'))
}

/** 确定按钮（唯一 primary）。 */
function confirmButton(p: HTMLElement = panel()): HTMLElement {
  const btn = dropdownButtons(p).find((b) => b.textContent === 'OK')
  if (!btn) throw new Error('OK button not found')
  return btn
}

/** 重置按钮（btns 内第 1 个，default 样式；antd 对应 `.ant-btn-link`）。 */
function resetButton(p: HTMLElement = panel()): HTMLElement {
  return dropdownButtons(p)[0]
}

function menuInputs(p: HTMLElement = panel()): HTMLInputElement[] {
  return Array.from(p.querySelectorAll<HTMLInputElement>('.dg-filter-menu-item input'))
}

function treeCheckboxes(p: HTMLElement = panel()): HTMLElement[] {
  return Array.from(p.querySelectorAll<HTMLElement>('.ant-tree-checkbox'))
}

/** 打开筛选下拉（点触发器）并等待 Dropdown 进入展开态。 */
async function openFilter(container: HTMLElement) {
  fireEvent.click(triggerOf(container))
  await waitFor(() => {
    expect(container.querySelector('.ant-dropdown-open')).toBeTruthy()
  })
  return panel()
}

/** 点触发器关闭筛选下拉（filterOnClose 默认 true → 同时应用草稿）。 */
async function closeFilterByTrigger(container: HTMLElement) {
  fireEvent.click(triggerOf(container))
  await waitFor(() => {
    expect(container.querySelector('.ant-dropdown-open')).toBeFalsy()
  })
}

/** 点任意面板内按钮并等待下拉关闭（confirm(/clearFilters({closeDropdown:true})) 语义）。 */
async function clickAndWaitClose(container: HTMLElement, el: HTMLElement) {
  fireEvent.click(el)
  await waitFor(() => {
    expect(container.querySelector('.ant-dropdown-open')).toBeFalsy()
  })
}

/** 确保筛选下拉处于打开态（已开则不动），返回当前面板。 */
async function ensureOpen(container: HTMLElement) {
  if (!container.querySelector('.ant-dropdown-open')) {
    return openFilter(container)
  }
  return panel()
}

/** 当前渲染的数据行数（行的唯一 data-row-index）。 */
function rowCount(container: HTMLElement): number {
  return new Set(
    Array.from(container.querySelectorAll('.dg-cell-body')).map((c) =>
      c.getAttribute('data-row-index'),
    ),
  ).size
}

/**
 * 第一行**最左**数据格的文本（参照侧该用例断言的是 `.ant-table-tbody .ant-table-cell` 首格）。
 *
 * 为什么不用 `rowNames`：多级表头下 body 格的 `data-column-key` 是**路径拼接键**
 *   （如 `name.age`，见 `engine/columnTree.ts` 的 key 派生），按列名后缀取会漏；且 flat 路径的
 *   DOM 序在 multi 路径下也不等于列序。故按 `data-row-index` 分组 + 按 inline `grid-column`
 *   起点取最左格（与 `Table.sorter.test.tsx` 的 `renderedFirstCellTexts` 同法，P-066）。
 */
function firstRowFirstCellText(container: HTMLElement): string | null {
  const cells = Array.from(container.querySelectorAll<HTMLElement>('.dg-cell-body')).filter(
    (c) => c.getAttribute('data-row-index') === '0',
  )
  if (cells.length === 0) return null
  const startCol = (c: HTMLElement): number => {
    const raw = c.style.gridColumn ?? ''
    const n = Number.parseInt(raw.split(/[\s/]+/)[1] ?? '0', 10)
    return Number.isNaN(n) ? 0 : n
  }
  return [...cells].sort((a, b) => startCol(a) - startCol(b))[0]!.textContent
}

/** 某列逐行文本（分组列下 data-column-key 形如 `group.name`，故用后缀匹配）。 */
function rowNames(container: HTMLElement, columnKey = 'name'): Array<string | null> {
  return Array.from(
    container.querySelectorAll(`.dg-cell-body[data-column-key$="${columnKey}"]`),
  ).map((c) => c.textContent)
}

describe('Table.filter', () => {
  const warnSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

  afterAll(() => {
    warnSpy.mockRestore()
  })

  // antd L94：未声明 filters（且无 onFilter/filterDropdown）→ 不渲染漏斗。
  it('not show filter icon when undefined', () => {
    const noFilterColumn: any = { ...column, filters: undefined }
    delete noFilterColumn.onFilter
    const { container } = customRender(createTable({ columns: [noFilterColumn] }))

    // antd 断言 `.ant-table-filter-column` 数量为 0；data-grid 无该包裹元素，改断言触发器数量。
    expect(container.querySelectorAll('.dg-filter-trigger')).toHaveLength(0)
  })

  // antd L107：filters 与 filterDropdown 都 undefined → 不渲染漏斗。
  it('not show filter icon when filter and filterDropdown is undefined', () => {
    const noFilterColumn: any = {
      ...column,
      filters: undefined,
      filterDropdown: undefined,
    }
    delete noFilterColumn.onFilter
    const { container } = customRender(createTable({ columns: [noFilterColumn] }))

    expect(container.querySelectorAll('.dg-filter-trigger')).toHaveLength(0)
  })

  // antd L119：整表快照。
  it('renders filter correctly', () => {
    const { asFragment } = customRender(createTable())

    expectSnapshot(asFragment().firstChild)
  })

  // antd L126：打开后的筛选面板快照（antd 查 `.ant-table-filter-dropdown`）。
  it('renders menu correctly', async () => {
    const { container } = customRender(createTable())

    const p = await openFilter(container)

    expectSnapshot(p)
  })

  // antd L134：断言筛选面板包裹元素带 `role="presentation"` 且无 `aria-hidden`。
  // skip 依据：data-grid 的面板根节点（FilterBuiltinPanel.tsx:126-134）只输出
  //   className/data-multiple/data-filter-mode，既无 role 也无 aria-hidden——
  //   实测 `panel.getAttribute('role') === null`、`aria-hidden === null`（该 a11y 契约未实现）。
  it.skip('marks filter dropdown wrapper as presentation', () => {})

  // antd L146：filters 为空数组时面板显示空态（antd 查渲染容器内的 `.ant-empty`）。
  it('renders empty menu correctly', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const { container } = customRender(createTable({ columns: [{ ...column, filters: [] }] }))

      const p = await openFilter(container)

      // antd 断言 `.ant-empty` 存在 + 无 console.error；data-grid 空态在 `.dg-filter-dropdown-empty` 内。
      expect(p.querySelector('.dg-filter-dropdown-empty .ant-empty')).toBeTruthy()
    } finally {
      // antd 原口径：console.error 完全未被调用。
      // 此处曾被迫过滤掉 "same key" 警告（同文件带同值筛选项的用例会异步漏出 React 重复 key 警告），
      // 缺口 **#2 修复后**（FilterBuiltinPanel.tsx 两处 key 改为 value + 索引）污染源头消失，收窄已回收。
      expect(errorSpy.mock.calls).toHaveLength(0)
      errorSpy.mockRestore()
    }
  })

  // antd L172：单选（filterMultiple=false）面板快照。
  it('renders radio filter correctly', async () => {
    const { container } = customRender(
      createTable({ columns: [{ ...column, filterMultiple: false }] }),
    )

    const p = await openFilter(container)

    expectSnapshot(p)
  })

  // antd L189：自定义面板（节点形态）快照。
  it('renders custom content correctly', async () => {
    const filter = <div className="custom-filter-dropdown">custom filter</div>
    const { container } = customRender(
      createTable({ columns: [{ ...column, filterDropdown: filter }] }),
    )

    const p = await openFilter(container)

    expectSnapshot(p)
  })

  // antd L209：filterDropdown 显式 undefined + boolean 型 filters → 打开后首项被勾选。
  // antd 查 `.ant-dropdown-menu-item-selected`；data-grid 的勾选态落在 checkbox 上，故改断言 checked。
  it('should handle filterDropdown undefined correctly', async () => {
    const { container } = customRender(
      createTable({
        columns: [
          {
            ...column,
            filters: [
              { text: 'Boy', value: true },
              { text: 'Girl', value: false },
            ],
            filteredValue: [true],
            filterDropdown: undefined,
          },
        ],
      }),
    )
    const p = await openFilter(container)

    const first = p.querySelectorAll<HTMLElement>('.dg-filter-menu-item')[0]
    expect(first.textContent).toBe('Boy')
    expect(menuInputs(p)[0].checked).toBe(true)
  })

  // antd L232：自定义面板注入的 props（prefixCls/selectedKeys/setSelectedKeys/confirm/clearFilters）。
  // 差异：data-grid 应用筛选后弹层即卸载，antd 的弹层仍在 DOM；故每次操作前重新打开下拉。
  it('override custom filter correctly', async () => {
    let renderSelectedKeys: React.Key[] | null = null
    const filter = ({
      prefixCls,
      setSelectedKeys,
      selectedKeys,
      confirm,
      clearFilters,
    }: any): React.ReactNode => {
      renderSelectedKeys = selectedKeys

      return (
        <div className={`${prefixCls}-view`} id="customFilter">
          <span onClick={() => setSelectedKeys([42])} id="setSelectedKeys">
            setSelectedKeys
          </span>
          <span onClick={() => confirm?.()} id="confirm">
            Confirm
          </span>
          <span onClick={() => clearFilters?.()} id="reset">
            Reset
          </span>
          <span
            onClick={() => {
              setSelectedKeys([43])
            }}
            id="set43"
          >
            SimulateOnSelect
          </span>
        </div>
      )
    }

    const { container } = customRender(
      createTable({ columns: [{ ...column, filterDropdown: filter }] }),
    )

    // check if renderer well
    await openFilter(container)
    expectSnapshot(document.body.querySelector('#customFilter'))

    // try to use reset btn
    expect(renderSelectedKeys).toHaveLength(0)
    fireEvent.click(document.body.querySelector('#setSelectedKeys')!)
    fireEvent.click(document.body.querySelector('#confirm')!)
    expect(renderSelectedKeys).toEqual([42])

    // Reset
    await openFilter(container)
    fireEvent.click(document.body.querySelector('#reset')!)
    fireEvent.click(document.body.querySelector('#confirm')!)
    expect(renderSelectedKeys).toHaveLength(0)

    // try to use confirm btn
    await openFilter(container)
    fireEvent.click(document.body.querySelector('#setSelectedKeys')!)
    expect(container.querySelector('.ant-dropdown-open')).toBeTruthy()
    fireEvent.click(document.body.querySelector('#confirm')!)
    expect(renderSelectedKeys).toEqual([42])
    await waitFor(() => {
      expect(container.querySelector('.ant-dropdown-open')).toBeFalsy()
    })

    // Simulate onSelect, setSelectedKeys & confirm（data-grid：setSelectedKeys 与 confirm 分两次派发，
    //   同一 handler 内连续调用时 confirm 读到的是上一轮草稿——见文件末尾「疑似缺陷」说明）
    await openFilter(container)
    fireEvent.click(document.body.querySelector('#set43')!)
    fireEvent.click(document.body.querySelector('#confirm')!)
    expect(renderSelectedKeys).toEqual([43])
  })

  describe('filterDropdownOpen & filterDropdownVisible', () => {
    function test(propName: string) {
      // antd L309（L338/339 调用两次 → 2 条名义行）：
      // **退化重复行（BAT-0 0-E B31，据步骤 51 §2 P-D）**：上游 `Table.filter.test.tsx`
      //   （6.5.2 与 6.4.4 两版）的 `function test(propName)` **体内从不使用 `propName`**——
      //   两条用例除名字外逐字节相同 ⇒ 实为 **1 个行为、2 条名义行**；此处保留 2 行**不合并**
      //   （合并会破坏名义 1:1 对齐；见 51-analyst-denominator-integrity.md §2 P-D）。
      // **字段两版生产码都不存在（BAT-0 0-E 独立复验，勿抄旧读数）**：
      //   已安装 antd **6.4.4** `es/**` 全库 **0 命中**（连类型声明都没有，
      //   `Select-String -Pattern 'filterDropdownVisible'` over `node_modules/antd/es/**`）；
      //   上游 6.5.2 工作树与 6.4.4 tag 的 `components/` 各只有**测试件自身 2 处**
      //   （`Table.filter.test.tsx:307` describe 名 ＋ `:339` 调用行）⇒ 这两行**永远无法与
      //   参照对齐**，只在分母里按名义 1:1 计（文件头部分母对账行）。
      // data-grid 不提供 `column.filterDropdownOpen`（src/docs/pages/deprecated-antd-members.tsx:60-65
      //   「不提供」；`filterDropdownVisible` 未登该表——它本来就不存在，谈不上弃用），
      //   等价受控路径是 `column.filterDropdownProps.open`——该路径由本文件
      //   `if the filter is visible it should ignore the selectedKeys changes`（antd L342）直测覆盖。
      it.skip(`can be controlled by ${propName}`, () => {})
    }

    test('filterDropdownOpen')
    test('filterDropdownVisible')
  })

  // antd L342：下拉可见期间外部 dataSource 变化不改变已勾选草稿 + 应用后行数变化。
  // data-grid：用受支持字段 `filterDropdownProps.open` 复现「受控打开」。
  it('if the filter is visible it should ignore the selectedKeys changes', async () => {
    const myColumn = {
      title: 'Name',
      dataIndex: 'name',
      filters: [{ text: 'J', value: 'J' }],
      onFilter: (value: any, record: any) => record.name.includes(value),
    }

    const tableProps = {
      columns: [{ ...myColumn, filterDropdownProps: { open: true } }],
    }

    const { container, rerender } = customRender(createTable(tableProps))

    await waitFor(() => {
      expect(container.querySelector('.ant-dropdown-open')).toBeTruthy()
    })
    const checkboxList = panel().querySelectorAll<HTMLInputElement>('.dg-filter-menu-item input')
    expect(checkboxList.length).toBeTruthy()
    checkboxList.forEach((checkbox) => {
      expect(checkbox.checked).toBeFalsy()
    })

    fireEvent.click(checkboxList[0])
    fireEvent.click(confirmButton())

    await waitFor(() => {
      expect(rowCount(container)).toBe(2)
    })

    rerender(
      createTable({
        ...tableProps,
        dataSource: [...data, { key: 999, name: 'Jason' }],
      }),
    )
    expect(rowCount(container)).toBe(3)
  })

  // antd L393：打开/关闭回调。data-grid 消费 `filterDropdownProps.onOpenChange`；
  //   过时字段 `onFilterDropdownOpenChange` 不消费（deprecated-antd-members.tsx:66-72），此处一并实测断言。
  it('fires change event when visible change', async () => {
    const onFilterDropdownOpenChange = vi.fn()
    const onOpenChange = vi.fn()
    const { container } = customRender(
      createTable({
        columns: [
          {
            ...column,
            filterDropdownProps: {
              onOpenChange,
            },
            onFilterDropdownOpenChange,
          },
        ],
      }),
    )
    await openFilter(container)

    expect(onOpenChange).toHaveBeenCalledWith(true)
    expect(onFilterDropdownOpenChange).not.toHaveBeenCalled()
  })

  // antd L414：受控 filteredValue（有值 / 空数组）。
  it('can be controlled by filteredValue', async () => {
    const { container, rerender } = customRender(
      createTable({
        columns: [
          {
            ...column,
            filteredValue: ['Lucy'],
          },
        ],
      }),
    )

    expect(rowCount(container)).toBe(1)

    rerender(
      createTable({
        columns: [
          {
            ...column,
            filteredValue: [],
          },
        ],
      }),
    )

    expect(rowCount(container)).toBe(4)
  })

  // antd L442：filteredValue 混类型 / null。
  // 差异：antd 把 boolean 值字符串化后传给 onFilter（'true'）；data-grid 传原始值（实测 ['Lucy', 12, true]）。
  it('should handle filteredValue and non-array filterValue as expected', () => {
    let filterKeys = new Set<any>()

    const { rerender } = customRender(
      createTable({
        columns: [
          {
            ...column,
            filteredValue: ['Lucy', 12, true],
            onFilter: (value: any) => {
              filterKeys.add(value)
              return false
            },
          },
        ],
      }),
    )

    expect(Array.from(filterKeys)).toEqual(['Lucy', 12, true])

    filterKeys = new Set()
    rerender(
      createTable({
        columns: [
          {
            ...column,
            filteredValue: null,
            onFilter: (value: any) => {
              filterKeys.add(value)
              return true
            },
          },
        ],
      }),
    )
    expect(Array.from(filterKeys)).toHaveLength(0)
  })

  // antd L480：受控 filteredValue 置 null → 清除筛选。
  it('can be controlled by filteredValue null', async () => {
    const { container, rerender } = customRender(
      createTable({
        columns: [
          {
            ...column,
            filteredValue: ['Lucy'],
          },
        ],
      }),
    )

    expect(rowCount(container)).toBe(1)

    rerender(
      createTable({
        columns: [
          {
            ...column,
            filteredValue: null,
          },
        ],
      }),
    )

    expect(rowCount(container)).toBe(4)
  })

  // antd L509：受控 filteredValue 决定勾选态（含 number/false 取值 + 不在 filters 中的值）。
  it('render checked of checkbox correctly controlled by filteredValue', async () => {
    for (const val of ['Lucy', 23, false] as any[]) {
      const { container, unmount } = customRender(
        createTable({
          columns: [
            {
              ...column,
              filters: [{ text: val, value: val }],
              filteredValue: [val],
            },
          ],
        }),
      )

      await openFilter(container)
      expect(menuInputs()[0].checked).toBe(true)
      unmount()
    }

    const { container, unmount } = customRender(
      createTable({
        columns: [
          {
            ...column,
            filters: [{ text: 'ant', value: 'ant' }],
            filteredValue: ['any-value-not-exists-in-filters'],
          },
        ],
      }),
    )
    await openFilter(container)

    expect(menuInputs()[0]?.checked).toBe(false)
    unmount()
  })

  // antd L551：defaultFilteredValue 初值 + 后续变化被忽略 + 被 filteredValue 覆盖。
  it('can read defaults from defaultFilteredValue', () => {
    const { container, rerender } = customRender(
      createTable({
        columns: [
          {
            ...column,
            defaultFilteredValue: ['Lucy'],
          },
        ],
      }),
    )
    expect(rowCount(container)).toBe(1)
    expect(rowNames(container)[0]).toBe('Lucy')

    // Should properly ignore further defaultFilteredValue changes
    rerender(
      createTable({
        columns: [
          {
            ...column,
            defaultFilteredValue: [],
          },
        ],
      }),
    )

    expect(rowCount(container)).toBe(1)
    expect(rowNames(container)[0]).toBe('Lucy')

    // Should properly be overridden by non-null filteredValue
    rerender(
      createTable({
        columns: [
          {
            ...column,
            defaultFilteredValue: ['Lucy'],
            filteredValue: ['Tom'],
          },
        ],
      }),
    )
    expect(rowCount(container)).toBe(1)
    expect(rowNames(container)[0]).toBe('Tom')

    // Should properly be overridden by a null filteredValue
    rerender(
      createTable({
        columns: [
          {
            ...column,
            defaultFilteredValue: ['Lucy'],
            filteredValue: null,
          },
        ],
      }),
    )
    expect(rowCount(container)).toBe(4)
  })

  // antd L610：defaultFilteredValue + 树形数据（children 逐层过滤）。
  // 缺口 #6a 已修：`computeFilteredDataSource` 增 `childrenColumnName` 入参并逐层递归
  //   （src/table/engine/filterUtils.ts）；`useFilter` 透传该值，`Table.tsx` 把
  //   childrenColumnName 的派生上移到 useFilter 调用之前。
  // 语义（**BAT-18 校正为自底向上**，对齐 antd `useFilter/index.js:133-144`）：先把该行的 children
  //   递归滤完，再拿「children 已被替换」的行去过 `onFilter`；判定不通过则整行连同其已滤子树一起丢弃。
  //   本用例两种顺序同解（Jack 至少剩下 Jim 一个子行）→ 实测 3 行 ['Jack','Jim','Tom']，与 antd 一致。
  it('can filter children by defaultFilteredValue', () => {
    const { container } = customRender(
      createTable({
        columns: [
          {
            ...column,
            defaultFilteredValue: ['Jim', 'Tom'],
            onFilter: (value: any, record: any) => {
              if (record.children?.length) {
                return true
              }
              return record.name.includes(value)
            },
          },
        ],
        dataSource: [
          {
            key: '0',
            name: 'Jack',
            children: [
              { key: '0-1', name: 'Jim' },
              { key: '0-2', name: 'Tony' },
            ],
          },
          { key: '1', name: 'Lucy' },
          { key: '2', name: 'Tom' },
          { key: '3', name: 'Jerry' },
        ],
        expandable: {
          defaultExpandAllRows: true,
        },
      }),
    )

    expect(rowNames(container)).toEqual(['Jack', 'Jim', 'Tom'])
    expect(rowCount(container)).toBe(3)
  })

  // ---- BAT-18（E-118）树形递归筛选的**求值顺序**补充直测（超出 antd 逐条对齐的 90 条）----
  // 参照 `node_modules/antd/es/table/hooks/useFilter/index.js:133-144`：
  //   const clonedRecord = { ...record };
  //   if (clonedRecord[childrenColumnName]) { clonedRecord[childrenColumnName] = getFilterData(...) }  // ① 先滤子层
  //   if (realKeys.some(k => onFilter(k, clonedRecord))) acc.push(clonedRecord)                          // ② 再判定、③ 不过则整行丢
  // 并排参照读数（live oracle + 双侧活体 DOM）来自一次性探针 `tmp/probe-bat18.test.tsx`
  //   （18 条纯函数例 + 13 条 DOM 例，落盘 tmp/vortex-logs/fix-real-bugs/17-evidence-bat18-probe-{before,after}.log）。
  // 改前分叉：探针 A2/D1（谁都匹配不了）dg=['Jack'] antd=[]；A9/D6（3 层深层命中）dg 多留一行空的 Mid1；
  //   A10/A11/A12/A14/A15/A17/A18 同类（子行全灭的中间层被留下）。改后 31 例逐值一致。

  /** 树形数据集（childrenKey 可换成 `expandable.childrenColumnName` 的改名字段）。 */
  function treeRows(childrenKey: string, level: 2 | 3) {
    const row = (name: string, key: string, kids: Array<any> = []) => ({
      key,
      name,
      ...(kids.length > 0 ? { [childrenKey]: kids } : {}),
    })
    if (level === 2) {
      // Jack[Jim,Tony] / Lucy / Tom / Jerry（与 antd L610 同款）
      return [
        row('Jack', '0', [row('Jim', '0-1'), row('Tony', '0-2')]),
        row('Lucy', '1'),
        row('Tom', '2'),
        row('Jerry', '3'),
      ]
    }
    // Root[Mid1[Tony,Joe], Mid2[Jim]] / Lucy
    return [
      row('Root', '0', [
        row('Mid1', '0-0', [row('Tony', '0-0-0'), row('Joe', '0-0-1')]),
        row('Mid2', '0-1', [row('Jim', '0-1-0')]),
      ]),
      row('Lucy', '1'),
    ]
  }

  /**
   * 顺序敏感的 onFilter（antd L610 的形状）：行带非空子行就放行。
   * 自底向上时它读到的是**已过滤**的子行 → 子行全灭会连带把父行判掉；自顶向下读到原始子行 → 父行留下。
   */
  const childrenAwareFilter =
    (childrenKey = 'children') =>
    (value: any, record: any) =>
      record[childrenKey]?.length ? true : record.name.includes(value)

  // 方向敏感例①：一个谁都匹配不了的值 → 参照 antd 得零行（探针 A2/D1：修前 dg 留 ['Jack'] + 空 children）。
  it('keeps no parent when the whole subtree is filtered out (bottom-up order)', () => {
    const { container } = customRender(
      createTable({
        columns: [
          {
            ...column,
            filters: [{ text: 'Zz', value: 'Zz' }],
            defaultFilteredValue: ['Zz'],
            onFilter: childrenAwareFilter(),
          },
        ],
        dataSource: treeRows('children', 2),
        expandable: { defaultExpandAllRows: true },
      }),
    )

    expect(rowNames(container)).toEqual([])
    expect(rowCount(container)).toBe(0)
  })

  // 方向敏感例②：3 层只有最深层命中 → 子行全灭的中间层整行消失（探针 A9/D6：修前 dg 多留 ['Mid1']）。
  it('drops an intermediate row whose children are all filtered out (3 levels)', () => {
    const { container } = customRender(
      createTable({
        columns: [
          {
            ...column,
            filters: [{ text: 'Jim', value: 'Jim' }],
            defaultFilteredValue: ['Jim'],
            onFilter: childrenAwareFilter(),
          },
        ],
        dataSource: treeRows('children', 3),
        expandable: { defaultExpandAllRows: true },
      }),
    )

    expect(rowNames(container)).toEqual(['Root', 'Mid2', 'Jim'])
    expect(rowCount(container)).toBe(3)
  })

  // 保留判据：子行命中**不能**救回不命中的父行（父行落选时其已过滤子树整体消失）。
  // 两种顺序同解（探针 A4/D3：dg 与 antd 都是零行），登记为对照组。
  it('does not rescue a non-matching parent when only its child matches', () => {
    const { container } = customRender(
      createTable({
        columns: [
          { ...column, filters: [{ text: 'Jim', value: 'Jim' }], defaultFilteredValue: ['Jim'] },
        ],
        dataSource: treeRows('children', 2),
        expandable: { defaultExpandAllRows: true },
      }),
    )

    expect(rowNames(container)).toEqual([])
    expect(rowCount(container)).toBe(0)
  })

  // `filterMultiple: false` 只改单选 UI，数据层判据不变：单选一个谁都匹配不了的值 → 零行。
  // （探针 A14/D9：dg 与 antd 都是 []；修前 dg 留 ['Jack']。）
  it('keeps no parent when single-select filter matches nothing', () => {
    const { container } = customRender(
      createTable({
        columns: [
          {
            ...column,
            filters: [{ text: 'Zz', value: 'Zz' }],
            defaultFilteredValue: ['Zz'],
            filterMultiple: false,
            onFilter: childrenAwareFilter(),
          },
        ],
        dataSource: treeRows('children', 2),
        expandable: { defaultExpandAllRows: true },
      }),
    )

    expect(rowNames(container)).toEqual([])
    expect(rowCount(container)).toBe(0)
  })

  // 改名后的 `expandable.childrenColumnName` 同样自底向上递归（探针 A18/D13：dg 与 antd 都是
  //   ['Root','Mid2','Jim']；修前 dg 多留空的 Mid1）。
  it('filters a renamed childrenColumnName bottom-up (3 levels)', () => {
    const { container } = customRender(
      createTable({
        columns: [
          {
            ...column,
            filters: [{ text: 'Jim', value: 'Jim' }],
            defaultFilteredValue: ['Jim'],
            onFilter: childrenAwareFilter('subNodes'),
          },
        ],
        dataSource: treeRows('subNodes', 3),
        expandable: { childrenColumnName: 'subNodes', defaultExpandAllRows: true },
      }),
    )

    expect(rowNames(container)).toEqual(['Root', 'Mid2', 'Jim'])
    expect(rowCount(container)).toBe(3)
  })

  // antd L652：应用筛选后 onChange 的参数。（data-grid 未开分页时 pagination 为
  //   {current,pageSize,total}，antd 为 {}。）
  it('fires change event', async () => {
    const handleChange = vi.fn()
    const { container } = customRender(createTable({ onChange: handleChange }))
    await openFilter(container)
    fireEvent.click(menuInputs()[0])
    fireEvent.click(confirmButton())

    expect(handleChange).toHaveBeenCalledWith(
      { current: 1, pageSize: 4, total: 4 },
      { name: ['boy'] },
      {},
      {
        currentDataSource: [],
        action: 'filter',
      },
    )
  })

  // antd L673（规约源 = 上游 checkout **6.5.2** 的 `components/table/__tests__/Table.filter.test.tsx:673`）：
  //   筛选后应触发 `pagination.onChange(1, 10)`。
  // 原 skip 依据「`pagination.onChange` 只由分页器 UI 触发（`usePagination.ts:108-134`）、点 OK 后调用次数为 0」
  //   **对现码为假** ⇒ 步骤 75 转直测（分页复位落地在 `usePaginationAdapter.ts:160-178` 的 `fireTableChange`：
  //   `shouldResetPagination(extra.action)` 为真时 `paginationConfig.onChange?.(1, base.pageSize)`；
  //   判据见 `src/table/engine/usePagination.ts:40-44`，只有 `'filter'` 复位）。
  // 裁判侧（已安装 **antd 6.4.4**）同形：`es/table/InternalTable.js:180-205` 的 `triggerOnChange(info, action, reset)`
  //   在 reset 分支里 `if (pagination) pagination.onChange?.(1, changeInfo.pagination?.pageSize)`，
  //   筛选侧调用点 `:232-237` 传 `reset = true`；上游 spec **6.5.2** `components/table/InternalTable.tsx:408-441`
  //   与 6.4.4 逐行同构 ⇒ **不是版本条件性分叉**。
  // 双侧读数（`tmp/75-probe-raw4.log` E1/E8）：两臂都恰好 1 次、参数 `[1,10]`；
  //   非 vacuous 对照 = **同一构造下改点排序**，两臂都 0 次 ⇒ 本条钉的不是"任何变更都复位"。
  it('fires pagination change event', async () => {
    // --- data-grid 臂 ---
    const onDgPaginationChange = vi.fn()
    const dg = customRender(createTable({ pagination: { onChange: onDgPaginationChange } }))
    const dgPanelNode = await openFilter(dg.container)
    const dgInputs = Array.from(
      dgPanelNode.querySelectorAll<HTMLInputElement>('.dg-filter-menu-item input'),
    )
    // P-102：点了不存在的目标会"过度自洽" ⇒ 读数前先断言目标在场
    expect(dgInputs.length).toBeGreaterThan(0)
    fireEvent.click(dgInputs[0])
    fireEvent.click(confirmButton())
    expect(onDgPaginationChange.mock.calls).toEqual([[1, 10]])
    dg.unmount()

    // --- 裁判臂：已安装 antd 6.4.4（同一次配置）---
    // P-112：本仓测试环境下参照面板 portal 到 document.body（容器内计数 0），故每步现取。
    const onRefPaginationChange = vi.fn()
    const ref = customRender(
      <AntdTable
        columns={[column]}
        dataSource={data}
        pagination={{ onChange: onRefPaginationChange }}
      />,
    )
    const refPanelRoot = () => {
      const all = document.body.querySelectorAll<HTMLElement>('.ant-table-filter-dropdown')
      return all[all.length - 1]
    }
    fireEvent.click(ref.container.querySelector<HTMLElement>('.ant-dropdown-trigger')!)
    await waitFor(() => expect(ref.container.querySelector('.ant-dropdown-open')).toBeTruthy())
    const refItems = Array.from(refPanelRoot().querySelectorAll<HTMLElement>('.ant-dropdown-menu-item'))
    expect(refItems.length).toBeGreaterThan(0) // P-102
    fireEvent.click(refItems[0])
    fireEvent.click(
      refPanelRoot().querySelector<HTMLElement>(
        '.ant-table-filter-dropdown-btns .ant-btn-color-primary.ant-btn-variant-solid',
      )!,
    )
    expect(onRefPaginationChange.mock.calls).toEqual([[1, 10]])

    // --- 非 vacuous 对照：同一构造下**排序**不得复位分页（两臂都必须 0 次）---
    const sortableColumn = {
      ...column,
      sorter: (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name),
    }
    const onDgSortPaginationChange = vi.fn()
    const onRefSortPaginationChange = vi.fn()
    const handleDgSortChange = vi.fn()
    const handleRefSortChange = vi.fn()
    const dgSort = customRender(
      createTable({
        columns: [sortableColumn],
        dataSource: data,
        pagination: { onChange: onDgSortPaginationChange },
        onChange: handleDgSortChange,
      }),
    )
    const refSort = customRender(
      <AntdTable
        columns={[sortableColumn]}
        dataSource={data}
        pagination={{ onChange: onRefSortPaginationChange }}
        onChange={handleRefSortChange}
      />,
    )
    const dgSorters = dgSort.container.querySelectorAll<HTMLElement>('.dg-column-has-sorters')
    const refSorters = refSort.container.querySelectorAll<HTMLElement>('.ant-table-column-sorters')
    expect(dgSorters.length).toBeGreaterThan(0) // P-102
    expect(refSorters.length).toBeGreaterThan(0) // P-102
    fireEvent.click(dgSorters[0])
    fireEvent.click(refSorters[0])
    // 先自证"这一下点出去了、排序真的跑了"（否则下面的 0 次是空档，不是对照）：
    // 两侧 table 级 onChange 都必须各收到一次、且 extra.action === 'sort'
    //（`tmp/75-probe-raw4.log` E8：两臂都是 `[payload,'sort']`，1 次。
    //  摘码反证 F2 实测：把这两下点掉 ⇒ 本组断言红，见步骤 75 日志 §5）
    expect(handleDgSortChange).toHaveBeenCalledTimes(1)
    expect(handleRefSortChange).toHaveBeenCalledTimes(1)
    expect(handleDgSortChange.mock.calls[0][3]?.action).toBe('sort')
    expect(handleRefSortChange.mock.calls[0][3]?.action).toBe('sort')
    // 复位只属于 filter：排序不得打 pagination.onChange（两臂都必须 0 次）
    expect(onDgSortPaginationChange.mock.calls).toEqual([])
    expect(onRefSortPaginationChange.mock.calls).toEqual([])
    dgSort.unmount()
    ref.unmount()
    refSort.unmount()
  })

  // antd L686 / L699：草稿无变化时关闭下拉不应触发 onChange。
  // 缺口 #5 已修：`useFilter.setFilterValue` 加了等值守卫（src/table/engine/useFilter.ts）——
  //   规范化后的新值与该列当前激活值逐项相等（原始值按值、对象按引用，与 normalizeFilteredValue
  //   同一把尺 `isSameFilteredValueList`）时整体跳过，既不写内部 state 也不派发 onFilterChange。
  //   对齐 antd `useFilter/FilterDropdown.js:188-199` internalTriggerFilter 的 isEqual 判定；
  //   守卫落在 useFilter 而非 FilterDropdown：OK / 关闭下拉（filterOnClose）/ clearFilters
  //   三条路径都汇流到 setFilterValue。实测（探针）：点 OK 后 onChange 调用次数 0。
  it('should not fire change event when close filterDropdown without changing anything', async () => {
    const handleChange = vi.fn()
    const { container } = customRender(createTable({ onChange: handleChange }))

    await openFilter(container)
    fireEvent.click(confirmButton())
    await waitFor(() => {
      expect(container.querySelector('.ant-dropdown-open')).toBeFalsy()
    })
    expect(handleChange).not.toHaveBeenCalled()
  })
  // 同上（antd L699，已筛选态：草稿初值 = defaultFilteredValue，点 OK 等于无变化）。
  it('should not fire change event when close a filtered filterDropdown without changing anything', async () => {
    const handleChange = vi.fn()
    const { container } = customRender(
      createTable({
        onChange: handleChange,
        columns: [
          {
            ...column,
            defaultFilteredValue: ['boy', 'designer'],
          },
        ],
      }),
    )

    await openFilter(container)
    fireEvent.click(confirmButton())
    await waitFor(() => {
      expect(container.querySelector('.ant-dropdown-open')).toBeFalsy()
    })
    expect(handleChange).not.toHaveBeenCalled()
  })

  // antd L721：三级嵌套筛选菜单（hover 展开 submenu 后取最深一层）。
  // skip 依据：data-grid menu 模式把 filters（含 children）**扁平化**为同级勾选项，
  //   不渲染二级/三级菜单 UI（src/table/engine/filterDropdownUtils.ts:21-31 flattenFilterItems；
  //   src/table/compat/filter.ts:89-92 children 字段注释「menu 模式保留字段但不消费 UI」）。
  //   层级仅在 `filterMode: 'tree'` 下可见（见本文件 filter tree mode 各用例）。
  it.skip('three levels menu', () => {})

  describe('should support value types', () => {
    const filterKeys = new Set()
    ;[
      ['Light', 93],
      ['Bamboo', false],
    ].forEach(([text, value]) => {
      // antd L796（forEach 两项 → 2 条用例）：boolean / number 取值可正常勾选、应用、回传。
      it(`${typeof value} type`, async () => {
        const onChange = vi.fn()
        const filters = [{ text, value }]
        const { container } = customRender(
          createTable({
            columns: [
              {
                ...column,
                filters,
                onFilter: (val: any) => {
                  expect(val).toBe(value)
                  filterKeys.add(val)
                  return false
                },
              },
            ],
            onChange,
          }),
        )

        const p = await openFilter(container)

        fireEvent.click(p.querySelectorAll('.dg-filter-menu-item input')[0])

        // data-grid 应用后弹层卸载，故勾选态在点 OK 之前断言（antd 在点 OK 之后断言）。
        expect(
          p.querySelectorAll<HTMLInputElement>('.ant-checkbox-input')[0].checked,
        ).toBe(true)

        fireEvent.click(confirmButton())
        await waitFor(() => {
          expect(container.querySelector('.ant-dropdown-open')).toBeFalsy()
        })

        expect(typeof Array.from(filterKeys)[0]).toBe('number')

        expect(Array.from(filterKeys).length > 0).toBeTruthy()

        onChange.mock.calls.forEach(([, currentFilters]: any[]) => {
          const [, val] = Object.entries(currentFilters)[0]
          expect(val).toEqual([value])
        })

        // Another time of Filter show
        const p2 = await openFilter(container)
        fireEvent.click(p2.querySelectorAll('.dg-filter-menu-item input')[0])

        expect(p2.querySelectorAll<HTMLInputElement>('.ant-checkbox-input')[0].checked).toBe(false)
      })
    })
  })

  // antd L858：JSX 风格（Column）+ 受控 filteredValue 的完整交互。
  // 差异：重置按钮不是 `.ant-btn-link` 而是 btns 内第 1 个 default 按钮（FilterBuiltinPanel.tsx:255-262）。
  it('works with JSX in controlled mode', async () => {
    const App: React.FC = () => {
      const [filters, setFilters] = useState<{ name?: any }>({})
      const handleChange: any = (_: any, filter: any) => {
        setFilters(filter)
      }
      return (
        <Table dataSource={data} onChange={handleChange}>
          <Column
            title="name"
            dataIndex="name"
            key="name"
            onFilter={filterFn}
            filteredValue={filters.name}
            filters={[
              { text: 'Jack', value: 'Jack' },
              { text: 'Lucy', value: 'Lucy' },
            ]}
          />
        </Table>
      )
    }

    const { container } = customRender(<App />)

    const p = await openFilter(container)
    expect(container.querySelector('.ant-dropdown-open')).toBeTruthy()

    fireEvent.click(menuInputs(p)[0])
    await clickAndWaitClose(container, confirmButton(p))
    await waitFor(() => {
      expect(rowNames(container)).toEqual(['Jack'])
    })
    expect(container.querySelector('.ant-dropdown-open')).toBeFalsy()

    const p2 = await openFilter(container)
    fireEvent.click(resetButton(p2))

    expect(container.querySelector('.ant-dropdown-open')).toBeTruthy()
    expect(rowNames(container)).toEqual(['Jack'])

    await clickAndWaitClose(container, confirmButton())
    await waitFor(() => {
      expect(rowNames(container)).toEqual(['Jack', 'Lucy', 'Tom', 'Jerry'])
    })
    expect(container.querySelector('.ant-dropdown-open')).toBeFalsy()
  })

  // antd L911：分组列 + 受控 filteredValue。
  it('works with grouping columns in controlled mode', () => {
    const columns = [
      {
        title: 'group',
        key: 'group',
        children: [
          {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            filters: [
              { text: 'Jack', value: 'Jack' },
              { text: 'Lucy', value: 'Lucy' },
            ],
            onFilter: filterFn,
            filteredValue: ['Jack'],
          },
          {
            title: 'Age',
            dataIndex: 'age',
            key: 'age',
          },
        ],
      },
    ]
    const testData = [
      { key: 0, name: 'Jack', age: 11 },
      { key: 1, name: 'Lucy', age: 20 },
      { key: 2, name: 'Tom', age: 21 },
      { key: 3, name: 'Jerry', age: 22 },
    ]
    const { container } = customRender(<Table columns={columns as any} dataSource={testData} />)

    // 分组列下叶子列的 data-column-key 为 `group.name`，rowNames 用后缀匹配。
    expect(rowNames(container)).toEqual(['Jack'])
  })

  // antd L948：点触发器关闭（filterOnClose 默认 true）即应用草稿。
  it('confirm filter when dropdown hidden', async () => {
    const handleChange = vi.fn()
    const { container } = customRender(
      createTable({
        columns: [
          {
            ...column,
            filters: [
              { text: 'Jack', value: 'Jack' },
              { text: 'Lucy', value: 'Lucy' },
            ],
          },
        ],
        onChange: handleChange,
      }),
    )
    const p = await openFilter(container)
    fireEvent.click(menuInputs(p)[0])
    await closeFilterByTrigger(container)

    expect(handleChange).toHaveBeenCalled()
    expect(handleChange.mock.calls[0][3].currentDataSource.length).toBe(1)
  })

  // antd L972：自定义漏斗图标（函数形态，收到 filtered 布尔）。
  it('renders custom filter icon correctly', async () => {
    const filterIcon = (filtered: boolean): React.ReactNode => (
      <span className="customize-icon">{filtered ? 'filtered' : 'unfiltered'}</span>
    )
    const { container } = customRender(
      createTable({
        columns: [
          {
            ...column,
            filterIcon,
          },
        ],
      }),
    )
    const p = await openFilter(container)
    fireEvent.click(menuInputs(p)[0])
    await closeFilterByTrigger(container)
    expectSnapshot(container.querySelector('.customize-icon'))
  })

  // antd L992：filterIcon 返回字符串。
  it('renders custom filter icon as string correctly', () => {
    const filterIcon = () => 'string'
    const { asFragment } = customRender(
      createTable({
        columns: [
          {
            ...column,
            filterIcon,
          },
        ],
      }),
    )
    expectSnapshot(asFragment().firstChild)
  })

  // antd L1007：filterIcon 内含 Tooltip（默认 title 提示）。
  it('renders custom filter icon with right Tooltip title', () => {
    const filterIcon = () => (
      <Tooltip title="title" open>
        Tooltip
      </Tooltip>
    )
    const { asFragment } = customRender(
      createTable({
        columns: [
          {
            ...column,
            filterIcon,
          },
        ],
      }),
    )
    expectSnapshot(asFragment().firstChild)
  })

  // antd L1026：filterIcon 传 ReactNode。
  it('renders custom filter icon as ReactNode', () => {
    const filterIcon = <span className="customize-icon" />
    const { container, asFragment } = customRender(
      createTable({
        columns: [
          {
            ...column,
            filterIcon,
          },
        ],
      }),
    )
    expectSnapshot(asFragment().firstChild)
    expect(container.querySelector('span.customize-icon')).toBeTruthy()
  })

  // antd L1043（issue #13028）：自定义面板内的受控输入随 selectedKeys 同步，应用并重开后清空。
  it('reset dropdown filter correctly', async () => {
    const Demo: React.FC = () => {
      const [name, setName] = useState<any>()
      const onChange = () => {
        setName('' as any)
      }
      return createTable({
        onChange,
        columns: [
          {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            filteredValue: name,
            filterDropdown: ({ setSelectedKeys, selectedKeys, confirm }: any) => (
              <div>
                <Input
                  value={selectedKeys[0]}
                  onChange={(e) => {
                    setSelectedKeys(e.target.value ? [e.target.value] : [])
                  }}
                />
                <Button className="confirm-btn" onClick={() => confirm()}>
                  Confirm
                </Button>
              </div>
            ),
          },
        ],
      })
    }

    const { container } = customRender(<Demo />)
    const customInput = () =>
      document.body.querySelector('.dg-filter-dropdown-custom input') as HTMLInputElement

    await openFilter(container)
    fireEvent.change(customInput(), { target: { value: 'test' } })
    expect(customInput().value).toBe('test')
    // antd 用 `container.querySelector('.ant-btn')`；data-grid 自定义面板内只有用户节点，
    // 故按 `.dg-filter-dropdown-custom` 定位其按钮。
    await clickAndWaitClose(
      container,
      document.body.querySelector('.dg-filter-dropdown-custom .ant-btn')!,
    )
    await openFilter(container)
    expect(customInput().value).toBe('')
  })

  // antd L1083（issue #17833）：自定义面板失焦/关闭时**不应**触发 onChange。
  // 直测依据（步骤 57 探针 57 V-1a，`已运行`，双侧并排 vs 已安装 **antd 6.4.4**）：
  //   参照 `es/table/hooks/useFilter/FilterDropdown.js:247` 的门 ② `!column.filterDropdown && filterOnClose`
  //   ⇒ **自定义面板从不因"关闭"而应用草稿**。参照读数 `onChange=0`、可见行 4 行不变；
  //   我方修复前读数 `onChange=1`、`filters={name:['whatevervalue']}`、可见行 **0 行**（未确认的值静默生效）。
  //   修复＝`src/table/engine/FilterDropdown.tsx` 的 `handleOpenChange` 关闭分支加 `!isCustom`。
  it('should not trigger onChange when blurring custom filterDropdown', async () => {
    const onChange = vi.fn()
    const filterDropdown = ({ setSelectedKeys }: any) => (
      <input onChange={(e) => setSelectedKeys([(e.target as HTMLInputElement).value])} />
    )
    const { container } = customRender(
      createTable({
        onChange,
        columns: [
          {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            onFilter: filterFn,
            filterDropdown,
          },
        ],
      }),
    )
    await openFilter(container)
    fireEvent.change(document.body.querySelector('.dg-filter-dropdown-custom input')!, {
      target: { value: 'whatevervalue' },
    })
    // 不点确定，直接点触发器关闭（上游件用「再点一次触发器」模拟失焦）。
    await closeFilterByTrigger(container)
    expect(onChange).not.toHaveBeenCalled()
    // 数据面（探针里参照的可见行＝全部 4 行）：未确认的草稿不许把表体筛空。
    expect(rowNames(container)).toEqual(['Jack', 'Lucy', 'Tom', 'Jerry'])
  })

  // 补充钉（步骤 57 探针 V-1d，`已运行`）：自定义面板的后果**有两种**，上一条只钉了第一种。
  //   面板调引擎给的 `clearFilters()`（不传 `confirm`）后关闭 ⇒ 参照 `onChange=0`、已生效筛选 ['Jack'] 保留；
  //   修复前我方 `onChange=1`、`filters={name:null}`、**4 行全回来**（把用户已有的筛选清空了）。
  it('does not drop the applied filter when a custom filterDropdown calls clearFilters() and closes', async () => {
    const onChange = vi.fn()
    const filterDropdown = ({ clearFilters }: any) => (
      <button type="button" className="clear-btn" onClick={() => clearFilters()}>
        clear
      </button>
    )
    const { container } = customRender(
      createTable({
        onChange,
        columns: [
          {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            onFilter: filterFn,
            defaultFilteredValue: ['Jack'],
            filterDropdown,
          },
        ],
      }),
    )
    expect(rowNames(container)).toEqual(['Jack'])
    await openFilter(container)
    fireEvent.click(document.body.querySelector('.dg-filter-dropdown-custom .clear-btn')!)
    await closeFilterByTrigger(container)
    expect(onChange).not.toHaveBeenCalled()
    expect(rowNames(container)).toEqual(['Jack'])
  })

  // 负例钉（步骤 57 探针 V-3a，`已运行`，两侧读数本就一致）：
  //   门 ② **只挡自定义面板**——内置面板在默认 `filterOnClose`（true）下关闭**照旧应用**。
  //   这条防的是"修过头"：把关闭语义整体改成丢弃，就会重新造出"我们比参照保守"的新分叉
  //   （参照 `:247` 的 `filterOnClose` 那一半仍然对内置面板生效）。
  it('still applies the draft when the builtin panel closes with default filterOnClose', async () => {
    const onChange = vi.fn()
    const { container } = customRender(
      createTable({
        onChange,
        columns: [
          {
            ...column,
            filters: [
              { text: 'Jack', value: 'Jack' },
              { text: 'Lucy', value: 'Lucy' },
            ],
          },
        ],
      }),
    )
    const p = await openFilter(container)
    fireEvent.click(menuInputs(p)[0])
    await closeFilterByTrigger(container)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][1]).toEqual({ name: ['Jack'] })
    expect(rowNames(container)).toEqual(['Jack'])
  })

  // antd L1107：自定义 filterDropdown 调 confirm → onChange 的 filters 参数正确。
  it('should trigger onChange with correct params if defines custom filterDropdown', async () => {
    const onChange = vi.fn()
    const filterDropdown = ({ setSelectedKeys, confirm }: any) => (
      <div>
        <input onChange={(e) => setSelectedKeys([e.target.value])} />
        <button className="confirm-btn" type="button" onClick={() => confirm()}>
          Confirm
        </button>
      </div>
    )
    const { container } = customRender(
      createTable({
        onChange,
        columns: [
          {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            filterDropdown,
          },
        ],
      }),
    )

    const p = await openFilter(container)
    fireEvent.change(p.querySelector('input')!, { target: { value: 'test' } })
    fireEvent.click(p.querySelector('.confirm-btn')!)

    expect(onChange).toHaveBeenCalled()
    onChange.mock.calls.forEach(([, currentFilters]: any[]) => {
      const [, val] = Object.entries(currentFilters)[0]
      expect(val).toEqual(['test'])
    })
  })

  // antd L1142：复杂自定义面板（筛选值是**对象**，antd 用 `<Select labelInValue>` 产生）。
  // 缺口 #1 已修：`normalizeFilteredValue` 改为 `Array.from(new Set(v))`
  //   （src/table/engine/filterUtils.ts）——Set 用 SameValueZero：原始值按值去重、
  //   **对象按引用去重**，不再把任意对象字符串化成 '[object Object]' 而丢掉第二项。
  //   对齐 antd：antd 侧 `String(k)` 只当查表键用（keyMap 还原真值），从不丢项。
  // 与 antd 同用例的差异：这里用按钮直接 `setSelectedKeys([objA, objB])` 造对象值，
  //   语义等价（对象值往返 onChange），不依赖 Select 弹层的交互时序。
  it('should work as expected with complex custom filterDropdown', async () => {
    const onChange = vi.fn()
    const closed = { value: 2, label: 'Closed' }
    const notIdentified = { value: 1, label: 'Not Identified' }
    let renderSelectedKeys: Array<any> | null = null
    const filterDropdown = ({ setSelectedKeys, selectedKeys, confirm }: any) => {
      renderSelectedKeys = selectedKeys
      return (
        <div>
          <button className="pick-all" type="button" onClick={() => setSelectedKeys([closed, notIdentified])}>
            pick all
          </button>
          <button className="clear-all" type="button" onClick={() => setSelectedKeys([])}>
            clear
          </button>
          <button className="confirm-btn" type="button" onClick={() => confirm()}>
            Confirm
          </button>
        </div>
      )
    }
    const objectValueColumn: any = {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      filters: [
        { text: 'Closed', value: closed },
        { text: 'Not Identified', value: notIdentified },
      ],
      filterDropdown,
      defaultFilteredValue: [closed, notIdentified],
    }
    const { container, unmount } = customRender(createTable({ onChange, columns: [objectValueColumn] }))

    // 两项对象筛选值都进得来（修前被折叠成 1 项）
    const p = await openFilter(container)
    expect(renderSelectedKeys).toHaveLength(2)
    expect(renderSelectedKeys?.[0]).toBe(closed)
    expect(renderSelectedKeys?.[1]).toBe(notIdentified)

    // 先清空：值确实变了 → 触发 onChange（等值守卫不该误伤）
    fireEvent.click(p.querySelector('.clear-all')!)
    fireEvent.click(p.querySelector('.confirm-btn')!)
    await waitFor(() => {
      expect(container.querySelector('.ant-dropdown-open')).toBeFalsy()
    })
    expect(onChange).toHaveBeenCalledTimes(1)
    expect((onChange.mock.calls[0] as any[])[1].name).toBeNull()

    // 再勾回两项对象 → onChange 第 2 参该列数组长度为 2，且两个对象引用都在
    const p2 = await openFilter(container)
    expect(p2.querySelector('.pick-all')).toBeTruthy()
    fireEvent.click(p2.querySelector('.pick-all')!)
    fireEvent.click(p2.querySelector('.confirm-btn')!)
    await waitFor(() => {
      expect(container.querySelector('.ant-dropdown-open')).toBeFalsy()
    })
    expect(onChange).toHaveBeenCalledTimes(2)
    const applied = (onChange.mock.calls[1] as any[])[1].name
    expect(applied).toHaveLength(2)
    expect(applied[0]).toBe(closed)
    expect(applied[1]).toBe(notIdentified)
    unmount()

    // 受控口径：filteredValue 传入两个对象同样不折叠
    let controlledKeys: Array<any> | null = null
    const controlledColumn: any = {
      ...objectValueColumn,
      defaultFilteredValue: undefined,
      filteredValue: [closed, notIdentified],
      filterDropdown: ({ selectedKeys }: any) => {
        controlledKeys = selectedKeys
        return <div className="controlled-panel" />
      },
    }
    const second = customRender(createTable({ columns: [controlledColumn] }))
    await openFilter(second.container)
    expect(controlledKeys).toHaveLength(2)
    expect(controlledKeys?.[0]).toBe(closed)
    expect(controlledKeys?.[1]).toBe(notIdentified)
    second.unmount()
  })

  // antd L1227（issue #17089）：动态更换 filters 不崩溃。
  it('not crash when dynamic change filter', async () => {
    const onChange = vi.fn()

    const Test: React.FC<{ filters?: any[] }> = ({ filters }) => (
      <Table
        onChange={onChange}
        rowKey="name"
        columns={[
          {
            title: 'Name',
            dataIndex: 'name',
            filters,
            onFilter: (value: any, record: any) => record.name.indexOf(value) === 0,
            sorter: (a: any, b: any) => a.name.length - b.name.length,
            sortDirections: ['descend'],
          },
        ] as any}
        dataSource={[
          {
            name: 'Jack',
          },
        ]}
      />
    )

    const { container, rerender } = customRender(
      <Test
        filters={[
          {
            text: 'Bill',
            value: 'Bill',
          },
        ]}
      />,
    )

    const p = await openFilter(container)
    fireEvent.click(p.querySelector('.dg-filter-menu-item input')!)
    fireEvent.click(confirmButton(p))
    await waitFor(() => {
      expect(container.querySelector('.ant-dropdown-open')).toBeFalsy()
    })
    expect(onChange).toHaveBeenCalled()
    onChange.mockReset()
    expect(onChange).not.toHaveBeenCalled()
    rerender(
      <Test
        filters={[
          {
            text: 'Jim',
            value: 'Jim',
          },
        ]}
      />,
    )

    const p2 = await openFilter(container)
    fireEvent.click(p2.querySelector('.dg-filter-menu-item input')!)
    fireEvent.click(confirmButton(p2))
    expect(onChange).toHaveBeenCalled()
  })

  // antd L1295：Table 级 getPopupContainer 透传给筛选下拉。
  it('should support getPopupContainer', async () => {
    const getPopupContainer = vi.fn((node: HTMLElement) => node.parentNode as HTMLElement)

    const { container } = customRender(
      createTable({
        getPopupContainer,
      }),
    )
    await openFilter(container)
    expect(getPopupContainer).toHaveBeenCalled()
  })

  // antd L1312：ConfigProvider 级 getPopupContainer 也生效（data-grid 未显式传时由 antd Dropdown 回退读取）。
  it('should support getPopupContainer from ConfigProvider', async () => {
    // 签名差异：antd `ConfigProviderProps.getPopupContainer` 的参数是**可选**的
    //   （node_modules/antd/es/config-provider/index.d.ts:17 `(triggerNode?: HTMLElement) => ...`），
    //   而 Table 级同名字段的参数必填（data-grid src/table/publicTypes.ts:714；antd
    //   es/table/interface.d.ts:196 同样是必填）。开启 strictFunctionTypes 后，参数必填的 helper
    //   不能赋给参数可选的 prop，故这里按可选声明、取值处收窄（运行时行为不变）。
    const getPopupContainer = vi.fn((node?: HTMLElement) => node!.parentNode as HTMLElement)

    const { container } = customRender(
      <ConfigProvider getPopupContainer={getPopupContainer}>{createTable()}</ConfigProvider>,
    )
    await openFilter(container)
    expect(getPopupContainer).toHaveBeenCalled()
  })

  // antd L1330：自定义面板收到 `visible` prop（初始 false）。
  it('pass visible prop to filterDropdown', () => {
    const filterDropdownMock = vi.fn().mockReturnValue(<span>test</span>)
    const filterDropdown = (...args: any[]) => filterDropdownMock(...args)

    const Test = () => (
      <Table
        rowKey="name"
        columns={[{ title: 'Name', dataIndex: 'name', filterDropdown }] as any}
        dataSource={[{ name: 'Jack' }]}
      />
    )

    customRender(<Test />)
    expect(filterDropdownMock).toHaveBeenCalledWith(
      expect.objectContaining({
        visible: false,
      }),
    )
  })

  // antd L1350：`visible` 随点击变化。
  it('visible prop of filterDropdown changes on click', async () => {
    const filterDropdownMock = vi.fn().mockReturnValue(<span>test</span>)
    const filterDropdown = (...args: any[]) => filterDropdownMock(...args)

    const Test: React.FC = () => (
      <Table
        rowKey="name"
        columns={[{ title: 'Name', dataIndex: 'name', filterDropdown }] as any}
        dataSource={[{ name: 'Jack' }]}
      />
    )

    const { container } = customRender(<Test />)

    await openFilter(container)
    expect(filterDropdownMock).toHaveBeenCalledWith(
      expect.objectContaining({
        visible: true,
      }),
    )
    await closeFilterByTrigger(container)
    expect(filterDropdownMock).toHaveBeenCalledWith(
      expect.objectContaining({
        visible: false,
      }),
    )
  })

  // antd L1378：筛选后 onChange 的 pagination 参数。
  // 差异：data-grid 的 pagination 参数恒为完整分页状态 {current,pageSize,total}（antd 未开分页时为 {}），
  //   且**不复位** current（复位行为缺失，见下一条 L1411 的 skip 依据）；此处 current=1 是默认页未被移动。
  it('should reset pagination after filter', async () => {
    const handleChange = vi.fn()
    const { container } = customRender(
      createTable({
        onChange: handleChange,
        dataSource: longData,
        pagination: true as any,
      }),
    )
    const p = await openFilter(container)
    fireEvent.click(p.querySelector('.dg-filter-menu-item input')!)
    fireEvent.click(confirmButton(p))

    expect(handleChange).toHaveBeenCalledWith(
      {
        current: 1,
        pageSize: 10,
        total: 100,
      },
      { name: ['boy'] },
      {},
      {
        currentDataSource: [],
        action: 'filter',
      },
    )
    expect(container.querySelectorAll('.ant-pagination-item')).toHaveLength(0)
  })

  // antd L1411（规约源 = 上游 checkout **6.5.2** 的 `components/table/__tests__/Table.filter.test.tsx:1411`）：
  //   受控 `pagination:{current:3}` 时，筛选应把 onChange 的 `pagination.current` 归一为 1。
  // 原 skip 依据「data-grid 筛选**不复位**分页／实测仍收到 `{current:3,pageSize:10,total:100}`」
  //   **对现码为假** ⇒ 步骤 75 转直测。落点同「fires pagination change event」一条
  //   （`src/table/usePaginationAdapter.ts:160-178` 三件事组合；参照 = 裁判 6.4.4
  //   `es/table/InternalTable.js:180-205` ＋ `:232-237` `reset=true`，spec 6.5.2 同构）。
  // ⚠️ 用例名各说对一半（步骤 68 的警告，本棒实测确认）：参照的真实行为是
  //   **外观页码不变（受控 prop 说了算）、只有回调参数归一到第 1 页** ⇒ 断言不能按用例名写。
  //   本条用两个构造分别钉这两面：参照原构造（筛到 0 行 ⇒ 分页器整个不渲染）＋ 全命中构造（分页器在场）。
  // ⚠️ 两侧 onChange 的 pagination 参数**不逐值相等**：data-grid 恒带 `total`，裁判 6.4.4 的
  //   `getPaginationParam` 只平铺用户裸 prop 里的非函数字段（`es/table/hooks/usePagination.js:5-16`）⇒ 不带 total。
  //   这条是本文件头已登记的既有分叉（「onChange 的 pagination 参数：data-grid 恒为 {current,pageSize,total}」），
  //   本条**分别钉现值**、只断言承重的 `current` 相等，不假装两个对象相等。
  it('should keep pagination current after filter', async () => {
    // 参照面板在本仓测试环境下 portal 到 body（容器内计数 0）⇒ 每步现取（P-112）。
    const refPanelRoot = () => {
      const all = document.body.querySelectorAll<HTMLElement>('.ant-table-filter-dropdown')
      return all[all.length - 1]
    }
    const refConfirmRoot = () =>
      refPanelRoot().querySelector<HTMLElement>(
        '.ant-table-filter-dropdown-btns .ant-btn-color-primary.ant-btn-variant-solid',
      )!
    const openRefFilter = async (container: HTMLElement) => {
      fireEvent.click(container.querySelector<HTMLElement>('.ant-dropdown-trigger')!)
      await waitFor(() => expect(container.querySelector('.ant-dropdown-open')).toBeTruthy())
    }

    // --- ① data-grid 臂（参照同名用例的构造：longData ＋ 谁都匹配不了的 'boy'）---
    const handleDgChange = vi.fn()
    const dg = customRender(
      createTable({ onChange: handleDgChange, dataSource: longData, pagination: { current: 3 } }),
    )
    // 前提自证：受控分页真的停在第 3 页（否则测的不是"受控"场景）
    expect(dg.container.querySelectorAll('.ant-pagination-item').length).toBeGreaterThan(0)
    expect(dg.container.querySelector('.ant-pagination-item-active')?.textContent).toBe('3')
    const dgPanelNode = await openFilter(dg.container)
    const dgInputs = Array.from(
      dgPanelNode.querySelectorAll<HTMLInputElement>('.dg-filter-menu-item input'),
    )
    expect(dgInputs.length).toBeGreaterThan(0) // P-102
    fireEvent.click(dgInputs[0])
    fireEvent.click(confirmButton())
    expect(handleDgChange).toHaveBeenCalledTimes(1)
    expect(handleDgChange.mock.calls[0][0]).toEqual({ current: 1, pageSize: 10, total: 100 })
    // 筛到 0 行 ⇒ 分页器不再渲染（两侧同值，见 ②）
    expect(dg.container.querySelector('.ant-pagination-item-active')).toBeNull()
    dg.unmount()

    // --- ② 裁判臂：已安装 antd 6.4.4 同一次构造 ---
    const handleRefChange = vi.fn()
    const ref = customRender(
      <AntdTable
        columns={[column]}
        dataSource={longData}
        pagination={{ current: 3 }}
        onChange={handleRefChange}
      />,
    )
    expect(ref.container.querySelectorAll('.ant-pagination-item').length).toBeGreaterThan(0)
    expect(ref.container.querySelector('.ant-pagination-item-active')?.textContent).toBe('3')
    await openRefFilter(ref.container)
    const refItems = Array.from(
      refPanelRoot().querySelectorAll<HTMLElement>('.ant-dropdown-menu-item'),
    )
    expect(refItems.length).toBeGreaterThan(0) // P-102
    fireEvent.click(refItems[0])
    fireEvent.click(refConfirmRoot())
    expect(handleRefChange).toHaveBeenCalledTimes(1)
    expect(handleRefChange.mock.calls[0][0]).toEqual({ current: 1, pageSize: 10 })
    expect(ref.container.querySelector('.ant-pagination-item-active')).toBeNull()
    // 承重字段：回调参数里的 current 两侧同值（都是 1）
    expect(handleDgChange.mock.calls[0][0].current).toBe(handleRefChange.mock.calls[0][0].current)

    // --- ③ 非 vacuous 对照：换成**全命中**的筛选值 ⇒ 分页器不被摘掉，
    //        此时"外观页码"才有可读的落点：两臂都必须仍是 3，而回调参数仍是 1。
    //        （若把 ①② 写成"什么都复位"，这条会红。）---
    const allMatchColumn = { ...column, filters: [{ text: 'Name', value: 'name' }] }
    const handleDgChangeAll = vi.fn()
    const dgAll = customRender(
      createTable({
        columns: [allMatchColumn],
        onChange: handleDgChangeAll,
        dataSource: longData,
        pagination: { current: 3 },
      }),
    )
    const dgAllPanel = await openFilter(dgAll.container)
    const dgAllInputs = Array.from(
      dgAllPanel.querySelectorAll<HTMLInputElement>('.dg-filter-menu-item input'),
    )
    expect(dgAllInputs.length).toBeGreaterThan(0) // P-102
    fireEvent.click(dgAllInputs[0])
    fireEvent.click(confirmButton())
    expect(handleDgChangeAll).toHaveBeenCalledTimes(1)
    expect(handleDgChangeAll.mock.calls[0][0]).toMatchObject({ current: 1 })
    expect(dgAll.container.querySelector('.ant-pagination-item-active')?.textContent).toBe('3')
    dgAll.unmount()

    const handleRefChangeAll = vi.fn()
    const refAll = customRender(
      <AntdTable
        columns={[allMatchColumn]}
        dataSource={longData}
        pagination={{ current: 3 }}
        onChange={handleRefChangeAll}
      />,
    )
    expect(refAll.container.querySelector('.ant-pagination-item-active')?.textContent).toBe('3')
    await openRefFilter(refAll.container)
    const refAllItems = Array.from(
      refPanelRoot().querySelectorAll<HTMLElement>('.ant-dropdown-menu-item'),
    )
    expect(refAllItems.length).toBeGreaterThan(0) // P-102
    fireEvent.click(refAllItems[0])
    fireEvent.click(refConfirmRoot())
    expect(handleRefChangeAll).toHaveBeenCalledTimes(1)
    expect(handleRefChangeAll.mock.calls[0][0]).toMatchObject({ current: 1 })
    // 裁判的真实行为：外观页码**不变**（受控），只有回调参数是第 1 页
    expect(refAll.container.querySelector('.ant-pagination-item-active')?.textContent).toBe('3')
    ref.unmount()
    refAll.unmount()
  })

  // antd L1448（issue #19274）：动态把 filterDropdown 设为非法值不崩溃。
  it('should not crash', async () => {
    const TestTable: React.FC = () => {
      const [cols, setCols] = useState<any[]>([])
      // 与 antd 同款：挂载后异步替换 columns，其中 filterDropdown 是非法的 123。
      useEffect(() => {
        setCols([{ title: 'test', key: 'test', filterDropdown: 123 }])
      }, [])
      return <Table columns={cols} dataSource={[]} scroll={{ x: 1000 }} />
    }
    const { container } = customRender(<TestTable />)
    // 等异步 setCols 落地：非法 filterDropdown 仍渲染出触发器，不抛错。
    await waitFor(() => {
      expect(container.querySelector('.dg-filter-trigger')).toBeTruthy()
    })
  })

  // antd L1460（issue #20854）：onChange 不应缓存旧状态（先排序再筛选，两侧参数都要最新）。
  // 历史依据（**已失效，保留一句历史**）：本条曾以「data-grid 排序路径的 onChange 把 filters
  //   写死为 `{}`（当时 `src/table/engine/useSorter.ts:269`）」为由跳过（ledger E-050 第 5 条）。
  //   该缺陷已由 **BAT-3（步骤 32 交付 / 步骤 35 验证通过）**消灭：useSorter 改经
  //   `getFilters` 取值器（`Table.tsx` 的 `filtersArgRef`）携带**当前**筛选态。
  //   ⇒ 依据现在是假话，且用例能过（探针 `tmp/probe-bat19d.test.tsx` 读数 D1，步骤 49 日志 §3）。
  // 期望值来源＝已安装 **antd 6.4.4** 同夹具的逐参数读数（不是照用例名猜）：
  //   排序腿 `{gender:null}` + sorter.column 为 Name 列原对象 + action:'sort'；
  //   筛选腿 `{gender:['male']}` + sorter **仍是排序后的 Name 列**（不缓存旧值）+ action:'filter'。
  // 差异：antd 用 `.ant-table-column-sorters` 点排序、`.ant-dropdown-menu-item` 勾项；
  //   data-grid 点表头格 + 面板内 `.dg-filter-menu-item input`（见文件头选择器映射表）。
  it('Not cache for onChange state', async () => {
    const onChange = vi.fn()
    const columns: any = [
      {
        title: 'Name',
        dataIndex: 'name',
        sorter: true,
      },
      {
        // 服务端筛选形状：只有 filters、**没有** onFilter（参照侧亦然）。
        title: 'Gender',
        dataIndex: 'gender',
        filters: [
          { text: 'Male', value: 'male' },
          { text: 'Female', value: 'female' },
        ],
      },
    ]
    const { container } = customRender(
      <Table columns={columns} dataSource={[]} onChange={onChange} />,
    )

    // --- Sort it ---
    fireEvent.click(container.querySelector<HTMLElement>('.dg-cell-header')!)
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1))
    expect(onChange).toHaveBeenLastCalledWith(
      expect.anything(),
      { gender: null },
      expect.objectContaining({
        column: {
          dataIndex: 'name',
          sorter: true,
          title: 'Name',
        },
      }),
      {
        currentDataSource: expect.anything(),
        action: 'sort',
      },
    )

    // --- Filter it ---
    onChange.mockReset()
    const p = await openFilter(container)
    fireEvent.click(menuInputs(p)[0]!)
    fireEvent.click(confirmButton(p))
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1))
    expect(onChange).toHaveBeenLastCalledWith(
      expect.anything(),
      { gender: ['male'] },
      expect.objectContaining({
        column: {
          dataIndex: 'name',
          sorter: true,
          title: 'Name',
        },
      }),
      {
        currentDataSource: expect.anything(),
        action: 'filter',
      },
    )
  })

  // antd L1533：locale 文案消费（filterConfirm / filterReset / filterCheckAll / filterSearchPlaceholder）。
  // 差异：antd 用过时字段 filterDropdownOpen 强制展开；data-grid 改点触发器展开。
  it('locale should work', async () => {
    const { container } = customRender(
      createTable({
        locale: { filterConfirm: 'Bamboo' },
        columns: [
          {
            ...column,
            filterSearch: true,
            filterMode: 'tree',
          },
        ],
      }),
    )

    const p = await openFilter(container)

    // locale.filterConfirm 生效后按钮文案不是 'OK'，故按 primary 按钮定位。
    expect(p.querySelector('.dg-filter-dropdown-btns button.ant-btn-primary')?.textContent).toBe(
      'Bamboo',
    )
    expect(resetButton(p)?.textContent).toBe('Reset')
    expect(p.querySelector('.dg-filter-dropdown-checkall')?.textContent).toBe('Select all items')
    expect(
      p.querySelector('.dg-filter-dropdown-search-input input')?.getAttribute('placeholder'),
    ).toBe('Search in filters')
  })

  // antd L1564：column.filtered 强制激活漏斗（antd 断言 className 含 'active'）。
  it('filtered should work', () => {
    const { container } = customRender(
      createTable({
        columns: [
          {
            ...column,
            filtered: true,
          },
        ],
      }),
    )

    expect(
      triggerOf(container).className.includes('active'),
    ).toBeTruthy()
  })

  // antd L1581：column.filtered 受控变化后激活态跟随。
  it('filtered should work after change', async () => {
    const App: React.FC = () => {
      const [filtered, setFiltered] = useState(true)
      const columns: any[] = [
        {
          title: 'Name',
          dataIndex: 'name',
          filtered,
          filters: [],
        },
      ]

      return (
        <div className="App">
          <button
            id="change-filtered-btn"
            type="button"
            onClick={() => {
              setFiltered(!filtered)
            }}
          >
            Set
          </button>
          <Table columns={columns} dataSource={data} />
        </div>
      )
    }
    const { container } = customRender(<App />)

    expect(triggerOf(container).className.includes('active')).toBeTruthy()

    fireEvent.click(container.querySelector('#change-filtered-btn')!)

    await waitFor(() => {
      expect(triggerOf(container).className.includes('active')).toBeFalsy()
    })
  })

  // antd L1622：filteredValue 为空数组 → 漏斗不激活。
  it('filteredValue with empty array should not active the filtered icon', () => {
    const { container } = customRender(
      createTable({
        columns: [
          {
            ...column,
            filteredValue: [],
          },
        ],
      }),
    )

    expect(triggerOf(container).className.includes('active')).toBeFalsy()
  })

  // antd L1639：只有 onFilter（无 filters / filterDropdown）也参与前端过滤。
  it('with onFilter', () => {
    const onFilter = vi.fn((value: any, record: any) => record.key === value)
    const columns: any[] = [{ dataIndex: 'key', filteredValue: [5], onFilter }]
    const testData = [{ key: 1 }, { key: 3 }, { key: 5 }]
    const { container } = customRender(<Table columns={columns} dataSource={testData} />)

    expect(onFilter).toHaveBeenCalled()
    expect(rowCount(container)).toBe(1)
  })

  // antd L1649：JSX 风格 Column + defaultFilteredValue。
  it('jsx work', () => {
    const { container } = customRender(
      <Table dataSource={data}>
        <Table.Column
          title="Name"
          dataIndex="name"
          filters={[
            { text: 'Jack', value: 'Jack' },
            { text: 'Lucy', value: 'Lucy' },
          ]}
          onFilter={(value: any, record: any) => record.name.includes(value)}
          defaultFilteredValue={['Jack']}
        />
      </Table>,
    )

    expect(rowCount(container)).toBe(1)
    expect(rowNames(container)[0]).toBe('Jack')
  })

  // antd L1669：受控 filteredValue 未变化时，重开下拉不保留草稿。
  it(`shouldn't keep status when controlled filteredValue isn't change`, async () => {
    const filterControlledColumn = {
      title: 'Name',
      dataIndex: 'name',
      filteredValue: null,
      filters: [
        { text: 'Boy', value: 'boy' },
        { text: 'Girl', value: 'girl' },
      ],
      onFilter: filterFn,
    }
    const { container } = customRender(createTable({ columns: [filterControlledColumn] }))
    const p = await openFilter(container)
    fireEvent.click(p.querySelector('.dg-filter-menu-item input')!)
    await clickAndWaitClose(container, confirmButton(p)) // close dropdown
    const p2 = await openFilter(container) // reopen
    const checkbox = p2
      .querySelector('.dg-filter-menu-item')
      ?.querySelector<HTMLInputElement>('input[type=checkbox]')
    expect(checkbox?.checked).toBe(false)
  })

  // antd L1695：filters 为空数组时点「确定」不应触发 onChange。
  // 缺口 #5 已修（同 L686/L699 的根因与落点：useFilter.ts 的等值守卫）——
  //   空面板的草稿是 `[]`，与该列当前激活值（无激活）等值 → 整体跳过，不再转发 onChange。
  //   实测（探针）：修前收到 onChange({name: null})，修后调用次数 0。
  it('should not trigger onChange when filters is empty', async () => {
    const onChange = vi.fn()
    const Test: React.FC<{ filters?: any[] }> = ({ filters }) => (
      <Table
        onChange={onChange}
        rowKey="name"
        columns={[{ title: 'Name', dataIndex: 'name', filters }] as any}
        dataSource={[{ name: 'Jack' }]}
      />
    )
    const { container, unmount } = customRender(<Test filters={[]} />)

    await openFilter(container)
    fireEvent.click(confirmButton())
    await waitFor(() => {
      expect(container.querySelector('.ant-dropdown-open')).toBeFalsy()
    })
    expect(onChange).not.toHaveBeenCalled()
    onChange.mockReset()
    unmount()
  })

  // antd L1717：children 里的 filters 应渲染出漏斗。
  // 期望值 **3** ＝ 参照的 `.ant-table-filter-column` 计数（antd Table.filter.test.tsx:1773 逐字写死 3）：
  //   分组列自身 1 个 + 它的 2 个叶子列各 1 个。
  // BAT-19 19-A 之前本文件钉的是 2（当时 `engine/columnTree.ts` 的 `filterable` 用 `leaf &&` 收口，
  //   分组列不渲染漏斗 ⇒ 分组列上写的 filters/onFilter 整族静默丢弃）。19-A 对齐参照后
  //   （`columnAdapter.toEngineColumns` 分组节点同等抄载筛选字段族 + `flattenAllColumns` 把分组列
  //   送进 useFilter 收集面 + `columnTree`/`HeaderCell` 放开分组格宿主），dg 侧同为 3，故翻回参照口径。
  it('filters in children should render', () => {
    const columns = [
      {
        title: 'English Score',
        dataIndex: 'english',
        filters: [{ text: '1', value: 1 }],
        onFilter: (record: any) => String(record.english1).includes(String(1)),
        children: [
          {
            title: 'English Score1',
            dataIndex: 'english1',
            filters: [{ text: '2', value: 2 }],
            onFilter: (record: any) => String(record.english2).includes(String(2)),
          },
          {
            title: 'English Score2',
            dataIndex: 'english2',
            filters: [{ text: '2', value: 3 }],
            onFilter: (record: any) => String(record.english2).includes(String(3)),
          },
        ],
      },
    ]
    const dataSource = [
      { key: '1', english: 71, english1: 71, english2: 72 },
      { key: '2', english: 89, english1: 72, english2: 72 },
      { key: '3', english: 70, english1: 71, english2: 73 },
      { key: '4', english: 89, english1: 71, english2: 72 },
    ]
    const { container } = customRender(
      createTable({
        columns,
        dataSource,
      }),
    )

    expect(container.querySelectorAll('.dg-filter-trigger')).toHaveLength(3)
  })

  // antd L1777：筛选后 onChange 的 pagination.current 为 1（默认页未被移动）。
  it('should pagination.current be 1 after filtering', async () => {
    const onChange = vi.fn()
    const columns = [
      {
        title: 'Name',
        dataIndex: 'name',
        filters: [
          {
            text: 'Jim',
            value: 'Jim',
          },
          {
            text: 'Joe',
            value: 'Joe',
          },
        ],
        onFilter: (value: any, record: any) => record.name.indexOf(value) === 0,
        sorter: (a: any, b: any) => a.name.length - b.name.length,
        sortDirections: ['descend'],
      },
    ] as any
    const dataSource = [
      {
        key: '1',
        name: 'John Brown',
        age: 32,
        address: 'New York No. 1 Lake Park',
      },
      {
        key: '2',
        name: 'Joe Black',
        age: 32,
        address: 'Sydney No. 1 Lake Park',
      },
    ]

    const { container } = customRender(
      <Table onChange={onChange} rowKey="name" columns={columns} dataSource={dataSource} />,
    )
    const p = await openFilter(container)
    fireEvent.click(p.querySelector('.dg-filter-menu-item input')!)
    fireEvent.click(confirmButton(p))
    await waitFor(() => {
      expect(onChange).toHaveBeenCalled()
    })

    expect(onChange.mock.calls[0][0].current).toBe(1)

    const p2 = await openFilter(container)
    fireEvent.click(p2.querySelectorAll('.dg-filter-menu-item input')[1]!)
    fireEvent.click(confirmButton(p2))
    await waitFor(() => {
      expect(onChange.mock.calls.length).toBeGreaterThan(1)
    })
    expect(onChange.mock.calls[1][0].current).toBe(1)
  })

  // antd L1837（issue #30454）：`confirm({ closeDropdown: false })` 不应产生额外的开合回调。
  // 差异：data-grid 的开合回调只在**用户交互**时触发（FilterDropdown.tsx:341-360 的 handleOpenChange
  //   由 antd Dropdown 的用户交互驱动），程序化关闭（confirm / close）不回调；
  //   故第三段用「下拉已关闭」这一可观测结果替代 antd 的 toHaveBeenCalledTimes(2)/lastCalledWith(false)。
  it('should not trigger onFilterDropdownOpenChange when call confirm({ closeDropdown: false })', async () => {
    const onOpenChange = vi.fn()
    const { container } = customRender(
      createTable({
        columns: [
          {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            filteredValue: undefined,
            filterDropdown: ({ confirm }: any) => (
              <>
                <button id="confirm-and-close" type="button" onClick={() => confirm()}>
                  confirm
                </button>
                <button
                  id="confirm-only"
                  type="button"
                  onClick={() => confirm({ closeDropdown: false })}
                >
                  confirm
                </button>
              </>
            ),
            filterDropdownProps: { onOpenChange },
          },
        ],
      }),
    )

    await openFilter(container)
    expect(onOpenChange).toHaveBeenCalledTimes(1)

    fireEvent.click(document.body.querySelector('#confirm-only')!)
    expect(onOpenChange).toHaveBeenCalledTimes(1)
    expect(container.querySelector('.ant-dropdown-open')).toBeTruthy()

    fireEvent.click(document.body.querySelector('#confirm-and-close')!)
    await waitFor(() => {
      expect(container.querySelector('.ant-dropdown-open')).toBeFalsy()
    })
    expect(onOpenChange).toHaveBeenCalledTimes(1)
  })

  // antd L1879：分组列（Name 带 children 且自身声明 filters）上的筛选。
  // 历史依据（**已修，保留一句历史**）：本条曾是缺口 **6b**——data-grid 只为叶子列渲染漏斗
  //   （旧 `engine/columnTree.ts` 的 `filterable: leaf && (...)`），分组列上写的 filters/onFilter
  //   在列树构建处就被整族丢弃 ⇒ 「dg 4 行 / antd 2 行、dg 0 漏斗 / antd 1 漏斗」（E-027）。
  //   与 6a（树形 children 不参与筛选，已修，见 'can filter children by defaultFilteredValue'）
  //   是两条独立根因。
  // BAT-19 19-A 按参照对齐（antd@6.4.4 `es/table/hooks/useFilter/index.js` 的
  //   `getMergedColumns:151-156` 保留分组节点本身 + `collectFilterStates:8-41` 逐层收集 +
  //   `injectFilter:42-85` 把漏斗挂在该列自己的 title 宿主上）：
  //   `columnAdapter.toEngineColumns` 分组节点同等抄载筛选字段族、`flattenAllColumns` 把分组列
  //   送进 useFilter 收集面、`columnTree`/`HeaderCell` 放开分组格宿主。
  // 期望值来源＝探针 A3 + D2（dg 与 antd 6.4.4 逐值相同）：
  //   初始 4 行、首个数据格 `32`；勾第一项（Joe）+ OK 后只剩 1 行、首格 `66`、
  //   `onChange` 第二参 `{ name: ['Joe'] }`（键＝分组列自己的 key）。
  it('Column with filter and children filters properly.', async () => {
    const onTableChange = vi.fn()
    const App: React.FC = () => {
      const [filteredInfo, setFilteredInfo] = useState<Record<string, any>>({})
      return (
        <Table
          columns={
            [
              {
                title: 'Name',
                dataIndex: 'name',
                key: 'name',
                filters: [
                  { text: 'Joe', value: 'Joe' },
                  { text: 'Jim', value: 'Jim' },
                ],
                // ★ 筛选配置写在**分组列**上（它有 children）。
                filteredValue: filteredInfo?.name || null,
                onFilter: (value: any, record: any) => String(record.name).includes(String(value)),
                children: [{ title: 'Age', dataIndex: 'age', key: 'age' }],
              },
              { title: 'Age2', dataIndex: 'age', key: 'age2' },
            ] as any
          }
          dataSource={[
            { key: '1', name: 'John Brown', age: 32 },
            { key: '2', name: 'Jim Green', age: 42 },
            { key: '3', name: 'Joe Black', age: 66 },
            { key: '4', name: 'Jim Red', age: 32 },
          ]}
          pagination={false}
          onChange={(pagination, filters, sorter, extra) => {
            onTableChange(pagination, filters, sorter, extra)
            setFilteredInfo(filters)
          }}
        />
      )
    }
    const { container } = customRender(<App />)

    // 分组列现在有自己的漏斗。
    expect(container.querySelectorAll('.dg-filter-trigger')).toHaveLength(1)
    // 首个数据格（多级表头下 body 只有叶子格：`name.age` 与 `age2`，都是 age 值）。
    expect(firstRowFirstCellText(container)).toBe('32')
    expect(rowCount(container)).toBe(4)

    await openFilter(container)
    fireEvent.click(menuInputs()[0]!)
    fireEvent.click(confirmButton())

    await waitFor(() => {
      expect(rowCount(container)).toBe(1)
    })
    expect(firstRowFirstCellText(container)).toBe('66')
    expect(onTableChange).toHaveBeenCalledTimes(1)
    expect((onTableChange.mock.calls[0] as any[])[1]).toEqual({ name: ['Joe'] })
  })

  // === BAT-19 补充直测 ①（不对应 antd 同名用例）===
  // 钉 `useColumnTreeBuilder.ts` 的 hasAnyFilter「必须遍历整棵树」这条修复。
  // 改前缺陷（本轮探针 C2 实测，`已运行`）：顶层全是分组时，旧的门只扫顶层且用 `!hasChildren(node)`
  //   排除分组 ⇒ `hasAnyFilter=false` → `applyFilterToNode` 整段跳过 → **嵌套叶子列**的
  //   `defaultFilteredValue` 激活态拿不到（dg `.dg-filter-trigger-active` = 0，antd 同夹具 = 1）。
  //   数据层当时已经滤对（`flattenAllColumns` 之前的叶子集就含它），所以症状是"行少了、漏斗却是灰的"。
  // 期望值出处＝已安装 antd 6.4.4 的 C2 读数（激活漏斗 1、非受控 defaultFilteredValue:['J'] 滤到 2 行）。
  it('activates the funnel of a nested filter column when only group columns are at top level', () => {
    const columns: any = [
      {
        title: 'Group',
        key: 'group',
        children: [
          {
            title: 'Name',
            dataIndex: 'name',
            key: 'innerName',
            filters: [
              { text: 'J', value: 'J' },
              { text: 'L', value: 'L' },
            ],
            defaultFilteredValue: ['J'],
            onFilter: (value: any, record: any) => String(record.name).includes(String(value)),
          },
        ],
      },
    ]
    const { container } = customRender(
      <Table
        columns={columns}
        dataSource={[
          { key: '1', name: 'Jack' },
          { key: '2', name: 'Lucy' },
          { key: '3', name: 'Tom' },
          { key: '4', name: 'Jerry' },
        ]}
        pagination={false}
      />,
    )
    // 数据层：'J' 命中 Jack / Jerry（与 antd 同值 2 行）。
    expect(rowCount(container)).toBe(2)
    // 表头层：嵌套叶子的漏斗必须是**激活态**（灰态即回归）。
    expect(container.querySelectorAll('.dg-filter-trigger')).toHaveLength(1)
    expect(container.querySelectorAll('.dg-filter-trigger-active')).toHaveLength(1)
  })

  // === BAT-19 补充直测 ②（不对应 antd 同名用例）===
  // 钉"逐层收集"：两层分组列各自声明 filters 时，**每一层的表头格**都要有自己的漏斗。
  // 期望值出处＝探针 A6（antd 6.4.4 同夹具 `adFunnels=2`、表头格 3；dg 改前 0）。
  // 与 'filters in children should render'（antd L1717，钉 3 个）的分工：那条是"一层分组 + 两个叶子"，
  // 这条是"两层分组 + 一个叶子"，只有两者都在才排除"只处理直接子层"的实现。
  it('renders a funnel for each nesting level when grouped columns all declare filters', () => {
    const mkFilter = () => ({
      filters: [
        { text: 'Joe', value: 'Joe' },
        { text: 'Jim', value: 'Jim' },
      ],
      onFilter: (value: any, record: any) => String(record.name).includes(String(value)),
    })
    const columns: any = [
      {
        title: 'Outer',
        key: 'outer',
        ...mkFilter(),
        children: [
          {
            title: 'Inner',
            key: 'inner',
            ...mkFilter(),
            children: [{ title: 'Age', dataIndex: 'age', key: 'leaf' }],
          },
        ],
      },
    ]
    const { container } = customRender(
      <Table
        columns={columns}
        dataSource={[
          { key: '1', name: 'John Brown', age: 32 },
          { key: '2', name: 'Jim Green', age: 42 },
          { key: '3', name: 'Joe Black', age: 66 },
        ]}
        pagination={false}
      />,
    )
    // 外层分组格 + 内层分组格各一个漏斗；叶子列没声明 filters ⇒ 无漏斗。
    expect(container.querySelectorAll('.dg-filter-trigger')).toHaveLength(2)
    // 两个漏斗分别落在两个分组表头格上（不是同一格画两次）。
    expect(container.querySelectorAll('.dg-cell-header-group .dg-filter-trigger')).toHaveLength(2)
  })

  // antd L1958：筛选生效后整体替换 columns → 旧筛选键不再参与过滤（行数恢复）。
  it('Columns with filters should filter correctly after reset it.', async () => {
    // 本用例点击后**整组**替换列与数据源：A 组 record 用 name/age，B 组用 name1，
    //   两组字段集不同。record 类型取并集（除 key 外全可选），与 antd 同用例的
    //   `interface DataType { key; name?; name1?; age?; address? }`（antd Table.filter.test.tsx:1959-1965）
    //   一致；state 显式标注该类型以便两组数据都能 set。
    type SwapRecord = {
      key: string
      name?: string
      name1?: string
      age?: number
      address?: string
    }
    const columnsA: any = [
      {
        title: 'Name',
        dataIndex: 'name',
        filters: [
          {
            text: 'Joe',
            value: 'Joe',
          },
          {
            text: 'Jim',
            value: 'Jim',
          },
          {
            text: 'Submenu',
            value: 'Submenu',
            children: [
              {
                text: 'Green',
                value: 'Green',
              },
              {
                text: 'Black',
                value: 'Black',
              },
            ],
          },
        ],
        onFilter: (value: any, record: any) => record.name?.indexOf(value) === 0,
        sorter: (a: any, b: any) => a.name.length - b.name.length,
        sortDirections: ['descend'],
      },
      {
        title: 'Age',
        dataIndex: 'age',
        defaultSortOrder: 'descend',
        sorter: (a: any, b: any) => a.age - b.age,
      },
      {
        title: 'Address',
        dataIndex: 'address',
        filters: [
          {
            text: 'London',
            value: 'London',
          },
          {
            text: 'New York',
            value: 'New York',
          },
        ],
        onFilter: (value: any, record: any) => record.address?.indexOf(value) === 0,
      },
    ]

    const dataA = [
      { key: '1', name: 'John Brown', age: 32, address: 'New York No. 1 Lake Park' },
      { key: '2', name: 'Jim Green', age: 42, address: 'London No. 1 Lake Park' },
      { key: '3', name: 'Joe Black', age: 32, address: 'Sydney No. 1 Lake Park' },
      { key: '4', name: 'Jim Red', age: 32, address: 'London No. 2 Lake Park' },
    ]
    const columnsB: any = [
      {
        title: 'name1',
        dataIndex: 'name1',
      },
      {
        title: 'Address',
        dataIndex: 'address',
        filters: [
          {
            text: 'London',
            value: 'London',
          },
          {
            text: 'New York',
            value: 'New York',
          },
        ],
        onFilter: (value: any, record: any) => record.address?.indexOf(value) === 0,
      },
    ]
    const dataB = [
      { key: '1', name1: 'Joe Brown', address: 'New York No. 1 Lake Park' },
      { key: '2', name1: 'Jim Green', address: 'London No. 1 Lake Park' },
      { key: '3', name1: 'Joe Black', address: 'Sydney No. 1 Lake Park' },
      { key: '4', name1: 'Jim Red', address: 'London No. 2 Lake Park' },
    ]

    const App: React.FC = () => {
      const [cs, setCs] = useState(columnsA)
      const [ds, setDs] = useState<SwapRecord[]>(dataA)
      return (
        <div>
          <span
            className="rest-btn"
            onClick={() => {
              setCs(columnsB)
              setDs(dataB)
            }}
          >
            refresh
          </span>
          <Table columns={cs} dataSource={ds} />
        </div>
      )
    }

    const { container } = customRender(<App />)

    expect(rowCount(container)).toBe(4)
    const p = await openFilter(container)
    fireEvent.click(p.querySelectorAll('.dg-filter-menu-item input')[0]!)
    fireEvent.click(confirmButton(p))
    await waitFor(() => {
      expect(rowCount(container)).toBe(1)
    })

    fireEvent.click(container.querySelector('.rest-btn')!)

    await waitFor(() => {
      expect(rowCount(container)).toBe(4)
    })
  })

  describe('filter tree mode', () => {
    // antd L2135：filterMode='tree' 渲染 antd Tree（含 children）。
    it('supports filter tree', async () => {
      const { container } = customRender(
        createTable({
          columns: [
            {
              ...column,
              filterMode: 'tree',
            },
          ],
        }),
      )
      const p = await openFilter(container)

      expect(p.querySelectorAll('.dg-filter-dropdown-tree')).toHaveLength(1)
      expect(p.querySelectorAll('.ant-tree-checkbox')).toHaveLength(5)
    })

    // antd L2155：tree 模式 + filterSearch 渲染搜索框。
    it('supports search input in filter tree', async () => {
      const { container } = customRender(
        createTable({
          columns: [
            {
              ...column,
              filterMode: 'tree',
              filterSearch: true,
            },
          ],
        }),
      )
      const p = await openFilter(container)

      expect(p.querySelectorAll('.dg-filter-dropdown-tree')).toHaveLength(1)
      expect(p.querySelectorAll('.dg-filter-dropdown-search-input input')).toHaveLength(1)
      fireEvent.change(p.querySelector('.dg-filter-dropdown-search-input input')!, {
        target: { value: '111' },
      })
    })

    // antd L2177：搜索无匹配时显示空态（antd 查 `.ant-empty`）。
    it('renders empty element when search not found', async () => {
      const { container, unmount } = customRender(
        createTable({
          columns: [
            {
              ...column,
              filters: [
                {
                  text: '123',
                  value: '456',
                },
                {
                  text: 123456,
                  value: '456',
                },
                {
                  text: '456',
                  value: '456',
                },
              ],
              filterSearch: true,
            },
          ],
        }),
      )
      const p = await openFilter(container)

      expect(p.querySelectorAll('.dg-filter-dropdown-search')).toHaveLength(1)
      expect(p.querySelectorAll('.dg-filter-dropdown-search-input input')).toHaveLength(1)
      fireEvent.change(p.querySelector('.dg-filter-dropdown-search-input input')!, {
        target: { value: '111' },
      })
      expect(p.querySelector('.dg-filter-dropdown-empty .ant-empty')).toBeTruthy()

      unmount()
    })

    // antd L2216：menu 模式（默认）也渲染搜索框。
    it('supports search input in filter menu', async () => {
      const { container } = customRender(
        createTable({
          columns: [{ ...column, filterSearch: true }],
        }),
      )
      const p = await openFilter(container)

      expect(p.querySelectorAll('.dg-filter-dropdown-search')).toHaveLength(1)
      expect(p.querySelectorAll('.dg-filter-dropdown-search-input input')).toHaveLength(1)
      fireEvent.change(p.querySelector('.dg-filter-dropdown-search-input input')!, {
        target: { value: '111' },
      })
    })

    // antd L2232：filters[0].text 为 ReactNode 时跳过其文本匹配（非 string/number 不参与 includes）。
    it('should skip search when filters[0].text is ReactNode', async () => {
      const { container, unmount } = customRender(
        createTable({
          columns: [
            {
              ...column,
              filters: [
                {
                  text: '123',
                  value: '456',
                },
                {
                  text: 123456,
                  value: '456',
                },
                {
                  text: <span>123</span>,
                  value: '456',
                },
              ],
              filterSearch: true,
            },
          ],
        }),
      )

      const p = await openFilter(container)

      expect(p.querySelectorAll('.dg-filter-dropdown-search')).toHaveLength(1)
      expect(p.querySelectorAll('.dg-filter-dropdown-search-input input')).toHaveLength(1)
      expect(p.querySelectorAll('.dg-filter-menu-item')).toHaveLength(3)
      fireEvent.change(p.querySelector('.dg-filter-dropdown-search-input input')!, {
        target: { value: '123' },
      })
      expect(p.querySelectorAll('.dg-filter-menu-item')).toHaveLength(2)

      unmount()
    })

    // antd L2272：filterSearch 函数形态（menu 模式）。
    // 缺口 **#2 已修**（本条由 skip 转直测）。原缺陷：src/table/engine/FilterBuiltinPanel.tsx 的
    //   Checkbox/Radio 两处分支用 `key={String(item.value)}` 当 React key，而
    //   `filterDropdownUtils.flattenFilterItems`（:21-31）把父项与 children **一起平铺** ⇒ 同 value 必然撞 key。
    //   本用例的 filters 故意含两个 value='456' 的项（antd 原用例同款），且 filterSearch 按 **value** 匹配，
    //   输入 '456' 命中第 2、3 项——被删的正是**首项**，是撞 key 时协调最容易残留节点的形态。
    // 改前实测（tmp/vortex-logs/fix-real-bugs/probe-bat1-before.log 的 p1-dg）：过滤后 DOM 仍留 3 个
    //   `.dg-filter-menu-item`，文案错位为 ['123456','123456','123']，
    //   console.error 有 4 条 "Encountered two children with the same key"。
    // 改后实测（同探针复跑 probe-bat1-after.log）：2 项、文案与 input.value 一一对应，console.error 0 条。
    // 口径：**超越 antd** 的健壮性修，不是对齐——参照侧同样用 `String(filter.value)`
    //   （antd `es/table/hooks/useFilter/FilterDropdown.js:55`），实测它也漏 duplicate-key 警告
    //   （p2-antd：4 条 + "Warning: Duplicated key '456' used in Menu by path [456]"），
    //   只是它把筛选项当 Menu 的**数据**渲染，DOM 恰好收敛到 2 项。
    it('should supports filterSearch has type of function', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      errorSpy.mockClear()
      const { container, unmount } = customRender(
        createTable({
          columns: [
            {
              ...column,
              filters: [
                { text: '123', value: '123' },
                { text: 123456, value: '456' },
                { text: <span>123</span>, value: '456' },
              ],
              filterSearch: (input: string, record: any) => String(record.value).includes(input),
            },
          ],
        }),
      )

      const p = await openFilter(container)

      expect(p.querySelectorAll('.dg-filter-dropdown-search')).toHaveLength(1)
      expect(p.querySelectorAll('.dg-filter-dropdown-search-input input')).toHaveLength(1)
      expect(p.querySelectorAll('.dg-filter-menu-item')).toHaveLength(3)

      fireEvent.change(p.querySelector('.dg-filter-dropdown-search-input input')!, {
        target: { value: '456' },
      })

      const items = Array.from(p.querySelectorAll<HTMLElement>('.dg-filter-menu-item')).map((el) => ({
        text: el.textContent,
        value: el.querySelector('input')?.getAttribute('value') ?? null,
      }))
      // 面板项数 = 命中项数（改前这里是 3：撞 key 让多余节点留在 DOM 里）
      expect(items).toHaveLength(2)
      // 每项文案与其 value 一一对应（改前第二项的文案停在被删项的 '123456'）
      expect(items).toEqual([
        { text: '123456', value: '456' },
        { text: '123', value: '456' },
      ])
      // 无 React duplicate-key 报错
      expect(
        errorSpy.mock.calls.filter((call) => /same key|duplicat/i.test(String(call[0]))),
      ).toHaveLength(0)

      unmount()
      errorSpy.mockRestore()
    })

    // antd L2303：filterSearch 函数形态（tree 模式）。
    // 差异：antd 给自定义函数传 antd Tree 的 DataNode（`record.title`）；data-grid 传
    //   `EngineFilterItem`（src/table/engine/FilterDropdown.tsx:276-294 `{ text: node.title, value: node.key }`），
    //   故断言用 `record.text` 取标题（antd 原写法 `record.title.includes(...)` 在此会抛 TypeError）。
    it('should supports filterSearch has type of function when filterMode is tree', async () => {
      const { container } = customRender(
        createTable({
          columns: [
            {
              ...column,
              filterMode: 'tree',
              filters: [
                { text: '节点一', value: 'node1' },
                { text: '节点二', value: 'node2' },
                { text: '节点三', value: 'node3' },
              ],
              filterSearch: (input: string, record: any) => String(record.text).includes(input),
            },
          ],
        }),
      )
      const p = await openFilter(container)

      expect(p.querySelectorAll('.dg-filter-dropdown-tree')).toHaveLength(1)
      expect(p.querySelectorAll('.dg-filter-dropdown-search-input input')).toHaveLength(1)
      fireEvent.change(p.querySelector('.dg-filter-dropdown-search-input input')!, {
        target: { value: '节点二' },
      })
      expect(p.querySelectorAll('.ant-tree-treenode.filter-node')).toHaveLength(1)
    })

    // antd L2331：全选 Checkbox 勾选/取消全部树节点。
    it('supports check all items', async () => {
      const { container } = customRender(
        createTable({
          columns: [{ ...column, filterMode: 'tree', filterSearch: true }],
        }),
      )
      const p = await openFilter(container)

      expect(p.querySelectorAll('.dg-filter-dropdown-checkall')).toHaveLength(1)
      expect(p.querySelector('.dg-filter-dropdown-checkall')?.textContent).toBe('Select all items')
      expect(p.querySelectorAll('.ant-tree-checkbox-checked')).toHaveLength(0)

      fireEvent.click(p.querySelector('.dg-filter-dropdown-checkall')!)
      expect(p.querySelectorAll('.ant-tree-checkbox-checked')).toHaveLength(5)

      fireEvent.click(p.querySelector('.dg-filter-dropdown-checkall')!)
      expect(p.querySelectorAll('.ant-tree-checkbox-checked')).toHaveLength(0)
    })

    // antd L2357：点节点选中 → 节点勾选 + 全选半选。
    it('supports check item by selecting it', async () => {
      const { container } = customRender(
        createTable({
          columns: [
            {
              ...column,
              filterMode: 'tree',
              filterSearch: true,
            },
          ],
        }),
      )
      const p = await openFilter(container)

      expect(p.querySelectorAll('.dg-filter-dropdown-checkall')).toHaveLength(1)
      expect(p.querySelector('.dg-filter-dropdown-checkall')?.textContent).toBe('Select all items')
      fireEvent.click(p.querySelector('.ant-tree-node-content-wrapper')!)

      expect(treeCheckboxes(p)[0]?.className.includes('ant-tree-checkbox-checked')).toBe(true)
      expect(
        p
          .querySelector('.dg-filter-dropdown-checkall .ant-checkbox')
          ?.className.includes('ant-checkbox-indeterminate'),
      ).toBe(true)
    })

    // antd L2392：全部勾选后全选框变为已选。
    it('select-all checkbox should change when all items are selected', async () => {
      const { container } = customRender(
        createTable({
          columns: [
            {
              ...column,
              filterMode: 'tree',
              filters: [
                { text: 'Boy', value: 'boy' },
                { text: 'Girl', value: 'girl' },
              ],
            },
          ],
        }),
      )
      const p = await openFilter(container)

      fireEvent.click(p.querySelectorAll('.ant-tree-node-content-wrapper')[0])
      fireEvent.click(p.querySelectorAll('.ant-tree-node-content-wrapper')[1])

      expect(
        p
          .querySelector('.dg-filter-dropdown-checkall .ant-checkbox')
          ?.className.includes('ant-checkbox-checked'),
      ).toBe(true)
    })
  })

  // antd L2423：filterMultiple=false + tree → checkStrictly（单选，不联动）。
  it('filterMultiple is false - check item', async () => {
    const { container } = customRender(
      createTable({
        columns: [{ ...column, filterMode: 'tree', filterMultiple: false }],
      }),
    )

    const p = await openFilter(container)

    expect(treeCheckboxes(p)).toHaveLength(5)
    expect(p.querySelector('.dg-filter-dropdown-checkall')).toBe(null)
    expect(p.querySelectorAll('.ant-tree-checkbox-checked')).toHaveLength(0)

    fireEvent.click(treeCheckboxes(p)[2])
    expect(treeCheckboxes(p)[2].className.includes('ant-tree-checkbox-checked')).toBe(true)
    expect(p.querySelectorAll('.ant-tree-checkbox-checked')).toHaveLength(1)

    fireEvent.click(treeCheckboxes(p)[1])
    expect(treeCheckboxes(p)[1].className.includes('ant-tree-checkbox-checked')).toBe(true)
    expect(p.querySelectorAll('.ant-tree-checkbox-checked')).toHaveLength(1)

    fireEvent.click(treeCheckboxes(p)[1])
    expect(treeCheckboxes(p)[1].className.includes('ant-tree-checkbox-checked')).toBe(false)
    expect(p.querySelectorAll('.ant-tree-checkbox-checked')).toHaveLength(0)
  })

  // antd L2464：filterMultiple=false + 点节点内容区（单选切换）。
  it('filterMultiple is false - select item', async () => {
    const { container } = customRender(
      createTable({
        columns: [
          {
            ...column,
            filterMode: 'tree',
            filterMultiple: false,
          },
        ],
      }),
    )
    const p = await openFilter(container)

    expect(treeCheckboxes(p)).toHaveLength(5)
    expect(p.querySelectorAll('.ant-tree-checkbox-checked')).toHaveLength(0)

    fireEvent.click(p.querySelectorAll('.ant-tree-node-content-wrapper')[2])
    expect(treeCheckboxes(p)[2].className.includes('ant-tree-checkbox-checked')).toBe(true)
    expect(p.querySelectorAll('.ant-tree-checkbox-checked')).toHaveLength(1)

    fireEvent.click(p.querySelectorAll('.ant-tree-node-content-wrapper')[1])
    expect(treeCheckboxes(p)[1].className.includes('ant-tree-checkbox-checked')).toBe(true)
    expect(p.querySelectorAll('.ant-tree-checkbox-checked')).toHaveLength(1)

    fireEvent.click(p.querySelectorAll('.ant-tree-node-content-wrapper')[1])
    expect(treeCheckboxes(p)[1].className.includes('ant-tree-checkbox-checked')).toBe(false)
    expect(p.querySelectorAll('.ant-tree-checkbox-checked')).toHaveLength(0)
  })

  // antd L2510：tree 模式下勾选父节点联动勾选子节点，并正确回传/应用筛选值。
  it('should select children when select parent', async () => {
    const { container } = customRender(
      createTable({
        columns: [
          {
            ...column,
            filters: [
              { text: 'Boy', value: 'boy' },
              { text: 'Girl', value: 'girl' },
              {
                text: 'Title',
                value: 'title',
                children: [
                  { text: 'Jack', value: 'Jack' },
                  { text: 'Coder', value: 'coder' },
                ],
              },
            ],
            filterMode: 'tree',
          },
        ],
      }),
    )
    const p = await openFilter(container)
    // check parentnode
    fireEvent.click(treeCheckboxes(p)[2])

    expect(treeCheckboxes(p)[2].className.includes('ant-tree-checkbox-checked')).toBe(true)
    expect(treeCheckboxes(p)[3].className.includes('ant-tree-checkbox-checked')).toBe(true)
    expect(treeCheckboxes(p)[4].className.includes('ant-tree-checkbox-checked')).toBe(true)

    await clickAndWaitClose(container, confirmButton(p))
    await waitFor(() => {
      expect(rowNames(container)).toEqual(['Jack'])
    })

    const p2 = await openFilter(container)

    fireEvent.click(p2.querySelectorAll('.ant-tree-checkbox-inner')[2])
    await clickAndWaitClose(container, confirmButton(p2))
    await waitFor(() => {
      expect(rowNames(container)).toEqual(['Jack', 'Lucy', 'Tom', 'Jerry'])
    })

    const p3 = await openFilter(container)

    fireEvent.click(p3.querySelectorAll('.ant-tree-node-content-wrapper')[2])
    await clickAndWaitClose(container, confirmButton(p3))
    await waitFor(() => {
      expect(rowNames(container)).toEqual(['Jack'])
    })
  })

  // antd L2592：clearFilters 参数矩阵（无参 / {confirm} / {closeDropdown} / 两者）。
  // 差异：antd 的每个按钮在**同一个 handler** 里连续调 setSelectedKeys([text]) + confirm()，
  //   data-grid 的 confirm 读的是渲染期草稿快照（FilterDropdown.tsx:369-378 confirmFn 捕获 localSelected），
  //   同一 handler 内会拿到旧值；故拆成「先点 setX，再点共享的 confirm」两次派发，
  //   参数语义（是否立即应用 / 是否关闭）与 antd 完全一致。
  it('clearFilters should support params', async () => {
    const filterConfig: Array<[string, string, any, string[], boolean]> = [
      ['Jack', 'NoParams', {}, ['Jack'], true],
      ['Lucy', 'Confirm', { confirm: true }, ['Jack', 'Lucy', 'Tom', 'Jerry'], true],
      ['Tom', 'Close', { closeDropdown: true }, ['Tom'], false],
      ['Jerry', 'Params', { closeDropdown: true, confirm: true }, ['Jack', 'Lucy', 'Tom', 'Jerry'], false],
    ]

    let renderSelectedKeys: any
    const filter = ({
      prefixCls,
      setSelectedKeys,
      selectedKeys,
      confirm,
      clearFilters,
    }: any): React.ReactNode => {
      renderSelectedKeys = selectedKeys

      return (
        <div className={`${prefixCls}-view`} id="customFilter">
          {filterConfig.map(([text, id, param]) => (
            <span key={`set${id}`}>
              <button type="button" onClick={() => setSelectedKeys([text])} id={`set${id}`}>
                setSelectedKeys
              </button>
              <button
                type="button"
                onClick={() => (clearFilters as any)?.(param)}
                id={`reset${id}`}
              >
                Reset
              </button>
            </span>
          ))}
          <button type="button" id="confirmAll" onClick={() => confirm()}>
            Confirm
          </button>
        </div>
      )
    }

    const { container } = customRender(
      createTable({
        columns: [
          {
            ...column,
            filterDropdown: filter,
          },
        ],
      }),
    )

    // check if renderer well
    await openFilter(container)
    expectSnapshot(document.body.querySelector('#customFilter'))
    expect(renderSelectedKeys).toHaveLength(0)

    for (const [text, id, , matchNames, visible] of filterConfig) {
      // data-grid 的自定义面板在应用后会关闭（filterOnClose 默认 true），
      // 故每次操作前先确保下拉处于打开态（antd 的弹层始终挂在 DOM 上，无需此步）。
      await ensureOpen(container)
      fireEvent.click(document.body.querySelector(`#set${id}`)!)
      await clickAndWaitClose(container, document.body.querySelector('#confirmAll')!)
      await waitFor(() => {
        expect(rowNames(container)).toEqual([text])
      })

      await ensureOpen(container)
      fireEvent.click(document.body.querySelector(`#reset${id}`)!)
      await waitFor(() => {
        expect(rowNames(container)).toEqual(matchNames)
      })
      // 关/开状态可能由 clearFilters 的 setTimeout(0) 延迟改变，故等待到期望态。
      await waitFor(() => {
        expect(!!container.querySelector('.ant-dropdown-open')).toBe(visible)
      })
    }
  })

  // antd L2671：filterResetToDefaultFilteredValue 决定重置按钮恢复默认值还是清空（tree 模式）。
  // 差异：antd 用 `button.ant-btn-link` 定位重置按钮；data-grid 是 btns 内第 1 个 default 按钮。
  it('filterDropdown should support filterResetToDefaultFilteredValue', async () => {
    const columnFilter: any = {
      ...column,
      filterMode: 'tree',
      filterSearch: true,
      filters: [
        { text: 'Boy', value: 'boy' },
        { text: 'Girl', value: 'girl' },
        {
          text: 'Title',
          value: 'title',
          children: [
            { text: 'Designer', value: 'designer' },
            { text: 'Coder', value: 'coder' },
          ],
        },
      ],
      defaultFilteredValue: ['girl'],
    }

    const { container } = customRender(
      createTable({
        columns: [columnFilter],
      }),
    )
    const p = await openFilter(container)
    expect(p.querySelectorAll('.ant-tree-checkbox-checked')).toHaveLength(1)

    fireEvent.click(p.querySelector('.dg-filter-dropdown-checkall')!)
    expect(p.querySelectorAll('.ant-tree-checkbox-checked')).toHaveLength(5)
    fireEvent.click(resetButton(p))
    expect(p.querySelectorAll('.ant-tree-checkbox-checked')).toHaveLength(0)

    const { container: container2, unmount } = customRender(
      createTable({
        columns: [
          {
            ...columnFilter,
            filterResetToDefaultFilteredValue: true,
          },
        ],
      }),
    )

    const p2 = await openFilter(container2)
    fireEvent.click(p2.querySelector('.dg-filter-dropdown-checkall')!)
    expect(p2.querySelectorAll('.ant-tree-checkbox-checked')).toHaveLength(5)
    fireEvent.click(resetButton(p2))
    expect(p2.querySelectorAll('.ant-tree-checkbox-checked')).toHaveLength(1)
    expect(p2.querySelector('.ant-tree-checkbox-checked+span')?.textContent).toBe('Girl')
    unmount()
  })

  // antd L2719（规约源 = 上游 checkout **6.5.2** 的 `components/table/__tests__/Table.filter.test.tsx:2719`）：
  //   自定义面板里的 antd Menu 不得被筛选逻辑接管（onSelect 正常触发）。
  // 缺口 **#3 的 src 修法**：`src/table/engine/FilterDropdown.tsx:503-518` 自定义分支外包
  //   `OverrideProvider selectable={undefined}`，对齐裁判 6.4.4 自家筛选面板
  //   `antd/es/table/hooks/useFilter/FilterDropdown.js:413-417`。
  // **BAT-0 0-B 由 skip 转直测**：原留 skip 的唯一原因是本仓测试环境把裸包名 `antd` 解析到
  //   CJS `lib` 实例（`require.resolve('antd') → lib/index.js`），与 src 取的
  //   `antd/es/menu/OverrideContext` 是**两个 OverrideContext 实例** ⇒ Provider 写进 Menu 不读的那份，
  //   修复在黑盒层不显形（onSelect 0）。BAT-0 0-B 在 `vite.config.ts` 落 `test.alias`
  //   `{ find: /^antd$/, replacement: 'antd/es' }`（测试作用域，站点构建零影响）⇒ 测试环境统一为
  //   es 单图（自证：裸 `Dropdown === antd/es/dropdown`；es 的 ConfigConsumer 能读到裸
  //   ConfigProvider 注入的 direction，改前 undefined → 改后 'rtl'；读数 96 报告 §2）。
  // 断言口径（es flavor 实测，probe-bat1g-es-flavor-real-table.log / tmp/75-probe-es.log）：
  //   mouseDown+click 后 `onSelect` **1** 次、`.ant-dropdown-menu-item-selected` **1** 个
  //   （选中态类名是 `.ant-dropdown-menu-item-selected`——Dropdown 注入 prefixCls=`ant-dropdown-menu`，
  //   dg 与 antd 两侧同名；`.ant-menu-item-selected` 在筛选面板里恒为 0，别按它断言）。
  // 历史双实例取证（BAT-1 / 步骤 75，探针读数落盘
  //   tmp/vortex-logs/fix-real-bugs/probe-bat1c-identity.log / probe-bat1f-identity-es-flavor.log /
  //   probe-bat1g-es-flavor-real-table.log / tmp/75-probe-raw4.log / tmp/75-probe-es.log）：
  //   · lib flavor（旧仓库测试环境）：es Provider → onSelect 0；lib Provider → onSelect 1
  //   · es flavor（现仓库测试环境）：真表 + 现 src → onSelect 1 ＋ selected 1
  //   · `antd/es/menu/OverrideContext !== antd/lib/menu/OverrideContext` = true ⇒ "两份实例"是可复现的事实。
  it('filterDropdown should not override customize Menu selectable', async () => {
    const onSelect = vi.fn()
    const { container } = customRender(
      createTable({
        columns: [
          {
            ...column,
            filterDropdown: (
              <div className="custom-filter-dropdown">
                <Menu onSelect={onSelect} items={[{ key: '1', label: 'Item 1' }]} />
              </div>
            ),
          },
        ],
      }),
    )
    const p = await openFilter(container)
    const item = p.querySelector<HTMLElement>('.ant-dropdown-menu-item')!
    fireEvent.mouseDown(item)
    fireEvent.click(item)
    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledTimes(1)
    })
    expect(p.querySelectorAll('.ant-dropdown-menu-item-selected')).toHaveLength(1)
  })

  describe('filteredKeys should all be controlled or not controlled', () => {
    const tableData = [
      {
        key: '1',
        name: 'John Brown',
        age: 32,
      },
    ]
    const getColumns = () => [
      {
        title: 'name',
        dataIndex: 'name',
        key: 'name',
        filters: [],
      },
      {
        title: 'age',
        dataIndex: 'age',
        key: 'age',
        filters: [],
      },
    ]

    // antd L2792：全非受控 → 无告警（口径同 antd：console.error 完全未被调用）。
    // 此处曾收窄为「只看有没有 filteredValue 受控校验告警」，因为同文件含两个同 value 筛选项的用例
    //   （antd 原数据如此）会异步漏出 React 的重复 key 警告、落到本用例的 spy 上。
    //   缺口 **#2 修复后**（FilterBuiltinPanel.tsx 两处 key 改为 value + 索引）污染消失，收窄已回收。
    it('all uncontrolled', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      try {
        customRender(
          createTable({
            columns: getColumns(),
            data: tableData,
          } as any),
        )
        expect(errorSpy.mock.calls).toHaveLength(0)
      } finally {
        errorSpy.mockRestore()
      }
    })

    // antd L2802（规约源 = 上游 checkout **6.5.2** 的 `components/table/__tests__/Table.filter.test.tsx:2802`）：
    //   部分列受控 → 应告警「Columns should all contain `filteredValue`...」。
    // skip 依据（步骤 75 已对**当前裁判 = 已安装 antd 6.4.4** 复验：仍真，非版本条件性分叉）：
    //   参照侧告警在 6.4.4 产物里在场（`antd/es/table/hooks/useFilter/index.js:206`），且**只**在部分受控时
    //   报（全受控负对照两侧都 0 条）。data-grid 不做受控/非受控混合校验——`src/table/engine/useFilter.ts`
    //   全文 `warn`/`validate`/`devWarn` 命中数为 **0**，受控与否是**逐列独立**判定的
    //   `filteredValue !== undefined`（`:130` 的 controlledMap、`:166` 的 filteredValueMap 两处），
    //   无跨列一致性校验分支 ⇒ 混合配置不产生任何 console.error，参照期望的 warning 文本永不出现。
    it.skip('part controlled', () => {})

    // antd L2816：全受控 → 无告警（同 L2792：console.error 完全未被调用，收窄已随缺口 #2 回收）。
    it('all controlled', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      try {
        const columns = getColumns()
        ;(columns[0] as any).filteredValue = []
        ;(columns[1] as any).filteredValue = []
        customRender(
          createTable({
            columns,
            data: tableData,
          } as any),
        )
        expect(errorSpy.mock.calls).toHaveLength(0)
      } finally {
        errorSpy.mockRestore()
      }
    })
  })

  // antd L2831（规约源 = 上游 checkout **6.5.2** 的 `components/table/__tests__/Table.filter.test.tsx:2831`）：
  //   filterResetToDefaultFilteredValue 下，重置按钮随草稿是否等于默认值而 disabled 切换
  //   （参照自己的读数序列：open true → 取消默认 false → 选另一枚 false → 取消另一枚 false → 选回默认 true）。
  // skip 依据（步骤 75 已对**当前裁判 = 已安装 antd 6.4.4** 复验：仍真，非版本条件性分叉）：
  //   参照侧 disabled 在 6.4.4 产物里在场（`antd/es/table/hooks/useFilter/FilterDropdown.js:403` `type:"link"`
  //   ＋ `:405` `disabled: getResetDisabled()`）；data-grid 的重置按钮没有 disabled 态——
  //   `src/table/engine/FilterBuiltinPanel.tsx:256-258` 只传 `size` 与 `onClick`（且是 default 按钮、
  //   非参照的 `.ant-btn-link`）。双侧实测：dg 五个状态 `disabled` 恒 **false**、按钮 class
  //   `ant-btn-default … ant-btn-sm`（无 `ant-btn-link`）；裁判臂同场景 true/false/false/false/true。
  //   ⚠️ 取证坑（后来者别再踩）：本仓测试环境下**参照侧筛选面板在 document.body portal**
  //   （容器内 `.ant-table-filter-dropdown` 计数 0、body 内 1），照抄上游的 `container.querySelector('.ant-btn-link')`
  //   会**恒 null** ⇒ `disabled` 读成 undefined 而非 false，那是"方向对、数值全错"的伪读数（P-112）。
  it.skip('can reset if filterResetToDefaultFilteredValue and filter is changing', async () => {})

  // antd L2886（规约源 = 上游 checkout **6.5.2** 的 `components/table/__tests__/Table.filter.test.tsx:2886`）：
  //   column.title 支持渲染函数并收到 `{ filters }`（参照自己的断言：`.ant-table-column-title` = 'RenderTitle'
  //   ＋ `title` 以 `objectContaining({ filters: { name: ['boy'] } })` 被调用）。
  // skip 依据（步骤 75 已对**当前裁判 = 已安装 antd 6.4.4** 复验：仍真，非版本条件性分叉）：
  //   参照侧的函数标题能力在 6.4.4 产物里在场（类型 `antd/es/table/interface.d.ts:72`
  //   `ColumnTitle = ReactNode | ((props) => ReactNode)`；调用点 `antd/es/table/util.js:14-19`
  //   `renderColumnTitle` 遇函数即调，经 `antd/es/table/hooks/useTitleColumns.js:8` 落到每列）。
  //   data-grid 的 `column.title` 只接受 ReactNode：`src/table/compat/column.ts:96` `title?: ReactNode`
  //   （类型面拦住函数；运行时另有 `columnAdapter.warnFunctionTitleOnce` 的按列开发态告警）。
  //   ⚠️ 原依据里的 `publicTypes.ts:71 同` 是一条**行号合法但指错位**的假指针（`:71` 实为
  //   `columns?: Array<ColumnOrSentinel<…>>`，且 `publicTypes.ts` 全文没有 `title?: ReactNode`；
  //   该文件 `:143` 的 `title?: (currentPageData) => ReactNode` 是 **Summary.Cell** 的 prop，不是列的），
  //   步骤 75 已删。
  //   双侧实测：dg 侧 `.dg-column-title` textContent 为 **''**、`title` 函数被调用 **0 次**、
  //   console.error 只有 React 的「Functions are not valid as a React child」；裁判臂同构造下
  //   `'RenderTitle'`／调用 2 次／入参含 `filters:{name:['boy']}` ⇒ 缺口在我方，需产品码才能补。
  it.skip('title render function support `filter`', () => {})

  // antd L2907：调 close() 只关闭下拉、不提交筛选（且不触发额外的开合回调）。
  it('should be hidden and not commit when call close()', async () => {
    const onOpenChange = vi.fn()
    const onFilter = vi.fn()
    const { container } = customRender(
      createTable({
        columns: [
          {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            filterDropdown: ({ close }: any) => (
              <button id="close-only" type="button" onClick={() => close()}>
                close
              </button>
            ),
            onFilter,
            filterDropdownProps: { onOpenChange },
          },
        ],
      }),
    )

    await openFilter(container)
    expect(onOpenChange).toHaveBeenCalledTimes(1)

    fireEvent.click(document.body.querySelector('#close-only')!)
    await waitFor(() => {
      expect(container.querySelector('.ant-dropdown-open')).toBeFalsy()
    })
    // data-grid 的开合回调只由用户交互驱动（FilterDropdown.tsx:341-360），程序化 close() 不回调，
    // 故此处断言次数仍为 1（antd 期望 2 + lastCalledWith(false)，见 L1837 同款差异说明）。
    expect(onOpenChange).toHaveBeenCalledTimes(1)
    expect(onFilter).toHaveBeenCalledTimes(0)
  })

  // antd L2938：分组列场景下筛选照常生效。
  it('works with grouping columns correctly', async () => {
    const columns = [
      {
        title: 'group',
        key: 'group',
        children: [
          {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            filters: [
              { text: 'Jack', value: 'Jack' },
              { text: 'Lucy', value: 'Lucy' },
            ],
            onFilter: filterFn,
          },
          {
            title: 'Age',
            dataIndex: 'age',
            key: 'age',
          },
        ],
      },
    ]
    const testData = [
      { key: 0, name: 'Jack', age: 11 },
      { key: 1, name: 'Lucy', age: 20 },
      { key: 2, name: 'Tom', age: 21 },
      { key: 3, name: 'Jerry', age: 22 },
    ]
    const { container } = customRender(<Table columns={columns as any} dataSource={testData} />)

    const p = await openFilter(container)
    fireEvent.click(p.querySelectorAll('.dg-filter-menu-item input')[0])
    fireEvent.click(confirmButton(p))

    await waitFor(() => {
      expect(rowNames(container)).toEqual(['Jack'])
    })
  })

  // antd L2981（issue #49542）：dataSource 变化不应重置用户正在编辑的草稿。
  // 历史依据（**已被推翻，保留一句历史**）：本条曾写「data-grid 的弹层在表格重渲染后被卸载
  //   （实测 ok 后 panels=0；仅改 dataSource 亦同）」⇒ 判成"与 antd 不一致但功能正常"的 B 类。
  //   步骤 36 的读码分析 + 本轮探针（`tmp/probe-bat19b.test.tsx`，日志 §2.2/§3.2）都**否掉**了
  //   这个归因：面板根本没卸载（PANELS 恒 1、`.ant-dropdown-open` 恒在；P-6 用
  //   `filterDropdownProps.open` 恒开做正交分流 ⇒ 局部 state 也没丢）。真因是 **V3**：
  //   `engine/useFilter.ts` 的 merged memo 每轮重算给出**新的** `[]` ⇒ 下游
  //   `sortFilterAdapter.applyFilterToNode` 把新引用透传成 `FilterDropdown` 的 `filteredValue` prop，
  //   而该组件把草稿同步成已应用值的 effect（`FilterDropdown.tsx:180-184`）按**身份**比较
  //   ⇒ 用户正勾着、数据一刷新勾选就被覆写。修法＝F-A（共享模块级 `EMPTY_FILTERED_VALUE`）。
  // 与上游夹具的两点**刻意偏离**（都是为了"唯一变量＝dataSource 内容"，逐条有读数）：
  //   1) 上游把 dataSource 从 `[]` 改成 1 行。这一步在我方会**额外**跨"空 ↔ 有数据"边界，
  //      命中另一条独立向量 **V1**（`engine/GridTable.tsx:275-322` 的 `resolved` deps 含
  //      `dataSource`，`:278` 的 `emptyEnabled` 参与 flat↔multi 换型 ⇒ 整棵网格连同弹层宿主卸载；
  //      探针 P-4：dg `PANELS 1→0`、antd `PANELS 1→1`）。那是**卸载**、不是**草稿覆写**，
  //      本批未修（属布局语义改动，缺项见步骤 49 日志 §5.2/§7）⇒ 这里用 2 行 → 3 行。
  //   2) 上游用受控 `filteredValue: []`。探针 E 的 2×2 矩阵（受控/非受控 × 稳定/内联列引用）
  //      读数：受控 + 内联列档 **antd 同样重置**（`useFilter/index.js:16-18` 的
  //      `filteredValue?.map(String)` 每轮新引用）⇒ 该档不是分叉、不在"对齐参照"面内；
  //      受控 + 稳定列档我方保住而参照重置（我方更强，登记不钉）。
  //      ⇒ 这里钉**非受控**档：dg 与 antd 6.4.4 都是"草稿保住"，是真正的参照同形断言。
  // 用内联 columns 字面量（不是提出去的 const）：稳定引用档在**改前**也是绿的，
  //   只有内联档能把 F-A 变成活门（摘码反证读数见日志 §5.1）。
  it('changes to table data should not reset the filter dropdown state being changed by a user', async () => {
    const filterCol = {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      filters: [
        { text: 'Jack', value: 'Jack' },
        { text: 'Lucy', value: 'Lucy' },
      ],
      onFilter: (value: any, record: any) => String(record.name).includes(String(value)),
    }
    const two = [
      { key: '1', name: 'Jack' },
      { key: '2', name: 'Lucy' },
    ]
    const three = [...two, { key: '3', name: 'Tom' }]

    const { container, rerender } = customRender(
      <Table columns={[filterCol]} dataSource={two} pagination={false} rowKey="key" />,
    )

    // 用户打开筛选下拉。
    await openFilter(container)
    // 那一项一开始没被勾选。
    expect(menuInputs()[0]!.checked).toBe(false)
    // 用户勾上它（**不点 OK**，草稿态）。
    fireEvent.click(menuInputs()[0]!)
    expect(menuInputs()[0]!.checked).toBe(true)

    // 表格数据在用户填写期间发生变化（唯一变量＝dataSource，2 行 → 3 行，不跨空/分页边界）。
    rerender(
      <Table columns={[filterCol]} dataSource={three} pagination={false} rowKey="key" />,
    )

    // 弹层还在、还开着，且**用户刚勾的那一项仍然是勾选态**（F-A 之前这里是 false）。
    await waitFor(() => {
      expect(panels().length).toBeGreaterThan(0)
      expect(container.querySelector('.ant-dropdown-open')).toBeTruthy()
      expect(menuInputs()[0]!.checked).toBe(true)
    })

    // 收尾自证：这条草稿不是"没提交所以看不出来"——点 OK 后它真的把行集滤成 1 行。
    fireEvent.click(confirmButton())
    await waitFor(() => {
      expect(rowCount(container)).toBe(1)
    })
  })

  // antd L3024：filterDropdown 传 boolean 不崩溃。
  it('should not crash when filterDropdown is boolean', async () => {
    const tableProps = {
      key: 'stabletable',
      rowKey: 'name',
      dataSource: [] as any[],
      columns: [
        {
          title: 'Name',
          dataIndex: 'name',
          filterDropdown: true,
        },
      ],
    }

    const { container } = customRender(createTable(tableProps))

    // User opens filter Dropdown.
    const p = await openFilter(container)
    expect(p.className).toContain('dg-filter-dropdown-custom')
  })

  // antd L3044：filterOnClose=false 时，关闭下拉不提交草稿。
  it('should not fire change event when dropdown dismisses if filterOnClose is false', async () => {
    const handleChange = vi.fn()
    const { container } = customRender(
      createTable({
        onChange: handleChange,
        columns: [
          {
            ...column,
            filterOnClose: false,
          },
        ],
      }),
    )
    const p = await openFilter(container)
    fireEvent.click(p.querySelectorAll('.dg-filter-menu-item input')[0])
    await closeFilterByTrigger(container)
    expect(handleChange).not.toHaveBeenCalled()
  })

  /**
   * https://github.com/ant-design/ant-design/issues/49542
   * https://github.com/ant-design/ant-design/discussions/49603
   */
  describe('empty state', () => {
    const TestDemo = ({ renderEmpty }: any) => (
      <ConfigProvider renderEmpty={renderEmpty}>
        <Table
          dataSource={[{ name: 'John Brown' }]}
          columns={[
            {
              title: 'Name',
              key: 'name',
              dataIndex: 'name',
              filters: [], // empty filters
            },
          ]}
        />
      </ConfigProvider>
    )

    // antd L3083：ConfigProvider renderEmpty('Table.filter') 返回自定义内容。
    it('should return custom content', async () => {
      const mockTableFilterRenderEmpty = vi.fn()

      function renderEmpty(...args: any[]) {
        if (args[0] === 'Table.filter') {
          mockTableFilterRenderEmpty(...args)
          return 'foo'
        }
        return 'bar'
      }

      const { container } = customRender(<TestDemo renderEmpty={renderEmpty} />)

      // Open Filter
      const p = await openFilter(container)

      expect(p).toHaveTextContent('foo')

      expect(mockTableFilterRenderEmpty).toHaveBeenCalled()
      expect(mockTableFilterRenderEmpty.mock.calls[0][0]).toBe('Table.filter')
    })

    // antd L3110（规约源 = 上游 checkout **6.5.2** 的 `components/table/__tests__/Table.filter.test.tsx:3110`）：
    //   renderEmpty 返回 false → 不渲染空态（参照断言：`.ant-empty` 为 null 且面板 `childNodes` 只剩 1 个）。
    // skip 依据（步骤 75 已对**当前裁判 = 已安装 antd 6.4.4** 复验：仍真，非版本条件性分叉）：
    //   参照侧之所以"false 就什么都不渲染"，是因为它用 **`??`** 取值——
    //   `antd/es/table/hooks/useFilter/FilterDropdown.js:310`
    //   `const empty = renderEmpty?.('Table.filter') ?? <Empty …/>` ⇒ 只有 null/undefined 才回退，
    //   `false` 原样进 JSX、渲染成空。data-grid 用的是**三段显式判定**，把 `false` 也算"未提供"：
    //   `src/table/engine/FilterDropdown.tsx:323-331`（判定行 `:326`
    //   `custom !== undefined && custom !== null && custom !== false`）⇒ 回退到内置 `<Empty>`。
    //   双侧实测：dg 面板内 `.ant-empty` **1**／`childNodes` **2**；裁判臂 **0**／**1** ⇒ 缺口在我方，需产品码才能补。
    it.skip('allow `false` to not render empty states', async () => {})

    describe('should support filterDropdownProps', () => {
      // antd L3127（issue #51151）：dropdownRender 包裹内置面板。
      it('dropdownRender', async () => {
        const dropdownRender = vi.fn((node: any) => (
          <>
            {node}
            <span>Foo</span>
          </>
        ))

        const { container, getByText } = customRender(
          createTable({
            columns: [
              {
                ...column,
                filterDropdownProps: {
                  dropdownRender,
                },
              },
            ],
          }),
        )

        await openFilter(container)
        expect(dropdownRender).toHaveBeenCalled()
        expect(isValidElement(dropdownRender.mock.calls[0][0])).toBeTruthy()
        expect(getByText('Foo')).toBeTruthy()
      })

      // antd L3155（issue #51151）：placement 透传到弹层。
      it('placement', async () => {
        const { container } = customRender(
          createTable({
            columns: [
              {
                ...column,
                filterDropdownProps: {
                  placement: 'topLeft',
                },
              },
            ],
          }),
        )

        await openFilter(container)
        // 弹层 portal 到 body：按 body 查询。
        expect(document.body.querySelector('.ant-dropdown-placement-topLeft')).toBeTruthy()
      })
    })
  })
})

// ============================================================================
// skip 汇总（**B = 8 ＝ 运行时 8**：6 条静态 `it.skip(` ＋ `test('can be controlled by …')` 工厂 2 次调用；
//   每条均有紧邻注释与 src 依据。步骤 57（BAT-23 23-D）做过一次对账：本清单原先多留了 3 条
//   **历次批次已转直测但未撤条目**的名字（`Not cache for onChange state` :1688、
//   `Column with filter and children filters properly.` :2101、
//   `changes to table data should not reset the filter dropdown state being changed by a user` :3148），已删。
//   BAT-0 0-B 再删 1 条：`filterDropdown should not override customize Menu selectable`（antd L2719）
//   转直测（双实例观测障碍被 `test.alias` 消除，见下方 BAT-0 0-B 段落）。）
//   1. marks filter dropdown wrapper as presentation（antd L134）
//      → 面板根无 role="presentation" / aria-hidden（FilterBuiltinPanel.tsx:126-134）
//   2. can be controlled by filterDropdownOpen（antd L309 ×2 之一）
//   3. can be controlled by filterDropdownVisible（antd L309 ×2 之二）
//      → 退化重复行：1 个行为 2 条名义行（上游工厂体不用 propName，勿合并）；
//      → 字段两版生产码都不存在（BAT-0 0-E 复验：6.4.4 es/ 0 命中；上游仅测试件自身 2 处），
//        永远无法与参照对齐 ⇒ 只按名义 1:1 计分母；`filterDropdownOpen` 明确不提供
//        （src/docs/pages/deprecated-antd-members.tsx:60-65）
//   4. three levels menu（antd L721）
//      → menu 模式扁平化，无多级子菜单 UI（filterDropdownUtils.ts:21-31；compat/filter.ts:89-92）
//   5. part controlled（antd L2802）
//      → 无受控/非受控混合校验（useFilter.ts:130 与 :166 逐列独立判定，全文无 warn/validate 分支）
//   6. can reset if filterResetToDefaultFilteredValue and filter is changing（antd L2831）
//      → 重置按钮无 disabled 态（FilterBuiltinPanel.tsx:256-258）
//   7. title render function support `filter`（antd L2886）
//      → column.title 仅 ReactNode（compat/column.ts:96）
//   8. allow `false` to not render empty states（antd L3110）
//      → renderEmpty 返回 false 时回退内置 Empty（FilterDropdown.tsx:323-331，判定行 :326）
//
// 步骤 75（E-156 跳过依据取证 · 筛选域片）：**转直测 2 条、留 skip 5 条并只补锚点/版本**
//   （运行时总数 99 不变，skip 11 → 9）。7 条的取证全文见
//   `tmp/vortex-logs/fix-real-bugs/75-auditor-skip-basis-filter.md`；探针件 `tmp/probe-75.test.tsx`
//   ＋读数 `tmp/75-probe-raw4.log`（仓库口径）与 `tmp/75-probe-es.log`（es flavor 口径）。
//   - 转直测「fires pagination change event」（antd L673）与「should keep pagination current after
//     filter」（antd L1411）：**两条的原依据都是假话**——写"pagination.onChange 只由分页器 UI 触发／
//     筛选不复位分页／实测 current 保持 3"，而分页复位已落地
//     （`src/table/usePaginationAdapter.ts:160-178` ＋ `engine/usePagination.ts:40-44`），
//     双侧实测两臂同值（`[[1,10]]` 各 1 次；回调参数 current 都是 1）。
//     两条都带**非 vacuous 对照**：① 同一构造下点**排序** ⇒ 两臂 `pagination.onChange` 都必须 0 次，
//     且先自证排序真跑了（`extra.action === 'sort'` 两侧都在）；② 「全命中」构造 ⇒ 分页器不被摘掉，
//     两臂**外观页码仍停在受控的第 3 页**而回调参数是 1 ⇒ 钉住步骤 68 警告的"用例名各说对一半"。
//   - 留 skip 且**只补锚点/版本**（依据仍真，缺口在我方或测试环境）：antd L2719 / L2802 / L2831 /
//     L2886 / L3110 五条，逐条标注"规约源 = 上游 checkout **6.5.2**"与"裁判 = 已安装 **antd 6.4.4**"两个面。
//   - 顺手抓到的**第三条行号合法但指错位的假锚点**（同 74 那类，anchor-audit 结构上抓不到）：
//     原 :3047 依据写「`publicTypes.ts:71` 同（也有 `title?: ReactNode`）」，实测 `publicTypes.ts:71` 是
//     `columns?: Array<ColumnOrSentinel<…>>`，且该文件**全文没有** `title?: ReactNode`（它 `:143` 的
//     `title?: (currentPageData) => ReactNode` 是 **Summary.Cell** 的 prop）；同条的 `compat/column.ts:95`
//     也差一行（实为 `:96`）。另 :3289 的 `FilterDropdown.tsx:304-315` 已漂到 `:323-331`。三条均已改实。
//
// BAT-1（E-101）：转直测 1 条（缺口 #2，skip 16 → 15，运行时总数 95 不变）
//   - should supports filterSearch has type of function（antd L2272）
//     → #2：FilterBuiltinPanel.tsx 的 Checkbox/Radio 两处分支 key 由 `String(item.value)`
//       改为 `` `${String(item.value)}-${idx}` ``（flattenFilterItems 平铺父项与 children ⇒ 同 value 必撞 key）。
//       改前实测 3 项残留 + 4 条 duplicate-key 警告，改后 2 项、文案与 value 对应、0 条警告。
//       口径：超越 antd 的健壮性修（参照侧同样用 String(value)，antd 自己也漏 duplicate-key 警告）。
//
// BAT-18（E-118）：本批 0 增 0 删 skip（B 现值见上方汇总头），另加 **5 条补充直测**
//   （总数 90 → 95），钉住树形递归筛选的**自底向上求值顺序**（此前 dg 与 antd 分叉：
//   `filters:['Zz']` 一个谁都匹配不了的值时 dg 留 ['Jack']、antd 留 []）。落点
//   src/table/engine/filterUtils.ts 的 filterLevel；参照
//   node_modules/antd/es/table/hooks/useFilter/index.js:133-144。
//   双侧读数为探针 tmp/probe-bat18.test.tsx（18 条纯函数例 vs antd getFilterData
//   live oracle + 13 条 dg/antd 活体 DOM 例），改前/改后读数落盘
//   tmp/vortex-logs/fix-real-bugs/17-evidence-bat18-probe-{before,after}.log。
//   反证（门不是死的）：把 filterUtils.ts 还原到改前版复跑，本批 5 条里 4 条转红
//   （`does not rescue…` 一条是两种顺序同解的对照组，预期仍绿），读数见
//   tmp/vortex-logs/fix-real-bugs/17-evidence-bat18-redgate-oldsrc.log。
//
// 本批（缺口 #1 / #5 / #6a）转直测的 5 条（skip 21 → 16，用例总数 90 不变）：
//   - can filter children by defaultFilteredValue（antd L610）
//     → #6a：filterUtils.computeFilteredDataSource 增 childrenColumnName 并逐层递归
//       （对齐 antd useFilter/index.js:133-145）；useFilter 透传；Table.tsx 把
//         childrenColumnName 的派生上移到 useFilter 调用之前
//   - should not fire change event when close filterDropdown without changing anything（antd L686）
//   - should not fire change event when close a filtered filterDropdown without changing anything（antd L699）
//   - should not trigger onChange when filters is empty（antd L1695）
//     → #5：useFilter.setFilterValue 加等值守卫（isSameFilteredValueList，对齐 antd
//       FilterDropdown.js:188-199 internalTriggerFilter 的 isEqual 判定）
//   - should work as expected with complex custom filterDropdown（antd L1142）
//     → #1：normalizeFilteredValue 改用 Set（SameValueZero）去重，对象按引用而非
//       String(item) 折叠
//
// BAT-23 23-D（步骤 57 / E-156）：**真缺陷修复** ＋ 转直测 1 条 ＋ 声明 2 条补充直测。
//   运行时口径：开工基线 `85 passed | 12 skipped (97)` → 收工 `88 passed | 11 skipped (99)`
//   （skip 12 → 11 只降不升；总数 +2 ＝ 下面**声明过**的两条补充用例）。
//   缺陷：我方无差别在「下拉关闭」时应用筛选草稿，而参照（antd **6.4.4**
//     `es/table/hooks/useFilter/FilterDropdown.js:247`）的门是 `!column.filterDropdown && filterOnClose`
//     ⇒ **自定义面板从不因关闭而应用**。后果两条都实测存在：
//     ① 面板把值写进引擎给的 `setSelectedKeys` ⇒ 未确认的值静默生效／**顶掉**已生效筛选
//       （dg 改前 `onChange=1`、`filters={name:['whatevervalue']}`、可见行 0 行；antd `onChange=0`、4 行）；
//     ② 面板调引擎给的 `clearFilters()`（不带 `confirm`）⇒ **清空**用户已有筛选
//       （dg 改前 `onChange=1`、`filters={name:null}`、4 行全回来；antd `onChange=0`、['Jack'] 保留）。
//   修复＝`src/table/engine/FilterDropdown.tsx` 的 `handleOpenChange` 关闭分支加 `!isCustom`（门 ②）。
//     参照的门 ①（`info.source === 'trigger'`）**本批未接**：`source` 实测可得但取值只有
//     `'trigger'|'menu'`，接它改的是「弹层内 `<Menu>` 点项该不该关面板」这条**开合语义**（与数据结果无关）
//     ⇒ 登记为待裁项交回 main。
//   落账用例：转直测 `should not trigger onChange when blurring custom filterDropdown`（antd L1083，
//     期望值取自实测参照）；补充 2 条 `does not drop the applied filter when a custom filterDropdown
//     calls clearFilters() and closes`（后果 ②）与 `still applies the draft when the builtin panel
//     closes with default filterOnClose`（**负例**：钉住内置面板关闭照旧应用，防"修过头"）。
//   双侧读数：探针 `tmp/probe-bat23d.test.tsx` + `tmp/vitest.probe.bat23d.config.ts`
//     （10 例，改前 `tmp/57-probe-before.log` / 改后 `tmp/57-probe-after.log`，两侧 console.error 恒 0）。
//
// BAT-0 0-B：**转直测 1 条**（skip 9 → 8，运行时总数 99 不变；
//   运行时口径 `90 passed | 9 skipped (99)` → **`91 passed | 8 skipped (99)`**，实测 EXIT=0）。
//   - `filterDropdown should not override customize Menu selectable`（antd L2719）：
//     原留 skip 的唯一原因是**测试环境双实例**——本仓 vitest 把裸包名 `antd` 解析到 CJS `lib` 构建
//     （`require.resolve('antd') → lib/index.js`），而 src 取 `antd/es/menu/OverrideContext`
//     ⇒ 两份 OverrideContext 实例，Provider 写进 Menu 不读的那份，修复黑盒不显形（onSelect 0）。
//     本批在 `vite.config.ts` 落 `test.alias { find: /^antd$/, replacement: 'antd/es' }`
//     （vitest 专有测试作用域别名，站点构建零影响）⇒ 测试环境统一 es 单图。
//   - 双实例自证（探针 `tmp/probe-bat0-b.test.tsx`＋独立探针配置 `tmp/vitest.probe.bat0b.prefix.config.ts`
//     ／ `tmp/vitest.probe.bat0b.config.ts`，不 mergeConfig 仓库配置）：
//     改前 bare `Dropdown === antd/es/dropdown` = **false**、es 的 ConfigConsumer 读裸
//     ConfigProvider 注入的 direction = **undefined**；改后 = **true** ／ **'rtl'**。
//   - 断言口径取自 es flavor 实测（probe-bat1g-es-flavor-real-table.log / tmp/75-probe-es.log）：
//     onSelect 1 次 ＋ `.ant-dropdown-menu-item-selected` 1 个。
//
// 直测中的语义改写（已在用例内注释）：antd 的 `.ant-table-filter-dropdown`/`li.ant-dropdown-menu-item`/
// `.ant-btn-link`/`tbody tr` 选择器重映射；onChange 的 pagination 参数含 `total`；
// onFilter 收到原始 value（不字符串化）；filterDropdownProps.onOpenChange 只在用户交互时回调；
// tree 模式 filterSearch 的函数参数是 `{text,value}` 而非 antd 的 Tree DataNode；
// setSelectedKeys + confirm 需分两次派发（同 handler 内 confirm 读到旧草稿）；
// 自定义面板应用后会关闭，故 clearFilters 参数矩阵每次操作前先确保下拉处于打开态；
// 「no console.error」类断言：曾收窄为「无 filteredValue 受控校验告警」（同文件有用例会异步漏出 React 重复 key
// 警告），缺口 **#2 修复后收窄已回收** —— `renders empty menu correctly` / `all uncontrolled` / `all controlled`
// 三条一律按 antd 原口径断言 console.error 完全未被调用。
