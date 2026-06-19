/**
 * 复刻 antd `colspan-rowspan` demo：
 *   `G:\Projects\ant-design\components\table\demo\colspan-rowspan.tsx`
 *
 * 重点：表头列合并（`column.colSpan`）+ 单元格行/列合并（`column.onCell` 返回 colSpan/rowSpan）。
 *
 * === antd demo 行为拆解（5 行 × 6 列）===
 *
 * 列定义（前序）：
 *   1. RowHead (key)       rowScope='row'        —— 行标题列（视觉加粗）。
 *   2. Name (name)         onCell: index===1 → colSpan:5   —— 第 2 行 Name 向右合并 5 列。
 *   3. Age (age)           onCell: sharedOnCell (index===1 → colSpan:0) —— 第 2 行被覆盖。
 *   4. Home phone (tel)    表头 colSpan:2 + onCell:
 *                          - index===3 → rowSpan:2（第 4 行向下合并 2 行）
 *                          - index===4 → rowSpan:0（被覆盖）
 *                          - index===1 → colSpan:0（被 Name 的 colSpan:5 覆盖）
 *   5. Phone (phone)       表头 colSpan:0（被 Home phone 的 colSpan:2 覆盖，不渲染表头格）
 *                          onCell: sharedOnCell (index===1 → colSpan:0)
 *   6. Address (address)   onCell: sharedOnCell (index===1 → colSpan:0)
 *
 * 预期渲染结果（与 antd 一致）：
 *   - 表头：5 个可见格（RowHead | Name | Home phone 跨 2 列 | Address）。Phone 表头被 Home phone 覆盖。
 *   - 第 1 行：正常 6 格。
 *   - 第 2 行（index===1）：Name 跨 5 列（覆盖 Age/Home phone/Phone/Address），共 2 格（RowHead + Name）。
 *   - 第 3 行：正常 6 格。
 *   - 第 4 行（index===3）：Home phone 向下合并 2 行（覆盖第 5 行同列）。共 6 格。
 *   - 第 5 行（index===4）：Home phone 被覆盖（rowSpan:0），共 5 格。
 *
 * === M3 实现说明 ===
 *
 * - 表头合并（column.colSpan）：引擎 columnTree.applyHeaderColSpan 把 colSpan>=2 的叶子表头格
 *   gridColumnEnd 扩展，后续 colSpan-1 个叶子表头格标 covered=true（不渲染 DOM）。
 * - 单元格合并（column.onCell）：cellMerge.computeCellMergePlan 对每格算 hidden + colSpan/rowSpan；
 *   hidden 格不渲染 DOM；左上角格设 grid-column/grid-row 的 span。
 * - rowScope='row'：视觉加粗（.dg-cell-rowscope），与 antd 一致。
 * - bordered：保留（与 antd demo 一致，便于看清合并边界）。
 */

import { Table } from '../table'
import type { ColumnType } from '../table'

interface DataType {
  key: string
  name: string
  age: number
  tel: string
  phone: number
  address: string
}

// 第 2 行（index===1）：Age/Home phone/Phone/Address 列均被 Name 的 colSpan:5 覆盖 → 返回 colSpan:0。
const sharedOnCell = (_record: DataType, index?: number) => {
  if (index === 1) {
    return { colSpan: 0 }
  }
  return {}
}

const columns: ColumnType<DataType>[] = [
  {
    title: 'RowHead',
    dataIndex: 'key',
    rowScope: 'row',
  },
  {
    title: 'Name',
    dataIndex: 'name',
    render: (text) => <a>{text}</a>,
    onCell: (_record, index) => ({
      colSpan: index === 1 ? 5 : 1,
    }),
  },
  {
    title: 'Age',
    dataIndex: 'age',
    onCell: sharedOnCell,
  },
  {
    title: 'Home phone',
    colSpan: 2,
    dataIndex: 'tel',
    onCell: (_record, index) => {
      if (index === 3) {
        return { rowSpan: 2 }
      }
      // These two are merged into above cell
      if (index === 4) {
        return { rowSpan: 0 }
      }
      if (index === 1) {
        return { colSpan: 0 }
      }

      return {}
    },
  },
  {
    title: 'Phone',
    colSpan: 0,
    dataIndex: 'phone',
    onCell: sharedOnCell,
  },
  {
    title: 'Address',
    dataIndex: 'address',
    onCell: sharedOnCell,
  },
]

const data: DataType[] = [
  {
    key: '1',
    name: 'John Brown',
    age: 32,
    tel: '0571-22098909',
    phone: 18889898989,
    address: 'New York No. 1 Lake Park',
  },
  {
    key: '2',
    name: 'Jim Green',
    tel: '0571-22098333',
    phone: 18889898888,
    age: 42,
    address: 'London No. 1 Lake Park',
  },
  {
    key: '3',
    name: 'Joe Black',
    age: 32,
    tel: '0575-22098909',
    phone: 18900010002,
    address: 'Sydney No. 1 Lake Park',
  },
  {
    key: '4',
    name: 'Jim Red',
    age: 18,
    tel: '0575-22098909',
    phone: 18900010002,
    address: 'London No. 2 Lake Park',
  },
  {
    key: '5',
    name: 'Jake White',
    age: 18,
    tel: '0575-22098909',
    phone: 18900010002,
    address: 'Dublin No. 2 Lake Park',
  },
]

export default function ColspanRowspanDemo() {
  return <Table<DataType> columns={columns} dataSource={data} bordered />
}
