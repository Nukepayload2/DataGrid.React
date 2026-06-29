/**
 * dynamic-settings demo 的 antd 段（右栏）。
 *
 * 忠实复刻 antd dynamic-settings demo（默认主题，无 ConfigProvider token 覆盖）。
 * props 见 DynamicSettingsAntdProps（与 dg 子组件同款）。
 */
import type { TableProps as AntdTableProps } from 'antd'
import { Space, Table as AntdTable } from 'antd'
import {
  dataSource as sharedData,
  defaultFooter,
  defaultTitle,
  type RecordType,
} from './_compare/dynamic-settings.shared'

// 内联 DownOutlined（More 链接右侧小箭头）— 避免 @ant-design/icons 直接依赖。两侧各自声明。
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

const antdDefaultExpandable: NonNullable<
  AntdTableProps<RecordType>['expandable']
> = {
  expandedRowRender: (record: RecordType) => <p>{record.description}</p>,
}

type SharedSize = 'large' | 'medium' | 'small'

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
  const antdExpandable = expandableEnabled ? antdDefaultExpandable : undefined
  const antdRowSelection: AntdTableProps<RecordType>['rowSelection'] = rowSelectionEnabled
    ? {}
    : undefined

  // antd scroll.y 用数字（不认 true）。virtual ON → 300 填 400 区扣表头/分页；yScroll ON → 240。
  const antdScroll: { x?: number | string; y?: number } = {}
  if (yScroll) {
    antdScroll.y = 240
  } else if (virtual) {
    antdScroll.y = 300
  }
  // scroll.x 两侧统一为 '120vw'（对齐 antd 官方 dynamic-settings 原值）。
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
        virtual={virtual}
      />
    </div>
  )
}
