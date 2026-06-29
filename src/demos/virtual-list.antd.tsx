/**
 * virtual-list demo 的 antd 段（右栏），忠实复刻 antd 官方 virtual-list demo。
 *
 * 强制虚拟 demo：自身永久 `virtual=true` + `scroll={{x:2000, y:400}}` + `pagination={false}`，
 * 内部硬编码不接 virtual prop。
 *
 * props：`{ bordered, fixed, expanded, empty, data, tableRef }`（由父组件传）。
 */
import { useMemo } from 'react'
import type { Ref } from 'react'
import { Space, Table as AntdTable, Typography } from 'antd'
import type { GetRef, TableProps } from 'antd'
import { getData, type RecordType } from './_compare/virtual-list.shared'

/** antd Table 的 ref 实例类型（含 scrollTo）。antd 顶层未导出 TableRef，用 GetRef 取得。 */
type AntdTableRef = GetRef<typeof AntdTable>

// ---------------------------------------------------------------------------
// 右栏（antd）列定义 —— 忠实复刻 antd 官方 virtual-list demo
// ---------------------------------------------------------------------------

const antdFixedColumns: NonNullable<TableProps<RecordType>['columns']> = [
  {
    title: 'ID',
    dataIndex: 'id',
    width: 100,
    fixed: 'start',
  },
  {
    // 官方 antd virtual-list demo 此处为 'FistName'（笔误）。两侧统一为正确拼写「FirstName」
    // 以消除标题层面的可见差异。
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
      <Space>
        <Typography.Link>Action1</Typography.Link>
        <Typography.Link>Action2</Typography.Link>
      </Space>
    ),
  },
]

const antdShortColumns: NonNullable<TableProps<RecordType>['columns']> = [
  {
    title: 'ID',
    dataIndex: 'id',
    width: 100,
  },
  {
    // 同 antdFixedColumns：官方 demo 此处亦为 'FistName' 笔误，统一改为 'FirstName'。
    title: 'FirstName',
    dataIndex: 'firstName',
    width: 120,
  },
  {
    title: 'LastName',
    dataIndex: 'lastName',
    width: 120,
  },
]

export interface VirtualListAntdProps {
  /** 表格边框（共享控制条驱动）。 */
  bordered: boolean
  /** 是否启用固定列（共享控制条驱动）。 */
  fixed: boolean
  /** 是否启用展开行（共享控制条驱动；展开时清 onCell + 关 rowSelection）。 */
  expanded: boolean
  /** 是否空表（共享控制条驱动；true 时 dataSource=[]）。 */
  empty: boolean
  /** 行数据（父组件 useMemo(getData(count)) 下发）。 */
  data: RecordType[]
  /** 父组件持有的 antd Table ref（用于双侧 scrollTo 对照）。 */
  tableRef?: Ref<AntdTableRef>
}

export default function VirtualListAntd({
  bordered = true,
  fixed = true,
  expanded = false,
  empty = false,
  data = getData(10000),
  tableRef,
}: VirtualListAntdProps) {
  // 列选择：非 fixed 时只显示前 3 列；展开时清 onCell（合并与展开互斥）。
  const antdColumns = useMemo<NonNullable<TableProps<RecordType>['columns']>>(() => {
    if (!fixed) return antdShortColumns
    if (!expanded) return antdFixedColumns
    return antdFixedColumns.map((col) => ({ ...col, onCell: undefined }))
  }, [expanded, fixed])

  const antdExpandable = useMemo<TableProps<RecordType>['expandable']>(() => {
    if (!expanded) return undefined
    return {
      columnWidth: 48,
      expandedRowRender: (record: RecordType) => (
        <p style={{ margin: 0 }}>🎉 Expanded {record.address1}</p>
      ),
      rowExpandable: (record: RecordType) => record.id % 2 === 0,
    }
  }, [expanded])

  return (
    <AntdTable<RecordType>
      ref={tableRef}
      bordered={bordered}
      virtual
      columns={antdColumns}
      scroll={{ x: 2000, y: 400 }}
      rowKey="id"
      dataSource={empty ? [] : data}
      pagination={false}
      rowSelection={expanded ? undefined : { type: 'radio', columnWidth: 48 }}
      expandable={antdExpandable}
    />
  )
}
