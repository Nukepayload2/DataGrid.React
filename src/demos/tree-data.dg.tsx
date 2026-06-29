/**
 * tree-data demo 的 data-grid 段（左栏）。props 驱动 `{ checkStrictly, virtual }`
 * （checkStrictly 由父级 DemoToolbar Switch 驱动）。rowSelection 的 onChange console.log 各侧独立。
 */
import { Table } from '../table'
import type { ColumnType, TableProps } from '../table'
import { data, type RecordType } from './_compare/tree-data.shared'

type TableRowSelection<T extends object = object> = TableProps<T>['rowSelection']

// ---------------------------------------------------------------------------
// 列定义 —— Name/Age/Address 纯文本，无 render（首列缩进 + 展开图标由引擎渲染）
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<RecordType>[] = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Age', dataIndex: 'age', key: 'age', width: '12%' },
  { title: 'Address', dataIndex: 'address', key: 'address', width: '30%' },
]

// ---------------------------------------------------------------------------
// rowSelection —— onChange console.log（各侧独立）；checkStrictly 由 props 注入。
// 注：antd demo 含 onSelect（单行勾选回调）；data-grid TableRowSelection 仅声明 onChange
// （功能等价：onChange 在每次勾选时触发）。
// ---------------------------------------------------------------------------

const dgRowSelectionBase: TableRowSelection<RecordType> = {
  onChange: (selectedRowKeys, selectedRows, info) => {
    // eslint-disable-next-line no-console
    console.log(
      `[data-grid] selectedRowKeys: ${selectedRowKeys}`,
      'selectedRows: ',
      selectedRows,
      'info',
      info,
    )
  },
}

// ---------------------------------------------------------------------------
// 子组件
// ---------------------------------------------------------------------------

export default function TreeDataDg({
  checkStrictly = false,
  virtual = false,
}: {
  checkStrictly: boolean
  virtual: boolean
}) {
  return (
    // data-grid 默认不分页，显式传 pagination={{}} 复刻 antd 默认分页行为（本 demo 顶层 2 行 → 单页）。
    <Table<RecordType>
      columns={dgColumns}
      rowSelection={{ ...dgRowSelectionBase, checkStrictly }}
      dataSource={data}
      pagination={{}}
      // ON→virtual+scroll.y=true（CSS 自适应高度，SplitDemo 限高 pane body 提供可滚动区域）。
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}
