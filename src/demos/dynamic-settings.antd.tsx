/**
 * dynamic-settings demo 的 antd 段（右栏），从 dynamic-settings.tsx 拆出。
 *
 * - props 驱动 `{ bordered, loading, size, expandableEnabled, showTitle, showHeader,
 *   showFooter, rowSelectionEnabled, hasData, tableLayout, top, bottom, ellipsis, yScroll,
 *   xScroll, virtual }`（与左栏 dg 子组件同款，由父组件传）。
 * - 自包含：含 `antdColumns`（Name + Age sorter + Address filters/onFilter + Action render 内联
 *   DownOutlined）+ `antdDefaultExpandable`（expandedRowRender 显示 description）+ `<AntdTable>` JSX +
 *   内联 `DownOutlined` SVG（两侧各自声明，零额外依赖）。
 * - 忠实复刻 antd dynamic-settings demo（默认主题，无 ConfigProvider token 覆盖；区别于
 *   component-token demo）。
 *
 * === ★ columns/expandable/DownOutlined 配置搬入子组件（task S33 live 编辑接入）===
 * 原父文件的 `antdColumns` / `antdDefaultExpandable` / 内联 `DownOutlined` 全部搬入本子组件。
 * DownOutlined 为纯内联 SVG（零依赖），两侧子组件各自声明（同款，与 component-token 子组件 /
 * edit-cell CSS 注入两侧各自幂等注入同款策略一致）——保证子组件自包含可独立展示/编译。
 *
 * === props 默认值（合理有效初值，坑5+坑7）===
 * 全量控制面板 state 默认值对齐改造前父级初值（与 dg 子组件同款）。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.antd.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'antd'` / `'./_compare/dynamic-settings.shared'`）。
 */
import type { TableProps as AntdTableProps } from 'antd'
import { Space, Table as AntdTable } from 'antd'
import {
  dataSource as sharedData,
  defaultFooter,
  defaultTitle,
  type RecordType,
} from './_compare/dynamic-settings.shared'

// ---------------------------------------------------------------------------
// 内联 DownOutlined（More 链接右侧的小箭头）——避免直接依赖 @ant-design/icons
// （仅 antd 间接依赖，与 nested-table / custom-filter-panel / drag-sorting-handler 约定一致）。
// SVG 路径取自 ant-design-icons DownOutlined。两侧子组件各自声明（自包含）。
// ---------------------------------------------------------------------------

