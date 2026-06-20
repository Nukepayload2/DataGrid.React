/**
 * 复刻 antd ellipsis-custom-tooltip demo：
 *   `G:\Projects\ant-design\components\table\demo\ellipsis-custom-tooltip.tsx`。
 *
 * === antd demo 要素 ===
 *
 * - Name 列：`render: (text) => <a>{text}</a>`，`width: 150`，无 ellipsis（链接正常显示）。
 * - Age 列：`width: 80`，无 ellipsis。
 * - Address ×4 列：均 `ellipsis: { showTitle: false }`（S21 对象形式），title 长度递减——
 *     * address 1：title 'Address'（短）。
 *     * address 2：title 'Long Column Long Column Long Column'（超长）。
 *     * address 3：title 'Long Column Long Column'（中长）。
 *     * address 4：title 'Long Column'（中）。
 *   每列 `render: (address) => <Tooltip placement="topLeft" title={address}>{address}</Tooltip>`
 *   ——用 antd `<Tooltip>`（决策 6：tooltip 非表格核心控件，用 antd）接管 hover 提示。
 * - 数据 3 行：address 均为超长文本（'New York No. 1 Lake Park, New York No. 1 Lake Park' 等）。
 *
 * === S21 自研任务验证点 ===
 *
 * 1. **showTitle:false 关闭默认 native title**：`ellipsis: { showTitle: false }` 列的 cell-inner
 *    **不加** native `title` 属性（S20 的 toEllipsisTitle 门被 showTitle !== false 判定挡住）。
 * 2. **antd Tooltip 接管 hover**：render 内 `<Tooltip placement="topLeft" title={address}>`
 *    悬浮单元格显示 antd Tooltip（placement topLeft）。
 * 3. **回归不破**：`ellipsis: true`（S20 默认 showTitle=true）列仍加 native title；
 *    非 ellipsis 列（Name render `<a>`、Age 数值）正常显示。
 *
 * === 视觉 gap（已知，非 S21 范围）===
 *
 * 与 S20 同款：grid 列宽默认 max-content 使 ellipsis 列 track=content 宽，cell-inner 不溢出 →
 * 视觉无 `...`（登记 §9）。S21 核心验证 showTitle 开关 + Tooltip hover，不依赖省略号视觉生效。
 */

import { Tooltip } from 'antd'
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
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    render: (text) => <a>{text}</a>,
    width: 150,
  },
  {
    title: 'Age',
    dataIndex: 'age',
    key: 'age',
    width: 80,
  },
  {
    title: 'Address',
    dataIndex: 'address',
    key: 'address 1',
    // S21：对象形式 ellipsis —— showTitle:false 关闭默认 native title，由 render 的 antd Tooltip 接管。
    ellipsis: { showTitle: false },
    render: (address) => (
      <Tooltip placement="topLeft" title={address}>
        {address}
      </Tooltip>
    ),
  },
  {
    title: 'Long Column Long Column Long Column',
    dataIndex: 'address',
    key: 'address 2',
    ellipsis: { showTitle: false },
    render: (address) => (
      <Tooltip placement="topLeft" title={address}>
        {address}
      </Tooltip>
    ),
  },
  {
    title: 'Long Column Long Column',
    dataIndex: 'address',
    key: 'address 3',
    ellipsis: { showTitle: false },
    render: (address) => (
      <Tooltip placement="topLeft" title={address}>
        {address}
      </Tooltip>
    ),
  },
  {
    title: 'Long Column',
    dataIndex: 'address',
    key: 'address 4',
    ellipsis: { showTitle: false },
    render: (address) => (
      <Tooltip placement="topLeft" title={address}>
        {address}
      </Tooltip>
    ),
  },
]

const data: DataType[] = [
  {
    key: '1',
    name: 'John Brown',
    age: 32,
    address: 'New York No. 1 Lake Park, New York No. 1 Lake Park',
  },
  {
    key: '2',
    name: 'Jim Green',
    age: 42,
    address: 'London No. 2 Lake Park, London No. 2 Lake Park',
  },
  {
    key: '3',
    name: 'Joe Black',
    age: 32,
    address: 'Sydney No. 1 Lake Park, Sydney No. 1 Lake Park',
  },
]

export default function EllipsisCustomTooltipDemo() {
  return (
    <div style={{ padding: 24 }}>
      <Table<DataType> columns={columns} dataSource={data} />
      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: '#fafafa',
          borderRadius: 8,
          color: 'rgba(0,0,0,0.65)',
          fontSize: 12,
          lineHeight: 1.8,
        }}
      >
        <p style={{ margin: '0 0 4px' }}>
          <b>S21 省略号 + 自定义 Tooltip</b>（对齐 antd ellipsis-custom-tooltip demo）：
        </p>
        <p style={{ margin: 0 }}>
          - <code>Name</code>（width 150，render <code>&lt;a&gt;</code>）+ <code>Age</code>（width 80）
          正常显示（无 ellipsis）。
        </p>
        <p style={{ margin: 0 }}>
          - <code>Address ×4</code> 列均 <code>ellipsis: {'{ showTitle: false }'}</code>：
          关闭默认 native title，<code>render</code> 内 antd <code>&lt;Tooltip placement="topLeft"&gt;</code>
          接管 hover 提示（决策 6：tooltip 用 antd）。
        </p>
        <p style={{ margin: 0 }}>
          - 表头 title 长度递减（'Address' → 'Long Column Long Column Long Column' → … → 'Long Column'）。
        </p>
        <p style={{ margin: 0 }}>
          - 回归：S20 <code>ellipsis: true</code>（默认 showTitle=true 加 native title）不变；
          非 ellipsis 列不变。
        </p>
      </div>
    </div>
  )
}
