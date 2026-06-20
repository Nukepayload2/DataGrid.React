/**
 * 复刻 antd `column-defaults` demo：
 *   `G:\Projects\ant-design\components\table\demo\column-defaults.tsx`。
 *
 * === S32 列默认值 column（自研任务）===
 *
 * antd 允许在 Table 级传 `column={{...}}` 设置**所有列的默认属性**，单列可通过自身同名字段覆盖。
 * 典型场景：一组列共享对齐方式 / 省略号 / 宽度等，避免在每个 column 上重复写。
 *
 * data-grid 对齐实现（S32）：
 *   - `TableProps.column?: Partial<ColumnType<RecordType>>`（对齐 antd `InternalTable.tsx:159`）。
 *   - 适配层 `applyColumnDefaults`（对齐 antd `useFilledColumns`）：把 `column` 默认**浅合并**到
 *     每个列——**列自身优先**（列自身已定义字段覆盖默认；列自身未定义字段回退到默认）；
 *     哨兵（EXPAND_COLUMN/SELECTION_COLUMN）豁免；多级表头逐层递归合并。
 *   - 合并位置在 responsive 过滤 / 排序 / 筛选 / 列树构建之前，保证默认字段对所有下游机制生效。
 *
 * === antd demo 要素（逐项复刻）===
 *
 * - 3 列：`Name`（width 140）/ `Description`（width 180）/ `Address`（width 220 + `align:'left'`）。
 * - Table 级 `column={{ align: 'center', ellipsis: true }}`：所有列默认居中 + 省略号。
 *   - Name / Description 继承默认 → align center + ellipsis。
 *   - Address 自身 `align: 'left'` 覆盖默认 → align left（其余字段仍继承 width / ellipsis 默认）。
 * - `pagination={false}`：不分页（data-grid 默认即不分页，等价）。
 * - 2 行数据：John Brown / Jim Green（含较长 description + address 以演示 ellipsis）。
 *
 * === 与 antd 的差异 ===
 *
 * - data-grid 默认不分页（`pagination` undefined 即全显）；antd 默认分页。本 demo 显式 `pagination={false}`
 *   与 antd demo 一致（两侧都不分页）。
 * - **视觉省略号 gap（见 task-plan §9）**：data-grid grid 列宽默认 `max-content`（列宽=内容宽度），
 *   ellipsis 列 track=content 宽 → cell-inner 不溢出 → 视觉无 `...`（API 与合并逻辑正确，缺列宽约束）。
 *   本 demo 验证 column 默认合并语义（align/width/ellipsis 字段正确下发到引擎），不依赖省略号视觉生效。
 */

import type { ColumnType } from '../table'
import { Table } from '../table'

interface DataType {
  key: React.Key
  name: string
  address: string
  description: string
}

const columns: ColumnType<DataType>[] = [
  {
    title: 'Name',
    dataIndex: 'name',
    width: 140,
  },
  {
    title: 'Description',
    dataIndex: 'description',
    width: 180,
  },
  {
    title: 'Address',
    dataIndex: 'address',
    // antd demo 原文 `align: 'left'`；data-grid 的 Align 类型用 'start'/'center'/'end'
    // （'start' 等价 antd 'left'）。此处用 'start' 覆盖 Table 级 `column.align: 'center'` 默认。
    align: 'start',
    width: 220,
  },
]

const data: DataType[] = [
  {
    key: '1',
    name: 'John Brown',
    description: 'Shared column props let repeated column settings live on the table.',
    address: 'No. 1 Lake Park Road, Hangzhou, Zhejiang, China',
  },
  {
    key: '2',
    name: 'Jim Green',
    description: 'Columns can still override the default alignment or other shared props.',
    address: 'No. 99 Garden Avenue, Pudong, Shanghai, China',
  },
]

export default function ColumnDefaultsDemo() {
  return (
    <Table<DataType>
      columns={columns}
      dataSource={data}
      column={{ align: 'center', ellipsis: true }}
      pagination={false}
    />
  )
}
