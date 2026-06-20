/**
 * 复刻 antd ajax demo：`G:\Projects\ant-design\components\table\demo\ajax.tsx`。
 *
 * === ★ 数据来源决策（重要，与 antd demo 的差异）===
 *
 * antd ajax demo 用**真实 fetch 外部 mockapi.io**（`https://...mockapi.io/api/users`）。
 * data-grid 本 demo **改用本地 mock 全量数据 + setTimeout 模拟请求延迟**：
 *   - 避免外部网络依赖（chrome-devtools 自动化验证不稳定）。
 *   - 避免网络副作用（任务规约：避免副作用 + 决策 6 非核心能力不依赖外部）。
 *   - **机制与 antd 完全一致**：loading 态 / 服务端分页 / 服务端排序 / 服务端筛选 / onChange 触发请求 /
 *     preserveSelectedRowKeys 跨页保留勾选——均在 demo 内对齐 antd 行为，仅"数据源"从远程 fetch 换成本地切片。
 *   - demo 头部注释明确此差异（本段）。
 *
 * === antd demo 要素（S12 远程数据 ajax + loading）===
 *
 * - columns：Name（`sorter: true`，服务端排序）/ Gender（filters male/female，服务端筛选）/ Email。
 * - state：
 *     * `data`：当前页数据（ajax 返回的切片）。
 *     * `loading`：请求中态。
 *     * `tableParams`：受控 pagination（current/pageSize/total）+ filters + sortField/sortOrder。
 * - `fetchData`（模拟请求）：
 *     * `setLoading(true)` → `setTimeout(800ms)` → 按 tableParams 对**本地全量 mock** 排序/筛选/切片
 *       得当前页 → `setData` + `setLoading(false)` + `setPagination.total`（筛选后全量长度）。
 * - `useEffect[deps: current/pageSize/sortOrder/sortField/filters]` → `fetchData`。
 * - `handleTableChange(pagination, filters, sorter)` → `setTableParams`（触发 useEffect）。
 * - `rowSelection`：**受控** `selectedRowKeys` + **`preserveSelectedRowKeys: true`**（跨页保留勾选）。
 *   翻到第 2 页勾几行 → 回第 1 页 → 再翻第 2 页，之前的勾选仍保留。
 * - `loading={loading}`、`pagination={tableParams.pagination}`（受控）、`rowKey="id"`。
 *
 * === 服务端模式机制（对齐 antd）===
 *
 * - 引擎复用 S11 受控分页（pagination.current/pageSize/total 受控）+ S1 sorter（`sorter: true` 表示
 *   该列可排序，但服务端场景下排序由 demo 在 onChange 后对全量数据计算）+ S3 filters（filters 声明 +
 *   onChange 回传）。
 * - **引擎不特殊处理服务端排序/筛选**：sorter:true 时引擎仍按前端比较排序，但 demo 把全量数据传给
 *   Table 前**已自行排序+筛选+切片**，所以引擎的前端排序作用在"当前页已排好的数据"上（无副作用）。
 *   （更严谨的做法是 demo 用受控 sortOrder 让引擎不排序——本 demo 为简单起见用全量预排序。）
 *
 * === 验证点（S12）===
 *
 * 1. loading 态：首次进入 + 每次 onChange（翻页/排序/筛选）→ 表格 Spin 转圈约 800ms → 数据刷新。
 * 2. 服务端分页：翻页触发 onChange → useEffect → fetchData → 新一页数据。
 * 3. 服务端排序：点 Name 表头 → ascend/descend → 全量按 name 排序后切片。
 * 4. 服务端筛选：Gender 漏斗选 male/female → 全量按 gender 筛选后切片 + total 更新为筛选后长度。
 * 5. preserveSelectedRowKeys：第 2 页勾选 → 翻回第 1 页 → 翻回第 2 页，勾选保留；
 *    底部显示 selectedRowKeys（含跨页 key）。
 * 6. 回归：其它 demo（basic/head/...）未传 loading → 不包 Spin；未传 preserveSelectedRowKeys → 行为不变。
 */

import { useEffect, useState } from 'react'
import { Table } from '../table'
import type {
  ColumnType,
  SorterResult,
  TablePaginationConfig,
  TableProps,
  TableRowSelection,
} from '../table'

interface DataType {
  id: number
  name: string
  gender: 'male' | 'female'
  email: string
}

