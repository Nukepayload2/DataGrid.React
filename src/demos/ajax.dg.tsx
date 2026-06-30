/**
 * ajax demo 的 data-grid 段（左栏）。自管异步加载 state（data / loading / tableParams /
 * selectedRowKeys + fetchData/useEffect/handleChange/onSelectChange）。
 */
import { useEffect, useState } from 'react'
import { Table } from '../table'
import type {
  ColumnType,
  TablePaginationState,
  TableProps as DgTableProps,
  TableRowSelection,
} from '../table'
import { queryData, type RecordType, type TableParams } from './_compare/ajax.shared'

// ---------------------------------------------------------------------------
// 列定义 —— Name（sorter:true 服务端排序）/ Gender（filters 服务端筛选）/ Email
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<RecordType>[] = [
  {
    title: 'Name',
    dataIndex: 'name',
    sorter: true,
    width: '25%',
  },
  {
    title: 'Gender',
    dataIndex: 'gender',
    filters: [
      { text: 'Male', value: 'male' },
      { text: 'Female', value: 'female' },
    ],
    width: '20%',
  },
  {
    title: 'Email',
    dataIndex: 'email',
  },
]

// ---------------------------------------------------------------------------
// 子组件（自管异步加载 state）
// ---------------------------------------------------------------------------

// 收敛 data-grid SorterResult 到 demo 共享 TableParams 窄类型（field?: string）。
function normalizeSorter(
  sorter:
    | { field?: unknown; order?: 'ascend' | 'descend' | null }
    | undefined,
): { field?: string; order: TableParams['sortOrder'] } {
  if (!sorter) return { order: undefined }
  const field = typeof sorter.field === 'string' ? sorter.field : undefined
  const order: TableParams['sortOrder'] =
    sorter.order === 'ascend' || sorter.order === 'descend' ? sorter.order : undefined
  return { field, order }
}

export default function AjaxDg({
  virtual = false,
}: {
  virtual: boolean
}) {
  const [data, setData] = useState<RecordType[]>([])
  const [loading, setLoading] = useState(false)
  const [tableParams, setTableParams] = useState<TableParams>({
    pagination: {
      current: 1,
      pageSize: 10,
    },
  })
  // 受控勾选 + preserveSelectedRowKeys（跨页保留）。
  const [selectedRowKeys, setSelectedRowKeys] = useState<Array<React.Key>>([])

  const fetchData = () => {
    setLoading(true)
    queryData(tableParams).then(({ data: paged, total }) => {
      setData(paged)
      setLoading(false)
      setTableParams((prev) => ({
        ...prev,
        pagination: {
          ...prev.pagination,
          total,
        },
      }))
    })
  }

  useEffect(() => {
    fetchData()
    // 依赖：current/pageSize/sortOrder/sortField/filters 变化即重新"请求"（对齐 antd demo）。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tableParams.pagination?.current,
    tableParams.pagination?.pageSize,
    tableParams.sortOrder,
    tableParams.sortField,
    JSON.stringify(tableParams.filters),
  ])

  const handleChange: DgTableProps<RecordType>['onChange'] = (
    pagination: TablePaginationState,
    filters,
    sorter,
  ) => {
    const n = normalizeSorter(Array.isArray(sorter) ? undefined : sorter)
    const prevPageSize = tableParams.pagination?.pageSize
    setTableParams({
      pagination: {
        current: pagination.current,
        pageSize: pagination.pageSize,
        total: pagination.total,
      },
      filters: filters as TableParams['filters'],
      sortOrder: n.order,
      sortField: n.field,
    })
    // pageSize 变化时清空当前页数据（对齐 antd demo：dataSource is useless since pageSize changed）。
    if (pagination.pageSize !== prevPageSize) {
      setData([])
    }
  }

  const onSelectChange = (keys: Array<React.Key>) => setSelectedRowKeys(keys)
  const dgRowSelection: TableRowSelection<RecordType> = {
    preserveSelectedRowKeys: true,
    selectedRowKeys,
    onChange: onSelectChange,
  }

  return (
    <Table<RecordType>
      columns={dgColumns}
      rowKey="id"
      dataSource={data}
      pagination={tableParams.pagination}
      loading={loading}
      onChange={handleChange}
      rowSelection={dgRowSelection}
      /* ON 时 virtual=true + scroll.y:true（CSS 自适应填满 SplitDemo 限高）。 */
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}
