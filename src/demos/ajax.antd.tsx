/**
 * ajax demo 的 antd 段（右栏）。自管异步加载 state，忠实复刻 antd ajax demo
 * （loading + 受控分页 + onChange + preserveSelectedRowKeys）。
 */
import { useEffect, useState } from 'react'
import { Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import { queryData, type RecordType, type TableParams } from './_compare/ajax.shared'

// ---------------------------------------------------------------------------
// 列定义 —— 与 antd ajax demo 一致
// ---------------------------------------------------------------------------

const antdColumns: NonNullable<TableProps<RecordType>['columns']> = [
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

// 收敛 antd SorterResult 到 demo 共享 TableParams 窄类型（field?: string）。
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

export default function AjaxAntd({
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tableParams.pagination?.current,
    tableParams.pagination?.pageSize,
    tableParams.sortOrder,
    tableParams.sortField,
    JSON.stringify(tableParams.filters),
  ])

  const handleChange: TableProps<RecordType>['onChange'] = (
    pagination,
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
    if (pagination.pageSize !== prevPageSize) {
      setData([])
    }
  }

  const onSelectChange = (keys: Array<React.Key>) => setSelectedRowKeys(keys)
  const antdRowSelection: TableProps<RecordType>['rowSelection'] = {
    preserveSelectedRowKeys: true,
    selectedRowKeys,
    onChange: onSelectChange,
  }

  return (
    <AntdTable<RecordType>
      columns={antdColumns}
      rowKey={(record) => record.id}
      dataSource={data}
      pagination={tableParams.pagination}
      loading={loading}
      onChange={handleChange}
      rowSelection={antdRowSelection}
      /* ON 时 virtual=true + scroll.y:280（antd 分页条画在 scroll.y 之外，需扣除表头与分页条高）。 */
      virtual={virtual}
      scroll={virtual ? { y: 280 } : undefined}
    />
  )
}
