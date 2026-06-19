/**
 * 复刻 antd `fixed-columns` demo：
 *   `G:\Projects\ant-design\components\table\demo\fixed-columns.tsx`
 *
 * 重点：左右固定列（Name/Age 固定 start，Action 固定 end）+ `scroll={{ x: 'max-content' }}` 横向滚动。
 *
 * === M2 落地说明 ===
 *
 * - 列定义与 antd demo 完全一致（含 `sorter: true` 字段，但 data-grid 未实现排序 S1，
 *   该字段被忽略，不影响渲染——保留字段以贴近 antd demo 列定义）。
 * - `scroll={{ x: 'max-content' }}` 启用横向滚动容器；固定列 Name/Age（start）与 Action（end）
 *   在滚动时 sticky 固定，边缘格画淡阴影。
 * - 数据：与 antd demo 一致（2 行 Olivia/Ethan）。
 *
 * 与官方 demo 差异：antd 用 `createStyles` 加细滚动条样式，data-grid 暂不消费 className，
 * 故略去（视觉上浏览器默认滚动条）。
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
    key: 'name',
    fixed: 'start',
  },
  {
    title: 'Age',
    width: 100,
    dataIndex: 'age',
    key: 'age',
    fixed: 'start',
    // 注：antd demo 此列带 sorter:true；data-grid 未实现排序（S1 任务），ColumnType
    // 暂不含 sorter 字段，故略去——视觉/列结构无影响。
  },
  { title: 'Column 1', dataIndex: 'address', key: '1' },
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
    title: 'Action',
    key: 'operation',
    fixed: 'end',
    width: 100,
    render: () => <a>action</a>,
  },
]

const dataSource: DataType[] = [
  { key: '1', name: 'Olivia', age: 32, address: 'New York Park' },
  { key: '2', name: 'Ethan', age: 40, address: 'London Park' },
]

export default function FixedColumnsDemo() {
  return (
    <Table<DataType>
      columns={columns}
      dataSource={dataSource}
      scroll={{ x: 'max-content' }}
    />
  )
}
