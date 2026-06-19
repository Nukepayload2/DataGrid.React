/**
 * 复刻 antd `fixed-gapped-columns` demo：
 *   `G:\Projects\ant-design\components\table\demo\fixed-gapped-columns.tsx`
 *
 * 重点：**分散的多个固定列堆叠** + bordered。
 *
 * 列结构（与 antd demo 完全一致）：
 *   - start 侧分散两段：[FullName(start)] ... [Column1(start)]（中间夹着非固定的 Age）
 *     —— 即 start 侧有 2 个固定列，但它们不相邻（Name 在最左、Column1 在第 3 列）。
 *   - end 侧分散两段：[Action1(end)] ... [Action3(end)]（中间夹着非固定的 Action2）
 *   - 启用 `bordered`，便于看清堆叠边界。
 *
 * === M2 堆叠实现要点 ===
 *
 * `useStickyColumns` 按**列顺序**累加偏移，不要求固定列相邻：
 *   - start 侧：从左到右扫，遇到 fixed=start 就累加宽度。所以 Name(left:0)、Column1(left:w_name)。
 *     Name 与 Column1 之间的 Age（非固定）不参与累加，但 Column1 的 left 仍是 Name 的宽度——
 *     滚动时 Column1 会"叠"在 Name 右边（视觉上两列都固定在左侧）。
 *   - end 侧：从右到左扫，遇到 fixed=end 就累加。Action3(right:0)、Action1(right:w_action3)。
 *
 * 这样无论固定列是否相邻，都能正确堆叠（antd fixed-gapped demo 的核心验证点）。
 *
 * 数据：与 antd demo 一致（2 行）。
 */

import { Table } from '../table'
import type { ColumnType } from '../table'

interface DataType {
  key: string | number
  name: string
  age: number
  address: string
}

const columns: ColumnType<DataType>[] = [
  {
    title: 'Full Name',
    width: 100,
    dataIndex: 'name',
    fixed: 'start',
  },
  {
    title: 'Age',
    width: 100,
    dataIndex: 'age',
  },
  { title: 'Column 1', dataIndex: 'address', key: '1', fixed: 'start' },
  { title: 'Column 2', dataIndex: 'address', key: '2' },
  { title: 'Column 3', dataIndex: 'address', key: '3' },
  { title: 'Column 4', dataIndex: 'address', key: '4' },
  { title: 'Column 5', dataIndex: 'address', key: '5' },
  { title: 'Column 6', dataIndex: 'address', key: '6' },
  { title: 'Column 7', dataIndex: 'address', key: '7' },
  { title: 'Column 8', dataIndex: 'address', key: '8' },
  { title: 'Column 9', dataIndex: 'address', key: '9' },
  { title: 'Column 10', dataIndex: 'address', key: '10' },
  { title: 'Column 11', dataIndex: 'address', key: '11' },
  { title: 'Column 12', dataIndex: 'address', key: '12' },
  { title: 'Column 13', dataIndex: 'address', key: '13' },
  { title: 'Column 14', dataIndex: 'address', key: '14' },
  { title: 'Column 15', dataIndex: 'address', key: '15' },
  { title: 'Column 16', dataIndex: 'address', key: '16' },
  { title: 'Column 17', dataIndex: 'address', key: '17' },
  { title: 'Column 18', dataIndex: 'address', key: '18' },
  { title: 'Column 19', dataIndex: 'address', key: '19' },
  { title: 'Column 20', dataIndex: 'address', key: '20' },
  {
    title: 'Action 1',
    fixed: 'end',
    width: 90,
    render: () => <a>action</a>,
  },
  {
    title: 'Action 2',
    width: 90,
    render: () => <a>action</a>,
  },
  {
    title: 'Action 3',
    fixed: 'end',
    width: 90,
    render: () => <a>action</a>,
  },
]

const dataSource: DataType[] = [
  { key: '1', name: 'Olivia', age: 32, address: 'New York Park' },
  { key: '2', name: 'Ethan', age: 40, address: 'London Park' },
]

export default function FixedGappedColumnsDemo() {
  return (
    <Table<DataType>
      bordered
      columns={columns}
      dataSource={dataSource}
      scroll={{ x: 'max-content' }}
    />
  )
}
