/**
 * dynamic-settings demo 的 data-grid 段（左栏），从 dynamic-settings.tsx 拆出。
 *
 * - props 驱动 `{ bordered, loading, size, expandableEnabled, showTitle, showHeader,
 *   showFooter, rowSelectionEnabled, hasData, tableLayout, top, bottom, ellipsis, yScroll,
 *   xScroll, virtual }`（由 dynamic-settings.tsx 父组件传，全量动态面板 state）。
 * - 自包含：含 `dgColumns`（Name + Age sorter + Address filters/onFilter + Action render 内联
 *   DownOutlined）+ `dgDefaultExpandable`（expandedRowRender 显示 description）+ `<Table>` JSX +
 *   内联 `DownOutlined` SVG（两侧各自声明，零额外依赖）。
 * - 行为与改造前一致——无 ConfigProvider theme token（默认主题，区别于 component-token demo）。
 *
 * === ★ columns/expandable/DownOutlined 配置搬入子组件（task S33 live 编辑接入）===
 * 原父文件的 `dgColumns` / `dgDefaultExpandable` / 内联 `DownOutlined` 全部搬入本子组件。
 * DownOutlined 为纯内联 SVG（零依赖），两侧子组件各自声明（同款，与 component-token 子组件 /
 * edit-cell CSS 注入两侧各自幂等注入同款策略一致）——保证子组件自包含可独立展示/编译。
 *
 * === props 默认值（合理有效初值，坑5+坑7）===
 * 全量控制面板 state 默认值对齐改造前父级初值：bordered/loading/showTitle/ellipsis/yScroll=false，
 * size='large'，expandableEnabled/rowSelectionEnabled/showHeader/showFooter/hasData=true，
 * tableLayout/xScroll='unset'，top='none'，bottom='bottomEnd'，virtual=false。
 * 编辑模式 propsFor 超集 {bordered,virtual,size,autoScroll} 仅覆盖 bordered/virtual/size，
 * 其余 state 靠默认值兜底——子组件单侧渲染完整演示一张带 expandable + rowSelection +
 * filters/sorter + pagination[top,bottom] 的 10 行表格（合理有效初值）。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.dg.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'antd'` / `'../table'` / `'./_compare/dynamic-settings.shared'`），源码可原样展示无需路径改写。
 */
import { Space } from 'antd'
import { Table } from '../table'
import type {
  ColumnType,
  Expandable,
  TablePaginationPlacement,
  TableRowSelection,
} from '../table'
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
// 左栏（data-grid）列定义 + defaultExpandable
// ---------------------------------------------------------------------------

// data-grid 列定义（render 用内联 DownOutlined SVG）。
const dgColumns: ColumnType<RecordType>[] = [
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

// data-grid defaultExpandable（expandedRowRender 显示 description）。
const dgDefaultExpandable: Expandable<RecordType> = {
  expandedRowRender: (record: RecordType) => <p>{record.description}</p>,
}

// ---------------------------------------------------------------------------
// 子组件
// ---------------------------------------------------------------------------

// 共享 size 类型：'large'/'medium'/'small' 在两侧都被接受
// （data-grid 用 'medium'（= 'middle'）；antd v6 也接受 'medium' 别名（= 'middle'），
// 不含 data-grid 独有的 'compact'，避免与 antd SizeType 不兼容）。
type SharedSize = 'large' | 'medium' | 'small'

export interface DynamicSettingsDgProps {
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

export default function DynamicSettingsDg({
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
}: DynamicSettingsDgProps) {
  // 派生：data-grid expandable（按开关启用/禁用）。
  const dgExpandable = expandableEnabled ? dgDefaultExpandable : undefined
  // 派生：data-grid rowSelection（按开关启用/禁用）。
  const dgRowSelection: TableRowSelection<RecordType> | undefined = rowSelectionEnabled
    ? {}
    : undefined

  // 决策 7：scroll.y 仅 true/undefined（不支持数字）。yScroll 开关 → y:true（CSS 自适应高度）。
  // ★ 全局虚拟化开关接入：virtual ON 时 data-grid y 强制 true（无论 yScroll）。
  const dgScroll: { x?: number | string; y?: true } = {}
  if (yScroll || virtual) {
    dgScroll.y = true
  }
  // ★ scroll.x 两侧统一为 '120vw'（对齐右栏 antd/官方 dynamic-settings.tsx 原值）。
  if (xScroll !== 'unset') {
    dgScroll.x = '120vw'
  }

  const dgTableColumns = (dgColumns as ColumnType<RecordType>[]).map((item) => ({
    ...item,
    ellipsis,
  }))
  if (xScroll === 'fixed') {
    dgTableColumns[0].fixed = true
    dgTableColumns[dgTableColumns.length - 1].fixed = 'right'
  }

  const resolvedTableLayout = tableLayout === 'fixed' ? ('fixed' as const) : undefined

  return (
    /* 决策 7：scroll.y:true 数据区域模式需父容器有明确 height。
       ★ virtual ON → 400 有界（virtual 模式需有界区才能虚拟裁剪 + 可滚动，参考 fixed-header 394 /
          virtual-list 440 量级取 400；dgScroll.y 已在派生处由 virtual 强制 true）；
       yScroll ON（virtual OFF）→ 240 fixed-header（原语义不变）；
       都 OFF → undefined（零回归，行为与改造前一致）。 */
    <div style={virtual ? { height: 400 } : yScroll ? { height: 240 } : undefined}>
      <Table<RecordType>
        bordered={bordered}
        loading={loading}
        size={size}
        expandable={dgExpandable}
        title={showTitle ? defaultTitle : undefined}
        showHeader={showHeader}
        footer={showFooter ? defaultFooter : undefined}
        rowSelection={dgRowSelection}
        scroll={dgScroll}
        tableLayout={resolvedTableLayout}
        pagination={{ placement: [top, bottom] }}
        columns={dgTableColumns}
        dataSource={hasData ? sharedData : []}
        /* 全局虚拟化开关接入：ON 时 virtual=true（dgScroll.y 已在派生处由 virtual 强制 true）；
           OFF 时 virtual 不传，dgScroll 仅由 yScroll 控制，行为与改造前一致。 */
        virtual={virtual}
      />
    </div>
  )
}
