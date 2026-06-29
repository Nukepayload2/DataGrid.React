/**
 * ajax demo 的 data-grid 段（左栏），从 ajax.tsx 拆出。
 *
 * === 异步加载 state 自管（子组件内）===
 * ajax demo 的核心交互是远程数据 loading + 服务端分页/排序/筛选 + preserveSelectedRowKeys，
 * 这些都是表格内部交互态（无外部控制条直接操作）。按 SOP「交互 state（含异步加载/loading/
 * 分页/排序/筛选/选择/展开）优先留子组件内自管」，本子组件内部自管：
 *   - `data`（当前页数据）
 *   - `loading`（请求中）
 *   - `tableParams`（受控 pagination + filters + sortField/sortOrder）
 *   - `selectedRowKeys`（受控 + preserveSelectedRowKeys）
 *   + `fetchData` + `useEffect[deps]` + `handleTableChange` + `onSelectChange`
 * 这与改造前 ajax.tsx 的行为完全等价（loading 态 + 服务端分页/排序/筛选 + 跨页保留勾选），
 * 区别仅是双栏从「共享同一组 state」改为「各自独立 state」（拆子文件后两栏天然分离）。
 *
 * === props 默认值（合理有效初值，坑5+坑7）===
 * - virtual=false（OFF 回 undefined scroll，行为与改造前一致）。
 * 编辑模式 propsFor 超集 {bordered,virtual,size,autoScroll} 已覆盖本子组件所需 virtual，
 * 异步加载 state 全在子组件内自管，无需父级 prop 兜底——编辑模式单侧渲染也能完整演示
 * loading + 服务端分页/排序/筛选（自管 state + useEffect 自动触发首次 queryData）。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.dg.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'../table'` / `'./_compare/ajax.shared'`），源码可原样展示无需路径改写。
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

// 把 data-grid SorterResult.field（React Key 含 bigint）+ order 收敛到 demo 共享 TableParams
// 的窄类型（field?: string，order?: 'ascend'|'descend'）。
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
  // ★ 异步加载 state 全在子组件内自管（拆子文件后两栏各自独立，不再共享 state）。
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
      filters,
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
      /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:true（CSS 自适应，填满 SplitDemo
         限高）；OFF 时回 undefined，行为与改造前一致。loading×virtual 共存属已知 §9 简化。 */
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}
