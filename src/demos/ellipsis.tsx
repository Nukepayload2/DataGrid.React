/**
 * 复刻 antd ellipsis demo：`G:\Projects\ant-design\components\table\demo\ellipsis.tsx`。
 *
 * === antd demo 要素 ===
 *
 * - Name 列：`render: (text) => <a>{text}</a>`，`width: 150`，**无 ellipsis**（链接正常显示）。
 * - Age 列：`width: 80`，无 ellipsis（数值短，不省略）。
 * - Address ×4 列：均 `ellipsis: true`，title（表头文案）长度递减——
 *     * address 1：title 'Address'（短，表头不省略）。
 *     * address 2：title 'Long Column Long Column Long Column'（超长，表头省略 + hover title）。
 *     * address 3：title 'Long Column Long Column'（中长）。
 *     * address 4：title 'Long Column'（中）。
 *   四列均取同一 dataIndex 'address'（内容相同），验证 ellipsis 在不同列宽下对**同一段长文本**
 *   的省略效果（列宽由 grid max-content / 表头内容自适应，address 列未显式 width 故等宽分配）。
 * - 数据 3 行：address 均为超长文本（'New York No. 1 Lake Park, New York No. 1 Lake Park' 等），
 *   演示 ellipsis 省略号 + hover native title 显示完整文本。
 *
 * === S20 自研任务验证点 ===
 *
 * 1. `column.ellipsis: true` 列的**表体**单元格文本溢出省略号（text-overflow:ellipsis +
 *    white-space:nowrap + overflow:hidden）。
 * 2. ellipsis 列 hover 单元格 → native title 显示完整文本（dataIndex 原值）。
 * 3. ellipsis 列的**表头**：长 title 也省略（如 'Long Column Long Column Long Column'）+ hover title。
 * 4. 非 ellipsis 列（Name render `<a>`、Age 数值）正常显示，无省略号、无多余 title。
 * 5. Name 列 render 返回 JSX `<a>{text}</a>`：单元格 ellipsis 未启用（Name 无 ellipsis），
 *    但即便启用，title 取 dataIndex 原值（'John Brown'）——本 demo Name 不启用 ellipsis 故无 title。
 *
 * === 回归 ===
 *
 * 不影响其它 demo：ellipsis 类仅在 `column.ellipsis === true` 列应用，非 ellipsis 列渲染完全不变。
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
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    // render 返回 JSX（链接）；无 ellipsis，正常显示。
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
    ellipsis: true,
  },
  {
    title: 'Long Column Long Column Long Column',
    dataIndex: 'address',
    key: 'address 2',
    ellipsis: true,
  },
  {
    title: 'Long Column Long Column',
    dataIndex: 'address',
    key: 'address 3',
    ellipsis: true,
  },
  {
    title: 'Long Column',
    dataIndex: 'address',
    key: 'address 4',
    ellipsis: true,
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

export default function EllipsisDemo() {
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
          <b>S20 省略号 ellipsis</b>（对齐 antd ellipsis demo）：
        </p>
        <p style={{ margin: 0 }}>
          - <code>Name</code>（width 150，render <code>&lt;a&gt;</code>，无 ellipsis）+
          <code>Age</code>（width 80）正常显示。
        </p>
        <p style={{ margin: 0 }}>
          - <code>Address ×4</code> 列均 <code>ellipsis: true</code>：表体超长 address 省略号，
          hover 单元格显示完整文本（native title）。
        </p>
        <p style={{ margin: 0 }}>
          - 表头 title 长度递减（'Address' → 'Long Column Long Column Long Column' → … → 'Long Column'），
          长表头省略 + hover 显示完整标题。
        </p>
        <p style={{ margin: 0 }}>
          - 回归：非 ellipsis 列（Name/Age）无省略号、无多余 title。
        </p>
      </div>
    </div>
  )
}
