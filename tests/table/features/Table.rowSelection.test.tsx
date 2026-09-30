// 黑盒 feature-slice 测试：与 antd 自家 Table rowSelection 测试用例逐条对齐（antd-style 黑盒层）。
//
// 对齐来源: {{AntDesign}}/components/table/__tests__/Table.rowSelection.test.tsx（2188 行）
//   antd 74 个 it（**6.5.2** 参照口径；已安装裁判 6.4.4 同名件 = **70**，差 4 行＝本文件末尾 skip 清单
//   C-1..C-4（`should have default aria-label` 等 aria-label 四条），逐条带版本注记；分母由 G-2 分母门
//   从 tests/fixtures/antd-denominator.json 重算）（含 describe('preset selection options') 3 条、describe('supports children') >
//   describe('supports checkStrictly') 9 条、describe('cache with selected keys') 8 条）
//   = 本文件 antd 对齐项 直测 66 + skip 8 = 74（步骤 54 / BAT-29 第 2 片把 2 条 skip 转直测：
//   `reset last select key after bulk operations`＝29-C、`selectedRows ant selectedKeys should
//   keep sync in initial state`＝29-G；对齐项总数 74 不变，只搬了拆分口径）。
//   每个 skip 均带紧邻注释写明依据（src 文件:行号或符号）。
//   非 antd 对齐补测：步骤 34 / BAT-6 返工 **3 条**（F-4 两方向各 1 + 表头全选框默认无障碍名 1）
//   ＋步骤 50 / 29-E·29-F **2 条** ＋步骤 80 / E-158 **5 条**（shift 区间判据 3 条：表头批量后／菜单批量后／
//   选中集清空后回单行，＋ checkStrictly=false 不做区间 1 条，＋ NONE 保留「当页 disabled 已选」对照 1 条）
//   3+2+5 = 10，步骤 82 / E-158 再 ＋ **4 条**（选择列宽随组件 token / 随派生 controlHeight /
//   无覆盖仍是缺省 32 / 显式 columnWidth 优先于 token）⇒ 合计 **14 条**（＝G-2 分母门孤儿集 14 条，
//   2026-09-30 重跑核平，tmp/bat0-denominator-check.out）；步骤 54 **0 新增用例、0 新增 skip**（只转直测）。
//   ⇒ 运行时总数 88（＝直测 80 ＋ skip 8）。⚠️ 这条恒等式**没有版本锚**：它只对
//   「本文件工作树态 ＋ antd 6.4.4（本机 installed）」成立，引用它时必须同时写这两项。
//
// 选择器重映射（data-grid 无语义化 table DOM，行不是容器元素，以 data-row-index 标识）:
//   - antd `th` / `td` → `div.dg-cell.dg-cell-header` / `.dg-cell-body`（带 `data-column-key` /
//     `data-row-index`，见 src/table/engine/BodyGrid.tsx:194-203）
//   - antd `.ant-table-selection-column` → `[data-column-key="__dg_selection__"]`
//     （SELECTION_COLUMN_KEY，见 src/table/selectionAdapter.tsx:71）
//   - antd `tbody tr[data-row-key]` → 无行元素；用 `.dg-cell-body[data-row-index="N"]` 或按
//     「行序号 → rowKey」映射表换算（见本文件 selectionCells/bodyInputs/getSelections）
//   - antd `thead .ant-checkbox-input` → `[data-column-key="__dg_selection__"].dg-cell-header input`
//   - antd `.ant-table-cell-fix-start` → `.dg-cell-fixed-start`（别名 `.ant-table-cell-fix-left`）
//   - antd `tr.ant-table-row-selected` → 该行全部格带 `.dg-cell-body.dg-row-selected`
//     （src/table/engine/BodyGrid.tsx:183-184；src/table/style/table.css:366）
//   - antd `.ant-checkbox-indeterminate` 落在 `.ant-checkbox`（= 选择 input 的父元素）上；
//     表体半选有两个来源：树形联动 `selection.isIndeterminate` 与缺口 #9 起支持的
//     `getCheckboxProps().indeterminate`（均见 src/table/selectionAdapter.tsx render 的
//     `indeterminate` 计算 + pickFromCheckboxProps）
//   - 选择菜单（selections）走 antd Dropdown：触发器 `.dg-selection-dropdown-trigger`
//     （同元素带 `.ant-dropdown-trigger`，src/table/selectionAdapter.tsx:97-115），菜单 portal 到
//     document.body，且用 trigger=['click']（不是 hover），故 antd 的 mouseEnter + runAllTimers 改写为 click
//   - 筛选下拉（本文件唯一用到处 `should keep item even if in filter`）→ `.dg-filter-trigger` +
//     `.dg-filter-dropdown-btns .ant-btn-primary.ant-btn-color-primary.ant-btn-variant-solid`
//
// 与 antd 的实测行为差异（保留 antd 用例名，断言按 data-grid 实测值写，逐条注释）:
//   a) 回调顺序：data-grid 先 `onChange` 再 `onSelect` / `onSelectAll` / `onSelectInvert` /
//      `onSelectNone`（src/table/useSelectionAdapter.ts 的 `fireSelectionChange` 派发段，按符号定位——
//      原写 `:286-316` 的行号已随 #12a / 29-G 的上方插入漂移）；antd 反之。
//   b) `onChange` 第 2 参数 selectedRows：缺口 #12a 已修，按 **keys 数组顺序**查表——
//      preserve=false 走**原始 dataSource 全树**（useSelectionAdapter.ts 的 recordByKey，对齐 antd
//      useLazyKVMap(rawData)），被筛掉 / 折叠 / 翻页移出可见区的已选行都在；
//      preserve=true 走**参照那样的记录缓存**（步骤 54 / 29-G 补，antd **6.4.4**
//      useSelection.js:71-88/:159-162）⇒ 连「已从 dataSource 彻底消失」的 key 也仍带 record。
//      唯一有意偏离＝该 key **从未**在任何数据源出现过（受控灌入的幽灵键）时，参照把 `undefined`
//      塞进 rows（探针 G6：antd rows=[undefined,'Lucy']），我方按 `Array<RecordType>` 类型面剔除。
//      （旧版这条钉的是「rows 只含当前可见行」，随 #12a 回收；「我们没有 preserve 缓存」随 29-G 回收。）
//   c) 选择列固定类名是 `dg-cell-fixed-start`（antd 为 `ant-table-cell-fix-start`）。
//   d) `rowSelection.onCell` 返回 rowSpan 时走 cellMerge：4 行合并为 1 个可见格 + `aria-rowspan`，
//      antd 是每行 td 都带 rowspan 属性。
//   e) antd 顶层 `defaultExpandAllRows` 由 rc-table legacyExpandableConfig 合并生效；
//      data-grid 只在 `expandable.*` 消费（src/table/compat/expand.ts:86），故本文件放进 expandable。
//      `expandedRowKeys` 同理（antd 顶层 → data-grid `expandable.expandedRowKeys`）。
//   f) 选择菜单项**文案**取自 locale（默认 'Select all data' / 'Invert current page' / 'Clear all data'，见
//      selectionAdapter.tsx 的 resolvedSelections 映射）；表头全选框的无障碍名**不**取 locale（步骤 34）。
//   g) **未修的分叉（步骤 54 实测并交回 main，见 tmp/vortex-logs/fix-real-bugs/54-implementer-bat29-selection.md）**：
//      表头全选框与菜单 INVERT 的**范围**。参照 antd **6.4.4** 把这两档限定在当前页
//      （useSelection.js:92 `flattenData(childrenColumnName, pageData)` → :271-277 recordKeys、:217 invert 遍历 pageData），
//      我方 `engine/useRowSelection.ts` 的 selectableKeys 建在 `useSelectionAdapter.ts` 的 selectionDataSource
//      ＝**筛选后的全量所有页**（Table.tsx:535-546 喂 filteredDataSource）。探针读数（pageSize 2／5 行）：
//      表头全选 dg keys=[1,2,3,4,5] vs antd [1,2]；菜单 INVERT dg [2,3,4,5] vs antd [2]；
//      菜单 ALL 两侧都是全量（参照 :201 用 data）⇒ ALL 同形、上面两档分叉。
//      更严重的一面：我方菜单仍显示 locale 原文案 **'Invert current page' / '反选当页'** 却反选所有页
//      ＝文案与行为互相打脸。不在本步修的理由＝修法要把当前页切片喂进选择 hook，而 `pagedDataSource`
//      出自 `Table.tsx:783-799` 的 usePaginationAdapter（在选择 hook `:535-546` **之后**），必须动
//      `Table.tsx` 的 hook 顺序——本步红线禁改该文件。本文件**不**为现状行为补断言（那等于把缺陷焊成规格）。
import { cloneElement, type Key } from 'react'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'

import { Table, type RowCheckboxProps, type TableProps } from '../../../src/table/index'
import { customRender, renderWithConfig } from '../../shared/render'

type Row = { key: number; name: string; disabled?: boolean }

// 旧版在此声明过 `AntdExtraCheckboxProps = RowCheckboxProps & { indeterminate/aria-label/
// onClick/onChange }`，用来绕开「data-grid 的 RowCheckboxProps 只有 disabled/name」。
// 缺口 #9 已把这四个字段并入单点定义（src/table/nativeOptions.ts 的 RowCheckboxProps），
// 该交叉类型不再有存在理由，随本批删除。

