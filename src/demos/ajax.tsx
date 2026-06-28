/**
 * 复刻 antd ajax demo：`G:\Projects\ant-design\components\table\demo\ajax.tsx`。
 *
 * === 决策 9 双栏对照（S12 远程数据 + loading）===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致——loading 态（Spin）+ 服务端分页/排序/筛选
 *   （受控 pagination + onChange 触发请求）+ preserveSelectedRowKeys 跨页保留勾选。
 * - **右栏（antd Table）**：忠实复刻 antd ajax demo（antd 原生 `<Table>` + loading + 受控分页 +
 *   onChange）。**唯一改动**：antd demo 原用真实 fetch 外部 mockapi.io，本 demo 统一改用本地
 *   mock（`_compare/ajax.shared.ts` 的 `queryData`，左右两栏共用），避免网络依赖（决策 6 +
 *   任务规约避免副作用）。
 * - **共享控制条**：无独立控制条（antd ajax demo 原本无控制条）；改造后**两侧共用同一组
 *   state**（`tableParams` / `loading` / `data` / `selectedRowKeys`），任一侧 onChange 都写回
 *   共享 tableParams → 触发同一个 useEffect → 同一个 queryData → 同一份 data 同时回填两侧。
 * - **共享数据**：`RecordType` + `MOCK_DATA` + `queryData` 见 `_compare/ajax.shared.ts`，
 *   两侧复用同一 mock 数据源 + 同一服务端逻辑（保证 diff 对照公平）。
 *
 * === antd demo 要素（S12 远程数据 ajax + loading）===
 *
 * - columns：Name（`sorter: true`，服务端排序）/ Gender（filters male/female，服务端筛选）/ Email。
 * - state：`data`（当前页数据）/ `loading`（请求中）/ `tableParams`（受控 pagination + filters +
 *   sortField/sortOrder）/ `selectedRowKeys`（受控 + preserveSelectedRowKeys）。
 * - `fetchData`：`setLoading(true)` → 请求 → `setData` + `setLoading(false)` + `setPagination.total`。
 * - `useEffect[deps]` → `fetchData`（current/pageSize/sortOrder/sortField/filters 变化即重新请求）。
 * - `handleTableChange(pagination, filters, sorter)` → `setTableParams`（触发 useEffect）。
 * - `rowSelection`：**受控** selectedRowKeys + **preserveSelectedRowKeys: true**（跨页保留）。
 *   翻第 2 页勾几行 → 回第 1 页 → 再翻第 2 页，勾选保留。
 * - `loading={loading}` / `pagination={tableParams.pagination}`（受控）/ `rowKey="id"`。
 *
 * === 服务端模式机制（对齐 antd，data-grid §9 S12 已修）===
 *
 *   - 引擎复用 S11 受控分页（pagination.current/pageSize/total 受控）+ S1 sorter + S3 filters。
 *   - **slicePage server 模式检测**（data.grid `data.length < total` 不切片，对齐 antd
 *     `InternalTable.tsx:547-556`）——服务端场景 dataSource 已是当前页切片，引擎不再二次切片。
 *   - **filterable 放宽**：filters/filterDropdown/onFilter 任一即可（onFilter 非必需）——
 *     server 筛选无 onFilter 也渲染漏斗。
 *   - **激活态门**：纯 filters 无 onFilter 列也回填 filteredValue → 漏斗激活态生效。
 *
 * === 两侧保留的差异 ===
 *
 * 1. **数据源**：左栏 data-grid 与右栏 antd 均用同一本地 mock（`queryData`），区别于 antd 官方
 *    demo 的真实 fetch。机制（loading + 异步回填）与 antd 等价。
 * 2. **preserveSelectedRowKeys**：两侧均显式 `true`（对齐 antd ajax demo 风格——antd 官方 ajax
 *    demo 未演示勾选，本 demo 加上勾选以对照 preserveSelectedRowKeys 跨页保留）。
 *
 * === 验证点（S12 + 决策 9）===
 *
 * 1. loading 态：首次进入 + 每次 onChange（翻页/排序/筛选）→ 两侧表格同步 Spin 转圈约 800ms
 *    → 数据刷新。
 * 2. 服务端分页：任一侧翻页 → 触发共享 useEffect → queryData → 两份数据同步刷新。
 * 3. 服务端排序：点 Name 表头 → ascend/descend → 全量按 name 排序后切片（两侧同步）。
 * 4. 服务端筛选：Gender 漏斗选 male/female → 全量按 gender 筛选 + total 更新为筛选后长度。
 * 5. preserveSelectedRowKeys：第 2 页勾选 → 翻回第 1 页 → 翻回第 2 页，勾选保留；底部显示
 *    selectedRowKeys（含跨页 key）。
 * 6. 回归：其它 demo（basic/head/...）未传 loading → 不包 Spin。
 */

