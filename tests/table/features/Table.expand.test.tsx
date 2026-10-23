// 黑盒 feature-slice 测试：与 antd 自家 Table 展开测试用例逐条对齐（antd-style 黑盒层）。
//
// 对齐来源: {{AntDesign}}/components/table/__tests__/Table.expand.test.tsx
//   antd 共 7 个 it（click to expand / expandRowByClick should not block click icon / show expandIcon /
//   row indent padding should be 0px when indentSize defined as 0 / has right aria-expanded state /
//   describe('expandIconColumnIndex') 内 basic + work with selection）。
//   本文件：antd 对齐 直测 A=5 + skip B=2 = 7；其余为 data-grid 专属补充直测（清单见下方 S*）。
//   本批增量（BAT-26 / 步骤 40）：补充直测 +5（S12 组，展开图标冒泡）、skip +0（现值以 `--reporter=verbose` 运行时为准）。
//
// ── 选择器重映射表（data-grid 无语义化 table DOM：行不是容器元素，格子是 .dg-grid 直接子节点）──
//   antd `.ant-table-row-expand-icon`          → `button.dg-expand-icon`
//     展开态 → `button.dg-expand-icon-expanded` / 收起态 → `button.dg-expand-icon-collapsed`
//     不可展开行 → `button.dg-expand-icon-spaced`（disabled，见 src/table/engine/ExpandIcon.tsx:31-42）
//   antd `tbody td`                            → `.dg-cell-body`（带 `data-row-index` / `data-column-key`）
//   antd `.indent-level-1`（td 加 paddingLeft） → `.dg-tree-indent` 容器 span 的 inline `paddingLeft`
//     （缩进是 level × indentSize px 写在 span style 上，见 src/table/engine/treeIndentRenderer.tsx:31-42）
//   antd `indentSize`（Table 顶层 prop）        → data-grid 只在 `expandable.indentSize`
//     （src/table/Table.tsx:431 `expandable?.indentSize ?? 15`；src/table/publicTypes.ts 无顶层 indentSize）
//   antd `expandedRowRender` 渲染的 `<tr class="ant-table-expanded-row">`
//                                              → `.dg-row-expanded`（grid item，带 gridRow/gridColumn）
//     （src/table/engine/expandLayerUtils.tsx:46-58）
//   antd 展开列位置由 `expandIconColumnIndex` 控制 → data-grid 无此字段，用 `Table.EXPAND_COLUMN` 哨兵
//     或默认位置（选择列之后、数据列之前；选择列 key = `__dg_selection__`，展开列 key = `__dg_expand__`）
//
// ── data-grid 与 antd 的两处结构性差异（实测，决定下面用例写法）──
//   1) 含 `children` 的 dataSource 走**树形模式**：展开图标渲染在**第一个数据列单元格内部**
//      （`.dg-cell-inner > .dg-tree-indent > button.dg-expand-icon`），且树形模式**禁用**
//      `expandedRowRender`（src/table/Table.tsx:481 `expandEnabled = !treeEnabled && …`）。
//      → antd 源第 1、4、5 条（dataSource 带 children）在 data-grid 上都是「树形展开」路径。
//   2) `expandable.expandIcon` 只有在 `expandedRowRender` 是函数时才会被渲染——展开列的存在性由
//      `expandedRowRender` 决定（src/table/engine/useRowExpand.ts:47 `typeof expandedRowRender !== 'function'`
//      → expandableKeySet 空 → expandEnabled=false）。antd 允许只给 expandIcon 不给 expandedRowRender。
//      → 第 3 条 `show expandIcon` 补上 expandedRowRender（保持用例意图：自定义图标替换默认图标），
//        并在该用例注释中写明此差异。
//
// ── skip 清单（2 条，均为 antd `describe('expandIconColumnIndex')` 内用例）──
//   命中全局 skip 矩阵「rootProps、expandIconColumnIndex → publicTypes 无此字段」：
//   data-grid 的 Expandable（src/table/compat/expand.ts:42-142）与 TableProps（src/table/publicTypes.ts:338
//   仅 `expandable?: Expandable`）都没有 `expandIconColumnIndex`；位置语义改由 `Table.EXPAND_COLUMN`
//   哨兵表达（本文件末尾 `places expand column via Table.EXPAND_COLUMN sentinel` 用例直测该替代路径）。
//
// ── 补充直测清单（plan 要求的「超越洼地」，全部直测，实现依据见各用例注释）──
//   S1 controlled expandedRowKeys + onExpandedRowsChange + onExpand（受控不改内部态）
//   S2 defaultExpandedRowKeys
//   S3 defaultExpandAllRows（含嵌套层级缩进 0/15/30px）
//   S4 rowExpandable: () => false（图标 disabled + spaced，点击不展开）
//   S5 expandedRowClassName（只注入展开行）
//   S6 expandedRowRender 的 expandedRowOffset（gridColumn 起点）
//   S7 固定展开列（expandable.fixed）
//   S8 Table.EXPAND_COLUMN 哨兵位置语义（替代 skip 掉的 expandIconColumnIndex）
//   S9 默认列序：选择列 + 展开列（对应 skip 的 `work with selection` 的替代直测）
//   S10 树形数据与展开互斥 / showExpandColumn:false / expandRowByClick 行体点击
//   S11 `expandIcon` 单独使用不建展开列（钉住 data-grid ≠ antd 的行为差异，避免只靠注释）
//   S12 展开图标点击不冒泡到行（BAT-26）：默认图标两格（expandRowByClick 真/假）+ 自定义图标两格（条件 span）+ 树形一格
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'

