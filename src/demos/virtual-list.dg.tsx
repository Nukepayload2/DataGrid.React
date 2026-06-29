/**
 * virtual-list demo 的 data-grid 段（左栏）。
 *
 * 强制虚拟 demo：自身永久 `virtual=true` + `scroll={{x:2000, y:true}}`，内部硬编码不接 virtual prop。
 *
 * props：`{ bordered, fixed, expanded, empty, merged, data, tableRef }`（由父组件传）。
 */
import { useMemo } from 'react'
import type { Ref } from 'react'
import { Table } from '../table'
import type { ColumnType, TableRef } from '../table'
import { getData, type RecordType } from './_compare/virtual-list.shared'

// ---------------------------------------------------------------------------
// 左栏（data-grid）列定义
// ---------------------------------------------------------------------------

// 含固定列 + 合并的列定义（对齐 antd virtual-list demo 的 fixedColumns）。
// 合并语义：
//   - Group 列：id % 4 === 0 的行 rowSpan=4（向下合并 4 行），其余 rowSpan=0（被覆盖）。
//   - Age 列：id % 4 === 0 的行 colSpan=2（向右合并 2 列，吃掉 Address 1）。
//   - Address 1 列：id % 4 === 0 的行 colSpan=0（被 Age 的 colSpan=2 覆盖）。
const dgMergedColumns: ColumnType<RecordType>[] = [
  {
    title: 'ID',
    dataIndex: 'id',
    width: 100,
    fixed: 'start',
  },
  {
    title: 'FirstName',
    dataIndex: 'firstName',
    width: 120,
    fixed: 'start',
  },
  {
    title: 'LastName',
    dataIndex: 'lastName',
    width: 120,
    fixed: 'start',
  },
  {
    title: 'Group',
    width: 120,
    render: (_, record) => `Group ${Math.floor(record.id / 4)}`,
    onCell: (record) => ({
      rowSpan: record.id % 4 === 0 ? 4 : 0,
    }),
  },
  {
    title: 'Age',
    dataIndex: 'age',
    width: 100,
    onCell: (record) => ({
      colSpan: record.id % 4 === 0 ? 2 : 1,
    }),
  },
  {
    title: 'Address 1',
    dataIndex: 'address1',
    onCell: (record) => ({
      colSpan: record.id % 4 === 0 ? 0 : 1,
    }),
  },
  {
    title: 'Address 2',
    dataIndex: 'address2',
  },
  {
    title: 'Address 3',
    dataIndex: 'address3',
  },
  {
    title: 'Action',
    width: 150,
    fixed: 'end',
    render: () => (
      <span style={{ display: 'inline-flex', gap: 8 }}>
        <a>Action1</a>
        <a>Action2</a>
      </span>
    ),
  },
]

// 关闭合并后的列定义（对齐 antd demo "expanded 时清掉 onCell" 的等价路径）。
const dgPlainColumns: ColumnType<RecordType>[] = [
  { title: 'ID', dataIndex: 'id', width: 100, fixed: 'start' },
  { title: 'FirstName', dataIndex: 'firstName', width: 120, fixed: 'start' },
  { title: 'LastName', dataIndex: 'lastName', width: 120, fixed: 'start' },
  { title: 'Group', width: 120, render: (_, r) => `Group ${Math.floor(r.id / 4)}` },
  { title: 'Age', dataIndex: 'age', width: 100 },
  { title: 'Address 1', dataIndex: 'address1' },
  { title: 'Address 2', dataIndex: 'address2' },
  { title: 'Address 3', dataIndex: 'address3' },
  {
    title: 'Action',
    width: 150,
    fixed: 'end',
    render: () => (
      <span style={{ display: 'inline-flex', gap: 8 }}>
        <a>Action1</a>
        <a>Action2</a>
      </span>
    ),
  },
]

// 非固定列（3 列，对齐 antd demo 的 columns 变体）。
const dgShortColumns: ColumnType<RecordType>[] = [
  { title: 'ID', dataIndex: 'id', width: 100 },
  { title: 'FirstName', dataIndex: 'firstName', width: 120 },
  { title: 'LastName', dataIndex: 'lastName', width: 120 },
]

export interface VirtualListDgProps {
  /** 表格边框（共享控制条驱动）。 */
  bordered: boolean
  /** 是否启用固定列（共享控制条驱动）。 */
  fixed: boolean
  /** 是否启用展开行（共享控制条驱动；展开时强制 plainColumns + 关 rowSelection）。 */
  expanded: boolean
  /** 是否空表（共享控制条驱动；true 时 dataSource=[]）。 */
  empty: boolean
  /** data-grid 专属：是否启用合并（差异点）。antd 侧 merged 由 fixed+expanded 推导。 */
  merged: boolean
  /** 行数据（父组件 useMemo(getData(count)) 下发）。 */
  data: RecordType[]
  /** 父组件持有的 data-grid Table ref（用于双侧 scrollTo 对照）。 */
  tableRef?: Ref<TableRef>
}

export default function VirtualListDg({
  bordered = true,
  fixed = true,
  expanded = false,
  empty = false,
  merged = true,
  data = getData(10000),
  tableRef,
}: VirtualListDgProps) {
  // 列选择：非 fixed 时只显示前 3 列；展开时强制 plainColumns（合并与展开互斥）。
  const dgColumns = useMemo<ColumnType<RecordType>[]>(() => {
    if (!fixed) return dgShortColumns
    return merged && !expanded ? dgMergedColumns : dgPlainColumns
  }, [fixed, merged, expanded])

  // 展开内容不计入虚拟窗口（窗口按收起态 rowHeight 算）—详见 docs/design-notes/virtualization.md
  const dgExpandable = useMemo(() => {
    if (!expanded) return undefined
    return {
      expandedRowRender: (record: RecordType) => (
        <div style={{ padding: 8 }}>
          Expanded content for id={record.id}: {record.address1} / {record.address2}
        </div>
      ),
      rowExpandable: (record: RecordType) => record.id % 2 === 0,
    }
  }, [expanded])

  return (
    /* 父容器需有明确 height：对齐右栏 antd scroll.y:400 表体区——右栏 400 是表体高，
       整表=表头(~40)+表体(400)≈440；左栏 height 是整表高（含表头），取 440 像素级对齐。
       虚拟窗口高度由容器 clientHeight 实时测量（ResizeObserver）。 */
    <div style={{ height: 440 }}>
      <Table<RecordType>
        ref={tableRef}
        bordered={bordered}
        virtual
        columns={dgColumns}
        scroll={{ x: 2000, y: true }}
        rowKey="id"
        dataSource={empty ? [] : data}
        expandable={dgExpandable}
        // 展开关闭时显示 radio 单选列（对齐右栏 antd）；展开时关闭避免图标列与选择列并存。
        rowSelection={expanded ? undefined : { type: 'radio', columnWidth: 48 }}
        // 每行 40px 作未测兜底；虚拟窗口由 RO 实测真实高驱动。
        gridOptions={{ rowHeight: 40, headerHeight: 40 }}
      />
    </div>
  )
}
