/**
 * 复刻 antd `fixed-header` demo：
 *   `G:\Projects\ant-design\components\table\demo\fixed-header.tsx`
 *
 * antd 原版：3 列（Name/Age/Address）× 100 行，`scroll={{ y: 55 * 5 }}` 表头固定、表体纵向滚动，
 * `pagination={{ pageSize: 50 }}`。
 *
 * === data-grid 对应（决策 7 scroll.y:true 数据区域模式）===
 *
 * - **决策 7**：`scroll={{ y: true }}` → 数据区域模式（表头固定 + 表体滚动 + 纵向悬浮滚动条）。
 * - **高度 CSS 自动适应**：`.dg-wrapper.dg-data-area` flex column + height:100%，
 *   表体区（`.dg-scroll-wrap`）flex:1 填满父容器剩余空间。**不用 JS 算数字高度**。
 * - ★ 父容器需有明确 height：本 demo 外层 div 设 `height: 300`（约等价 antd `y: 55*5=275`）。
 *   调用方需确保 `.dg-wrapper` 的父容器有明确高度，否则表体退化为内容自然高。
 *
 * 与官方 demo 差异：antd 用 `createStyles` 加细滚动条样式，data-grid 用 #35 悬浮滚动条（macOS 风格）。
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
    // ★ 决策 7：父容器需有明确 height（这里固定 300px，约等价 antd y:55*5=275）。
    //   true 模式下表体 flex:1 填满此容器剩余空间（表头之外）。
    <div style={{ height: 300 }}>
      <Table<DataType>
        columns={columns}
        dataSource={dataSource}
        scroll={{ y: true }}
      />
    </div>
  )
}