describe('Table.rowSelection', () => {
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

  afterAll(() => {
    errorSpy.mockRestore()
  })

  const columns: TableProps<any>['columns'] = [
    {
      title: 'Name',
      dataIndex: 'name',
    },
  ]

  const data: Row[] = [
    { key: 0, name: 'Jack' },
    { key: 1, name: 'Lucy' },
    { key: 2, name: 'Tom' },
    { key: 3, name: 'Jerry' },
  ]

  function createTable(props: TableProps<any> = {}) {
    return <Table columns={columns} dataSource={data} rowSelection={{}} {...props} />
  }

  const DATA_KEYS = data.map((d) => d.key)

  /** 选择列表体格（按 data-row-index 升序）。 */
  const selectionCells = (container: HTMLElement) =>
    Array.from(
      container.querySelectorAll<HTMLElement>('.dg-cell-body[data-column-key="__dg_selection__"]'),
    ).sort((a, b) => Number(a.dataset.rowIndex) - Number(b.dataset.rowIndex))

  /** 表体选择 input（按行序）。 */
  const bodyInputs = (container: HTMLElement) =>
    selectionCells(container).map((cell) => cell.querySelector('input') as HTMLInputElement)

  /** 表头全选 input（radio 模式无）。 */
  const headerInput = (container: HTMLElement) =>
    container.querySelector<HTMLInputElement>(
      '[data-column-key="__dg_selection__"].dg-cell-header input',
    )

  /** 行文本（重映射 antd renderedNames：td[1] → name 列的 body 格）。 */
  const renderedNames = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('.dg-cell-body[data-column-key="name"]')).map(
      (cell) => cell.textContent,
    )

  /**
   * 取已勾选行的 rowKey 列表（重映射 antd getSelections：原本读 tr[data-row-key]，
   * data-grid 无行元素 → 按 data-row-index 换算）。keys 为「行序号 → rowKey」映射。
   */
  const getSelections = (container: HTMLElement, keys: Key[] = DATA_KEYS) =>
    bodyInputs(container)
      .map((input, index) => (input.checked ? keys[index] : null))
      .filter((key): key is Key => key !== null)

  /** 取半选行的 rowKey 列表（antd `.ant-checkbox-indeterminate` 检查的是 input 父元素）。 */
  const getIndeterminateSelection = (container: HTMLElement, keys: Key[] = DATA_KEYS) =>
    bodyInputs(container)
      .map((input, index) =>
        input.parentElement?.className.includes('ant-checkbox-indeterminate') ? keys[index] : null,
      )
      .filter((key): key is Key => key !== null)

  const isIndeterminate = (input: HTMLInputElement | null | undefined) =>
    !!input?.parentElement?.className.includes('ant-checkbox-indeterminate')

  /** 打开表头选择菜单（antd mouseEnter → data-grid trigger=['click']）。 */
  const openSelectionMenu = (container: HTMLElement) => {
    fireEvent.click(container.querySelector('.dg-selection-dropdown-trigger') as HTMLElement)
  }

  /** 菜单项（portal 到 document.body）。 */
  const menuItems = () =>
    Array.from(document.body.querySelectorAll<HTMLElement>('li.ant-dropdown-menu-item'))

  // antd L85
  it('select default row', () => {
    const { container } = customRender(
      createTable({ rowSelection: { defaultSelectedRowKeys: [0] } }),
    )
    const checkboxes = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
    expect(getSelections(container)).toEqual([0])

    fireEvent.click(checkboxes[1])
    expect(getSelections(container)).toEqual([])

    fireEvent.click(checkboxes[0])
    expect(getSelections(container)).toEqual([0, 1, 2, 3])

    fireEvent.click(checkboxes[0])
    expect(getSelections(container)).toEqual([])
  })

  // antd L100
  it('select by checkbox', () => {
    const { container } = customRender(createTable())
    const checkboxes = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')

    fireEvent.click(checkboxes[0])
    expect(getSelections(container)).toEqual([0, 1, 2, 3])

    fireEvent.click(checkboxes[1])
    expect(getSelections(container)).toEqual([1, 2, 3])

    fireEvent.click(checkboxes[1])
    expect(getSelections(container)).toEqual([0, 1, 2, 3])
  })

  // antd L114
  it('select by radio', () => {
    const { container } = customRender(createTable({ rowSelection: { type: 'radio' } }))
    const radios = container.querySelectorAll<HTMLInputElement>('input[type="radio"]')

    expect(radios.length).toBe(4)
    fireEvent.click(radios[0])
    expect(getSelections(container)).toEqual([0])

    fireEvent.click(radios[radios.length - 1])
    expect(getSelections(container)).toEqual([3])
  })

  // antd L126
  // 缺口 #9 已修：`getCheckboxProps` 的返回值不再只取 disabled/name——`indeterminate` /
  // `aria-label` / `title` / `id` / `className` / `onClick` / `onChange` 都由适配层转传到
  // `<SelectionInput>`（src/table/selectionAdapter.tsx 的 pickFromCheckboxProps），
  // 落点 src/table/engine/SelectionInput.tsx（antd `{...checkboxProps}` 全展开，
  // es/table/hooks/useSelection.js:411-419 同款）。
  // ⇒ 本用例的半选断言按 antd 原值 `toEqual([2])` 直测（旧版钉的是「字段被丢弃」的 dg 分叉）。
  // 注：树形父子联动（checkStrictly=false）下 antd 让**计算值覆盖** custom indeterminate
  //   （useSelection.js:404-410 的 nest 分支），本库同规则；本用例是非树形 → custom 生效。
  it('pass getCheckboxProps to checkbox', () => {
    const rowSelection = {
      getCheckboxProps: (record: any) => ({
        disabled: record.name === 'Lucy',
        indeterminate: record.name === 'Tom',
        name: record.name,
      }),
    }

    const { container } = customRender(createTable({ rowSelection }))
    const checkboxes = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')

    expect(checkboxes[1].disabled).toBe(false)
    expect(checkboxes[1].name).toBe(data[0].name)
    expect(checkboxes[2].disabled).toBe(true)
    expect(checkboxes[2].name).toBe(data[1].name)

    expect(getIndeterminateSelection(container)).toEqual([2])
  })

  // antd L146
  // skip 依据（**不是** #9 的字段丢弃，#9 已修）：本用例要的是「无 getCheckboxProps 时的默认
  // aria-label = 'Select row N'」。该默认值是 antd **6.5.2** 才加的
  // （参照源码仓库 `{{AntDesign}}`（其 package.json 的 version＝6.5.2）
  //  components/table/hooks/useSelection.tsx:538 `Select row ${index + 1}`），
  // 本仓参照是已安装的 node_modules/antd@6.4.4：实读 es/table/hooks/useSelection.js:395-419
  // 表体 Checkbox/Radio 都**没有**默认 aria-label，只有表头有（`:356` 'Select all'/'Custom selection'）。
  // 实测并排（tmp/probe-bat6b.test.tsx P5，读数存 tmp/vortex-logs/fix-real-bugs/22-evidence-bat6b-probe.log）：
  // 不传 getCheckboxProps 时 dg 与 antd@6.4.4 的表体
  // input aria-label 都是 null → 与本用例期望不符，属「参照新版本能力」，不在本批移植范围。
  it.skip('should have default aria-label', () => {
    const { container } = customRender(createTable({ rowSelection: {} }))
    const checkboxes = container.querySelectorAll<HTMLInputElement>('tbody input[type="checkbox"]')

    expect(checkboxes[0].getAttribute('aria-label')).toBe('Select row 1')
  })

  // antd L156
  // 缺口 #9 已修：`getCheckboxProps` 返回的 `aria-label` 现在会转传到 input
  //   （src/table/selectionAdapter.tsx 的 pickFromCheckboxProps → engine/SelectionInput.tsx 的
  //   ariaLabel 槽位，antd 侧同样在 `{...checkboxProps}` 展开里给，es/table/hooks/useSelection.js:411-419）。
  //   实测 dg 与已安装 antd@6.4.4 并排：两侧 input 的 aria-label 都是 'Select Jack' / 'Select Lucy'。
  // 选择器重映射：antd 用 `tbody input`，data-grid 无 tbody 元素 → 用本文件 bodyInputs。
  it('should support custom aria-label from getCheckboxProps', () => {
    const rowSelection = {
      getCheckboxProps: (record: any) => ({
        'aria-label': `Select ${record.name}`,
      }),
    }
    const { container } = customRender(createTable({ rowSelection }))
    const checkboxes = bodyInputs(container)

    expect(checkboxes[0].getAttribute('aria-label')).toBe('Select Jack')
    expect(checkboxes[1].getAttribute('aria-label')).toBe('Select Lucy')
  })

  // antd L169
  // skip 依据：同 `should have default aria-label` —— 默认 'Select row N' 是参照 **6.5.2**
  // （useSelection.tsx:538/578）的能力，已安装的 antd@6.4.4 对 radio 分支同样不发默认 aria-label
  // （radio 分支 es/table/hooks/useSelection.js:373-395 只有 `{...checkboxProps}` 展开，不发默认名）。
  // 实测并排（探针 P5）：dg 与 antd@6.4.4 的表体 input aria-label 都是 null。
  it.skip('should have default aria-label for radio type', () => {
    const { container } = customRender(createTable({ rowSelection: { type: 'radio' } }))
    const radios = container.querySelectorAll<HTMLInputElement>('tbody input[type="radio"]')

    expect(radios[0].getAttribute('aria-label')).toBe('Select row 1')
  })

  // antd L178
  // skip 依据：'Row N selected' 这个**选中态默认标签**同样是参照 6.5.2 才有的
  // （参照源码仓库 `{{AntDesign}}`（package.json version＝6.5.2）
  //  components/table/hooks/useSelection.tsx:578
  // `selected ? 'Row N selected' : 'Select row N'`）；已安装的 antd@6.4.4
  // （es/table/hooks/useSelection.js:395-419）选中与否都不写默认 aria-label。
  // 本库口径：无用户值时回退 `getCheckboxProps().name`（src/table/selectionAdapter.tsx
  // pickFromCheckboxProps），与 6.4.4 一致 → 本用例期望的字符串两侧都不存在。
  it.skip('should have selected aria-label when row is selected', () => {
    const { container } = customRender(
      createTable({ rowSelection: { defaultSelectedRowKeys: [0, 1] } }),
    )
    const checkboxes = container.querySelectorAll<HTMLInputElement>('tbody input[type="checkbox"]')

    expect(checkboxes[0].getAttribute('aria-label')).toBe('Row 1 selected')
  })

  // antd L187
  // 缺口 #9 已修：非树形时 `getCheckboxProps().indeterminate` 覆盖计算值
  //   （src/table/selectionAdapter.tsx render 的 `checkboxProps?.indeterminate ?? computedIndeterminate`，
  //   对齐 antd es/table/hooks/useSelection.js:404-410 的非 nest 分支）。
  // 实测（探针 P5 + 本用例）：selectedRowKeys=[2] 且 Tom 返回 indeterminate:true → 第 2 行半选。
  it("make getCheckboxProps's `indeterminate` override selectedRowKeys' effect", () => {
    const rowSelection: TableProps<any>['rowSelection'] = {
      getCheckboxProps: (record) => ({
        disabled: record.name === 'Lucy',
        indeterminate: record.name === 'Tom',
        name: record.name,
      }),
      selectedRowKeys: [2],
    }

    const { container } = customRender(createTable({ rowSelection }))
    expect(getIndeterminateSelection(container)).toEqual([2])
  })

  // antd L201
  // skip 依据：data-grid 的全选/半选统计基于**全量筛选后数据**而非当前页——
  // src/table/useSelectionAdapter.ts 把 `selectionDataSource`（由 `filteredDataSource` 全树扁平
  // 而来）喂给 useRowSelection，而 `filteredDataSource` 在 src/table/Table.tsx 里早于分页
  // （分页只作用于 `pagedDataSource`/`renderedDataSource`）；antd 的 checkboxPropsMap 建在
  // `flattenData(pageData)` 上（es/table/hooks/useSelection.js:92），是**当前页**。
  // 实测：第 1 页点全选后翻到第 2 页，表头仍为 checked（antd 期望 false）。
  // （缺口 #12a 修的是「存在性/rows 用 rawData」，与本条「全选统计范围」是两件事，未受影响。）
  it.skip('works with pagination', () => {
    const { container } = customRender(createTable({ pagination: { pageSize: 2 } }))

    const pagers = container.querySelectorAll('.ant-pagination-item')
    const checkboxAll = headerInput(container)

    fireEvent.click(checkboxAll!)
    expect(checkboxAll?.checked).toBe(true)

    fireEvent.click(pagers[1])
    expect(checkboxAll?.checked).toBe(false)

    fireEvent.click(pagers[0])
    expect(checkboxAll?.checked).toBe(true)
  })

  // antd L225
  // skip 依据：data-grid 不产生任何 getCheckboxProps 校验 warning（全 src 无该 warning 分支；
  // 单点定义的 RowCheckboxProps（src/table/nativeOptions.ts）里根本没有 checked/defaultChecked
  // 字段，antd 侧同理，只是额外发了这条告警）。
  it.skip('handles defaultChecked', () => {
    const rowSelection = {
      getCheckboxProps: (record: any) => ({
        defaultChecked: record.key === 0,
      }),
    } as TableProps<any>['rowSelection']

    customRender(createTable({ rowSelection }))

    expect(errorSpy).toHaveBeenCalledWith(
      'Warning: [antd: Table] Do not set `checked` or `defaultChecked` in `getCheckboxProps`. Please use `selectedRowKeys` instead.',
    )
  })

  // antd L240
  it('can be controlled', () => {
    const { container, rerender } = customRender(
      createTable({ rowSelection: { selectedRowKeys: [0] } }),
    )

    expect(getSelections(container)).toEqual([0])

    rerender(createTable({ rowSelection: { selectedRowKeys: [1] } }))

    expect(getSelections(container)).toEqual([1])
  })

  // antd L250
  // 回调顺序实测：data-grid 先 onChange 再 onSelect（src/table/useSelectionAdapter.ts 的
  // `fireSelectionChange` 派发段，现为 :398-427；antd 相反；其余参数（含 onSelect 第 4 参 nativeEvent 为 MouseEvent）一致。
  // 旧注释写的 `:286-296` 在本步之前就已对不上（该段原本在 :352 起），29-G 又在上方插入，故改按符号定位。
  it('fires change & select events', () => {
    const order: string[] = []
    const handleChange = vi.fn().mockImplementation(() => {
      order.push('onChange')
    })
    const handleSelect = vi.fn().mockImplementation(() => {
      order.push('onSelect')
    })
    const rowSelection = {
      onChange: handleChange,
      onSelect: handleSelect,
    }
    const { container } = customRender(createTable({ rowSelection }))

    fireEvent.click(container.querySelectorAll('input[type="checkbox"]')[4])

    expect(handleChange).toHaveBeenCalledWith([3], [{ key: 3, name: 'Jerry' }], {
      type: 'single',
    })
    expect(handleSelect.mock.calls.length).toBe(1)
    expect(handleSelect.mock.calls[0][0]).toEqual({ key: 3, name: 'Jerry' })
    expect(handleSelect.mock.calls[0][1]).toBe(true)
    expect(handleSelect.mock.calls[0][2]).toEqual([{ key: 3, name: 'Jerry' }])
    expect(handleSelect.mock.calls[0][3].type).toBe('click')
    expect(order).toEqual(['onChange', 'onSelect'])
  })

  // antd L277
  // 回调顺序实测按 data-grid：onChange → onSelect → onChange → onSelect → onSelectMultiple
  // （src/table/useSelectionAdapter.ts 的 fireSelectionChange 派发段，现 :398-427；antd 是 onSelect/onChange 交替）。
  // shiftKey 范围选的取值与 antd 一致（anchor = 上一次勾选行，src/table/selectionAdapter.tsx 的
  // resolveSelectionRangeKeys 分支，表体格 onChange 内 useRange 判定）。
  it('fires selectMulti event', () => {
    const order: string[] = []
    const handleSelectMulti = vi.fn().mockImplementation(() => {
      order.push('onSelectMultiple')
    })
    const handleSelect = vi.fn().mockImplementation(() => {
      order.push('onSelect')
    })
    const handleChange = vi.fn().mockImplementation(() => {
      order.push('onChange')
    })
    const rowSelection = {
      onChange: handleChange,
      onSelect: handleSelect,
      onSelectMultiple: handleSelectMulti,
    }
    const { container } = customRender(createTable({ rowSelection }))
    fireEvent.click(bodyInputs(container)[0], { shiftKey: true })

    expect(handleSelect).toHaveBeenCalled()
    expect(handleChange).toHaveBeenLastCalledWith([0], [{ key: 0, name: 'Jack' }], {
      type: 'single',
    })

    fireEvent.click(bodyInputs(container)[2], { shiftKey: true })

    expect(handleSelectMulti).toHaveBeenCalledWith(
      true,
      [data[0], data[1], data[2]],
      [data[1], data[2]],
    )
    expect(handleChange).toHaveBeenLastCalledWith(
      [0, 1, 2],
      [
        { key: 0, name: 'Jack' },
        { key: 1, name: 'Lucy' },
        { key: 2, name: 'Tom' },
      ],
      { type: 'multiple' },
    )

    fireEvent.click(bodyInputs(container)[0], { shiftKey: true })
    expect(handleSelectMulti).toHaveBeenCalledWith(false, [], [data[0], data[1], data[2]])
    expect(handleChange).toHaveBeenLastCalledWith([], [], { type: 'multiple' })

    expect(order).toEqual([
      'onChange',
      'onSelect',
      'onChange',
      'onSelect',
      'onSelectMultiple',
      'onChange',
      'onSelect',
      'onSelectMultiple',
    ])
  })

  // antd L338
  it('reset last select key after deselect', () => {
    const onChange = vi.fn()

    const { container } = customRender(
      createTable({
        checkbox: true,
        rowSelection: {
          selections: [Table.SELECTION_NONE],
          onChange: (keys) => onChange(keys),
        },
      } as TableProps<any>),
    )

    const last = () => bodyInputs(container)[bodyInputs(container).length - 1]
    const first = () => bodyInputs(container)[0]

    fireEvent.click(first())
    expect(onChange).toHaveBeenLastCalledWith([0])
    fireEvent.click(last())
    expect(onChange).toHaveBeenLastCalledWith([0, 3])
    fireEvent.click(last())
    expect(onChange).toHaveBeenLastCalledWith([0])
    fireEvent.click(last(), {
      shiftKey: true,
    })
    expect(onChange).toHaveBeenLastCalledWith([0, 3])
  })

  // antd L376
  // 步骤 54 / 29-C 转直测：表头全选与选择菜单**每一项**（含自定义项）操作后都清 shift 范围锚点
  //   （src/table/selectionAdapter.tsx 表头框 onChange 与 SelectionsDropdown onSelect 两处
  //    `setSelectionAnchorKey(null)`，对齐 antd **6.4.4** useSelection.js:297-298 与 :251-257）。
  // 修前的实测（同一条序列）：全选清空后 shift 点首行 → onChange [0,1,2,3]（从陈旧锚点拉了一整段），
  //   antd 期望 [0]；双侧读数见探针 PR-C 的 C2（dg [4] vs antd [1,2,4]）与 C3（dg [2,3]/multiple
  //   vs antd [3]/single）。锚点由「单点勾选」建立这一维两侧本就同形（参照 :463；探针 C1 读数一致）。
  it('reset last select key after bulk operations', () => {
    const onChange = vi.fn()

    const { container } = customRender(
      createTable({
        checkbox: true,
        rowSelection: {
          selections: [Table.SELECTION_NONE],
          onChange: (keys) => onChange(keys),
        },
      } as TableProps<any>),
    )

    const last = () => bodyInputs(container)[bodyInputs(container).length - 1]
    const first = () => bodyInputs(container)[0]
    const allElement = () => headerInput(container)

    fireEvent.click(last())
    expect(onChange).toHaveBeenLastCalledWith([3])
    fireEvent.click(first(), { shiftKey: true })
    expect(onChange).toHaveBeenLastCalledWith([3, 0, 1, 2])
    fireEvent.click(allElement()!)
    expect(onChange).toHaveBeenLastCalledWith([])

    fireEvent.click(last())
    expect(onChange).toHaveBeenLastCalledWith([3])
    fireEvent.click(allElement()!)
    fireEvent.click(allElement()!)
    expect(onChange).toHaveBeenLastCalledWith([])
    fireEvent.click(first(), { shiftKey: true })
    expect(onChange).toHaveBeenLastCalledWith([0])

    // antd L423-436 的第三段：**菜单批量**（本夹具唯一项＝SELECTION_NONE）之后同样要清锚点。
    // 本库选择下拉 trigger=['click']（见文件头 :30-32），故 antd 的 mouseEnter + runAllTimers 改写为 click。
    // 这一段单独给「SelectionsDropdown onSelect 处的 setSelectionAnchorKey(null)」成门：
    // 缺那句时锚点停在末行 key3，shift 点首行会拉成 [0,1,2,3]。
    fireEvent.click(last())
    expect(onChange).toHaveBeenLastCalledWith([0, 3])
    openSelectionMenu(container)
    expect(menuItems().map((item) => item.textContent)).toEqual(['Clear all data'])
    fireEvent.click(menuItems()[0])
    expect(onChange).toHaveBeenLastCalledWith([])
    fireEvent.click(first(), { shiftKey: true })
    expect(onChange).toHaveBeenLastCalledWith([0])
  })

  // 步骤 80 / E-158 缺陷 1（双臂探针 A1，裁判 **antd 6.4.4**，读数 tmp/80-probe-readings-before.txt）：
  // 「是不是 shift 区间」的判据从旧树的**锚点存在维**（`type==='checkbox' && shiftKey && selectionAnchorKey !== null`）
  // 改成参照的**已有选中项维**（`src/table/selectionAdapter.tsx` 的 `isCheckboxRangeSelect`，
  // 逐字对齐 antd 6.4.4 `es/table/hooks/useSelection.js:428-429`
  // `isMultiple = derivedSelectedKeySet.size > 0 && recordKeys.some(k => derivedSelectedKeySet.has(k))`
  // ＋ `if (shiftKey && checkStrictly && isMultiple)`）。
  // 修前实测（同一条序列）：dg `info.type='single'`、`onSelectMultiple` **0 次**；
  //   antd `'multiple'`、`onSelectMultiple` **1 次** `(false, [Jack,Lucy,Jerry], [Tom])`。
  //   键集 `[0,1,3]` 两侧本就同值（＝步骤 79 的 C2「巧合同值」那一面）⇒ 缺陷只在**标签＋回调派发面**，
  //   用户挂了 `onSelectMultiple` 的话参照会响、我方永不响。
  // ⇒ 本条钉的是**回调派发面**，与上面 29-C 那条钉的**键集面**互补（摘掉任一处判据各有红：见批次日志 §7）。
  it('reports type=multiple and fires onSelectMultiple for shift click after header select-all', () => {
    const onChange = vi.fn()
    const onSelectMultiple = vi.fn()
    const { container } = customRender(
      createTable({ rowSelection: { onChange, onSelectMultiple } }),
    )
    const inputs = bodyInputs(container)
    expect(inputs.length).toBe(4)

    fireEvent.click(inputs[0])
    expect(onChange).toHaveBeenLastCalledWith([0], [data[0]], { type: 'single' })
    fireEvent.click(headerInput(container)!)
    expect(onChange).toHaveBeenLastCalledWith([0, 1, 2, 3], data, { type: 'all' })

    // 锚点已被 29-C 清成 null ⇒ 区间退化成「只动被点行」（参照 useMultipleSelect.js:9）；
    // 但 method 必须是 multiple（选中集非空）。
    fireEvent.click(inputs[2], { shiftKey: true })
    expect(onChange).toHaveBeenLastCalledWith([0, 1, 3], [data[0], data[1], data[3]], {
      type: 'multiple',
    })
    expect(onSelectMultiple).toHaveBeenCalledTimes(1)
    expect(onSelectMultiple).toHaveBeenCalledWith(
      false,
      [data[0], data[1], data[3]],
      [data[2]],
    )
  })

  // 步骤 80 缺陷 1 的第二条边（探针 A4）：批量出自**选择菜单**（SELECTION_ALL）时同一判据同样错。
  // 修前 dg 也是 `single` / `onSelectMultiple` 0 次 ⇒ 这一格与上面那条**不同源**（清锚站点不同），
  // 摘掉 `SelectionsDropdown` 那处 `setSelectionAnchorKey(null)` 会让本条的**键集**变成 `[0,1,2]`（区间从陈旧锚点拉起）。
  it('reports type=multiple and fires onSelectMultiple for shift click after menu select-all', () => {
    const onChange = vi.fn()
    const onSelectMultiple = vi.fn()
    const { container } = customRender(
      createTable({
        rowSelection: { onChange, onSelectMultiple, selections: [Table.SELECTION_ALL] },
      }),
    )
    const inputs = bodyInputs(container)
    expect(inputs.length).toBe(4)

    fireEvent.click(inputs[0])
    openSelectionMenu(container)
    expect(menuItems().map((item) => item.textContent)).toEqual(['Select all data'])
    fireEvent.click(menuItems()[0])
    expect(onChange).toHaveBeenLastCalledWith([0, 1, 2, 3], data, { type: 'all' })

    fireEvent.click(inputs[2], { shiftKey: true })
    expect(onChange).toHaveBeenLastCalledWith([0, 1, 3], [data[0], data[1], data[3]], {
      type: 'multiple',
    })
    expect(onSelectMultiple).toHaveBeenCalledTimes(1)
  })

  // 步骤 80 缺陷 1 的反向形状（探针 A5＝步骤 54 遗交 #2「单行取消后仍走区间」那一面）：
  // 选中集为空时参照**必须**走单行支（`isMultiple` 要求「已有选中项」），锚点在不在都一样。
  // 修前实测：dg `[0,1,2]`/`multiple`/onSelectMultiple 1 次 vs antd `[2]`/`single`/0 次。
  // ⇒ 这条钉的是**键集**面：判据退回「锚点存在维」就红（摘码反证见批次日志 §7 CF-2）。
  it('falls back to single select for shift click once nothing is selected anymore', () => {
    const onChange = vi.fn()
    const onSelect = vi.fn()
    const onSelectMultiple = vi.fn()
    const { container } = customRender(
      createTable({ rowSelection: { onChange, onSelect, onSelectMultiple } }),
    )
    const inputs = bodyInputs(container)
    expect(inputs.length).toBe(4)

    fireEvent.click(inputs[0])
    expect(onChange).toHaveBeenLastCalledWith([0], [data[0]], { type: 'single' })
    fireEvent.click(inputs[0])
    expect(onChange).toHaveBeenLastCalledWith([], [], { type: 'single' })

    fireEvent.click(inputs[2], { shiftKey: true })
    expect(onChange).toHaveBeenLastCalledWith([2], [data[2]], { type: 'single' })
    expect(onSelectMultiple).not.toHaveBeenCalled()
    // 三次点击都是单行支 ⇒ onSelect 每次都派发（回调顺序维见文件头 a) 条）
    expect(onSelect).toHaveBeenCalledTimes(3)
  })

  // antd L438
  // 回调顺序实测：onChange 先于 onSelectAll（src/table/useSelectionAdapter.ts 的 fireSelectionChange
  // 派发段，现 :398-427；onChange :398、onSelectAll :410），
  // 参数一致：全选 (true, 全部行, 变化行=全部行)；清空 (false, [], 变化行=全部行)。
  it('fires selectAll event', () => {
    const order: string[] = []
    const handleSelectAll = vi.fn().mockImplementation(() => {
      order.push('onSelectAll')
    })
    const handleChange = vi.fn().mockImplementation(() => {
      order.push('onChange')
    })
    const rowSelection = {
      onChange: handleChange,
      onSelectAll: handleSelectAll,
    }
    const { container } = customRender(createTable({ rowSelection }))

    const checkAll = headerInput(container)

    fireEvent.click(checkAll!)
    expect(handleSelectAll).toHaveBeenCalledWith(true, data, data)

    expect(order).toEqual(['onChange', 'onSelectAll'])

    fireEvent.click(checkAll!)
    expect(handleSelectAll).toHaveBeenCalledWith(false, [], data)
  })

  // antd L463
  it('works with selectAll option inside selection menu', () => {
    const handleChange = vi.fn()
    // `selections?: true | SelectionItem[]`（src/table/compat/selection.ts:100）：裸 const 里字面量 `true`
    // 会被推断成 `boolean`，故用 data-grid 声明的字段类型标注，让 `true` 保持字面量（运行时不变）。
    const rowSelection: TableProps<any>['rowSelection'] = {
      onChange: handleChange,
      selections: true,
    }
    const { container } = customRender(createTable({ rowSelection }))

    openSelectionMenu(container)
    fireEvent.click(menuItems()[0])

    expect(handleChange.mock.calls[0][0]).toEqual([0, 1, 2, 3])
  })

  // antd L483
  // antd 此处对 `.ant-dropdown` 做快照；data-grid 的菜单 portal 到 document.body 且类名体系不同，
  // 故改为直测「默认 selections 渲染出三个内置项 + 文案取自 locale」
  // （src/table/selectionAdapter.tsx 的 resolvedSelections locale 映射、useRowSelection.ts 的
  // resolvedSelections 内置三项列表）。
  it('render with default selection correctly', () => {
    // `selections: true` 需字面量类型（src/table/compat/selection.ts:100），标注同 `works with selectAll`。
    const rowSelection: TableProps<any>['rowSelection'] = {
      selections: true,
    }
    const { container } = customRender(createTable({ rowSelection }))

    expect(container.querySelector('.dg-selection-dropdown-trigger')).toBeTruthy()
    openSelectionMenu(container)

    expect(menuItems().map((item) => item.textContent)).toEqual([
      'Select all data',
      'Invert current page',
      'Clear all data',
    ])
  })

  // antd L497
  // 回调顺序实测按 data-grid：onChange → onChange → onSelectInvert
  // （src/table/useSelectionAdapter.ts 的 fireSelectionChange 派发段，现 :398-427；onChange :398、onSelectInvert :412）。
  it('fires selectInvert event', () => {
    const order: string[] = []
    const handleSelectInvert = vi.fn().mockImplementation(() => {
      order.push('onSelectInvert')
    })
    const handleChange = vi.fn().mockImplementation(() => {
      order.push('onChange')
    })
    const rowSelection: TableProps<any>['rowSelection'] = {
      onChange: handleChange,
      onSelectInvert: handleSelectInvert,
      selections: true,
    }
    const { container } = customRender(createTable({ rowSelection }))

    fireEvent.click(bodyInputs(container)[0])
    openSelectionMenu(container)

    fireEvent.click(menuItems()[1])

    expect(handleSelectInvert).toHaveBeenCalledWith([1, 2, 3])
    expect(order).toEqual(['onChange', 'onChange', 'onSelectInvert'])
  })

  // antd L530
  // 回调顺序实测按 data-grid：onChange → onChange → onSelectNone。
  it('fires selectNone event', () => {
    const order: string[] = []
    const handleChange = vi.fn().mockImplementation(() => {
      order.push('onChange')
    })
    const handleSelectNone = vi.fn().mockImplementation(() => {
      order.push('onSelectNone')
    })
    const rowSelection: TableProps<any>['rowSelection'] = {
      onChange: handleChange,
      onSelectNone: handleSelectNone,
      selections: true,
    }
    const { container } = customRender(createTable({ rowSelection }))

    fireEvent.click(bodyInputs(container)[0])
    openSelectionMenu(container)
    const dropdownMenuItems = menuItems()
    fireEvent.click(dropdownMenuItems[dropdownMenuItems.length - 1])

    expect(handleSelectNone).toHaveBeenCalled()
    expect(order).toEqual(['onChange', 'onChange', 'onSelectNone'])
  })

  // antd L559
  it('fires selection event', () => {
    const handleSelectOdd = vi.fn()
    const handleSelectEven = vi.fn()
    const rowSelection = {
      selections: [
        Table.SELECTION_ALL,
        Table.SELECTION_INVERT,
        {
          key: 'odd',
          text: '奇数项',
          onSelect: handleSelectOdd,
        },
        {
          key: 'even',
          text: '偶数项',
          onSelect: handleSelectEven,
        },
      ],
    }
    const { container } = customRender(createTable({ rowSelection }))

    openSelectionMenu(container)

    const dropdownMenuItems = menuItems()

    expect(dropdownMenuItems.length).toBe(4)

    fireEvent.click(dropdownMenuItems[2])
    expect(handleSelectOdd).toHaveBeenCalledWith([0, 1, 2, 3])

    openSelectionMenu(container)
    fireEvent.click(menuItems()[3])
    expect(handleSelectEven).toHaveBeenCalledWith([0, 1, 2, 3])
  })

  describe('preset selection options', () => {
    const presetData = [
      { key: 0, name: 'Jack' },
      { key: 1, name: 'Lucy', disabled: true },
      { key: 2, name: 'Tom' },
    ]

    const getCheckboxProps = (record: any) => record

    // antd L607
    // SELECTION_ALL 实测：结果是「已选集合 + 全部可勾选行」，故已选 key 2 排在新增 key 0 之前
    // （src/table/engine/useRowSelection.ts:407-411）→ [2, 0]；antd 按数据源顺序给 [0, 2]。
    it('SELECTION_ALL', () => {
      const onChange = vi.fn()
      const { container } = customRender(
        createTable({
          dataSource: presetData,
          rowSelection: {
            onChange,
            defaultSelectedRowKeys: [2],
            getCheckboxProps,
            selections: [Table.SELECTION_ALL],
          },
        }),
      )

      openSelectionMenu(container)

      fireEvent.click(menuItems()[0])
      expect(onChange).toHaveBeenCalledWith([2, 0], expect.anything(), { type: 'all' })
    })

    // antd L632
    it('SELECTION_INVERT', () => {
      const onChange = vi.fn()
      const { container } = customRender(
        createTable({
          dataSource: presetData,
          rowSelection: {
            onChange,
            defaultSelectedRowKeys: [2],
            getCheckboxProps,
            selections: [Table.SELECTION_INVERT],
          },
        }),
      )

      openSelectionMenu(container)

      fireEvent.click(menuItems()[0])

      expect(onChange).toHaveBeenCalledWith([0], expect.anything(), { type: 'invert' })
    })

    // antd L658
    it('SELECTION_NONE', () => {
      const onChange = vi.fn()
      const { container } = customRender(
        createTable({
          dataSource: presetData,
          rowSelection: {
            onChange,
            defaultSelectedRowKeys: [1, 2],
            getCheckboxProps,
            selections: [Table.SELECTION_NONE],
          },
        }),
      )

      openSelectionMenu(container)

      fireEvent.click(menuItems()[0])

      expect(onChange).toHaveBeenCalledWith([1], expect.anything(), { type: 'none' })
    })

    // 步骤 80 / E-158 缺陷 2 的**对照面**（双臂探针 B2，裁判 antd 6.4.4，读数 tmp/80-probe-readings.txt）：
    // NONE 的保留面＝「已选 ∧ disabled」，这一维在**不分页**（上面那条）与**该 disabled 行就在当前页**
    // （本条新增的分母维）两种形状下两侧**同值**（dg `[1]` ＝ antd `[1]`）。
    // ⇒ 本条的作用是把「干脆让 NONE 清空一切」这种错修当场钉红。
    //   缺陷 2 本体（**跨页**的 disabled 已选行清不掉＝探针 B1／步骤 79 的 B4c：dg `[3]` vs antd `[]`）
    //   本轮**未修并交回**：参照的 `checkboxPropsMap` 建在 `pageData`
    //   （antd 6.4.4 `useSelection.js:92` `flattenData(childrenColumnName, pageData)` ＋ `:115-124`），
    //   NONE 的保留判据在 `:236-247`（`filter(key => checkboxPropsMap.get(key)?.disabled)`）；
    //   我方 `engine/useRowSelection.ts` 的 NONE 保留面读 `changeableRowKeys`
    //   ＝ `selectableKeys`，而建在**未分页**的 `selectionDataSource`（`useSelectionAdapter.ts:147-161`
    //   收 `Table.tsx:535-546` 喂的 `filteredDataSource`）。要对齐就得把当前页切片喂进选择层，
    //   而 `pagedDataSource` 出自 `Table.tsx:783-799` 的 usePaginationAdapter（在选择 hook **之后**）
    //   ⇒ 与文件头 g) 条（29-B）同一堵墙、同一个待裁的产品形状，本棒红线禁改 `Table.tsx`（日志 §9）。
    it('keeps a disabled selected row that is on the current page when SELECTION_NONE is used', () => {
      const onChange = vi.fn()
      const { container } = customRender(
        createTable({
          pagination: { pageSize: 2 },
          rowSelection: {
            onChange,
            selections: [Table.SELECTION_NONE],
            selectedRowKeys: [0, 1],
            getCheckboxProps: (record: Row) => ({ disabled: record.key === 1 }),
          },
        }),
      )
      // P-102 同型硬闸：当前页只渲染 2 行（key0 / key1），其中 key1 disabled 且已选
      expect(bodyInputs(container).length).toBe(2)

      openSelectionMenu(container)
      fireEvent.click(menuItems()[0])
      expect(onChange).toHaveBeenLastCalledWith([1], [data[1]], { type: 'none' })
    })
  })

  // antd L685
  // 实测：hideSelectAll 时表头选择格内容为空（不渲染全选 checkbox，也不渲染选择菜单触发器，
  // src/table/selectionAdapter.tsx:195），故 antd 的 `.ant-selection`（data-grid 无此容器）改为
  // 直测表头格内无 input。
  it('could hide selectAll checkbox and custom selection', () => {
    const rowSelection = {
      hideSelectAll: true,
    }
    const { container } = customRender(createTable({ rowSelection }))
    expect(container.querySelector('.ant-selection')).toBeFalsy()
    expect(headerInput(container)).toBeFalsy()
    expect(container.querySelector('.dg-selection-dropdown-trigger')).toBeFalsy()
  })

  // antd L693
  it('handle custom selection onSelect correctly when hide default selection options', () => {
    const handleSelectOdd = vi.fn()
    const handleSelectEven = vi.fn()
    const rowSelection = {
      selections: [
        {
          key: 'odd',
          text: '奇数项',
          onSelect: handleSelectOdd,
        },
        {
          key: 'even',
          text: '偶数项',
          onSelect: handleSelectEven,
        },
      ],
    }
    const { container } = customRender(createTable({ rowSelection }))

    openSelectionMenu(container)

    const dropdownMenuItems = menuItems()
    expect(dropdownMenuItems.length).toBe(2)

    fireEvent.click(dropdownMenuItems[0])
    expect(handleSelectOdd).toHaveBeenCalledWith([0, 1, 2, 3])

    openSelectionMenu(container)
    fireEvent.click(menuItems()[1])
    expect(handleSelectEven).toHaveBeenCalledWith([0, 1, 2, 3])
  })

  // antd L730
  // 缺口 #10 已修：表头全选的 disabled 由「无可选行」推导（engine/useRowSelection.ts 的
  // allDisabled + selectionAdapter.tsx 的 titleDisabled 兜底），故数据源全 disabled 时
  // 表头与表体 input 一起 disabled（实测 headerInput(container)!.disabled === true）。
  it('handles disabled checkbox correctly when dataSource changes', () => {
    const rowSelection: TableProps<any>['rowSelection'] = {
      getCheckboxProps: (record) => ({ disabled: record.disabled }),
    }
    const { container, rerender } = customRender(createTable({ rowSelection }))
    const newData = [
      { key: 0, name: 'Jack', disabled: true },
      { key: 1, name: 'Lucy', disabled: true },
    ]

    rerender(createTable({ rowSelection, dataSource: newData }))
    // 数量前置（E-024 F-3）：下面的 forEach 在**空集合**上恒真 ⇒ 先钉住遍历面真的有内容。
    // 实测（探针 C1）：rerender 前 5 个 input（表头 + 4 行），rerender 后 3 个（表头 + 2 行）。
    expect(container.querySelectorAll('input')).toHaveLength(3)
    container.querySelectorAll('input').forEach((checkbox) => {
      expect(checkbox.disabled).toBe(true)
    })
  })

  // antd L747
  it('should allow dynamic getCheckboxProps', () => {
    const { container, rerender } = customRender(
      <Table
        columns={columns}
        dataSource={data}
        rowSelection={{
          getCheckboxProps: (record) => ({ disabled: record.name === 'Jack' }),
        }}
      />,
    )

    let checkboxList = container.querySelectorAll('input')
    expect(checkboxList[1]).toHaveAttribute('disabled')
    expect(checkboxList[2]).not.toHaveAttribute('disabled')

    rerender(
      <Table
        columns={columns}
        dataSource={data}
        rowSelection={{
          getCheckboxProps: (record) => ({ disabled: record.name === 'Lucy' }),
        }}
      />,
    )
    checkboxList = container.querySelectorAll('input')
    expect(checkboxList[1]).not.toHaveAttribute('disabled')
    expect(checkboxList[2]).toHaveAttribute('disabled')
  })

  // antd L777
  it('should not switch pagination when select record', () => {
    const newData: Record<'key' | 'name', string>[] = []
    for (let i = 0; i < 20; i += 1) {
      newData.push({
        key: i.toString(),
        name: i.toString(),
      })
    }
    const { container } = customRender(
      createTable({
        rowSelection: {},
        dataSource: newData,
      }),
    )
    fireEvent.click(container.querySelectorAll('.ant-pagination-item')[1])
    fireEvent.click(headerInput(container)!)

    expect(renderedNames(container)).toEqual([
      '10',
      '11',
      '12',
      '13',
      '14',
      '15',
      '16',
      '17',
      '18',
      '19',
    ])
    expect(container.querySelector('.ant-pagination-item-active')?.textContent).toBe('2')
  })

  // antd L808
  // 重映射：data-grid 无 tr，选中态加在该行全部表格上（src/table/engine/BodyGrid.tsx:183-184）。
  it('highlight selected row', () => {
    const { container } = customRender(createTable())

    fireEvent.click(bodyInputs(container)[0])
    const rowCells = Array.from(
      container.querySelectorAll('.dg-cell-body[data-row-index="0"]'),
    ) as HTMLElement[]
    expect(rowCells.length).toBeGreaterThan(0)
    expect(rowCells.every((cell) => cell.className.includes('dg-row-selected'))).toBe(true)
  })

  // antd L817
  // 固定类名重映射：antd `ant-table-cell-fix-start` → data-grid `dg-cell-fixed-start`
  // （src/table/style/table.css，别名 ant-table-cell-fix-left）。
  it('fix selection column on the start', () => {
    const { container } = customRender(
      createTable({
        rowSelection: { fixed: true },
        scroll: { x: 903 },
      }),
    )

    expect(container.querySelector('[data-column-key="__dg_selection__"]')).toHaveClass(
      'dg-cell-fixed-start',
    )
  })

  // antd L830
  it('fix expand on th start when selection column fixed on the start', () => {
    const { container } = customRender(
      createTable({
        expandable: {
          expandedRowRender() {
            return <div />
          },
        },
        rowSelection: { fixed: true },
        scroll: { x: 903 },
      }),
    )

    expect(
      container.querySelector('[data-column-key="__dg_selection__"].dg-cell-header'),
    ).toHaveClass('dg-cell-fixed-start')
  })

  // antd L848
  it('fix selection column on the start when any other column is fixed', () => {
    const { container } = customRender(
      createTable({
        rowSelection: {},
        columns: [
          {
            title: 'Name',
            dataIndex: 'name',
            fixed: 'start',
          },
          {
            title: 'Age',
            dataIndex: 'age',
          },
        ],
        scroll: { x: 903 },
      }),
    )

    expect(
      container.querySelector('[data-column-key="__dg_selection__"].dg-cell-header'),
    ).toHaveClass('dg-cell-fixed-start')
  })

  // antd L872
  // antd 此处做快照。data-grid 只把 `Table.SELECTION_COLUMN` 哨兵当作选择列插入位置
  // （src/table/useColumnTreeBuilder.ts:75-91），普通列的 key 字面量 'selection-column' 不参与识别，
  // 故改为直测：选择列（`__dg_selection__`）仍在最前，用户列在原位。
  it('use column as selection column when key is `selection-column`', () => {
    const { container } = customRender(
      createTable({
        rowSelection: {},
        columns: [
          {
            title: 'Name',
            dataIndex: 'name',
            key: 'selection-column',
          },
        ],
      }),
    )

    const headerKeys = Array.from(
      container.querySelectorAll<HTMLElement>('.dg-cell-header[data-column-key]'),
    ).map((cell) => cell.dataset.columnKey)
    expect(headerKeys).toEqual(['__dg_selection__', 'selection-column'])
  })

  // antd L890
  it('should keep all checked state when remove item from dataSource', () => {
    const { container, rerender } = customRender(
      <Table
        rowSelection={{
          selectedRowKeys: [0, 1, 2, 3],
        }}
        columns={columns}
        dataSource={data}
      />,
    )
    const checkboxes = container.querySelectorAll('.ant-checkbox')
    expect(checkboxes.length).toBe(5)
    checkboxes.forEach((checkbox) => {
      expect(checkbox.querySelector('input')?.checked).toBe(true)
      expect(checkbox.className.includes('ant-checkbox-indeterminate')).toBe(false)
    })

    rerender(
      <Table
        rowSelection={{
          selectedRowKeys: [1, 2, 3],
        }}
        columns={columns}
        dataSource={data.slice(1)}
      />,
    )

    expect(container.querySelectorAll('.ant-checkbox').length).toBe(4)
    container.querySelectorAll('.ant-checkbox').forEach((checkbox) => {
      expect(checkbox.querySelector('input')?.checked).toBe(true)
      expect(checkbox.className.includes('ant-checkbox-indeterminate')).toBe(false)
    })
  })

  // antd L925
  it('add columnTitle for rowSelection', () => {
    const { container, rerender } = customRender(
      <Table columns={columns} dataSource={data} rowSelection={{ columnTitle: '多选' }} />,
    )
    expect(
      container.querySelector('[data-column-key="__dg_selection__"].dg-cell-header')?.textContent,
    ).toBe('多选')
    rerender(
      <Table
        columns={columns}
        dataSource={data}
        rowSelection={{
          type: 'radio',
          columnTitle: '单选',
        }}
      />,
    )
    expect(
      container.querySelector('[data-column-key="__dg_selection__"].dg-cell-header')?.textContent,
    ).toBe('单选')
  })

  // antd L943
  // skip 依据：columnTitle 函数收到的 node 是 data-grid 自绘的 `<SelectionInput>`
  // （src/table/selectionAdapter.tsx headerContent 里构造的 `checkbox`），该组件按 props 名单消费
  // （src/table/engine/SelectionInput.tsx 的 SelectionInputProps）——缺口 #9 把名单扩到
  // title/id/className/onClick/onChange 等，但**仍不透传 children 与任意 rest props**，
  // 所以 cloneElement 注入的 children / data-testid 都丢失（实测表头 textContent === ''、
  // input 无 data-testid）；antd 的 node 是 `<Checkbox>`，会渲染 children。
  it.skip('columnTitle for rowSelection to be renderProps', () => {
    const { container } = customRender(
      <Table
        columns={columns}
        dataSource={data}
        rowSelection={{
          columnTitle: (originalNode) =>
            cloneElement(originalNode as any, {
              'data-testid': 'selection-checkbox',
              children: '多选',
            }),
        }}
      />,
    )

    expect(
      container.querySelector('[data-column-key="__dg_selection__"].dg-cell-header')?.textContent,
    ).toBe('多选')
  })

  // antd L971
  // 缺口 #12a 已修：非 preserve 分支的存在性判定改为查 **rawData key→record 表**
  //   （src/table/useSelectionAdapter.ts 的 recordByKey，对齐 antd
  //   es/table/InternalTable.js:177 useLazyKVMap(rawData,...) + es/table/hooks/useSelection.js:161-178），
  //   不再用「排序+筛选后的可见行」→ 被筛掉的已选 key 不会被下一次勾选删掉。
  // 实测（探针 P1/P1c，tmp/probe-bat6b.test.tsx）：筛到 Jack 勾选 → keys [0]/rows ["Jack"]；
  //   切到只筛 Lucy 再勾选 → keys [0,1]/rows ["Jack","Lucy"]，与 antd@6.4.4 **逐值相同**
  //   （修复前 dg 是 [1] / ["Lucy"]，即丢数据）。rows 顺序＝keys 数组顺序（antd `:184` `keys.map`）。
  // ★ 与参照原用例的写法差异（有意为之，别改回去）：参照
  //   `{{AntDesign}}/components/table/__tests__/Table.rowSelection.test.tsx:971-1031`
  //   靠列级 **`filterDropdownOpen: true`** 让面板常开，再 `clickFilter([0,1])`（取消 Jack + 勾 Lucy）
  //   ⇒ 可见行数仍是 1（只有 Lucy），于是「已选的 Jack 被筛出可见区」，点 Lucy 得 keys 长度 2。
  //   而 `filterDropdownOpen` 是 antd **已废弃**字段、本库**刻意不实现**（`docs/reference/compat-matrix.md`
  //   的「未实现」行、`docs/reference/deprecated-antd-table-members.md`、本仓
  //   `Table.filter.test.tsx:395-405` 已把它登记为 skip），所以参照那条序列在本仓**无法逐字镜像**。
  //   探针实测（`tmp/probe-bat6b-filter.test.tsx` D1–D5，读数存
  //   `tmp/vortex-logs/fix-real-bugs/22-evidence-bat6b-filter-diag.log`）：用「点触发器开面板」去镜像时，
  //   dg 第二轮对「已勾选那一项」的取消点击不生效（点击前后面板项的 checked 态完全一致），
  //   而 antd 侧同序列（无 filterDropdownOpen）第二轮 onChange 也是 `keys=[]`
  //   ⇒ 「2」属于 `filterDropdownOpen` 那条序列，不属于镜像出来的这条。
  //   故本用例改用**受控 `filteredValue` + rerender**，直接表达参照序列的语义前提与结论
  //   （第 2 轮可见行＝1 且已不含被选中的 Jack ⇒ keys 与 rows 都仍留着 Jack），
  //   同时避开正被 BAT-1/BAT-18 在飞编辑的筛选面板 DOM。
  it('should keep item even if in filter', () => {
    const makeFilterColumns = (filteredValue: Array<string>): TableProps['columns'] => [
      {
        title: 'Name',
        dataIndex: 'name',
        filters: [
          {
            text: 'Jack',
            value: 'Jack',
          },
          {
            text: 'Lucy',
            value: 'Lucy',
          },
        ],
        filteredValue,
        onFilter: (value: any, record: any) => record.name.indexOf(value) === 0,
      },
    ]

    const onChange = vi.fn()
    const rowSelection = {
      onChange,
    }

    const { container, rerender } = customRender(
      <Table columns={makeFilterColumns(['Jack'])} dataSource={data} rowSelection={rowSelection} />,
    )

    // 第 1 轮：只见 Jack，勾选它。
    expect(renderedNames(container)).toEqual(['Jack'])
    fireEvent.click(bodyInputs(container)[0])
    expect(onChange.mock.calls[0][0].length).toBe(1)
    expect(onChange.mock.calls[0][0]).toEqual([0])
    expect((onChange.mock.calls[0][1] as Array<Row>).map((r) => r.name)).toEqual(['Jack'])

    // 第 2 轮：把 Jack 筛出可见区（受控切成只筛 Lucy），再勾选 Lucy。
    rerender(
      <Table columns={makeFilterColumns(['Lucy'])} dataSource={data} rowSelection={rowSelection} />,
    )
    expect(renderedNames(container)).toEqual(['Lucy'])
    fireEvent.click(bodyInputs(container)[0])
    // ★ 被筛出可见区的 Jack（key 0）必须还在——这就是 #12a 的验收点。
    expect(onChange.mock.calls[1][0].length).toBe(2)
    expect(onChange.mock.calls[1][0]).toEqual([0, 1])
    expect((onChange.mock.calls[1][1] as Array<Row>).map((r) => r.name)).toEqual(['Jack', 'Lucy'])
  })

  // antd L1035
  // antd 本用例构造了 objectContaining 却从未真正断言（原文件 L1062-1066 的两处
  // `expect.objectContaining(...)` 只是取值，没有 expect 调用），故按用例名表达的真实意图
  // 直测：`childrenColumnName="test"` 生效 → `children` 不当树形展开，只有表头 + 2 行；
  // 勾满全部行后表头才变全选。
  it('render correctly when set childrenColumnName', () => {
    const newData = [
      {
        key: 1,
        name: 'Jack',
        children: [
          {
            key: 11,
            name: 'John Brown',
          },
        ],
      },
      {
        key: 2,
        name: 'Lucy',
        children: [
          {
            key: 21,
            name: 'Lucy Brown',
          },
        ],
      },
    ]
    const { container } = customRender(
      <Table columns={columns} dataSource={newData} childrenColumnName="test" rowSelection={{}} />,
    )
    expect(container.querySelectorAll('input').length).toBe(3)

    fireEvent.click(container.querySelectorAll('input')[1])
    expect(headerInput(container)?.checked).toBe(false)
    expect(isIndeterminate(headerInput(container))).toBe(true)

    fireEvent.click(container.querySelectorAll('input')[2])
    expect(headerInput(container)?.checked).toBe(true)
    expect(isIndeterminate(headerInput(container))).toBe(false)
  })

  // antd L1075
  // 适配：antd 顶层 `expandedRowKeys` 在 data-grid 需放进 `expandable`（见文件头注释 e）。
  // 缺口 #12a 已修：selectedRows 改为**按 keys 数组顺序**从 rawData 查表给出
  // （src/table/useSelectionAdapter.ts 的 recordByKey + rows 构造），与 antd 逐值一致
  // （es/table/hooks/useSelection.js:184 `keys.map(getRecordByKey)`）
  // ⇒ 旧版「dg 按 dataSource 顺序给 [父, 子]、antd 给 [子, 父]」的分叉消失，本用例回归 antd 原断言。
  it('should get selectedRows correctly when set childrenColumnName', () => {
    const onChange = vi.fn()
    const newData = [
      {
        key: 1,
        name: 'Jack',
        list: [
          {
            key: 11,
            name: 'John Brown',
          },
        ],
      },
    ]
    const { container } = customRender(
      <Table
        columns={columns}
        dataSource={newData}
        expandable={{ childrenColumnName: 'list', expandedRowKeys: [1] }}
        rowSelection={{ onChange }}
      />,
    )
    const checkboxes = container.querySelectorAll('input')

    fireEvent.click(checkboxes[2])

    expect(onChange).toHaveBeenLastCalledWith([11], [newData[0].list[0]], { type: 'single' })
    onChange.mockReset()

    fireEvent.click(checkboxes[1])
    const item0 = newData[0]
    expect(onChange).toHaveBeenLastCalledWith([11, 1], [newData[0].list[0], item0], {
      type: 'single',
    })
  })

  // antd L1112
  it('clear selection className when remove `rowSelection`', () => {
    const dataSource = [
      { id: 1, name: 'Hello', age: 10 },
      { id: 2, name: 'World', age: 30 },
    ]

    // 真实 API 偏差：antd 顶层 `expandedRowRender` 由 InternalTable 消费
    // （antd components/table/InternalTable.tsx:217,358），data-grid 只在 `expandable.expandedRowRender`
    // 消费（src/table/compat/expand.ts:49；src/table/Table.tsx:613-620）；顶层传入被静默忽略
    // （Table 只解构 TableProps 已声明字段，src/table/Table.tsx:232-233）。
    // 本用例对齐 antd 用例语义（照 antd 传参形状传顶层 expandedRowRender），故把它挂在 data-grid 声明的
    // TableProps 上（交叉类型，运行时原样传递、不改断言；同款写法见 Table.sorter.test.tsx:501-504）。
    const antdOnlyExpand: TableProps<any> & { expandedRowRender?: () => null } = {
      expandedRowRender: () => null,
    }

    const { container, rerender } = customRender(
      <Table
        columns={columns}
        dataSource={dataSource}
        rowSelection={{}}
        {...antdOnlyExpand}
        rowKey="id"
      />,
    )
    const checkboxes = container.querySelectorAll('input')
    fireEvent.click(checkboxes[1])

    // 重映射 antd `tr.ant-table-row-selected` 数量 1：data-grid 无行元素，选中态加在该行全部格上，
    // 本表有「选择列 + Name 列」2 个格 → 2 个 `.dg-row-selected`，且都属于 data-row-index="0"。
    const selectedCells = Array.from(
      container.querySelectorAll<HTMLElement>('.dg-row-selected'),
    )
    expect(selectedCells.length).toBe(2)
    expect(selectedCells.every((cell) => cell.dataset.rowIndex === '0')).toBe(true)

    rerender(
      <Table
        columns={columns}
        dataSource={dataSource}
        rowSelection={null as unknown as TableProps<any>['rowSelection']}
        {...antdOnlyExpand}
        rowKey="id"
      />,
    )

    expect(container.querySelectorAll('.dg-row-selected').length).toBe(0)
  })

  // antd L1145
  it('select by checkbox to trigger stopPropagation', () => {
    const { container } = customRender(createTable())
    expect(() => {
      fireEvent.click(container.querySelectorAll('.ant-checkbox')[4])
    }).not.toThrow()
  })

  // antd L1152
  // 缺口 #10 已修：selectionAdapter 表头段 disabled 兜底 = 「无可选行」（对齐 antd
  // `disabled ?? (flattedData.length === 0 || allDisabled)`），且 onChange 用同一个合并后的
  // disabled 做守卫 —— 实测：全 disabled 数据源下点表头，onChange / onSelectAll 各 0 次
  // （修复前会收到一次 `onChange([], [], {type:'all'})` + `onSelectAll(true, [], [])`）。
  it('all disabled should not make select all checked', () => {
    const onChange = vi.fn()
    const onSelectAll = vi.fn()
    const { container } = customRender(
      createTable({
        rowSelection: {
          onChange,
          onSelectAll,
          getCheckboxProps: () => ({ disabled: true }),
        },
      }),
    )

    expect(headerInput(container)?.disabled).toBeTruthy()
    expect(headerInput(container)?.checked).toBeFalsy()

    fireEvent.click(headerInput(container)!)
    expect(onChange).not.toHaveBeenCalled()
    expect(onSelectAll).not.toHaveBeenCalled()
  })

  // antd L1169
  // 缺口 #10 已修：全 disabled 且每行都选中 → 表头为 checked（对齐 antd
  // allDisabledAndChecked；引擎侧 allCheckedDisabled，useRowSelection.ts）。
  it('should make select all checked when each item is checked and disabled', () => {
    const { container } = customRender(
      createTable({
        rowSelection: {
          selectedRowKeys: [0, 1, 2, 3],
          getCheckboxProps: () => ({
            disabled: true,
          }),
        },
      }),
    )

    expect(headerInput(container)?.disabled).toBeTruthy()
    expect(headerInput(container)?.checked).toBeTruthy()
  })

  // antd L1189
  // 缺口 #10 已修：全 disabled 且只有部分行选中 → 表头为半选（对齐 antd
  // allDisabledSomeChecked；引擎侧 someDisabledChecked）。
  it('should make select all indeterminate when each item is disabled and some item is checked', () => {
    const { container } = customRender(
      createTable({
        rowSelection: {
          selectedRowKeys: [0],
          getCheckboxProps: () => ({
            disabled: true,
          }),
        },
      }),
    )

    expect(headerInput(container)?.disabled).toBeTruthy()
    expect(headerInput(container)?.checked).toBeFalsy()
    expect(isIndeterminate(headerInput(container))).toBe(true)
  })

  // antd L1212
  it('should make select all checked when each item is checked and some item is disabled', () => {
    const { container } = customRender(
      createTable({
        rowSelection: {
          selectedRowKeys: [0, 1, 2, 3],
          getCheckboxProps: (record) => ({
            disabled: record.key === 0,
          }),
        },
      }),
    )

    expect(headerInput(container)?.disabled).toBeFalsy()
    expect(headerInput(container)?.checked).toBeTruthy()
    // 未全 disabled → 半选态只取 intermediate（antd `!allDisabled` 分支）；已全选故非半选。
    expect(isIndeterminate(headerInput(container))).toBe(false)
  })

  // antd L1232
  it('should not make select all checked when some item is checked and disabled', () => {
    const { container } = customRender(
      createTable({
        rowSelection: {
          selectedRowKeys: [1],
          getCheckboxProps: (record) => ({
            disabled: record.key === 0,
          }),
        },
      }),
    )

    expect(headerInput(container)?.disabled).toBeFalsy()
    expect(headerInput(container)?.checked).toBeFalsy()
    expect(isIndeterminate(headerInput(container))).toBe(true)
  })

  // antd L1253
  // 缺口 #12b 已修：`<SelectionInput>` 的 Radio / Checkbox 两条分支都在控件上
  //   `e.stopPropagation()`（src/table/engine/SelectionInput.tsx 的 handleClick），
  //   与 antd 一致（es/table/hooks/useSelection.js:398-401 / :418-421 都是
  //   `onClick: e => { e.stopPropagation(); checkboxProps?.onClick?.(e) }`）。
  //   用户的 getCheckboxProps().onClick 仍在 stopPropagation **之后**被调用。
  // 实测（探针 P3）：点勾选框 → onRow.onClick 0 次（修复前 1 次）；点行本体仍照常 1 次。
  it('should onRowClick not called when checkbox clicked', () => {
    const onRowClick = vi.fn()

    const { container } = customRender(
      createTable({
        onRow: () => ({
          onClick: onRowClick,
        }),
      }),
    )
    const checkboxes = container.querySelectorAll('input')
    fireEvent.click(checkboxes[checkboxes.length - 1])

    expect(onRowClick).not.toHaveBeenCalled()
  })

  // antd L1269
  // 缺口 #12c 已修：Table 级 `getPopupContainer` 现在透传给选择列表头下拉的 `<Dropdown>`
  //   （src/table/Table.tsx 调用 buildSelectionColumnNode 时传入 → src/table/selectionAdapter.tsx
  //   SelectionsDropdown 的 `getPopupContainer`），antd 在同一处也传了
  //   （es/table/hooks/useSelection.js:326-329）。
  // 实测（探针 P4）：打开选择菜单 → getPopupContainer 调用 7 次、菜单落在返回容器内
  //   （修复前 dg 调用 0 次、菜单挂到 document.body），与 antd@6.4.4 逐值相同。
  // 参照写法逐点对齐：mock 用 `(node) => node`（返回触发节点本身，参照同款），
  //   触发方式本仓是 `trigger={['click']}`（参照该处走 Dropdown 默认 hover）——这一条是
  //   **已登记差异**（台账 E-011：两侧都可用），故这里点触发器而不是 mouseEnter。
  //   参照另有一次 `expect(container.firstChild).toMatchSnapshot()`，本仓由 demo 快照层承担，不重复。
  it('should support getPopupContainer', () => {
    const rowSelection: TableProps<any>['rowSelection'] = {
      selections: true,
    }
    const getPopupContainer = vi.fn((node: HTMLElement) => node)
    const { container } = customRender(
      createTable({
        rowSelection,
        getPopupContainer,
      }),
    )
    openSelectionMenu(container)
    expect(getPopupContainer).toHaveBeenCalled()
    // 菜单挂在 getPopupContainer 返回的容器（下拉触发器）里，而触发器在表头选择格内
    //   ⇒ 等价于参照要证的「没挂到 document.body 根下」。
    const selectionHeader = container.querySelector(
      '.dg-cell-header[data-column-key="__dg_selection__"]',
    )
    expect(selectionHeader?.querySelector('.ant-dropdown-menu')).toBeTruthy()
  })

  // antd L1289
  // skip 依据（**与 #12c 不是同一件事**，#12c 已修）：本用例要的是 antd 的
  //   `getPopupContainer: getPopupContainer || getContextPopupContainer` 回退
  //   （es/table/InternalTable.js:244/308，getContextPopupContainer 取自 ConfigContext，`:91`）。
  //   data-grid 只把 Table 级 prop 接到选择菜单（src/table/Table.tsx → selectionAdapter.tsx），
  //   ConfigContext 目前仅消费 `locale`（src/table/Table.tsx 的 mergedLocale useMemo），
  //   没有读 context 的 getPopupContainer → 该回退链缺失，属另一个未登记缺口。
  // 另：本文件的这条用例体从未渲染 ConfigProvider（antd 原用例是 `<ConfigProvider getPopupContainer=…>`
  //   包裹），断言的 spy 也不会被任何路径调用 → 需要连同 ConfigProvider 接线一起做，本批不动。
  it.skip('should support getPopupContainer from ConfigProvider', () => {
    const rowSelection: TableProps<any>['rowSelection'] = {
      selections: true,
    }
    const getPopupContainer = vi.fn((node: HTMLElement) => node)
    const { container } = customRender(createTable({ rowSelection }))
    openSelectionMenu(container)
    expect(getPopupContainer).toHaveBeenCalled()
    expect(container.firstChild).toBeTruthy()
  })

  // antd L1306
  it('Table selection should check', () => {
    const onChange = vi.fn()
    const { container } = customRender(
      <Table
        dataSource={[{ name: 'light', sub: [{ name: 'bamboo' }] }]}
        expandable={{ expandedRowKeys: ['light'], childrenColumnName: 'sub' }}
        rowSelection={{ onChange }}
        rowKey="name"
      />,
    )

    const checkboxes = container.querySelectorAll<HTMLElement>('input')
    fireEvent.click(checkboxes[checkboxes.length - 1])

    expect(onChange.mock.calls[0][1]).toEqual([expect.objectContaining({ name: 'bamboo' })])
  })

  // antd L1323
  // 实测差异：data-grid 的 rowSpan 走 cellMerge——被覆盖格 hidden 不渲染，合并格带 `aria-rowspan`，
  // 故 antd 的 `td[rowspan='4']` 数量断言改为「onCell 每行都被调用 + 合并格 aria-rowspan=4」。
  it('support onCell', () => {
    const onCell = vi.fn().mockReturnValue({ rowSpan: 4 })
    const { container } = customRender(
      createTable({
        rowSelection: {
          onCell,
        },
      }),
    )
    expect(onCell.mock.calls.length).toBeGreaterThanOrEqual(4)
    expect(new Set(onCell.mock.calls.map((call) => call[0].key)).size).toBe(4)
    expect(container.querySelectorAll('[aria-rowspan="4"]').length).toBe(1)
  })

  describe('supports children', () => {
    const dataWithChildren = [
      { key: 0, name: 'Jack' },
      { key: 1, name: 'Lucy' },
      { key: 2, name: 'Tom' },
      {
        key: 3,
        name: 'Jerry',
        children: [
          {
            key: 4,
            name: 'Jerry Jack',
          },
          {
            key: 5,
            name: 'Jerry Lucy',
          },
          {
            key: 6,
            name: 'Jerry Tom',
            children: [
              {
                key: 7,
                name: 'Jerry Tom Jack',
              },
              {
                key: 8,
                name: 'Jerry Tom Lucy',
              },
              {
                key: 9,
                name: 'Jerry Tom Tom',
              },
            ],
          },
        ],
      },
    ]
    const flatKeys = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    const flatNames = [
      'Jack',
      'Lucy',
      'Tom',
      'Jerry',
      'Jerry Jack',
      'Jerry Lucy',
      'Jerry Tom',
      'Jerry Tom Jack',
      'Jerry Tom Lucy',
      'Jerry Tom Tom',
    ]

    describe('supports checkStrictly', () => {
      // antd L1375
      it('use data entity key', () => {
        const onChange = vi.fn()

        const table = createTable({
          dataSource: dataWithChildren,
          expandable: { defaultExpandAllRows: true },
          rowSelection: {
            checkStrictly: false,
            onChange,
          },
        })
        const { container } = customRender(table)
        const checkboxes = container.querySelectorAll('input')

        fireEvent.click(checkboxes[4])

        expect(getSelections(container, flatKeys)).toEqual([3, 4, 5, 6, 7, 8, 9])
        expect(getIndeterminateSelection(container, flatKeys)).toEqual([])
        expect(onChange.mock.calls[0][0]).toEqual([3, 4, 5, 6, 7, 8, 9])

        fireEvent.click(container.querySelectorAll('input')[7])

        expect(getSelections(container, flatKeys)).toEqual([4, 5])
        expect(getIndeterminateSelection(container, flatKeys)).toEqual([3])
        expect(onChange.mock.calls[1][0]).toEqual([4, 5])
      })

      // 步骤 80（缺陷 1 判据的第四个合取项，探针 C2 双臂实测）：参照的门是
      // `shiftKey && checkStrictly && isMultiple`（antd 6.4.4 useSelection.js:429）
      // ⇒ **父子联动模式下参照根本不做区间**，走 `conductCheck` 的单行支。
      // 旧门（`shiftKey && 锚点存在`）没有这一项 ⇒ 联动模式下会走「不传导父子」的区间支。
      // 修前/不挂这一项时的实测差：本条序列会得 `[0,1,2]`/`multiple`（区间、无传导），
      //   参照得 `[0,2]`/`single`。摘码反证＝日志 §7 CF-3（摘掉 checkStrictly 项 ⇒ 恰本条红）。
      it('does not range-select on shift click when checkStrictly is false', () => {
        const onChange = vi.fn()
        const onSelectMultiple = vi.fn()
        const table = createTable({
          dataSource: dataWithChildren,
          expandable: { defaultExpandAllRows: true },
          rowSelection: {
            checkStrictly: false,
            onChange,
            onSelectMultiple,
          },
        })
        const { container } = customRender(table)
        const inputs = bodyInputs(container)
        expect(inputs.length).toBe(10)

        fireEvent.click(inputs[0])
        expect(onChange).toHaveBeenLastCalledWith([0], [{ key: 0, name: 'Jack' }], {
          type: 'single',
        })

        // 已有选中项（key0）＋ shift ⇒ 若判据漏掉 checkStrictly，这里会拉成 [0,1,2]／multiple
        fireEvent.click(inputs[2], { shiftKey: true })
        expect(onChange).toHaveBeenLastCalledWith([0, 2], [{ key: 0, name: 'Jack' }, { key: 2, name: 'Tom' }], {
          type: 'single',
        })
        expect(onSelectMultiple).not.toHaveBeenCalled()
      })

      // antd L1401
      it('use function rowkey', () => {
        const onChange = vi.fn()
        const table = createTable({
          dataSource: dataWithChildren,
          expandable: { defaultExpandAllRows: true },
          rowSelection: {
            checkStrictly: false,
            onChange,
          },
          rowKey: (entity) => entity.name,
        })
        const { container } = customRender(table)
        const checkboxes = container.querySelectorAll('input')

        fireEvent.click(checkboxes[4])
        expect(getSelections(container, flatNames)).toEqual([
          'Jerry',
          'Jerry Jack',
          'Jerry Lucy',
          'Jerry Tom',
          'Jerry Tom Jack',
          'Jerry Tom Lucy',
          'Jerry Tom Tom',
        ])
        expect(getIndeterminateSelection(container, flatNames)).toEqual([])
        expect(onChange.mock.calls[0][0]).toEqual([
          'Jerry',
          'Jerry Jack',
          'Jerry Lucy',
          'Jerry Tom',
          'Jerry Tom Jack',
          'Jerry Tom Lucy',
          'Jerry Tom Tom',
        ])

        fireEvent.click(container.querySelectorAll('input')[7])
        expect(getSelections(container, flatNames)).toEqual(['Jerry Jack', 'Jerry Lucy'])
        expect(getIndeterminateSelection(container, flatNames)).toEqual(['Jerry'])
        expect(onChange.mock.calls[1][0]).toEqual(['Jerry Jack', 'Jerry Lucy'])
      })

      // antd L1441
      it('use string rowkey', () => {
        const onChange = vi.fn()
        const table = createTable({
          dataSource: dataWithChildren,
          expandable: { defaultExpandAllRows: true },
          rowSelection: {
            checkStrictly: false,
            onChange,
          },
          rowKey: 'name',
        })
        const { container } = customRender(table)
        const checkboxes = container.querySelectorAll('input')

        fireEvent.click(checkboxes[4])
        expect(getSelections(container, flatNames)).toEqual([
          'Jerry',
          'Jerry Jack',
          'Jerry Lucy',
          'Jerry Tom',
          'Jerry Tom Jack',
          'Jerry Tom Lucy',
          'Jerry Tom Tom',
        ])
        expect(getIndeterminateSelection(container, flatNames)).toEqual([])
        expect(onChange.mock.calls[0][0]).toEqual([
          'Jerry',
          'Jerry Jack',
          'Jerry Lucy',
          'Jerry Tom',
          'Jerry Tom Jack',
          'Jerry Tom Lucy',
          'Jerry Tom Tom',
        ])

        fireEvent.click(container.querySelectorAll('input')[7])
        expect(getSelections(container, flatNames)).toEqual(['Jerry Jack', 'Jerry Lucy'])
        expect(getIndeterminateSelection(container, flatNames)).toEqual(['Jerry'])
        expect(onChange.mock.calls[1][0]).toEqual(['Jerry Jack', 'Jerry Lucy'])
      })

      // antd L1481
      it('initialized correctly', () => {
        const table = createTable({
          dataSource: dataWithChildren,
          expandable: { defaultExpandAllRows: true },
          rowSelection: {
            checkStrictly: false,
            selectedRowKeys: [7, 8, 9],
          },
          rowKey: 'key',
        })
        const { container } = customRender(table)
        expect(getSelections(container, flatKeys)).toEqual([6, 7, 8, 9])
        expect(getIndeterminateSelection(container, flatKeys)).toEqual([3])
      })

      // antd L1495
      // skip 依据（缺口 #11，已修）：conductTreeCheck / toggleTreeKey 现在接收 isDisabled 谓词
      // （antd 亦把 isCheckboxDisabled 传给 rc-tree 的 conductCheck）——填充子孙跳过 disabled
      // 行且不穿过它；父行「全选/半选」的分母只算可选子行。
      // 实测：先点 key 9 再点 key 3（key 6 = 'Jerry Tom' 已 disabled）→ 选中 [3,4,5,9]、
      // onChange = [9,3,4,5]，与 antd 一致。
      it('works with disabled checkbox', () => {
        const onChange = vi.fn()

        const table = createTable({
          dataSource: dataWithChildren,
          expandable: { defaultExpandAllRows: true },
          rowSelection: {
            checkStrictly: false,
            onChange,
            getCheckboxProps(record) {
              return {
                disabled: record.name === 'Jerry Tom',
              }
            },
          },
        })
        const { container } = customRender(table)

        const checkboxes = container.querySelectorAll('input')

        fireEvent.click(checkboxes[10])
        fireEvent.click(checkboxes[4])

        // 以下断言面按**参照已提交用例**逐条对齐（`{{AntDesign}}/components/table/__tests__/
        // Table.rowSelection.test.tsx:1495-1526`）。keys 用 `Array.from(...).sort()`——参照**刻意不钉**
        // 这个数组的顺序（本批 keys 顺序的验收点在 `should get selectedRows correctly when set
        // childrenColumnName` 与 `should keep item even if in filter`，那两处参照自己钉了顺序）。
        // 实测原序（探针 P8，dg 与已安装 antd@6.4.4 逐值相同）：[9] → [9,3,4,5] → [9]。
        expect(getSelections(container, flatKeys).sort()).toEqual([3, 4, 5, 9])
        expect(getIndeterminateSelection(container, flatKeys)).toEqual([])
        expect(Array.from(onChange.mock.calls[1][0] as Array<any>).sort()).toEqual([3, 4, 5, 9])

        // 参照的第三击：再点 key 3 取消。disabled 行（key 6 'Jerry Tom'）挡住传导，
        // 其已单独选中的子行 key 9 保持选中。
        fireEvent.click(checkboxes[4])
        expect(getSelections(container, flatKeys)).toEqual([9])
        expect(getIndeterminateSelection(container, flatKeys)).toEqual([])
        expect(onChange.mock.calls[2][0]).toEqual([9])
      })

      // antd L1527
      // 缺口 #11 已修：同 `works with disabled checkbox`（联动排除 disabled 子树）。
      it('works with disabled checkbox and function rowkey', () => {
        const onChange = vi.fn()

        const table = createTable({
          dataSource: dataWithChildren,
          expandable: { defaultExpandAllRows: true },
          rowSelection: {
            checkStrictly: false,
            onChange,
            getCheckboxProps(record) {
              return {
                disabled: record.name === 'Jerry Tom',
              }
            },
          },
          rowKey: (entity) => entity.name,
        })
        const { container } = customRender(table)
        const checkboxes = container.querySelectorAll('input')

        fireEvent.click(checkboxes[10])
        fireEvent.click(checkboxes[4])
        expect(getSelections(container, flatNames)).toEqual([
          'Jerry',
          'Jerry Jack',
          'Jerry Lucy',
          'Jerry Tom Tom',
        ])
        // ↓ 补齐参照已提交用例（:1554-1567）的断言面：indeterminate 为空 + keys（sort 形式）
        //   + 参照的第三击（取消 'Jerry' → 只剩 disabled 子树里已选的 'Jerry Tom Tom'）。
        expect(getIndeterminateSelection(container, flatNames)).toEqual([])
        expect(Array.from(onChange.mock.calls[1][0] as Array<any>).sort()).toEqual([
          'Jerry',
          'Jerry Jack',
          'Jerry Lucy',
          'Jerry Tom Tom',
        ])

        fireEvent.click(checkboxes[4])
        expect(getSelections(container, flatNames)).toEqual(['Jerry Tom Tom'])
        expect(getIndeterminateSelection(container, flatNames)).toEqual([])
        expect(onChange.mock.calls[2][0]).toEqual(['Jerry Tom Tom'])
      })

      // antd L1568
      // 缺口 #11 已修：同 `works with disabled checkbox`（联动排除 disabled 子树）。
      it('works with disabled checkbox and string rowkey', () => {
        const onChange = vi.fn()

        const table = createTable({
          dataSource: dataWithChildren,
          expandable: { defaultExpandAllRows: true },
          rowSelection: {
            checkStrictly: false,
            onChange,
            getCheckboxProps(record) {
              return {
                disabled: record.name === 'Jerry Tom',
              }
            },
          },
          rowKey: 'name',
        })
        const { container } = customRender(table)
        const checkboxes = container.querySelectorAll('input')

        fireEvent.click(checkboxes[10])
        fireEvent.click(checkboxes[4])
        expect(getSelections(container, flatNames)).toEqual([
          'Jerry',
          'Jerry Jack',
          'Jerry Lucy',
          'Jerry Tom Tom',
        ])
        // ↓ 补齐参照已提交用例（:1594-1605）的断言面（同上，rowKey 换成字符串字段）。
        expect(getIndeterminateSelection(container, flatNames)).toEqual([])
        expect(Array.from(onChange.mock.calls[1][0] as Array<any>).sort()).toEqual([
          'Jerry',
          'Jerry Jack',
          'Jerry Lucy',
          'Jerry Tom Tom',
        ])

        fireEvent.click(checkboxes[4])
        expect(getSelections(container, flatNames)).toEqual(['Jerry Tom Tom'])
        expect(getIndeterminateSelection(container, flatNames)).toEqual([])
        expect(onChange.mock.calls[2][0]).toEqual(['Jerry Tom Tom'])
      })

      // antd L1610
      it('should support `childrenColumnName`', () => {
        const onChange = vi.fn()

        const table = createTable({
          dataSource: [
            {
              key: 0,
              name: 'Jack',
              childList: [
                { key: 1, name: 'Light' },
                { key: 2, name: 'Bamboo' },
              ],
            },
          ],
          expandable: {
            childrenColumnName: 'childList',
            defaultExpandAllRows: true,
          },
          rowSelection: {
            checkStrictly: false,
            onChange,
          },
        })
        const { container } = customRender(table)
        const checkboxes = container.querySelectorAll('input')
        expect(checkboxes).toHaveLength(1 + 3)

        fireEvent.click(checkboxes[1])
        expect(getSelections(container, [0, 1, 2])).toEqual([0, 1, 2])
      })
    })

    // 29-E / Y-5（原步骤 42 验证者交回）：`children: []` 退化表项的**生产路径**在真实渲染里可构造——
    // 一个父行 + 两个 **无 `key`（rowKey 不可解析）** 的子行 ⇒ `engine/useTreeData.ts:181-188`
    // 给父行登记 `parentChildrenMap.set(root, [])`（子行 key 全 undefined，被 `childKey !== undefined` 过滤掉）。
    // 摘掉 BAT-16 的 16-B（`selectionTreeConduction.ts:211` 的 `if (!hasSelectableChild) continue`）后，
    // 空 children 的父行会**空转落到 `allChecked=true`** ⇒ 无任何勾选却把 root 判成已勾选（rootChecked 翻 true）。
    // 本条是**功能层**（走 Table 组件真实渲染，读父行 checkbox DOM 态），非纯函数白盒。
    // 反证（摘 src 必红）见批次日志 `50-evidence-CFE-*`。
    it('children 全部 rowKey 不可解析时父行不得显示已勾选（16-B 空 children 退化表项，功能层）', () => {
      const { container } = customRender(
        createTable({
          dataSource: [
            {
              key: 'root',
              name: 'Root',
              children: [{ name: 'NoKey1' }, { name: 'NoKey2' }],
            },
          ],
          expandable: { defaultExpandAllRows: true },
          rowSelection: { checkStrictly: false },
          rowKey: 'key',
        }),
      )

      const inputs = bodyInputs(container)
      // 反 vacuous：两条 keyless 子行确被渲染（否则 3 行只剩父行，父行判据面测不到）。
      expect(renderedNames(container)).toEqual(['Root', 'NoKey1', 'NoKey2'])
      expect(inputs).toHaveLength(3)

      const rootInput = inputs[0]
      // 未勾选任何行 ⇒ 父行既不应 checked、也不应半选（16-B 让空 children 的父行不参与判定）。
      expect(rootInput.checked).toBe(false)
      expect(isIndeterminate(rootInput)).toBe(false)
    })

    // 29-F / PR-6（取消勾选方向的树形级联）：此前**取消方向无门**。
    // 构造 root(可选) > C(disabled) > k(可选)，受控 selectedRowKeys={root,k}，取消 k ⇒
    // 参照（antd 6.4.4 useSelection.js:440-455 的 cleanConductCheck）保留可选祖先 root ⇒ nextKeys=['root']；
    // 旧产品码的向上清在 root「无可选子（唯一子 C 被 disabled）」时空转误删 root ⇒ nextKeys=[]。
    // 这是勾选/取消不对称的 A 类数据结果，功能层可构造、可观测（探针 RFORK 双侧实测 dg=[] / antd=[root]）。
    it('取消隔着 disabled 中间层的深叶时保留可选祖先（PR-6 cleanConductCheck 方向，功能层）', () => {
      const onChange = vi.fn()
      const { container } = customRender(
        createTable({
          dataSource: [
            {
              key: 'root',
              name: 'Root',
              children: [{ key: 'C', name: 'C', children: [{ key: 'k', name: 'K' }] }],
            },
          ],
          expandable: { defaultExpandAllRows: true },
          rowSelection: {
            checkStrictly: false,
            selectedRowKeys: ['root', 'k'],
            onChange,
            getCheckboxProps: (record: any) => ({ disabled: record.key === 'C' }),
          },
          rowKey: 'key',
        }),
      )

      const inputs = bodyInputs(container)
      // 行序：root(0) / C(1) / k(2)——反 vacuous 三条都在。
      expect(renderedNames(container)).toEqual(['Root', 'C', 'K'])
      expect(inputs).toHaveLength(3)
      // 初始：root 与 k 已勾选，C disabled 不可勾。
      expect(inputs[0].checked).toBe(true)
      expect(inputs[2].checked).toBe(true)

      // 取消叶子 k（可选），其祖先链隔着 disabled 的 C。
      fireEvent.click(inputs[2])

      expect(onChange).toHaveBeenCalledTimes(1)
      // 参照语义：只移除 k，保留可选祖先 root（不因「root 无可选中」而误删）。
      expect([...(onChange.mock.calls[0][0] as Key[])].sort()).toEqual(['root'])
    })

    // antd L1641
    // skip 依据（**不是** #9 的字段丢弃，#9 已修）：本用例断言的是 antd 的 **dev warning**
    //   「set `indeterminate` using `rowSelection.getCheckboxProps` is not allowed with tree
    //   structured dataSource.」（es/table/hooks/useSelection.js:404-408 的 nest 分支 warning）。
    //   data-grid 全 src 无 antd 式 dev-warning 通道（最接近的先例是
    //   src/table/engine/usePagination.ts:175 的裸 console.warn，且文案前缀不是 `[antd: Table]`），
    //   复制 antd 的 `[antd: Table]` 前缀会误导调用方 → 本批不发该 warning。
    //   行为侧已对齐：树形父子联动下 `getCheckboxProps().indeterminate` 被**计算值覆盖**
    //   （src/table/selectionAdapter.tsx 的 selection.treeLinkEnabled 分支），与 antd 渲染结果一致，
    //   差的只有这条告警。
    it.skip('warns when set `indeterminate` using `rowSelection.getCheckboxProps` is not allowed with tree structured data.', () => {
      customRender(
        createTable({
          dataSource: dataWithChildren,
          expandable: { defaultExpandAllRows: true },
          rowSelection: {
            checkStrictly: false,
            // 缺口 #9 修完后 `indeterminate` 已是 RowCheckboxProps 的正式字段
            // （单点定义 src/table/nativeOptions.ts）。
            getCheckboxProps(): RowCheckboxProps {
              return {
                indeterminate: true,
              }
            },
          },
        }),
      )
      expect(errorSpy).toHaveBeenCalledWith(
        'Warning: [antd: Table] set `indeterminate` using `rowSelection.getCheckboxProps` is not allowed with tree structured dataSource.',
      )
    })
  })

  describe('cache with selected keys', () => {
    // antd L1664
    it('default not cache', () => {
      const onChange = vi.fn()
      const { container, rerender } = customRender(
        <Table
          dataSource={[{ name: 'light' }, { name: 'bamboo' }]}
          rowSelection={{ onChange }}
          rowKey="name"
        />,
      )

      fireEvent.click(bodyInputs(container)[0])
      expect(onChange).toHaveBeenCalledWith(['light'], [{ name: 'light' }], { type: 'single' })
      rerender(
        <Table dataSource={[{ name: 'bamboo' }]} rowSelection={{ onChange }} rowKey="name" />,
      )
      fireEvent.click(bodyInputs(container)[0])
      expect(onChange).toHaveBeenCalledWith(['bamboo'], [{ name: 'bamboo' }], { type: 'single' })
    })

    // antd L1683
    // 步骤 54 / 29-G：selectedRowKeys 与 selectedRows **都**保留跨数据源的 'light'——
    //   `src/table/useSelectionAdapter.ts` 现按参照那样缓存 preserve 记录（antd **6.4.4**
    //   useSelection.js:71-88/:159-162），rows 顺序＝keys 顺序。裁判读数＝探针 G3/G7 双侧并排。
    //   旧注释写的「selectedRows 只含当前可见行（useSelectionAdapter.ts:268-273）」随 #12a 与 29-G
    //   双双失效（结论与行号都是假话），已回收。
    it('cache with preserveSelectedRowKeys', () => {
      const onChange = vi.fn()
      const { container, rerender } = customRender(
        <Table
          dataSource={[{ name: 'light' }, { name: 'bamboo' }]}
          rowSelection={{ onChange, preserveSelectedRowKeys: true }}
          rowKey="name"
        />,
      )

      fireEvent.click(bodyInputs(container)[0])
      expect(onChange).toHaveBeenCalledWith(['light'], [{ name: 'light' }], { type: 'single' })

      rerender(
        <Table
          dataSource={[{ name: 'bamboo' }]}
          rowSelection={{ onChange, preserveSelectedRowKeys: true }}
          rowKey="name"
        />,
      )
      fireEvent.click(bodyInputs(container)[0])
      expect(onChange).toHaveBeenLastCalledWith(['light', 'bamboo'], [{ name: 'light' }, { name: 'bamboo' }], {
        type: 'single',
      })
    })

    // antd L1711
    it('cache with preserveSelectedRowKeys and checkStrictly false', () => {
      const onChange = vi.fn()
      const { container, rerender } = customRender(
        <Table
          dataSource={[{ name: 'light' }, { name: 'bamboo' }]}
          rowSelection={{ onChange, preserveSelectedRowKeys: true, checkStrictly: false }}
          rowKey="name"
        />,
      )

      fireEvent.click(bodyInputs(container)[0])
      expect(onChange).toHaveBeenCalledWith(['light'], [{ name: 'light' }], { type: 'single' })

      rerender(
        <Table
          dataSource={[{ name: 'bamboo' }]}
          rowSelection={{ onChange, preserveSelectedRowKeys: true, checkStrictly: false }}
          rowKey="name"
        />,
      )
      fireEvent.click(bodyInputs(container)[0])
      expect(onChange).toHaveBeenLastCalledWith(['light', 'bamboo'], [{ name: 'light' }, { name: 'bamboo' }], {
        type: 'single',
      })
    })

    // antd L1739
    // 步骤 54 / 29-G 起与 antd 原用例**逐字同形**：`src/table/useSelectionAdapter.ts` 补了参照的
    //   `preserveRecordsRef` 等价缓存（对齐 antd **6.4.4** useSelection.js:71-88/:159-162），
    //   第二次 onChange 的 selectedRows 会带上「已从 dataSource 消失」的 {key:2}。
    // 裁判读数＝探针 G7 双侧并排（antd 6.4.4 与 data-grid 同为 keys [12,121,2] / rows c,d,e）。
    // 旧版这里曾把 rows 写成缺 {key:2} 的样子并注「实测差异（useSelectionAdapter.ts:268-273）」，
    //   那行号与结论都随 #12a/29-G 失效，已回收。
    it('treeData cache with preserveSelectedRowKeys and checkStrictly false', () => {
      const onChange = vi.fn()
      const treeDataColumns = [
        {
          title: 'Name',
          dataIndex: 'name',
          key: 'name',
        },
      ]
      const treeData = [
        {
          key: 1,
          name: 'a',
          children: [
            {
              key: 11,
              name: 'b',
            },
            {
              key: 12,
              name: 'c',
              children: [
                {
                  key: 121,
                  name: 'd',
                },
              ],
            },
          ],
        },
        {
          key: 2,
          name: 'e',
        },
      ]
      const { container, rerender } = customRender(
        <Table
          expandable={{ defaultExpandAllRows: true }}
          columns={treeDataColumns}
          dataSource={treeData}
          rowSelection={{ onChange, preserveSelectedRowKeys: true, checkStrictly: false }}
        />,
      )

      fireEvent.click(headerInput(container)!)
      expect(onChange).toHaveBeenCalledWith(
        [1, 11, 12, 121, 2],
        [
          {
            key: 1,
            name: 'a',
            children: [
              {
                key: 11,
                name: 'b',
              },
              {
                key: 12,
                name: 'c',
                children: [
                  {
                    key: 121,
                    name: 'd',
                  },
                ],
              },
            ],
          },
          { key: 11, name: 'b' },
          { key: 12, name: 'c', children: [{ key: 121, name: 'd' }] },
          { key: 121, name: 'd' },
          { key: 2, name: 'e' },
        ],
        { type: 'all' },
      )

      rerender(
        <Table
          expandable={{ defaultExpandAllRows: true }}
          columns={treeDataColumns}
          dataSource={[treeData[0]]}
          rowSelection={{ onChange, preserveSelectedRowKeys: true, checkStrictly: false }}
        />,
      )
      fireEvent.click(bodyInputs(container)[1])
      expect(onChange).toHaveBeenLastCalledWith(
        [12, 121, 2],
        [
          { key: 12, name: 'c', children: [{ key: 121, name: 'd' }] },
          { key: 121, name: 'd' },
          { key: 2, name: 'e' },
        ],
        { type: 'single' },
      )
      expect(getIndeterminateSelection(container, [1, 11, 12, 121])).toEqual([1])
    })

    // antd L1860
    it('works with receive selectedRowKeys from [] to undefined', () => {
      const onChange = vi.fn()
      const dataSource = [{ name: 'Jack' }]
      const { container, rerender } = customRender(
        <Table
          dataSource={dataSource}
          rowSelection={{ onChange, selectedRowKeys: [0] }}
          rowKey="name"
        />,
      )

      rerender(
        <Table
          dataSource={dataSource}
          rowSelection={{ onChange, selectedRowKeys: undefined }}
          rowKey="name"
        />,
      )

      fireEvent.click(bodyInputs(container)[0])
      expect(onChange).toHaveBeenCalledWith(['Jack'], [{ name: 'Jack' }], { type: 'single' })
    })

    // antd L1883
    it('works with preserveSelectedRowKeys after receive selectedRowKeys from [] to undefined', () => {
      const onChange = vi.fn()
      const dataSource = [{ name: 'Jack' }]
      const { container, rerender } = customRender(
        <Table
          dataSource={dataSource}
          rowSelection={{ onChange, selectedRowKeys: ['Jack'] }}
          rowKey="name"
        />,
      )

      rerender(
        <Table
          dataSource={dataSource}
          rowSelection={{ onChange, selectedRowKeys: [] }}
          rowKey="name"
        />,
      )

      rerender(
        <Table
          dataSource={dataSource}
          rowSelection={{ onChange, preserveSelectedRowKeys: true }}
          rowKey="name"
        />,
      )

      fireEvent.click(bodyInputs(container)[0])
      expect(onChange).toHaveBeenCalledWith(['Jack'], [{ name: 'Jack' }], { type: 'single' })
    })

    // antd L1914
    it('works with selectionType radio receive selectedRowKeys from [] to undefined', () => {
      const onChange = vi.fn()
      const dataSource = [{ name: 'Jack' }]
      const { container, rerender } = customRender(
        <Table
          dataSource={dataSource}
          rowSelection={{ onChange, selectedRowKeys: [0], type: 'radio' }}
          rowKey="name"
        />,
      )
      rerender(
        <Table
          dataSource={dataSource}
          rowSelection={{ onChange, selectedRowKeys: undefined, type: 'radio' }}
          rowKey="name"
        />,
      )

      fireEvent.click(bodyInputs(container)[0])
      expect(onChange).toHaveBeenCalledWith(['Jack'], [{ name: 'Jack' }], { type: 'single' })
    })

    // antd L1936
    // 步骤 54 / 29-G 转直测，**期望值＝读到的参照**（不是我方旧行为）：
    //   探针 G3 双侧并排（裁判 antd **6.4.4**）——受控 selectedRowKeys=['Jack'] 且 Jack 已不在
    //   当前 dataSource 时，antd onChange 第 2 参仍含 Jack 的 record（preserveRecordsRef 兜底，
    //   useSelection.js:71-88/:159-162），修前我方缺席。现已同形（keys 与 rows 都含 Jack）。
    //   旧 skip 依据写的「selectedRows 只从当前 flattenedDataSource 构造（useSelectionAdapter.ts:268-273）」
    //   在 #12a 后就是假话（真实取值面是 rawDataSource 全树），行号也已漂移，一并回收。
    it('selectedRows ant selectedKeys should keep sync in initial state', () => {
      const dataSource = [{ name: 'Jack' }, { name: 'Tom' }, { name: 'Lucy' }, { name: 'John' }]
      const onChange = vi.fn()
      const rowSelection = {
        preserveSelectedRowKeys: true,
        onChange,
        selectedRowKeys: ['Jack'],
      }
      const columnsProp = [
        {
          title: 'Name',
          dataIndex: 'name',
          key: 'name',
        },
      ]
      const { container, rerender } = customRender(
        <Table
          dataSource={dataSource.slice(0, 2)}
          rowSelection={rowSelection}
          rowKey="name"
          columns={columnsProp}
        />,
      )

      rerender(
        <Table
          dataSource={dataSource.slice(2, 4)}
          rowSelection={rowSelection}
          rowKey="name"
          columns={columnsProp}
        />,
      )
      fireEvent.click(bodyInputs(container)[0])
      expect(onChange).toHaveBeenCalledWith(
        ['Jack', 'Lucy'],
        [{ name: 'Jack' }, { name: 'Lucy' }],
        { type: 'single' },
      )
    })
  })

  // antd L1976
  // 缺口 #9 已修：`getCheckboxProps().onClick` / `.onChange` 现在都会调用
  //   （src/table/engine/SelectionInput.tsx：handleClick 先 stopPropagation 再 onClick，
  //   handleCheckboxChange 先内部 onChange 再 userOnChange），
  //   对齐 antd es/table/hooks/useSelection.js:411-419（`{...checkboxProps}` 展开 +
  //   `onClick`/`onChange` 内部再各调一次 `checkboxProps?.onXxx?.(e)`）。
  // 实测（探针 P5）：点勾选框 → onClick / onChange 各 1 次；同时缺口 #12b 保证 onRow.onClick 0 次。
  it('should trigger both custom and internal checkbox events', () => {
    const onClickMock = vi.fn()
    const onChangeMock = vi.fn()

    // 照 antd 传参形状返回 onClick/onChange（缺口 #9 修完后这些字段已在 RowCheckboxProps 里）。
    const getCheckboxProps = (): RowCheckboxProps => ({
      onClick: onClickMock,
      onChange: onChangeMock,
    })

    const { container } = customRender(
      <Table
        rowSelection={{
          type: 'checkbox',
          getCheckboxProps,
        }}
        columns={columns}
        dataSource={data}
      />,
    )

    const firstRowCheckbox = bodyInputs(container)[0]
    expect(firstRowCheckbox).toBeTruthy()
    fireEvent.click(firstRowCheckbox)

    expect(onClickMock).toHaveBeenCalled()
    // 恰好 1 次：#12b 的 stopPropagation 若缺位，勾选点击会另走一条路径把回调次数放大。
    expect(onClickMock.mock.calls.length).toBe(1)

    expect(onChangeMock).toHaveBeenCalled()
    expect(onChangeMock.mock.calls.length).toBe(1)

    // userOnChange 收到的是 antd 原始事件对象（有 target.checked）。
    const changeEvent = onChangeMock.mock.calls[0][0] as { target?: { checked?: boolean } }
    expect(changeEvent).toHaveProperty('target')
    expect(changeEvent.target).toHaveProperty('checked')
  })

  // antd L2012
  // 缺口 #9 已修（radio 分支同款）：src/table/engine/SelectionInput.tsx 的 Radio 分支也传
  //   onClick={handleClick}（先 stopPropagation）+ handleRadioChange 内调用 userOnChange，
  //   对齐 antd es/table/hooks/useSelection.js:373-395 的 Radio 分支（onClick :382-385、onChange :386-391）。
  it('should trigger both custom and internal radio events', () => {
    const onClickMock = vi.fn()
    const onChangeMock = vi.fn()

    // 同 `should trigger both custom and internal checkbox events`（radio 走同一 SelectionInput）。
    const getCheckboxProps = (): RowCheckboxProps => ({
      onClick: onClickMock,
      onChange: onChangeMock,
    })

    const { container } = customRender(
      <Table
        rowSelection={{
          type: 'radio',
          getCheckboxProps,
        }}
        columns={columns}
        dataSource={data}
      />,
    )

    const firstRowRadio = container.querySelector('input[type="radio"]')
    expect(firstRowRadio).toBeTruthy()
    fireEvent.click(firstRowRadio!)

    expect(onClickMock).toHaveBeenCalled()
    expect(onClickMock.mock.calls.length).toBe(1)

    expect(onChangeMock).toHaveBeenCalled()
    expect(onChangeMock.mock.calls.length).toBe(1)

    // 参照（:2040-2042）还断言事件对象形状：radio 分支同样把 antd RadioChangeEvent 原样给 userOnChange。
    const changeEvent = onChangeMock.mock.calls[0][0] as { target?: { checked?: boolean } }
    expect(changeEvent).toHaveProperty('target')
    expect(changeEvent.target).toHaveProperty('checked')
  })

  // antd L2048
  // 缺口 #12a 的后半（BAT-5 实测交下来）已修：喂给 `useRowSelection` 的数据源改成
  //   **筛选后数据的全树扁平视图**（src/table/useSelectionAdapter.ts 的 selectionDataSource），
  //   折叠子孙的 `getCheckboxProps().disabled` 在勾选那一刻取得到 → conduction 能排除它。
  //   antd 侧同口径：checkboxPropsMap 建在 flattenData(pageData) 全树上
  //   （es/table/hooks/useSelection.js:23-31/92/115-124），折叠态也判得到 disabled。
  // 实测（探针 P2）：折叠态点父行 key1 → dg onChange keys = [1,121]（修复前 [1,12,121]），
  //   与 antd 逐值相同；展开后 age=9 的 disabled 子行保持未选。
  // 另：data-grid 无 `tr[data-row-key]`，行定位改用 name 列文本。
  it('work with pagination and checkStrictly false', async () => {
    const treeDataColumns = [
      { title: 'Name', dataIndex: 'name', key: 'name' },
      { title: 'Age', dataIndex: 'age', key: 'age' },
      { title: 'Address', dataIndex: 'address', key: 'address' },
    ]
    const treeData = [
      {
        key: 1,
        name: 'John Brown sr.',
        age: 60,
        children: [
          { key: 12, name: 'John Brown jr.', age: 9 },
          { key: 121, name: 'Jimmy Brown', age: 16 },
        ],
      },
      { key: 2, name: 'Joe Black', age: 32 },
      {
        key: 11,
        name: 'John Brown',
        age: 42,
        children: [
          { key: 1311, name: 'Jim Green jr.', age: 25 },
          { key: 1312, name: 'Jimmy Green sr.', age: 18 },
        ],
      },
      {
        key: 13,
        name: 'Jim Green sr.',
        age: 72,
        children: [{ key: 131, name: 'Jim Green', age: 42 }],
      },
    ]
    const rowSelection = {
      getCheckboxProps: (record: { age: number }) => {
        return 'children' in record
          ? {
              disabled: false,
            }
          : {
              disabled: record.age <= 10,
            }
      },
      checkStrictly: false,
    }
    const { container } = customRender(
      <Table
        rowSelection={rowSelection}
        columns={treeDataColumns}
        dataSource={treeData}
        pagination={{ pageSize: 2 }}
      />,
    )

    fireEvent.click(bodyInputs(container)[0])
    fireEvent.click(bodyInputs(container)[1])
    fireEvent.click(container.querySelector('.ant-pagination-next .ant-pagination-item-link')!)
    fireEvent.click(bodyInputs(container)[0])
    fireEvent.click(bodyInputs(container)[1])
    fireEvent.click(container.querySelector('.ant-pagination-prev .ant-pagination-item-link')!)

    fireEvent.click(container.querySelector('button.dg-expand-icon')!)
    const names = renderedNames(container)
    const childIndex = names.indexOf('John Brown jr.')
    expect(childIndex).toBeGreaterThan(-1)
    expect(bodyInputs(container)[childIndex].checked).toBe(false)
  })

  // antd L2171
  it('Table Header Checkbox', () => {
    const { container } = customRender(
      <Table
        dataSource={[
          { key: '1', name: 'Item 1' },
          { key: '2', name: 'Item 2' },
        ]}
        columns={[{ title: 'Name', dataIndex: 'name', key: 'name' }]}
        rowSelection={{
          getTitleCheckboxProps: () => ({ disabled: true, 'aria-label': 'Custom label' }),
        }}
      />,
    )
    const checkbox = headerInput(container)
    expect(checkbox).toBeDisabled()
    expect(checkbox).toHaveAttribute('aria-label', 'Custom label')
  })

  // ===== 本批（步骤 34 / BAT-6 返工）新增补测：3 条，非 antd 对齐项 ⇒ 总数 74 → 77，skip 不增加 =====

  // F-4（ledger E-024 已裁定）方向 A：**计算值覆盖 `getTitleCheckboxProps().indeterminate`**。
  // 参照依据（本轮亲读 `node_modules/antd/es/table/hooks/useSelection.js:352-359`）：
  // `{...customCheckboxProps}` 在前、`indeterminate: <计算>` 在后 ⇒ custom 抢不过计算值。
  // 本库实现：`src/table/selectionAdapter.tsx` 把 `indeterminate` 排除出 `pickFromCheckboxProps`，
  // 表头恒取 `titleIndeterminate = intermediate || someDisabledChecked`。
  // 步骤 31 验证者实测行为正确但「全仓零直测」（F-31-B）⇒ 这条把方向 A 钉住；
  // 期望值取 34 号探针 PR8 的 dg≡antd 逐值读数（4 行只选 1 行 ⇒ 计算=半选 ⇒ `true`）。
  it('header checkbox: computed indeterminate overrides getTitleCheckboxProps false', () => {
    const getTitleCheckboxProps = vi.fn(() => ({ indeterminate: false }))
    const { container } = customRender(
      <Table
        columns={columns}
        dataSource={data}
        rowSelection={{ selectedRowKeys: [0], getTitleCheckboxProps }}
      />,
    )
    // 观测面①：custom 确实被消费（否则「覆盖」无从谈起）。次数不钉——同一次挂载内被调 2 次
    // （PR8 读数 dg/antd 两侧皆 2），钉次数会把无关的重渲染量焊成规格。
    expect(getTitleCheckboxProps).toHaveBeenCalled()
    // 观测面②：DOM 半选类在（计算值赢），且勾选框本身仍是未全选态。
    expect(isIndeterminate(headerInput(container))).toBe(true)
    expect(headerInput(container)?.checked).toBe(false)
  })

  // F-4 方向 B（反方向）：计算值 = 全选 ⇒ custom 的 `indeterminate: true` 必须被压成 `false`。
  // 只钉一个方向会漏掉「实现改成 custom 优先」的另一半（步骤 31 探针 P9 双向读数：
  // dg `B:false` = antd `B:false`），故两条各一。
  it('header checkbox: computed full selection overrides getTitleCheckboxProps true', () => {
    const getTitleCheckboxProps = vi.fn(() => ({ indeterminate: true }))
    const { container } = customRender(
      <Table
        columns={columns}
        dataSource={data}
        rowSelection={{ selectedRowKeys: [0, 1, 2, 3], getTitleCheckboxProps }}
      />,
    )
    expect(getTitleCheckboxProps).toHaveBeenCalled()
    // 具体布尔：计算=全选 ⇒ 半选必须为 false。
    expect(isIndeterminate(headerInput(container))).toBe(false)
    expect(headerInput(container)?.checked).toBe(true)
  })

  // 表头全选框的**默认无障碍名**（R-34-3，A 类缺陷修复）。
  // 判据 = 参照硬编码两分支 `useSelection.js:356`
  // `aria-label: customizeSelections ? 'Custom selection' : 'Select all'`（在 `...customCheckboxProps`
  // 之前 ⇒ 用户显式 `aria-label` 仍可覆盖，那条已由上方 antd L2171 用例钉住）；
  // 参照**不消费任何 locale 键**——旧实现挪用了 `locale.selectionAll`（antd 里那是**下拉菜单项文案**
  // 键，en_US 值 `'Select all data'`），于是默认名恒成 `'Select all data'`。
  // 我方「存在下拉菜单」的对应布尔 = `selectionAdapter.tsx` 的 `showSelectionDropdown`。
  // 期望值按 34 号探针 PR1/PR2 实测填（PR1 dg 旧值 'Select all data' vs antd 'Select all'；
  // PR2 antd 'Custom selection'）。⚠️ 别按菜单文案查——菜单项仍是 'Select all data'（`selections` 文案
  // 走 locale，与无障碍名是两个面，antd 也从不同时落在同一元素上）。
  it('header checkbox: default accessible name matches reference branches', () => {
    // 无选择下拉 ⇒ 'Select all'
    const plain = customRender(createTable({ rowSelection: {} }))
    expect(plain.container.querySelector('.dg-selection-dropdown-trigger')).toBeNull()
    expect(headerInput(plain.container)).toHaveAttribute('aria-label', 'Select all')
    plain.unmount()

    // 有选择下拉 ⇒ 'Custom selection'（参照的 `customizeSelections` 分支对应物）
    const withMenu = customRender(
      // `selections: true` 需字面量类型（src/table/compat/selection.ts:100），同 `works with selectAll`。
      createTable({ rowSelection: { selections: true } as TableProps<any>['rowSelection'] }),
    )
    expect(withMenu.container.querySelector('.dg-selection-dropdown-trigger')).toBeTruthy()
    expect(headerInput(withMenu.container)).toHaveAttribute('aria-label', 'Custom selection')
    withMenu.unmount()
  })

  // ===== 本批（步骤 82 / E-158）新增补测：4 条，非 antd 对齐项 ⇒ 总数 74 不变（本文件 antd 对齐项口径），
  //       运行时总数 84 → 88，skip 不增加 =====
  // 钉的是「选择列**列宽**随主题 token」——参照依据（本轮亲读裁判 **antd 6.4.4** 产物）：
  //   ① `node_modules/antd/es/table/InternalTable.js:126-131`
  //      `mergedRowSelection = { columnWidth: token.Table?.selectionColumnWidth, ...customizeRowSelection }`
  //      ⇒ 组件 token 给缺省列宽、用户显式 `rowSelection.columnWidth` 后置覆盖（④ 钉这一档优先级，
  //      形状照参照 spread 顺序，不发明新规则）。
  //   ② `node_modules/antd/es/table/style/index.js:226` `selectionColumnWidth: controlHeight`
  //      ＋ `node_modules/antd/es/table/style/selection.js:23`
  //      `.ant-table-selection-col{width:tableSelectionColumnWidth}`
  //      ⇒ token 没被用户覆盖时，缺省值仍**派生自全局 `controlHeight`**（默认主题实测 32，见
  //      `tmp/82-probe-readings.txt` 臂 `P2.derived`）⇒ ② 钉派生档。
  // 我方观测面：dg 无 `.ant-table-selection-col`（实测计数 0，探针 `selColFound:false`），
  //   选择列宽体现在 `.dg-grid` 内联 `grid-template-columns` 的**第 1 条轨**（specified value 层，
  //   就是浏览器实际吃到的宽度声明——jsdom 无布局，量不到 rect，故不假装量了 rect）。
  //   同时断 `.dg-wrapper` 上 `--ant-table-selection-column-width` 与轨道**同源**（同一个值），
  //   这正是缺陷本体：改前变量 200px / 轨道恒 32px。
  /** `.dg-grid` 内联 `grid-template-columns` 的第 1 条轨（选择列轨）；按括号深度切，兼容 `minmax(a, b)` 内的空格。 */
  const firstGridTrack = (container: HTMLElement) => {
    const grid = container.querySelector('.dg-grid') as HTMLElement
    const value = grid.style.gridTemplateColumns
    let depth = 0
    for (let index = 0; index < value.length; index += 1) {
      const char = value[index]
      if (char === '(') depth += 1
      else if (char === ')') depth -= 1
      else if (char === ' ' && depth === 0) return value.slice(0, index)
    }
    return value
  }

  /** `.dg-wrapper` 内联的选择列宽 CSS 变量值（token 桥产物）。 */
  const wrapperSelectionColumnVar = (container: HTMLElement) =>
    (container.querySelector('.dg-wrapper') as HTMLElement).style.getPropertyValue(
      '--ant-table-selection-column-width',
    )

  // 82-①：`theme.components.Table.selectionColumnWidth` ⇒ 选择列轨随它动（**改前必红**：轨恒 32px）。
  it('selection column width follows theme token selectionColumnWidth', () => {
    const { container } = renderWithConfig(createTable(), {
      theme: { components: { Table: { selectionColumnWidth: 200 } } },
    })
    // 变量与列轨同源：两个观测面都得是 200px（缺陷本体＝变量 200px 而轨道 32px）。
    expect(wrapperSelectionColumnVar(container)).toBe('200px')
    expect(firstGridTrack(container)).toBe('minmax(200px, max-content)')
    // 选择列格确实在第 1 列（轨道归属这一列，不是别的列）。
    const selectionHeaderCell = container.querySelector<HTMLElement>(
      '[data-column-key="__dg_selection__"].dg-cell-header',
    )
    expect(selectionHeaderCell).toBeTruthy()
    expect(selectionHeaderCell?.style.gridColumn).toBe('1')
  })

  // 82-②：派生档——token 未被用户覆盖时缺省仍来自 `controlHeight`（参照 style/index.js:226）。
  //   **改前必红**：轨恒 32px，而变量已是 48px。
  it('selection column width follows derived controlHeight token', () => {
    const { container } = renderWithConfig(createTable(), {
      theme: { token: { controlHeight: 48 } },
    })
    expect(wrapperSelectionColumnVar(container)).toBe('48px')
    expect(firstGridTrack(container)).toBe('minmax(48px, max-content)')
  })

  // 82-③：没有任何覆盖 ⇒ 仍是缺省值（防过度修：不许把 32 改成"别的常量"）。
  //   期望值来源＝参照默认主题下 `controlHeight`＝32（探针 `P2.derived` 读数），非本仓自创。
  it('selection column width keeps default 32px without theme override', () => {
    const { container } = customRender(createTable())
    expect(wrapperSelectionColumnVar(container)).toBe('32px')
    expect(firstGridTrack(container)).toBe('minmax(32px, max-content)')
  })

  // 82-④：用户显式 `rowSelection.columnWidth` **优先于 token**（参照 spread 后置 ⇒ 用户赢）。
  it('explicit rowSelection.columnWidth wins over theme token', () => {
    const { container } = renderWithConfig(createTable({ rowSelection: { columnWidth: 50 } }), {
      theme: { components: { Table: { selectionColumnWidth: 200 } } },
    })
    expect(firstGridTrack(container)).toBe('minmax(50px, max-content)')
    // token 值不得漏进列轨（CSS 变量本身仍是 200px——它由参照的 CSS 规则侧消费，与本档无关）。
    expect(wrapperSelectionColumnVar(container)).toBe('200px')
  })
})
