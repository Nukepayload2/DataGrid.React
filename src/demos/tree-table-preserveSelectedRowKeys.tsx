/**
 * 复刻 antd `tree-table-preserveSelectedRowKeys` demo（S14 验收）：
 *   `G:\Projects\ant-design\components\table\demo\tree-table-preserveSelectedRowKeys.tsx`
 *
 * === antd demo 要素 ===
 *
 * - **15 个父行**（Edward 0..14），每父含 **2 个子行**（Brown / Jimmy）→ 树形模式。
 * - 3 列 Name/Age/Address。
 * - 顶部 **CheckStrictly** Switch（默认 **false** = 父子联动）。
 * - 顶部 **preserveSelectedRowKeys** Switch（默认 **true** = 翻页/折叠保留已选 key）。
 * - `rowSelection={{ checkStrictly, preserveSelectedRowKeys, onChange }}`（onSelect 是 data-grid
 *   决策 3 第二步才补的 API；这里用 onChange 功能等价——每次勾选触发，可观察 selectedRowKeys）。
 * - `pagination={{ defaultPageSize: 5 }}`（15 父 → 3 页）。
 *
 * === S14 关键场景（issue #50621）===
 *
 * 组合：树形 × 分页 × `checkStrictly=false` × `preserveSelectedRowKeys=true`。
 *
 * - **跨页保留**：第 1 页勾选某父（联动勾选其全部含跨页子）→ 翻到第 2 页 → 回第 1 页，
 *   之前页选的父+子仍选中（preserve=true 保留 key）。
 * - **折叠保留**：展开父行→勾选子→折叠父行→子 key 仍在 selectedRowKeys（preserve 保留），
 *   再展开子仍是选中态。
 * - **联动跨页/折叠**：勾父→全部子（含折叠/跨页的）被勾；ant 递归 parentChildrenMap（全树，
 *   不受展开/分页影响）。
 *
 * === 引擎组合确认（无需修复）===
 *
 * - `usePagination.dataSourceLength = flattenedDataSource.length`：分页基于扁平化后可见行数
 *   （S13 已如此，S14 确认）。
 * - `slicePage(flattenedDataSource, ...)`：切片作用于扁平化后（确认）。
 * - `useRowSelection.dataSource = flattenedDataSource` + `parentChildrenMap = 全树`：
 *   父子联动基于全树结构，不受展开/分页影响（勾父→全部含跨页/折叠子；保留正确）。
 * - `fireSelectionChange` 存在性判定用**全树**（filteredDataSource 递归 walk children）：
 *   preserve=false 也不会误清折叠/跨页子孙 key（S13 已改，S14 确认）；preserve=true 不过滤，
 *   nextKeys 原样保留所有 key（含跨页/折叠的）。
 *
 * === 决策 2 ===
 *
 * 树形展开行视为普通表格行，遵循行高约定（rowHeight），不动态测量。
 */

import { useState } from 'react'
import { Space, Switch } from 'antd'
import { Table } from '../table'
import type { ColumnType, TableProps } from '../table'

type TableRowSelection<T extends object = object> = TableProps<T>['rowSelection']

interface DataType {
  key: React.ReactNode
  name: string
  age: number
  address: string
  children?: DataType[]
}

const columns: ColumnType<DataType>[] = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Age', dataIndex: 'age', key: 'age', width: '12%' },
  { title: 'Address', dataIndex: 'address', key: 'address', width: '30%' },
]

// 15 个父行（Edward 0..14），每父含 2 个子行（Brown / Jimmy）——对齐 antd demo 数据。
const dataSource: DataType[] = Array.from({ length: 15 }).map<DataType>((_, i) => ({
  key: `key${i}`,
  name: `Edward ${i}`,
  age: 32,
  address: `London Park no. ${i}`,
  children: [
    {
      key: `subKey${i}1`,
      name: 'Brown',
      age: 16,
      address: 'New York No. 3 Lake Park',
    },
    {
      key: `subKey${i}2`,
      name: 'Jimmy',
      age: 16,
      address: 'New York No. 3 Lake Park',
    },
  ],
}))

// rowSelection：onChange console.log（功能等价 antd demo 的 onChange + onSelect）。
// onSelect 属决策 3 第二步补齐的 API，这里用 onChange 观察勾选变化即可。
const rowSelection: TableRowSelection<DataType> = {
  onChange: (selectedRowKeys, selectedRows, info) => {
    console.log(
      `selectedRowKeys: ${selectedRowKeys}`,
      'selectedRows: ',
      selectedRows,
      'info',
      info,
    )
  },
}

export default function TreeTablePreserveSelectedRowKeysDemo() {
  // 默认 checkStrictly=false（父子联动），对齐 antd demo。
  const [checkStrictly, setCheckStrictly] = useState(false)
  // 默认 preserveSelectedRowKeys=true（翻页/折叠保留），对齐 antd demo。
  const [preserveSelectedRowKeys, setPreserveSelectedRowKeys] = useState(true)

  return (
    <div style={{ padding: 24 }}>
      <Space align="center" style={{ marginBottom: 16 }}>
        CheckStrictly:{' '}
        <Switch checked={checkStrictly} onChange={setCheckStrictly} />
        preserveSelectedRowKeys:{' '}
        <Switch
          checked={preserveSelectedRowKeys}
          onChange={setPreserveSelectedRowKeys}
        />
      </Space>
      <Table<DataType>
        columns={columns}
        rowSelection={{ ...rowSelection, checkStrictly, preserveSelectedRowKeys }}
        dataSource={dataSource}
        pagination={{ defaultPageSize: 5 }}
      />

      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: '#fafafa',
          borderRadius: 8,
          color: 'rgba(0,0,0,0.65)',
          fontSize: 12,
        }}
      >
        树形 × 分页 × checkStrictly(false) × preserveSelectedRowKeys(true)（issue #50621）：
        15 父 × 2 子 + 分页 5/页。勾父→联动勾全部子（含折叠/跨页）；翻页/折叠后已选 key 保留。
      </div>
    </div>
  )
}