function DownOutlined() {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 1024 1024"
      fill="currentColor"
      aria-hidden="true"
      style={{ verticalAlign: '-0.125em' }}
    >
      <path d="M884 256h-75c-5.1 0-9.9 2.5-12.9 6.6L512 654.2 227.9 262.6c-3-4.1-7.8-6.6-12.9-6.6h-75c-6.5 0-10.3 7.4-6.5 12.6l352.6 486.1c12.8 17.6 39 17.6 51.7 0l352.6-486.1c3.9-5.2.1-12.6-6.4-12.6z" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// 右栏（antd）列定义 + defaultExpandable
// ---------------------------------------------------------------------------

// antd 列定义（render 同样用内联 DownOutlined SVG；antd demo 原本 import
// @ant-design/icons，本 demo 改用内联 SVG 保持零额外依赖，视觉一致）。
const antdColumns: NonNullable<AntdTableProps<RecordType>['columns']> = [
  { title: 'Name', dataIndex: 'name' },
  {
    title: 'Age',
    dataIndex: 'age',
    sorter: (a, b) => a.age - b.age,
  },
  {
    title: 'Address',
    dataIndex: 'address',
    filters: [
      { text: 'London', value: 'London' },
      { text: 'New York', value: 'New York' },
    ],
    onFilter: (value, record) => record.address.indexOf(value as string) === 0,
  },
  {
    title: 'Action',
    key: 'action',
    sorter: true,
    render: () => (
      <Space size="medium">
        <a>Delete</a>
        <a>
          <Space>
            More actions
            <DownOutlined />
          </Space>
        </a>
      </Space>
    ),
  },
]

// antd defaultExpandable（结构同 data-grid，类型独立；两者字段重叠，运行时兼容）。
const antdDefaultExpandable: NonNullable<
  AntdTableProps<RecordType>['expandable']
> = {
  expandedRowRender: (record: RecordType) => <p>{record.description}</p>,
}

// ---------------------------------------------------------------------------
// 子组件
// ---------------------------------------------------------------------------

// 共享 size 类型（与 dg 子组件同款）：'large'/'medium'/'small' 在两侧都被接受。
type SharedSize = 'large' | 'medium' | 'small'

// 跨子文件类型不共享 import：本子文件独立声明 PaginationPlacement / xScroll 类型字面量，
// 与 dg 子组件同款（SOP：dg/antd 子文件各自声明类型，不跨子文件 import）。
type TablePaginationPlacement =
  | 'topStart'
  | 'topCenter'
  | 'topEnd'
  | 'bottomStart'
  | 'bottomCenter'
  | 'bottomEnd'
  | 'none'

export interface DynamicSettingsAntdProps {
  bordered: boolean
  loading: boolean
  size: SharedSize
  expandableEnabled: boolean
  showTitle: boolean
  showHeader: boolean
  showFooter: boolean
  rowSelectionEnabled: boolean
  hasData: boolean
  tableLayout: 'unset' | 'fixed'
  top: TablePaginationPlacement
  bottom: TablePaginationPlacement
  ellipsis: boolean
  yScroll: boolean
  xScroll: 'unset' | 'scroll' | 'fixed'
  virtual: boolean
}

export default function DynamicSettingsAntd({
  bordered = false,
  loading = false,
  size = 'large',
  expandableEnabled = true,
  showTitle = false,
  showHeader = true,
  showFooter = true,
  rowSelectionEnabled = true,
  hasData = true,
  tableLayout = 'unset',
  top = 'none',
  bottom = 'bottomEnd',
  ellipsis = false,
  yScroll = false,
  xScroll = 'unset',
  virtual = false,
}: DynamicSettingsAntdProps) {
  // 派生：antd expandable（按开关启用/禁用）。
  const antdExpandable = expandableEnabled ? antdDefaultExpandable : undefined
  // 派生：antd rowSelection（按开关启用/禁用；antd TableProps['rowSelection'] 允许 undefined）。
  const antdRowSelection: AntdTableProps<RecordType>['rowSelection'] = rowSelectionEnabled
    ? {}
    : undefined

  // 决策 7：scroll.y 用数字（antd 不认 true）。
  // ★ 全局虚拟化开关接入：virtual ON 时 antd y 强制 300（yScroll 开启时 antd 沿用 240 贴合外层
  //   div height:240 的 demo 语义；virtual 单独 ON 时 300）。
  const antdScroll: { x?: number | string; y?: number } = {}
  if (yScroll) {
    antdScroll.y = 240
  } else if (virtual) {
    antdScroll.y = 300
  }
  // ★ scroll.x 两侧统一为 '120vw'（对齐官方 dynamic-settings.tsx 原值）。
  if (xScroll !== 'unset') {
    antdScroll.x = '120vw'
  }

  const antdTableColumns = antdColumns.map((item) => ({ ...item, ellipsis }))
  if (xScroll === 'fixed') {
    antdTableColumns[0].fixed = true
    antdTableColumns[antdTableColumns.length - 1].fixed = 'right'
  }

  const resolvedTableLayout = tableLayout === 'fixed' ? ('fixed' as const) : undefined

  return (
    /* 忠实复刻 antd dynamic-settings demo：antd 原生 Table + scroll.y:240（数字）+ 无 theme。
       ★ virtual ON → 外层 div 400 有界（与左栏一致，virtual 模式有界区；antdScroll.y 已在派生处
          由 virtual 给 300 填 400 区扣表头/分页）；yScroll ON（virtual OFF）→ 240；都 OFF → undefined。 */
    <div style={virtual ? { height: 400 } : yScroll ? { height: 240 } : undefined}>
      <AntdTable<RecordType>
        bordered={bordered}
        loading={loading}
        size={size}
        expandable={antdExpandable}
        title={showTitle ? defaultTitle : undefined}
        showHeader={showHeader}
        footer={showFooter ? defaultFooter : undefined}
        rowSelection={antdRowSelection}
        scroll={antdScroll}
        tableLayout={resolvedTableLayout}
        pagination={{ placement: [top, bottom] }}
        columns={antdTableColumns}
        dataSource={hasData ? sharedData : []}
        /* 全局虚拟化开关接入：ON 时 virtual=true（antdScroll.y 已在派生处由 virtual/yScroll 给值）；
           OFF 时 virtual 不传，antdScroll 仅由 yScroll 控制，行为与改造前一致。 */
        virtual={virtual}
      />
    </div>
  )
}
