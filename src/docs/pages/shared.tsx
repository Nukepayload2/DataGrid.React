// 真正跨页（≥2 个 render）共享的常量 / helper / interface 集中在这里。
// 单页私有的 rows / interface / 代码块字符串随对应子页面文件走，不进这里。

/**
 * data-grid 概览页与能力总览页共用的行类型：
 * - architecture-overview 渲染「四层职责」
 * - features 渲染「能力清单」+ featureRows
 */
export interface OverviewRow {
  key: string
  area: string
  purpose: string
  entry: string
}

// 最小表格代码块：intro 与 quick-start 两页都引用。
export const QUICK_START_MINIMAL = `import { Table } from '@nukepayload2/data-grid'
import type { ColumnType } from '@nukepayload2/data-grid'

interface Record {
  key: string
  name: string
  age: number
}

const columns: ColumnType<Record>[] = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Age', dataIndex: 'age', key: 'age' },
]

const data: Record[] = [
  { key: '1', name: 'Alice', age: 28 },
  { key: '2', name: 'Bob', age: 34 },
]

export default function Demo() {
  return <Table rowKey="key" columns={columns} dataSource={data} />
}`

// gridOptions 示例代码：api-namespace 与 grid-options 两页都引用。
export const GRID_OPTIONS_CODE = `<Table
  columns={columns}
  dataSource={data}
  rowKey="id"
  gridOptions={{
    rowHeight: 48,
    headerHeight: 44,
    resizable: true,
    columnResizeMode: 'ResizeLeft',
  }}
/>`
