/**
 * 复刻 antd `narrow` demo：`G:\Projects\ant-design\components\table\demo\narrow.tsx`。
 *
 * === S27 落地说明 ===
 *
 * antd v6 narrow demo：窄容器（width: 300）内 + 200 行数据 + `size="small"` + 分页
 * `defaultCurrent: 13`，演示在小空间内展示大量数据。
 *
 * 复刻要点（逐字对齐 antd demo）：
 *   - 外层容器 `width: 300`。
 *   - 3 列（Name/Age/Address）+ 200 行（name 固定 'Sample Name'，age = 30 + (key % 5)，
 *     address = `Sample Address ${key}`）。
 *   - `size="small"`。
 *   - `pagination={{ defaultCurrent: 13 }}`：antd 默认 pageSize 10，200 行 = 20 页，第 13 页存在。
 *
 * === ★ 已知 gap（§9 列宽策略，不阻塞 S27 size 验证）===
 *
 * data-grid 表格总宽默认 = `max-content`（每列 track 取内容宽度），窄容器 300px 下表格会
 * 横向溢出（容器出现水平滚动条或内容截断）。这是 data-grid 当前**列宽策略 gap**（非 size 问题）：
 *   - antd 用 `table-layout: fixed` + `width: 100%` 让列均分容器宽度（小空间内自动压缩列）。
 *   - data-grid 用 CSS Grid + `max-content`，列宽 = 内容宽，小容器内不自动压缩。
 *
 * 影响：narrow demo 视觉上表格会超出 300px 容器（与 antd 紧凑填满容器不同）。**size 行高 padding
 * 正确**（small 8/8），仅列宽策略是 gap。后续"列宽策略"任务（§9 S20 ellipsis 行末）会补齐
 * `width:100%` + 无 width 列 `minmax(0,1fr)`，使 narrow demo 视觉完全对齐 antd。
 *
 * 本 demo 按 antd demo 原样复刻（不改 size/列数/数据），gap 由后续任务统一修复。
 */

import { Table } from '../table'
import type { ColumnType, TablePaginationConfig } from '../table'

interface DataType {
  key: React.Key
  name: string
  age: number
  address: string
}

const columns: ColumnType<DataType>[] = [
  { title: 'Name', dataIndex: 'name' },
  { title: 'Age', dataIndex: 'age' },
  { title: 'Address', dataIndex: 'address' },
]

const dataSource = Array.from({ length: 200 }).map<DataType>((_, key) => ({
  key,
  name: 'Sample Name',
  age: 30 + (key % 5),
  address: `Sample Address ${key}`,
}))

const pagination: TablePaginationConfig = { defaultCurrent: 13 }

export default function NarrowDemo() {
  return (
    <div style={{ width: 300 }}>
      <Table<DataType>
        columns={columns}
        dataSource={dataSource}
        size="small"
        pagination={pagination}
      />
    </div>
  )
}
