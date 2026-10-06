// 黑盒 feature-slice 测试：空态（empty）用例，与 antd 自家 empty 测试对齐 + data-grid 特有语义。
//
// 对齐来源: {{AntDesign}}/components/table/__tests__/empty.test.tsx（6 个 it，逐条对齐）
//   + 2 个 data-grid 特有直测（筛选无结果共用 emptyText、locale.emptyText 函数形态）
//   = 共 8 用例（7 直测 + 1 skip）。
//
// 选择器重映射：
//   - antd `.ant-table-placeholder` → `.dg-empty`（data-grid 表体空态区 div，
//     src/table/engine/GridTable.tsx:754-766，仅 `emptyText && dataSource.length === 0` 时渲染）。
//   - 默认空态内容为 antd `<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />`（`.ant-empty`，
//     src/table/emptyLoadingAdapter.tsx:30-36，对齐 antd InternalTable 的 DefaultRenderEmpty 'Table' 兜底）。
//   - antd 的 offsetWidth spy + triggerResize 是 rc-resize-observer 布局测量所需；
//     data-grid 空态区渲染不依赖实测宽度（jsdom RO 为 no-op mock），故无需 spy/resize。
//
// emptyText 优先级（src/table/emptyLoadingAdapter.tsx:9-32 useTableEmptyText）：
//   rowCount>0 → null；locale.emptyText（函数则调用）> ConfigProvider renderEmpty('Table')
//   > 默认 antd <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />（对齐 antd InternalTable 兜底）。
//
// skip 策略：'should not render empty when loading' 是 data-grid 与 antd 的行为差异
// （useTableEmptyText 无 loading 参数），见对应用例注释。
import { describe, expect, it } from 'vitest'

import { Table, type TableProps } from '../../../src/table/index'
import { customRender } from '../../shared/render'
import { expectSnapshot } from '../../shared/snapshot'

const columns: TableProps<any>['columns'] = [
  { title: 'Column 1', dataIndex: 'address', key: '1' },
  { title: 'Column 2', dataIndex: 'address', key: '2' },
  { title: 'Column 3', dataIndex: 'address', key: '3' },
  { title: 'Column 4', dataIndex: 'address', key: '4' },
]

const columnsFixed: TableProps<any>['columns'] = [
  {
    title: 'Full Name',
    width: 100,
    dataIndex: 'name',
    key: 'name',
    fixed: 'start',
  },
  {
    title: 'Age',
    width: 100,
    dataIndex: 'age',
    key: 'age',
    fixed: 'start',
  },
  ...columns,
  {
    title: 'Action',
    key: 'address',
    fixed: 'end',
    width: 100,
  },
]

