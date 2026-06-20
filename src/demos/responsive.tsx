/**
 * 复刻 antd `responsive` demo：
 *   `G:\Projects\ant-design\components\table\demo\responsive.tsx`
 *
 * === S28 落地说明 ===
 *
 * - `column.responsive: Breakpoint[]`：按视口断点显隐列（对齐 antd `column.responsive`）。
 * - 断点检测用 antd `Grid.useBreakpoint`（决策 6：响应式检测用 antd）。`screens[bp]===true`
 *   表示当前视口 >= bp，故 `responsive: ['md']` 实际语义是 **md 及以上显示**
 *   （与 antd responsive demo 注释 "medium screen or bigger" 一致）。
 *
 * 3 列：
 *   - Name（render `<a>`，**无 responsive** → 所有视口始终显示）。
 *   - Age（`responsive: ['md']` → md 及以上显示；<md 视口隐藏）。
 *   - Address（`responsive: ['lg']` → lg 及以上显示；<lg 视口隐藏）。
 * 1 行数据。
 *
 * 预期（调整浏览器视口宽度对照）：
 *   - 视口 >= lg（≥992px）：3 列全显（Name / Age / Address）。
 *   - 视口 md（768–991px，<lg）：Name + Age（Address 隐藏）。
 *   - 视口 < md（<768px）：仅 Name（Age / Address 隐藏）。
 *
 * 实现细节（Table 适配层）：needResponsive（任一列设 responsive 才订阅 useBreakpoint）+
 * visibleColumns 过滤（列出的任一断点激活即保留）；无 responsive 的列始终显示（零回归）。
 */

import { Table } from '../table'
import type { ColumnType } from '../table'

interface DataType {
  key: React.Key
  name: string
  age: number
  address: string
}

const columns: ColumnType<DataType>[] = [
  {
    title: 'Name (all screens)',
    dataIndex: 'name',
    key: 'name',
    render: (text) => <a>{text}</a>,
  },
  {
    title: 'Age (medium screen or bigger)',
    dataIndex: 'age',
    key: 'age',
    responsive: ['md'],
  },
  {
    title: 'Address (large screen or bigger)',
    dataIndex: 'address',
    key: 'address',
    responsive: ['lg'],
  },
]

const data: DataType[] = [
  {
    key: '1',
    name: 'John Brown',
    age: 32,
    address: 'New York No. 1 Lake Park',
  },
]

export default function ResponsiveDemo() {
  return (
    <div>
      <h3 style={{ marginBottom: 12 }}>Responsive（复刻 antd responsive demo）</h3>
      <p style={{ marginBottom: 12, color: 'rgba(0,0,0,0.65)' }}>
        调整浏览器视口宽度验证列显隐：≥lg 三列全显；md（&lt;lg）Name+Age；&lt;md 仅 Name。
      </p>
      <Table<DataType> columns={columns} dataSource={data} />
    </div>
  )
}
