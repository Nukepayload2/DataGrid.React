/**
 * 复刻 antd `expand` demo（M9 验收）：
 *   `G:\Projects\ant-design\components\table\demo\expand.tsx`
 *
 * === antd demo 要素 ===
 *
 * - `expandable.expandedRowRender(record)`：展开内容渲染 description。
 * - `expandable.rowExpandable(record)`：record.name === 'Not Expandable' 的行不可展开
 *   → 图标禁用（与 antd 一致）。
 * - 默认非受控展开态（未传 expandedRowKeys / defaultExpandedRowKeys）。
 *
 * === 验证点（M9）===
 *
 * 1. 每行第一列（默认展开列位置）渲染展开图标。
 * 2. 点击图标：▶ → ▼ 平滑旋转（0.3s），同时展开内容 track `0fr → 1fr` 平滑展开。
 *    再点击收起，对称动画。
 * 3. "Not Expandable" 行的图标为禁用态（灰、cursor not-allowed、点击无反应）。
 * 4. 展开内容：description 文本，带淡灰底（rowExpandedBg token）+ 内边距。
 * 5. 展开行与表头 / 其它行 / border 视觉正确（不崩）。
 */

import { Table } from '../table'
import type { ColumnType, Expandable } from '../table'

interface DataType {
  key: React.Key
  name: string
  age: number
  address: string
  description: string
}

const columns: ColumnType<DataType>[] = [
  { title: 'Name', dataIndex: 'name' },
  { title: 'Age', dataIndex: 'age' },
  { title: 'Address', dataIndex: 'address' },
  {
    title: 'Action',
    dataIndex: '',
    render: () => <a>Delete</a>,
  },
]

const data: DataType[] = [
  {
    key: 1,
    name: 'John Brown',
    age: 32,
    address: 'New York No. 1 Lake Park',
    description: 'My name is John Brown, I am 32 years old, living in New York No. 1 Lake Park.',
  },
  {
    key: 2,
    name: 'Jim Green',
    age: 42,
    address: 'London No. 1 Lake Park',
    description: 'My name is Jim Green, I am 42 years old, living in London No. 1 Lake Park.',
  },
  {
    key: 3,
    name: 'Not Expandable',
    age: 29,
    address: 'Jiangsu No. 1 Lake Park',
    description: 'This not expandable',
  },
  {
    key: 4,
    name: 'Joe Black',
    age: 32,
    address: 'Sydney No. 1 Lake Park',
    description: 'My name is Joe Black, I am 32 years old, living in Sydney No. 1 Lake Park.',
  },
]

const expandable: Expandable<DataType> = {
  expandedRowRender: (record) => <p style={{ margin: 0 }}>{record.description}</p>,
  // "Not Expandable" 行不可展开（图标禁用）。
  rowExpandable: (record) => record.name !== 'Not Expandable',
}

export default function ExpandDemo() {
  return (
    <div style={{ padding: 24 }}>
      <Table<DataType>
        columns={columns}
        expandable={expandable}
        dataSource={data}
      />

      <div style={{ marginTop: 16, padding: 12, background: '#fafafa', borderRadius: 8, color: 'rgba(0,0,0,0.65)', fontSize: 12 }}>
        点击每行第一列的展开图标展开/收起。展开内容 grid track 用 <code>0fr↔1fr</code> 过渡
        （lun 思路，纯 React 重写）；"Not Expandable" 行图标禁用。
      </div>
    </div>
  )
}
