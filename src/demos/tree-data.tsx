/**
 * 复刻 antd `tree-data` demo（S13 验收）：
 *   `G:\Projects\ant-design\components\table\demo\tree-data.tsx`
 *
 * === antd demo 要素 ===
 *
 * - dataSource record 含 `children` 嵌套子字段（默认 childrenColumnName='children'）→ 自动进入**树形模式**。
 * - 嵌套数据：John Brown sr. → 子树多层（John Brown / John Brown jr. → Jimmy Brown；
 *   Jim Green sr. → Jim Green → Jim Green jr. + Jimmy Green sr.）；Joe Black 无 children。
 * - 3 列 Name/Age/Address（首列 Name 含展开图标 + 缩进）。
 * - 顶部 `CheckStrictly` Switch（默认 **false** = 父子联动）。
 * - rowSelection 的 onChange / onSelect console.log。
 *
 * === S13 关键行为 ===
 *
 * - **扁平化**：嵌套 children DFS 扁平化；按展开状态过滤（仅展开父行的子孙可见）。
 *   默认未传 expandable → 仅顶层 2 行可见（John Brown sr. + Joe Black）。
 * - **首列缩进 + 展开图标**：Name 列单元格内，`level × indentSize`（indentSize 默认 15px，对齐
 *   antd 6.4.4 实测）左缩进；hasChildren 行渲染展开/收起图标（▶/▼），点击 toggle。
 * - **checkStrictly=false**（默认）：父子勾选联动——勾父→勾全部子；勾全部子→勾父（半选 indeterminate）。
 * - **checkStrictly=true**：独立勾选，父子不联动。
 *
 * === 决策 2 ===
 *
 * 树形展开行视为**普通表格行**，遵循行高约定（rowHeight），不做动态测量
 * （见 task-plan §1.2 决策 2 + GridTable.tsx 文件头注释）。
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

const data: DataType[] = [
  {
    key: 1,
    name: 'John Brown sr.',
    age: 60,
    address: 'New York No. 1 Lake Park',
    children: [
      {
        key: 11,
        name: 'John Brown',
        age: 42,
        address: 'New York No. 2 Lake Park',
      },
      {
        key: 12,
        name: 'John Brown jr.',
        age: 30,
        address: 'New York No. 3 Lake Park',
        children: [
          {
            key: 121,
            name: 'Jimmy Brown',
            age: 16,
            address: 'New York No. 3 Lake Park',
          },
        ],
      },
      {
        key: 13,
        name: 'Jim Green sr.',
        age: 72,
        address: 'London No. 1 Lake Park',
        children: [
          {
            key: 131,
            name: 'Jim Green',
            age: 42,
            address: 'London No. 2 Lake Park',
            children: [
              {
                key: 1311,
                name: 'Jim Green jr.',
                age: 25,
                address: 'London No. 3 Lake Park',
              },
              {
                key: 1312,
                name: 'Jimmy Green sr.',
                age: 18,
                address: 'London No. 4 Lake Park',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    key: 2,
    name: 'Joe Black',
    age: 32,
    address: 'Sydney No. 1 Lake Park',
  },
]

// rowSelection objects indicates the need for row selection.
// 注：antd demo 还用了 onSelect（单行勾选回调）；data-grid 此版本 TableRowSelection
// 尚未实现 onSelect（决策 3 第二步补齐），这里仅保留 onChange（功能等价：onChange 在每次
// 勾选时触发，可在其中观察 selectedRowKeys 变化）。
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

export default function TreeDataDemo() {
  // 默认 checkStrictly=false（父子联动），对齐 antd tree-data demo。
  const [checkStrictly, setCheckStrictly] = useState(false)

  return (
    <div style={{ padding: 24 }}>
      <Space align="center" style={{ marginBottom: 16 }}>
        CheckStrictly: <Switch checked={checkStrictly} onChange={setCheckStrictly} />
      </Space>
      <Table<DataType>
        columns={columns}
        rowSelection={{ ...rowSelection, checkStrictly }}
        dataSource={data}
      />

      <div style={{ marginTop: 16, padding: 12, background: '#fafafa', borderRadius: 8, color: 'rgba(0,0,0,0.65)', fontSize: 12 }}>
        树形数据（childrenColumnName='children'）：首列按 <code>level × indentSize(15px)</code> 缩进 +
        hasChildren 行渲染展开图标；CheckStrictly=false（默认）父子勾选联动。决策 2：树形展开行视为
        普通行，遵循行高约定（不动态测量）。
      </div>
    </div>
  )
}