import { useEffect, useState } from 'react'
import { Table as AntdTable, theme } from 'antd'
import type { TableProps } from 'antd'
import { Table } from '../table'
import type {
  ColumnType,
  TablePaginationState,
  TableProps as DgTableProps,
  TableRowSelection,
} from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { queryData, type RecordType, type TableParams } from './_compare/ajax.shared'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y（loading×virtual 共存是已知 §9 简化）
import { useVirtualization } from './VirtualizationContext'

// ---------------------------------------------------------------------------
// 左栏（data-grid）列定义 —— 行为与改造前一致
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
// 右栏（antd）列定义 —— 忠实复刻 antd ajax demo（仅 width 25%→20% 同步，保持一致）
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
// Demo 根组件
// ---------------------------------------------------------------------------

export default function AjaxDemo() {
  // ★ 共享状态：同一组 state 同时驱动两侧表格。
  const [data, setData] = useState<RecordType[]>([])
  const [loading, setLoading] = useState(false)
  const [tableParams, setTableParams] = useState<TableParams>({
    pagination: {
      current: 1,
      pageSize: 10,
    },
  })
  // 受控勾选 + preserveSelectedRowKeys（跨页保留）。两侧共用同一 selectedRowKeys。
  const [selectedRowKeys, setSelectedRowKeys] = useState<Array<React.Key>>([])
  // 全局虚拟化开关接入：开关 ON 时两栏叠加 virtual=true + scroll.y（loading 态 Spin 与 virtual
  // 共存是已知 §9 简化——Spin 可能破坏 data-area flex 链高度，正常接入即可）。
  const { virtual } = useVirtualization()
  // 底部选中态可视化区 chrome 文字/弱底色 token 化（colorTextSecondary≈rgba(0,0,0,0.65)、
  // colorTextTertiary≈rgba(0,0,0,0.45)、colorFillQuaternary≈#fafafa），暗主题自适应。
  // ★ 仅 chrome 色，不动 loading/server/fetch 逻辑。
  const { token } = theme.useToken()

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

  // 共享 onChange：任一侧触发都写回同一 tableParams → 触发 useEffect → 两份数据同步刷新。
  // 收敛两侧 pagination 入参（data-grid `TablePaginationState` 与 antd `TablePaginationConfig`
  // 共有 current/pageSize/total）到同一形状，便于共享 state。
  const applyChange = (
    pagination: { current?: number; pageSize?: number; total?: number },
    filters: TableParams['filters'],
    sorter: { field?: string; order?: TableParams['sortOrder'] },
  ) => {
    const prevPageSize = tableParams.pagination?.pageSize
    const nextPagination: TableParams['pagination'] = {
      current: pagination.current,
      pageSize: pagination.pageSize,
      total: pagination.total,
    }
    setTableParams({
      pagination: nextPagination,
      filters,
      sortOrder: sorter.order,
      sortField: sorter.field,
    })
    // pageSize 变化时清空当前页数据（对齐 antd demo：dataSource is useless since pageSize changed）。
    if (pagination.pageSize !== prevPageSize) {
      setData([])
    }
  }

  // 收敛两侧 sorter 的宽类型（data-grid SorterResult.field 用 React Key 含 bigint，
  // antd field 可能 string|number|(string|number)[]；order 均含 null）到本 demo 共享
  // TableParams 的窄类型（field?: string，order?: 'ascend'|'descend'）。
  const normalizeSorter = (
    sorter:
      | { field?: unknown; order?: 'ascend' | 'descend' | null }
      | undefined,
  ): { field?: string; order: TableParams['sortOrder'] } => {
    if (!sorter) return { order: undefined }
    const field = typeof sorter.field === 'string' ? sorter.field : undefined
    const order: TableParams['sortOrder'] =
      sorter.order === 'ascend' || sorter.order === 'descend' ? sorter.order : undefined
    return { field, order }
  }

  const dgHandleChange: DgTableProps<RecordType>['onChange'] = (
    pagination: TablePaginationState,
    filters,
    sorter,
  ) => {
    const n = normalizeSorter(Array.isArray(sorter) ? undefined : sorter)
    applyChange(pagination, filters, n)
  }

  const antdHandleChange: TableProps<RecordType>['onChange'] = (pagination, filters, sorter) => {
    const n = normalizeSorter(Array.isArray(sorter) ? undefined : sorter)
    applyChange(
      { current: pagination.current, pageSize: pagination.pageSize, total: pagination.total },
      filters as TableParams['filters'],
      n,
    )
  }

  // 共享 rowSelection：受控 selectedRowKeys + preserveSelectedRowKeys（跨页保留）。两侧共用。
  const onSelectChange = (keys: Array<React.Key>) => setSelectedRowKeys(keys)
  const dgRowSelection: TableRowSelection<RecordType> = {
    preserveSelectedRowKeys: true,
    selectedRowKeys,
    onChange: onSelectChange,
  }
  const antdRowSelection: TableProps<RecordType>['rowSelection'] = {
    preserveSelectedRowKeys: true,
    selectedRowKeys,
    onChange: onSelectChange,
  }

  return (
    <div style={{ padding: 24 }}>
      {/*
        minPaneWidth=600（含 3 列 + email 宽列，无 scroll.x 但 email 列较长）→ 横排阈值 ≈ 1216。
        常规笔记本视口（≥1280）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={600}
        left={
          <Table<RecordType>
            columns={dgColumns}
            rowKey="id"
            dataSource={data}
            pagination={tableParams.pagination}
            loading={loading}
            onChange={dgHandleChange}
            rowSelection={dgRowSelection}
            /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:true（CSS 自适应，填满 SplitDemo
               限高）；OFF 时回 undefined，行为与改造前一致。loading×virtual 共存属已知 §9 简化。 */
            virtual={virtual}
            scroll={virtual ? { y: true } : undefined}
          />
        }
        right={
          <AntdTable<RecordType>
            columns={antdColumns}
            rowKey={(record) => record.id}
            dataSource={data}
            pagination={tableParams.pagination}
            loading={loading}
            onChange={antdHandleChange}
            rowSelection={antdRowSelection}
            /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:280（antd 分页条画在 scroll.y 之外，
               需扣除表头~55 与分页条~64 → 约 280 才能塞进 ~400px pane；OFF 时回 undefined）。 */
            virtual={virtual}
            scroll={virtual ? { y: 280 } : undefined}
          />
        }
      >
        <div>
          <div
            style={{
              padding: 12,
              background: token.colorFillQuaternary,
              borderRadius: 8,
              marginBottom: 8,
            }}
          >
            <strong>selectedRowKeys (preserveSelectedRowKeys=true，跨页保留):</strong>{' '}
            {selectedRowKeys.length === 0 ? (
              <span style={{ color: token.colorTextTertiary }}>(none)</span>
            ) : (
              <code>[{selectedRowKeys.join(', ')}]</code>
            )}
            <div style={{ marginTop: 4, color: token.colorTextSecondary, fontSize: 12 }}>
              翻到第 2 页勾几行 → 回第 1 页 → 再翻第 2 页，勾选应保留；selectedRowKeys 含跨页 id。
            </div>
          </div>
          <strong>对照说明（决策 9 B14 / S12 远程数据 + loading）：</strong>
          左右并排呈现 data-grid 与 antd ajax demo（loading + 服务端分页/排序/筛选 +
          preserveSelectedRowKeys）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>共享 state</strong>：<code>tableParams</code> / <code>loading</code> /
              <code> data</code> / <code>selectedRowKeys</code> 共用同一组——任一侧 onChange
              （翻页/排序/筛选/勾选）都写回共享 state，触发同一 useEffect → 同一 queryData →
              两份数据/勾选同步刷新。
            </li>
            <li>
              <strong>loading 态</strong>：首次进入 + 每次 onChange → 两侧表格同步 Spin 转圈约
              800ms（本地 mock + setTimeout，替代 antd demo 的真实 fetch，避免网络依赖）。
            </li>
            <li>
              <strong>服务端模式</strong>：受控 pagination（current/pageSize/total）+ onChange
              触发请求。data-grid §9 S12 已修：slicePage server 检测（data.length&lt;total 不切片）+
              filterable 放宽（无 onFilter 也渲染漏斗）+ 激活态门同步。
            </li>
            <li>
              <strong>preserveSelectedRowKeys</strong>：两侧均 <code>true</code>（跨页保留勾选）；
              第 2 页勾选 → 翻回第 1 页 → 翻回第 2 页，勾选保留；底部 selectedRowKeys 含跨页 id。
            </li>
            <li>
              <strong>数据源</strong>：左右两栏均用同一本地 mock（<code>queryData</code>，100 条），
              机制与 antd demo 等价（loading + 异步回填）；区别于 antd 官方 demo 的真实 fetch。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
