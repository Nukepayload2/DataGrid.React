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
} from './_compare/component-token.shared'
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

const dgDefaultExpandable: Expandable<RecordType> = {
  expandedRowRender: (record: RecordType) => <p>{record.description}</p>,
}

type SharedSize = 'large' | 'medium' | 'small'

export interface ComponentTokenDgProps {
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

export default function ComponentTokenDg({
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
}: ComponentTokenDgProps) {
  const dgExpandable = expandableEnabled ? dgDefaultExpandable : undefined
  const dgRowSelection: TableRowSelection<RecordType> | undefined = rowSelectionEnabled
    ? {}
    : undefined
  const dgScroll: { x?: number | string; y?: true } = {}
  if (yScroll || virtual) {
    dgScroll.y = true
  }
  if (xScroll !== 'unset') {
    dgScroll.x = '100vw'
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
        virtual={virtual}
      />
    </div>
  )
}