interface TableParams {
  pagination?: TablePaginationConfig
  sortField?: SorterResult<DataType>['field']
  sortOrder?: SorterResult<DataType>['order']
  filters?: Record<string, Array<string | number> | null>
}

// === 本地 mock 全量数据（100 条）===
// 替代 antd demo 的外部 fetch（mockapi.io）。gender 随机 male/female。
const MOCK_DATA: DataType[] = Array.from({ length: 100 }).map<DataType>((_, i) => {
  const gender: 'male' | 'female' = i % 2 === 0 ? 'male' : 'female'
  const first = gender === 'male' ? 'John' : 'Jane'
  return {
    id: i + 1,
    name: `${first} Doe ${i + 1}`,
    gender,
    email: `${first.toLowerCase()}.${i + 1}@example.com`,
  }
})

const columns: ColumnType<DataType>[] = [
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

/**
 * 模拟服务端请求：按 tableParams 对本地全量 mock 排序/筛选/切片，返回当前页 + total。
 * 用 setTimeout(800ms) 模拟网络延迟（与 antd demo 的真实 fetch 机制等价：loading 态 + 异步回填）。
 */
function queryData(params: TableParams): Promise<{ data: DataType[]; total: number }> {
  const { pagination, filters, sortField, sortOrder } = params
  const current = pagination?.current ?? 1
  const pageSize = pagination?.pageSize ?? 10

  // 1. 筛选（Gender）。
  let filtered = MOCK_DATA.slice()
  const genderFilter = filters?.gender
  if (genderFilter && genderFilter.length > 0) {
    filtered = filtered.filter((row) => genderFilter.includes(row.gender))
  }

  // 2. 排序（Name，服务端排序语义）。
  if (sortField === 'name' && sortOrder) {
    filtered.sort((a, b) => {
      const cmp = a.name < b.name ? -1 : a.name > b.name ? 1 : 0
      return sortOrder === 'ascend' ? cmp : -cmp
    })
  }

  // 3. 切片当前页。
  const total = filtered.length
  const start = (current - 1) * pageSize
  const paged = filtered.slice(start, start + pageSize)

  // 模拟网络延迟。
  return new Promise((resolve) => {
    setTimeout(() => resolve({ data: paged, total }), 800)
  })
}

const App: React.FC = () => {
  const [data, setData] = useState<DataType[]>([])
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

  const handleTableChange: TableProps<DataType>['onChange'] = (
    pagination,
    filters,
    sorter,
  ) => {
    setTableParams({
      pagination,
      filters,
      sortOrder: Array.isArray(sorter) ? undefined : sorter.order,
      sortField: Array.isArray(sorter) ? undefined : sorter.field,
    })
    // pageSize 变化时清空当前页数据（对齐 antd demo：dataSource is useless since pageSize changed）。
    if (pagination.pageSize !== tableParams.pagination?.pageSize) {
      setData([])
    }
  }

  const rowSelection: TableRowSelection<DataType> = {
    preserveSelectedRowKeys: true,
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ color: 'rgba(0,0,0,0.65)', fontSize: 13 }}>
        远程数据 demo：loading 态 + 服务端分页/排序/筛选（onChange 触发请求）+
        preserveSelectedRowKeys 跨页保留勾选。数据来源为本地 mock（100 条）+ setTimeout(800ms)
        模拟请求延迟（替代 antd demo 的外部 fetch，避免网络依赖）。
      </div>
      <Table<DataType>
        columns={columns}
        rowKey="id"
        dataSource={data}
        pagination={tableParams.pagination}
        loading={loading}
        onChange={handleTableChange}
        rowSelection={rowSelection}
      />
      <div style={{ padding: 12, background: '#fafafa', borderRadius: 8 }}>
        <strong>selectedRowKeys (preserveSelectedRowKeys=true，跨页保留):</strong>{' '}
        {selectedRowKeys.length === 0 ? (
          <span style={{ color: 'rgba(0,0,0,0.45)' }}>(none)</span>
        ) : (
          <code>[{selectedRowKeys.join(', ')}]</code>
        )}
        <div style={{ marginTop: 4, color: 'rgba(0,0,0,0.65)', fontSize: 12 }}>
          翻到第 2 页勾几行 → 回第 1 页 → 再翻第 2 页，勾选应保留；selectedRowKeys 含跨页 id。
        </div>
      </div>
    </div>
  )
}

export default App