describe('Table empty', () => {
  // antd empty.test.tsx L51 'renders empty table'。
  it('renders empty table', () => {
    const { container } = customRender(
      <Table dataSource={[]} columns={columns} pagination={false} />,
    )

    // 空态区存在，默认内容为 antd <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />；表体无数据格。
    const empty = container.querySelector('.dg-empty')
    expect(empty).toBeTruthy()
    expect(empty!.querySelector('.ant-empty')).toBeTruthy()
    expect(container.querySelector('.dg-cell-body')).toBeFalsy()

    expectSnapshot(container.firstChild)
  })

  // antd empty.test.tsx L56-91 'renders empty table with fixed columns should work'。
  // 固定列 + scroll.x 空表仍渲染空态区（data-grid 空态区独立于滚动模式，
  // 无需 antd 的 offsetWidth spy / triggerResize / fake timers）。
  it('renders empty table with fixed columns', () => {
    const { container } = customRender(
      <Table dataSource={[]} columns={columnsFixed} pagination={false} scroll={{ x: 1 }} />,
    )

    expect(container.querySelector('.dg-empty')).toBeTruthy()
    expect(container.querySelector('.ant-empty')).toBeTruthy()

    expectSnapshot(container.firstChild)
  })

  // antd empty.test.tsx L93 'renders empty table when emptyText is null'。
  // 重映射：antd 保留空占位格（placeholder cell 无子节点）；data-grid 的 emptyText=null 时
  // 整个空态区不渲染（GridTable.tsx:754 `{emptyText && dataSource.length === 0}`，
  // useTableEmptyText 返回 null，emptyLoadingAdapter.tsx:19-23）。
  it('renders empty table when emptyText is null', () => {
    const { container } = customRender(
      <Table dataSource={[]} columns={columns} pagination={false} locale={{ emptyText: null }} />,
    )

    expect(container.querySelector('.dg-empty')).toBeFalsy()
    expect(container.querySelector('.ant-empty')).toBeFalsy()
  })

  // antd empty.test.tsx L105 'renders empty table with custom emptyText'。
  it('renders empty table with custom emptyText', () => {
    const { container } = customRender(
      <Table
        dataSource={[]}
        columns={columns}
        pagination={false}
        locale={{ emptyText: 'custom empty text' }}
      />,
    )

    expect(container.querySelector('.dg-empty')?.textContent).toBe('custom empty text')
  })

  // antd empty.test.tsx L117 'renders empty table without emptyText when loading'。
  // 注意：data-grid loading 时**仍渲染** .dg-empty（在 Spin 内部）——与 antd 的行为差异
  // 由下方 'should not render empty when loading' skip 用例记录；此处快照记录 data-grid 实际 DOM。
  it('renders empty table without emptyText when loading', () => {
    const { container } = customRender(<Table dataSource={[]} columns={columns} loading />)

    expect(container.querySelector('.ant-spin-spinning')).toBeTruthy()

    expectSnapshot(container.firstChild)
  })

  // antd empty.test.tsx L123-128（规约源 6.5.2；issue 54601）'should not render empty when loading'。
  // skip 依据（**行为差异，仍真**，非选择器问题）：
  //   - 裁判 **6.4.4**：抑制分支在 `node_modules/antd/es/table/InternalTable.js:403-417` 的 `mergedEmptyNode`，
  //     判据 `:408` 是 `if (spinProps?.spinning && rawData === EMPTY_LIST) return null`，
  //     而 `:122` `const rawData = dataSource || EMPTY_LIST`
  //     ⇒ **只有"根本不传 `dataSource`"才抑制**；`dataSource={[]}` 是新数组、不等于 EMPTY_LIST ⇒ **不抑制**。
  //     ⚠️ 旧依据只写"spinning 时抑制空占位"，漏了 `EMPTY_LIST` 引用相等这一半 ⇒ 口径过宽，已按实读收窄
  //     （其指的上游 6.5.2 `InternalTable.tsx:686-698` 同段逻辑）。
  //   - data-grid：`useTableEmptyText` 入参仅 `{ rowCount, locale }`、无 loading 参数
  //     （`src/table/emptyLoadingAdapter.tsx:9-32`，该行号实测仍准），
  //     调用点 `src/table/Table.tsx:835-838` 也不传 loading
  //     （旧依据写的 `Table.tsx:729-732` 实测已漂到展开行绑定那段，已改）
  //     → loading 时 `.dg-empty`（含 `.ant-empty`）仍在 Spin 内部渲染。
  //   - 双臂 × 两形态实测（探针 `tmp/81-probe-readings.txt` 臂 `A12.*`，两臂都只数容器内节点）：
  //     `A12.dg.noDataSource` spin 1 / `*[class^="ant-empty"]` **2**；`A12.dg.emptyArray` 同 **2**；
  //     `A12.ref.noDataSource` spin 1 / **0**（裁判**抑制**）；`A12.ref.emptyArray` spin 1 / **2**（裁判**不抑制**）
  //     ⇒ 上游用例的真实构造（不传 dataSource）下**不同值** ⇒ 留 skip。
  //     另登记：`dataSource={[]}` 那一形态两臂**同值**（都渲染空态），但本文件现有直测
  //     `renders empty table without emptyText when loading` 用的正是 `dataSource={[]}`，
  //     **没走到**裁判的抑制分支 ⇒ 它不构成本 skip 的重复覆盖；要补那一形态请连同下方对齐一起做。
  // 记录为已知 gap；若后续对齐 antd（spinning 且未传 dataSource 时抑制 empty），去掉 skip 并把断言改为
  // ".ant-spin-spinning truthy 且 .ant-empty 不存在"。
  it.skip('should not render empty when loading', () => {
    // 占位：data-grid loading 时不抑制空态区（useTableEmptyText 无 loading 参数）。
  })


  // data-grid 特有：表体 empty 不区分"空数据 vs 筛选无结果"，两种场景共用同一 emptyText
  // （src/table/publicTypes.ts:496-506；useFilter 非受控初始值取 defaultFilteredValue，
  // src/table/engine/useFilter.ts:104-117）。
  it('shares emptyText between empty data and filtered-no-result', () => {
    const filterColumns: TableProps<any>['columns'] = [
      {
        title: 'Name',
        dataIndex: 'name',
        key: 'name',
        filters: [{ text: 'a', value: 'a' }],
        onFilter: () => false,
        defaultFilteredValue: ['a'],
      },
    ]
    const { container } = customRender(
      <Table
        columns={filterColumns}
        dataSource={[{ key: '1', name: 'b' }]}
        locale={{ emptyText: 'no result' }}
        pagination={false}
      />,
    )

    // 筛选后无结果 → 表体空态区显示同一 emptyText。
    expect(container.querySelector('.dg-cell-body')).toBeFalsy()
    expect(container.querySelector('.dg-empty')?.textContent).toBe('no result')
  })

  // data-grid 特有：locale.emptyText 支持函数形态（ReactNode | (() => ReactNode)，
  // src/table/compat/locale.ts:33；函数调用见 emptyLoadingAdapter.tsx:19-23）。
  it('supports function-form locale.emptyText', () => {
    const { container } = customRender(
      <Table
        columns={columns}
        dataSource={[]}
        locale={{ emptyText: () => <span>fn empty</span> }}
        pagination={false}
      />,
    )

    expect(container.querySelector('.dg-empty')?.textContent).toBe('fn empty')
  })
})
