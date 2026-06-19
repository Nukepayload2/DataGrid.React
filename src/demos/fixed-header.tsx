/**
 * 复刻 antd `fixed-header` demo：
 *   `G:\Projects\ant-design\components\table\demo\fixed-header.tsx`
 *
 * antd 原版：3 列（Name/Age/Address）× 100 行，`scroll={{ y: 55 * 5 }}` 表头固定、表体纵向滚动，
 * `pagination={{ pageSize: 50 }}`。
 *
 * === data-grid 对应 ===
 *
 * - M8 固定表头：`scroll={{ y: 55 * 5 }}` → 表体容器 max-height=275px 纵向滚动，
 *   表头 `position: sticky; top: 0` 钉顶（纵向滚动时表头不消失）。
 * - **分页（pagination）暂未实现**（S11 任务）。antd 原版用 `pagination={{ pageSize: 50 }}`
 *   把 100 行分两页；data-grid 当前一次性渲染全部 100 行（表体限高滚动，视觉上等价于
 *   "一页 100 行 + 表头固定"）。S11 完成后可补回 pagination 行为，不影响本 demo 的 M8 验收。
 *
 * 与官方 demo 差异：antd 用 `createStyles` 加细滚动条样式，data-grid 暂不消费 className，故略去
 * （视觉上浏览器默认滚动条）。
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
    title: 'Name',
    dataIndex: 'name',
    width: 150,
  },
  {
    title: 'Age',
    dataIndex: 'age',
    width: 150,
  },
  {
    title: 'Address',
    dataIndex: 'address',
  },
]

const dataSource = Array.from({ length: 100 }).map<DataType>((_, i) => ({
  key: i,
  name: `Edward King ${i}`,
  age: 32,
  address: `London, Park Lane no. ${i}`,
}))

export default function FixedHeaderDemo() {
  return (
    <Table<DataType>
      columns={columns}
      dataSource={dataSource}
      scroll={{ y: 55 * 5 }}
    />
  )
}
