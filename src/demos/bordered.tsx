/**
 * 复刻 antd `bordered` demo：
 *   `G:\Projects\ant-design\components\table\demo\bordered.tsx`
 *
 * === S26 落地说明 ===
 *
 * - `bordered`：表格内外边框线（dg-wrapper.dg-bordered 加表格外边框 + 单元格 border-inline-end
 *   竖线 + 抑制表头 ::before 分割竖线避免双线，对齐 antd 6.4.4 bordered 样式）。
 * - `title`：表格上方标题区（dg-title，bordered 模式下加底边框）。
 *   函数收 currentPageData（data-grid 传 filteredDataSource 全量，demo 不分页无差异）。
 * - `footer`：表格下方脚注区（dg-footer，bordered 模式下加顶边框）。
 * - 列：Name render `<a>` / Cash Assets `className:'column-money'` align right / Address，
 *   3 列 + 3 行 + title 'Header' + footer 'Footer'，与 antd demo 逐字一致。
 *
 * 示例二（bordered + fixed 组合）：验证固定列在 bordered 模式下边框完整——
 *   左固定列（Full Name）、右固定列（Action）与中间可滚动列在 bordered 模式下竖向边框正确，
 *   无 lun 的"右 sticky 列缺左 border"缺陷（本引擎靠 bordered 模式给 fixed-end 边界格补
 *   border-inline-start 修正）。
 */

import { Table } from '../table'
import type { ColumnType } from '../table'

// === 示例 1：复刻 antd bordered demo ===

interface DataType {
  key: string
  name: string
  money: string
  address: string
}

const columns: ColumnType<DataType>[] = [
  {
    title: 'Name',
    dataIndex: 'name',
    render: (text) => <a>{text}</a>,
  },
  {
    title: 'Cash Assets',
    // 注：antd demo 此列带 className:'column-money'（CSS 类样式高亮金额列）；
    // data-grid 的 ColumnType 暂不支持列 className（非 S26 范围），故略去——视觉/边框无影响。
    dataIndex: 'money',
    // 注：antd demo 此处为 align:'right'；data-grid 用逻辑属性 'start'|'center'|'end'，
    // 'end' 等价于 antd 的 'right'（右对齐，RTL 下自动适配）。
    align: 'end',
  },
  {
    title: 'Address',
    dataIndex: 'address',
  },
]

const data: DataType[] = [
  {
    key: '1',
    name: 'John Brown',
    money: '￥300,000.00',
    address: 'New York No. 1 Lake Park',
  },
  {
    key: '2',
    name: 'Jim Green',
    money: '￥1,256,000.00',
    address: 'London No. 1 Lake Park',
  },
  {
    key: '3',
    name: 'Joe Black',
    money: '￥120,000.00',
    address: 'Sydney No. 1 Lake Park',
  },
]

// === 示例 2：bordered + fixed 组合（验证固定列边框）===

interface FixedRow {
  key: string
  name: string
  age: number
  address: string
}

const fixedColumns: ColumnType<FixedRow>[] = [
  {
    title: 'Full Name',
    dataIndex: 'name',
    width: 120,
    fixed: 'start',
  },
  { title: 'Age', dataIndex: 'age', width: 100, fixed: 'start' },
  { title: 'Column 1', dataIndex: 'address', key: '1' },
  { title: 'Column 2', dataIndex: 'address', key: '2' },
  { title: 'Column 3', dataIndex: 'address', key: '3' },
  { title: 'Column 4', dataIndex: 'address', key: '4' },
  { title: 'Column 5', dataIndex: 'address', key: '5' },
  {
    title: 'Action',
    key: 'operation',
    width: 100,
    fixed: 'end',
    render: () => <a>action</a>,
  },
]

const fixedData: FixedRow[] = [
  { key: '1', name: 'John Brown', age: 32, address: 'New York Park' },
  { key: '2', name: 'Jim Green', age: 40, address: 'London Park' },
  { key: '3', name: 'Joe Black', age: 28, address: 'Sydney Park' },
]

export default function BorderedDemo() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div>
        <h3 style={{ marginBottom: 12 }}>bordered + title/footer（复刻 antd bordered demo）</h3>
        <Table<DataType>
          columns={columns}
          dataSource={data}
          bordered
          title={() => 'Header'}
          footer={() => 'Footer'}
        />
      </div>
      <div>
        <h3 style={{ marginBottom: 12 }}>
          bordered + fixed 组合（验证固定列边框完整，无右 sticky 列缺左 border）
        </h3>
        <Table<FixedRow>
          columns={fixedColumns}
          dataSource={fixedData}
          bordered
          scroll={{ x: 'max-content' }}
        />
      </div>
    </div>
  )
}