import { Table, type TableProps } from '../../../src/table/index'
import { customRender } from '../../shared/render'

const columns: TableProps<any>['columns'] = [{ title: 'Name', key: 'name', dataIndex: 'name' }]

// antd 源同款记录，另补 `name`（本文件 columns 的 dataIndex 是 'name'，antd 源里该列取值恒空）。
const John = { key: '1', name: 'John Brown', firstName: 'John', lastName: 'Brown', age: 32 }
const Jim = { key: '2', name: 'Jim Green', firstName: 'Jim', lastName: 'Green', age: 42 }

/** antd 源同款数据：首条记录带 children → data-grid 走树形模式。 */
const data = [{ ...John, children: [{ ...Jim }] }]

const EXPAND_ICON = 'button.dg-expand-icon'
const ROW_EXPANDED = '.dg-row-expanded'

/** 行级结构摘要（非全量 HTML）：展开图标态 / 格子文本 / 缩进 / 展开内容区。 */
function digest(container: HTMLElement) {
  return Array.from(container.querySelectorAll('.dg-grid > .dg-cell-body')).map((cell) => ({
    row: (cell as HTMLElement).dataset.rowIndex,
    column: (cell as HTMLElement).dataset.columnKey,
    text: cell.querySelector('.dg-cell-inner')?.textContent ?? '',
    expandIcon: cell.querySelector(EXPAND_ICON)?.className.replace('dg-expand-icon ', '') ?? null,
    ariaExpanded: cell.querySelector(EXPAND_ICON)?.getAttribute('aria-expanded') ?? null,
    iconDisabled: cell.querySelector(EXPAND_ICON)?.hasAttribute('disabled') ?? null,
    indentPaddingLeft: (cell.querySelector('.dg-tree-indent') as HTMLElement | null)?.style.paddingLeft ?? null,
    expandedRowContent: cell.querySelector(ROW_EXPANDED)?.textContent ?? null,
  }))
}

