/**
 * 复刻 antd `fixed-columns-header` demo：
 *   `G:\Projects\ant-design\components\table\demo\fixed-columns-header.tsx`
 *
 * antd 原版用 `scroll={{ x: 'max-content', y: 55 * 5 }}` 同时实现：
 *   (a) 固定列（横向 sticky）—— M2 ✅
 *   (b) 固定表头（纵向 sticky，y 控制表体高度）—— M8 ✅
 *
 * === data-grid 对应（决策 7 scroll.y:true + 决策 8 横向悬浮滚动条）===
 *
 * - **决策 7**：`scroll={{ x: 'max-content', y: true }}` → 数据区域模式（表头固定 + 表体滚动 +
 *   纵向悬浮滚动条）+ 横向滚动（决策 8 横向悬浮滚动条）。
 * - **高度 CSS 自动适应**：表体区 flex:1 填满父容器剩余空间（不用 JS 算数字）。
 * - ★ 父容器需有明确 height：本 demo 外层 div 设 `height: 300`。
 *
 * === corner cell 双 sticky（M8 × M2）===
 *
 * 左上角（Name/Age fixed start 的表头格）与右上角（Action fixed end 的表头格）同时：
 *   - 横向 sticky（left/right，M2，zIndex 3）
 *   - 纵向 sticky（top:0，M8，zIndex 4）
 * 单元素双 sticky 浏览器原生支持（与 antd rc-table corner cell 一致）。角单元格 z-index 取
 * **最高（5）**（仅纵向 4 的中间表头格、仅横向 3 的固定列表头格都低于它），保证横向滚动时
 * 中间表头格不会盖住 corner cell，纵向滚动时固定列表头格也不被普通表头盖住。
 *
 * 列定义与 antd demo 一致（Name/Age fixed start，Action fixed end）。
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
  },
  {
    title: 'Column 1',
    dataIndex: 'address',
    key: '1',
    width: 150,
  },
  {
    title: 'Column 2',
    dataIndex: 'address',
    key: '2',
    width: 150,
  },
  {
    title: 'Column 3',
    dataIndex: 'address',
    key: '3',
    width: 150,
  },
  {
    title: 'Column 4',
    dataIndex: 'address',
    key: '4',
    width: 150,
  },
  {
    title: 'Column 5',
    dataIndex: 'address',
    key: '5',
    width: 150,
  },
  {
    title: 'Column 6',
    dataIndex: 'address',
    key: '6',
    width: 150,
  },
  {
    title: 'Column 7',
    dataIndex: 'address',
    key: '7',
    width: 150,
  },
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

// 与 antd 原版一致：100 行（M8 表头纵向固定后无需再缩减）。
const dataSource = Array.from({ length: 100 }).map<DataType>((_, i) => ({
  key: i,
  name: `Edward King ${i}`,
  age: 32,
  address: `London, Park Lane no. ${i}`,
}))

export default function FixedColumnsHeaderDemo() {
  return (
    // ★ 决策 7：父容器需有明确 height（这里固定 300px）。
    <div style={{ height: 300 }}>
      <Table<DataType>
        columns={columns}
        dataSource={dataSource}
        scroll={{ x: 'max-content', y: true }}
      />
    </div>
  )
}
