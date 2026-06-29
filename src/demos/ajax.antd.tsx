/**
 * ajax demo 的 antd 段（右栏），从 ajax.tsx 拆出。
 *
 * === 异步加载 state 自管（子组件内）===
 * 与 ajax.dg 对称，本子组件内部自管：data / loading / tableParams / selectedRowKeys
 * + fetchData + useEffect[deps] + handleTableChange + onSelectChange。
 * 忠实复刻 antd ajax demo（loading + 受控分页 + onChange + preserveSelectedRowKeys）。
 *
 * === props 默认值（合理有效初值，坑5+坑7）===
 * - virtual=false（OFF 回 undefined scroll，行为与改造前一致）。
 * 编辑模式 propsFor 超集 {bordered,virtual,size,autoScroll} 已覆盖 virtual。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.antd.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'antd'` / `'./_compare/ajax.shared'`）。
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

// 把 antd SorterResult 收敛到 demo 共享 TableParams 窄类型（field?: string，
// order?: 'ascend'|'descend'）。
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
  // ★ 异步加载 state 全在子组件内自管（拆子文件后两栏各自独立，不再共享 state）。
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
      /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:280（antd 分页条画在 scroll.y 之外，
         需扣除表头~55 与分页条~64 → 约 280 才能塞进 ~400px pane；OFF 时回 undefined）。 */
      virtual={virtual}
      scroll={virtual ? { y: 280 } : undefined}
    />
  )
}