describe('Table.expand', () => {
  // antd L42：树形数据首行可展开；点击图标后整行子树出现（快照改为结构摘要式小快照）。
  it('click to expand', () => {
    const { container } = customRender(<Table columns={columns} dataSource={data} />)

    expect(container.querySelectorAll('.dg-cell-body')).toHaveLength(1)
    fireEvent.click(container.querySelector(EXPAND_ICON)!)

    // 展开后：父行 + 子行（子行 level=1）。data-grid 行无容器元素，以 data-row-index 标识。
    expect(container.querySelectorAll('.dg-cell-body')).toHaveLength(2)
    const digestSnapshot = digest(container)
    expect(digestSnapshot).toHaveLength(2)
    expect(digestSnapshot).toMatchSnapshot()
  })

  // antd L48：expandRowByClick=true 时点击图标仍能切换（图标点击不被行点击吞掉）。
  it('expandRowByClick should not block click icon', () => {
    const { container } = customRender(
      <Table
        columns={columns}
        dataSource={[John, Jim]}
        expandable={{
          expandRowByClick: true,
          expandedRowRender: () => '',
        }}
      />,
    )
    // 两个数据行都可展开 → 两个展开列图标（默认位置：首列）。
    expect(container.querySelectorAll(EXPAND_ICON)).toHaveLength(2)
    expect(container.querySelectorAll('.dg-expand-icon-collapsed')).toHaveLength(2)

    fireEvent.click(container.querySelector(EXPAND_ICON)!)
    expect(container.querySelector('button.dg-expand-icon-expanded')).toBeTruthy()
    expect(container.querySelectorAll(ROW_EXPANDED)).toHaveLength(1)

    // 再次点击同一图标（仍是 DOM 中第一个）→ 收起。
    fireEvent.click(container.querySelector(EXPAND_ICON)!)
    expect(container.querySelector('button.dg-expand-icon-collapsed')).toBeTruthy()
    expect(container.querySelectorAll('.dg-expand-icon-expanded')).toHaveLength(0)
  })

  // antd L66：自定义 expandIcon 替换默认图标。
  // antd 原用例只给 `expandIcon`（不给 expandedRowRender）；data-grid 需要 `expandedRowRender`
  //   才建展开列（见 src/table/engine/useRowExpand.ts:47 + src/table/Table.tsx:506-514），
  //   故这里补上 `expandedRowRender: () => ''` 以保留原用例意图（自定义图标替换默认图标）。
  //   单独给 `expandIcon` 的行为另见下方用例 `expandIcon alone does not create an expand column`。
  it('show expandIcon', () => {
    const { container } = customRender(
      <Table
        columns={[{ dataIndex: 'key' }]}
        dataSource={[{ key: 233 }]}
        expandable={{
          expandedRowRender: () => '',
          expandIcon: () => <div className="expand-icon" />,
        }}
      />,
    )
    expect(container.querySelectorAll('.expand-icon')).toHaveLength(1)
    // 自定义图标替换默认图标 → 无默认 button.dg-expand-icon。
    expect(container.querySelectorAll(EXPAND_ICON)).toHaveLength(0)
  })

  // 行为差异钉住（data-grid ≠ antd）：只给 `expandIcon` 而不给 `expandedRowRender` 时，
  //   data-grid 完全不建展开列——自定义图标渲染 0 个、无 `__dg_expand__` 表头格/数据格。
  //   根因：src/table/engine/useRowExpand.ts:47（`typeof expandedRowRender !== 'function'` →
  //   expandableKeySet 空 → expandEnabled=false）→ src/table/Table.tsx:506-514 不建展开列节点。
  //   antd 允许只给 `expandIcon` 就渲染图标。本用例以断言固定 data-grid 现状：
  //   将来上游修好此差异时本用例会失败，届时按「更新对齐口径」处理，而不是默默漂移。
  it('expandIcon alone does not create an expand column', () => {
    const { container } = customRender(
      <Table
        columns={columns}
        dataSource={[John]}
        pagination={false}
        expandable={{ expandIcon: () => <div className="expand-icon" /> }}
      />,
    )

    expect(container.querySelectorAll('.expand-icon')).toHaveLength(0)
    expect(container.querySelectorAll('[data-column-key="__dg_expand__"]')).toHaveLength(0)
  })

  // antd L79：indentSize=0 时缩进为 0px（indentSize 在 data-grid 属 expandable，见文件头重映射表）。
  it('row indent padding should be 0px when indentSize defined as 0', () => {
    const { container } = customRender(
      <Table columns={columns} dataSource={data} expandable={{ indentSize: 0 }} />,
    )

    fireEvent.click(container.querySelector(EXPAND_ICON)!)

    const indents = container.querySelectorAll<HTMLElement>('.dg-tree-indent')
    expect(indents).toHaveLength(2)
    expect(indents[0]).toHaveStyle({ paddingLeft: '0px' })
    // level=1 的子行同样为 0px（1 × 0）。
    expect(indents[1]).toHaveStyle({ paddingLeft: '0px' })
  })

  // antd L89：展开图标带正确 aria-expanded 状态。
  it('has right aria-expanded state', () => {
    const { container } = customRender(<Table columns={columns} dataSource={data} />)

    expect(container.querySelector('[aria-expanded=false]')).toBeTruthy()
    expect(container.querySelector('[aria-expanded=true]')).toBeNull()

    fireEvent.click(container.querySelector(EXPAND_ICON)!)

    // 展开后：父行图标 aria-expanded=true，新增子行图标 aria-expanded=false（spaced 占位）。
    expect(container.querySelector('[aria-expanded=true]')).toBeTruthy()
    expect(container.querySelector('[aria-expanded=false]')).toBeTruthy()
  })

  describe('expandIconColumnIndex', () => {
    // antd L97：expandIconColumnIndex=1 —— data-grid 无此字段（skip 矩阵 + src/table/compat/expand.ts:42-142
    // 与 src/table/publicTypes.ts:338 均无 expandIconColumnIndex），位置语义改由 Table.EXPAND_COLUMN 哨兵
    // 表达，见本文件 `places expand column via Table.EXPAND_COLUMN sentinel` 用例。
    it.skip('basic', () => {})

    // antd L116：expandIconColumnIndex=2 + rowSelection —— 同上，data-grid 无 expandIconColumnIndex；
    // 「选择列 + 展开列」组合的列序由默认位置 / 哨兵表达，见下方 `expand column sits after selection column`。
    it.skip('work with selection', () => {})
  })

  // antd 无对应源用例的 data-grid 补充直测（plan 明确要求）。

  // S1：受控 expandedRowKeys 为真理源——点击只回调，不改内部态（DOM 不展开）。
  it('controlled expandedRowKeys keeps state external', () => {
    const onExpandedRowsChange = vi.fn()
    const onExpand = vi.fn()
    const { container } = customRender(
      <Table
        columns={columns}
        dataSource={[John, Jim]}
        expandable={{
          expandedRowRender: () => <div className="er">ER</div>,
          expandedRowKeys: [],
          onExpandedRowsChange,
          onExpand,
        }}
      />,
    )

    fireEvent.click(container.querySelector(EXPAND_ICON)!)

    // 回调收到新 keys（useRowExpand.ts:102-117：先 onExpandedRowsChange 再 onExpand）。
    expect(onExpandedRowsChange).toHaveBeenCalledTimes(1)
    expect(onExpandedRowsChange.mock.calls[0][0]).toEqual(['1'])
    expect(onExpand).toHaveBeenCalledTimes(1)
    expect(onExpand.mock.calls[0][0]).toBe(true)
    expect(onExpand.mock.calls[0][1]).toBe(John)
    // 受控源仍是 [] → 内部态未被改写：DOM 上无展开内容、图标仍为收起态。
    expect(container.querySelectorAll(ROW_EXPANDED)).toHaveLength(0)
    expect(container.querySelectorAll('.dg-expand-icon-collapsed')).toHaveLength(2)
  })

  // S2：非受控 defaultExpandedRowKeys 决定初始展开态。
  it('defaultExpandedRowKeys expands the listed rows initially', () => {
    const { container } = customRender(
      <Table
        columns={columns}
        dataSource={[John, Jim]}
        expandable={{
          expandedRowRender: (record) => <div className="er">{record.key}</div>,
          defaultExpandedRowKeys: ['2'],
        }}
      />,
    )

    expect(container.querySelectorAll(ROW_EXPANDED)).toHaveLength(1)
    expect(container.querySelector(ROW_EXPANDED)?.textContent).toBe('2')
    expect(container.querySelector('[aria-expanded=true]')).toBeTruthy()
  })

  // S3：defaultExpandAllRows 展开所有可展开行（含嵌套层级，缩进随之递增）。
  it('defaultExpandAllRows expands every expandable row', () => {
    const nested = [
      {
        key: '1',
        name: 'a',
        children: [{ key: '1-1', name: 'a1', children: [{ key: '1-1-1', name: 'a11' }] }],
      },
    ]
    const { container } = customRender(
      <Table columns={columns} dataSource={nested} expandable={{ defaultExpandAllRows: true }} />,
    )

    // 三层全部可见（useTreeData.ts:222-227 非受控初始取全部可展开 key）。
    expect(container.querySelectorAll('.dg-cell-body')).toHaveLength(3)
    const indents = Array.from(container.querySelectorAll<HTMLElement>('.dg-tree-indent'))
    expect(indents.map((el) => el.style.paddingLeft)).toEqual(['0px', '15px', '30px'])
  })

  // S4：rowExpandable 返回 false 的行图标禁用（spaced 态）且点击不展开。
  it('rowExpandable false disables that row', () => {
    const { container } = customRender(
      <Table
        columns={columns}
        dataSource={[John, Jim]}
        expandable={{
          expandedRowRender: () => '',
          rowExpandable: (record) => record.key !== '2',
        }}
      />,
    )

    const icons = container.querySelectorAll<HTMLButtonElement>(EXPAND_ICON)
    expect(icons).toHaveLength(2)
    // 行 1（key='2'）不可展开 → disabled + spaced。
    const jimIcon = container.querySelector<HTMLButtonElement>(
      '.dg-cell-body[data-row-index="1"] button.dg-expand-icon',
    )!
    expect(jimIcon).toHaveClass('dg-expand-icon-spaced')
    expect(jimIcon).toBeDisabled()

    fireEvent.click(jimIcon)
    expect(container.querySelectorAll(ROW_EXPANDED)).toHaveLength(0)
  })

  // S5：expandedRowClassName 只注入到展开行（行级 class，见 useExpandRowBinding）。
  it('expandedRowClassName applies to the expanded row only', () => {
    const { container } = customRender(
      <Table
        columns={columns}
        dataSource={[John, Jim]}
        expandable={{
          expandedRowRender: () => '',
          defaultExpandedRowKeys: ['1'],
          expandedRowClassName: (record) => `expanded-${record.key}`,
        }}
      />,
    )

    const rowCells = (index: number) =>
      Array.from(container.querySelectorAll(`.dg-cell-body[data-row-index="${index}"]`))
    expect(rowCells(0).length).toBeGreaterThan(0)
    rowCells(0).forEach((cell) => expect(cell).toHaveClass('expanded-1'))
    rowCells(1).forEach((cell) => expect(cell).not.toHaveClass('expanded-1'))
  })

  // S6：expandedRowOffset=N 让展开内容从第 N+1 个叶子列开始（gridColumn 起点右移）。
  it('expandedRowOffset shifts the expanded content start column', () => {
    const { container: full } = customRender(
      <Table
        columns={[columns[0], { title: 'Age', dataIndex: 'age' }]}
        dataSource={[John]}
        expandable={{ expandedRowRender: () => 'ER', defaultExpandedRowKeys: ['1'] }}
      />,
    )
    // 无 offset → 跨整行。
    expect(full.querySelector<HTMLElement>(ROW_EXPANDED)!.style.gridColumn).toBe('1 / -1')

    const { container: offset } = customRender(
      <Table
        columns={[columns[0], { title: 'Age', dataIndex: 'age' }]}
        dataSource={[John]}
        expandable={{
          expandedRowRender: () => 'ER',
          defaultExpandedRowKeys: ['1'],
          expandedRowOffset: 1,
        }}
      />,
    )
    // offset=1 → 从第 2 个叶子列起（实测：展开列不计入 offset，offset 从第一个数据列起算，
    // 见 src/table/engine/expandLayerUtils.tsx:32 `startLine = min(offset, leafColumns.length - 1) + 1`；
    // 本表叶子列 = [展开列, name, age]，故 startLine=2 → '2 / -1'）。
    expect(offset.querySelector<HTMLElement>(ROW_EXPANDED)!.style.gridColumn).toBe('2 / -1')
  })

  // S7a：expandable.fixed 让展开列固定（dg-cell-fixed-start + antd 别名）。
  it('fixed expandable renders a fixed expand column', () => {
    const { container } = customRender(
      <Table
        columns={columns}
        dataSource={[John]}
        expandable={{ expandedRowRender: () => '', fixed: 'left' }}
      />,
    )
    const iconCell = container.querySelector('.dg-cell-body[data-column-key="__dg_expand__"]')!
    expect(iconCell).toHaveClass('dg-cell-fixed-start')
    expect(iconCell).toHaveClass('ant-table-cell-fix-left')
  })

  // S7b：Table.EXPAND_COLUMN 哨兵把展开列插在指定位置（data-grid 对 expandIconColumnIndex 的替代语义）。
  it('places expand column via Table.EXPAND_COLUMN sentinel', () => {
    const { container } = customRender(
      <Table
        columns={[columns[0], Table.EXPAND_COLUMN, { title: 'Age', dataIndex: 'age' }]}
        dataSource={[John]}
        expandable={{ expandedRowRender: () => '' }}
      />,
    )
    const bodyKeys = Array.from(container.querySelectorAll('.dg-cell-body[data-row-index="0"]')).map(
      (cell) => (cell as HTMLElement).dataset.columnKey,
    )
    expect(bodyKeys).toEqual(['name', '__dg_expand__', 'age'])
  })

  // S7c（对应 skip 的 `work with selection` 的替代直测）：无哨兵时展开列默认紧随选择列之后。
  it('expand column sits after selection column by default', () => {
    const { container } = customRender(
      <Table columns={columns} dataSource={[John]} rowSelection={{}} expandable={{ expandedRowRender: () => '' }} />,
    )
    const bodyKeys = Array.from(container.querySelectorAll('.dg-cell-body[data-row-index="0"]')).map(
      (cell) => (cell as HTMLElement).dataset.columnKey,
    )
    expect(bodyKeys).toEqual(['__dg_selection__', '__dg_expand__', 'name'])
  })

  // S8：树形数据与 expandedRowRender 互斥（树形优先：不渲染展开列，也不渲染展开内容）。
  it('tree data takes precedence over expandedRowRender', () => {
    const { container } = customRender(
      <Table
        columns={columns}
        dataSource={data}
        expandable={{ expandedRowRender: () => <div className="er">ER</div> }}
      />,
    )

    // 无独立展开列（位置语义为树形首列内联图标）。
    expect(container.querySelectorAll('[data-column-key="__dg_expand__"]')).toHaveLength(0)
    expect(container.querySelectorAll('.er')).toHaveLength(0)
    expect(container.querySelectorAll('.dg-tree-indent')).toHaveLength(1)
  })

  // S9：showExpandColumn=false 不渲染展开图标列，但仍可由受控 keys 驱动展开内容。
  it('showExpandColumn false hides the icon column but keeps expanded content', () => {
    const { container } = customRender(
      <Table
        columns={columns}
        dataSource={[John]}
        expandable={{
          expandedRowRender: () => <div className="er">ER</div>,
          showExpandColumn: false,
          expandedRowKeys: ['1'],
        }}
      />,
    )

    expect(container.querySelectorAll('[data-column-key="__dg_expand__"]')).toHaveLength(0)
    expect(container.querySelectorAll(EXPAND_ICON)).toHaveLength(0)
    expect(container.querySelectorAll('.er')).toHaveLength(1)
  })

  // S10：expandRowByClick 时点击行体单元格也能切换（与图标点击共存）。
  it('expandRowByClick toggles by clicking a body cell', () => {
    const { container } = customRender(
      <Table
        columns={columns}
        dataSource={[John, Jim]}
        expandable={{ expandRowByClick: true, expandedRowRender: () => <div className="er">ER</div> }}
      />,
    )

    fireEvent.click(container.querySelector('.dg-cell-body[data-row-index="0"][data-column-key="name"]')!)
    expect(container.querySelectorAll('.er')).toHaveLength(1)
    expect(container.querySelector('button.dg-expand-icon-expanded')).toBeTruthy()
  })

  // ── S12（BAT-26）：展开图标的点击**不冒泡到行**——两道人参照同形 ──
  //   ① 图标层无条件阻断：`node_modules/antd/es/table/ExpandIcon.js:17-20`
  //      （默认图标 onClick 是 `e => { onExpand(record, e); e.stopPropagation() }`，**不看** `expandRowByClick`）
  //      ⇒ 落点 `src/table/engine/ExpandIcon.tsx` 的 onClick（默认图标 + 树形缩进图标共用它）。
  //   ② 展开列层条件阻断：`@rc-component/table/es/hooks/useColumns/index.js:144-147`
  //      （`if (expandRowByClick) return <span onClick={e => e.stopPropagation()}>{icon}</span>`）
  //      ⇒ 落点 `src/table/expandAdapter.tsx` 的自定义图标分支。
  //   双侧读数以步骤 40 探针为准（`tmp/vortex-logs/fix-real-bugs/40-evidence-bat26-readings-{before,after}.txt`）。
  it('expand icon click does not fire user onRow.onClick when expandRowByClick is true', () => {
    const onClick = vi.fn()
    const onExpand = vi.fn()
    const { container } = customRender(
      <Table
        columns={columns}
        dataSource={[John, Jim]}
        onRow={() => ({ onClick })}
        expandable={{
          expandRowByClick: true,
          expandedRowRender: () => <div className="er">ER</div>,
          onExpand,
        }}
      />,
    )

    fireEvent.click(container.querySelector(EXPAND_ICON)!)
    // 参照：图标自带 stopPropagation ⇒ 用户行回调 0 次；展开只切换 1 次。
    expect(onClick).toHaveBeenCalledTimes(0)
    expect(onExpand).toHaveBeenCalledTimes(1)
    expect(container.querySelectorAll('.er')).toHaveLength(1)
  })

  it('expand icon click does not fire user onRow.onClick when expandRowByClick is off', () => {
    const onClick = vi.fn()
    const onExpand = vi.fn()
    const { container } = customRender(
      <Table
        columns={columns}
        dataSource={[John, Jim]}
        onRow={() => ({ onClick })}
        expandable={{
          expandRowByClick: false,
          expandedRowRender: () => <div className="er">ER</div>,
          onExpand,
        }}
      />,
    )

    fireEvent.click(container.querySelector(EXPAND_ICON)!)
    // ★ 参照在 `expandRowByClick:false` 时**同样**不触发用户回调——阻断挂在默认图标自己身上
    //   （`ExpandIcon.js:19`），不挂在 `expandRowByClick` 那个条件 span 上（那层只管自定义图标）。
    //   实测读数 antd 侧 0 次（探针 A3）；旧实现这里是 1 次（我们的图标没有那一行 stopPropagation）。
    expect(onClick).toHaveBeenCalledTimes(0)
    expect(onExpand).toHaveBeenCalledTimes(1)
    expect(container.querySelectorAll('.er')).toHaveLength(1)
  })

  it('custom expand icon is wrapped against bubbling only when expandRowByClick is true', () => {
    const onClick = vi.fn()
    const onExpand = vi.fn()
    const { container } = customRender(
      <Table
        columns={columns}
        dataSource={[John, Jim]}
        onRow={() => ({ onClick })}
        expandable={{
          expandRowByClick: true,
          expandedRowRender: () => <div className="er">ER</div>,
          onExpand,
          expandIcon: ({ expanded, record, onExpand: toggle }) => (
            <div
              className="custom-expand-icon"
              data-expanded={String(expanded)}
              onClick={(e) => toggle(record, e)}
            />
          ),
        }}
      />,
    )

    fireEvent.click(container.querySelector('.custom-expand-icon')!)
    // 参照 `useColumns/index.js:144-147`：erbc 为真 ⇒ 条件 span ⇒ 用户回调 0 次。
    expect(onClick).toHaveBeenCalledTimes(0)
    // 旧实现此处是 **2** 次：自定义图标不带 `.dg-expand-icon` 类 ⇒ 逃过 `shouldSkipRowSelectionClick`
    //   的跳过集，冒泡进行体点击那条内部路径又补了一次 toggleExpand（同帧快照 → 净展开 1 行、回调 2 次）。
    //   条件 span 顺带修掉这个双切换，与参照的 1 次对齐。
    expect(onExpand).toHaveBeenCalledTimes(1)
    expect(container.querySelectorAll('.er')).toHaveLength(1)
    expect(container.querySelector('.custom-expand-icon')).toHaveAttribute('data-expanded', 'true')
  })

  it('custom expand icon still bubbles to user onRow.onClick when expandRowByClick is off', () => {
    const onClick = vi.fn()
    const onExpand = vi.fn()
    const { container } = customRender(
      <Table
        columns={columns}
        dataSource={[John, Jim]}
        onRow={() => ({ onClick })}
        expandable={{
          expandRowByClick: false,
          expandedRowRender: () => <div className="er">ER</div>,
          onExpand,
          expandIcon: ({ expanded, record, onExpand: toggle }) => (
            <div
              className="custom-expand-icon"
              data-expanded={String(expanded)}
              onClick={(e) => toggle(record, e)}
            />
          ),
        }}
      />,
    )

    fireEvent.click(container.querySelector('.custom-expand-icon')!)
    // ★ 不许改这一格：参照此刻**刻意不**包那层 span（`useColumns/index.js:143-148` 的 else 分支原样返回 icon），
    //   用户自定义图标的点击照样冒泡到 `onRow.onClick` ⇒ 两侧都是 1 次（探针 B2：dg 1 / antd 1）。
    //   把它「顺手改成阻断」会造出一条新分叉（我们比参照更激进）。
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onExpand).toHaveBeenCalledTimes(1)
    expect(container.querySelectorAll('.er')).toHaveLength(1)
  })

  it('tree expand icon click does not fire user onRow.onClick', () => {
    const onClick = vi.fn()
    const onExpand = vi.fn()
    const { container } = customRender(
      <Table
        columns={columns}
        dataSource={data}
        onRow={() => ({ onClick })}
        expandable={{ onExpand }}
      />,
    )

    expect(container.querySelectorAll('.dg-cell-body')).toHaveLength(1)
    fireEvent.click(container.querySelector(EXPAND_ICON)!)
    // 树形缩进图标复用同一个 `ExpandIcon` ⇒ 同一道阻断；参照 nest 路径同理
    //   （`@rc-component/table/es/Body/BodyRow.js:34-45` 调用的就是 antd 那个自带 stopPropagation 的图标，
    //    且 nest 路径连条件 span 都没有）。
    expect(onClick).toHaveBeenCalledTimes(0)
    expect(onExpand).toHaveBeenCalledTimes(1)
    expect(container.querySelectorAll('.dg-cell-body')).toHaveLength(2)
  })

  // cellMerge × 树形：`rowSpan` 数的是"行"，已展开的子行是附加轨道（不占配额）。
  //   否则子行会吃掉配额——分组合并格停在子行末尾，同组剩余行（声明 rowSpan: 0）整列留空，
  //   视觉上就是"分组的横线画在展开前的位置"。详见 docs/features/layout/header-and-span.md。
  it('rowSpan counts rows while expanded children join the merged cell as extra tracks', () => {
    const grouped = [
      {
        key: 'g1',
        group: 'G1',
        name: 'parent-1',
        children: [
          { key: 'g1-c1', group: 'G1-child', name: 'child-1' },
          { key: 'g1-c2', group: 'G1-child', name: 'child-2' },
        ],
      },
      { key: 'g2', group: 'G1', name: 'parent-2' },
      { key: 'g3', group: 'G1', name: 'parent-3' },
    ]
    // 分组列：(起行) 声明跨 3 行（parent-1/2/3），其余行 rowSpan: 0 表示被覆盖。
    const groupSpan: Record<string, number> = { g1: 3, g2: 0, g3: 0 }
    const groupColumns: TableProps<(typeof grouped)[number]>['columns'] = [
      {
        title: 'group',
        dataIndex: 'group',
        key: 'group',
        onCell: (record) => ({ rowSpan: groupSpan[String(record.key)] ?? 1 }),
      },
      { title: 'name', dataIndex: 'name', key: 'name' },
    ]
    const { container, rerender } = customRender(
      <Table columns={groupColumns} dataSource={grouped} expandable={{}} />,
    )

    const mergedCell = () => container.querySelector<HTMLElement>('.dg-cell-rowspan')!

    // 收起：3 行（parent-1/2/3）。
    expect(mergedCell()).toHaveAttribute('aria-rowspan', '3')
    expect(mergedCell().style.gridRow).toContain('span 3')

    // 展开：parent-1 + 2 个子行 + parent-2/3 = 5 条轨道；rowSpan 仍按 3 行计，子行是附加轨道。
    rerender(<Table columns={groupColumns} dataSource={grouped} expandable={{ expandedRowKeys: ['g1'] }} />)
    expect(container.querySelectorAll('.dg-cell-rowspan')).toHaveLength(1)
    expect(mergedCell()).toHaveAttribute('aria-rowspan', '5')
    expect(mergedCell().style.gridRow).toContain('span 5')
    // 子行与同组剩余行在分组列都不渲染格子（被合并格覆盖），数据列正常。
    expect(
      container.querySelectorAll('.dg-cell-body[data-column-key="group"]'),
    ).toHaveLength(1)
    expect(
      container.querySelectorAll('.dg-cell-body[data-column-key="name"]'),
    ).toHaveLength(5)
  })
})
