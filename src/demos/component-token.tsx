/**
 * 复刻 antd component-token demo：
 *   `G:\Projects\ant-design\components\table\demo\component-token.tsx`
 *
 * === S30 component-token 主题定制（antd v6 token → data-grid CSS variables）===
 *
 * ★ 核心机制（详见 Table.tsx `buildTableTokenCssVars` 注释）：
 *   antd v6 cssinjs 把 Table component token 输出到 `:where(.ant-table)` 选择器，
 *   data-grid 用 `.dg-wrapper`（非 `.ant-table`），token **不会自动注入**。
 *   S30 在 data-grid Table 适配层用 `theme.useToken()` 读取 ConfigProvider 当前主题
 *   （含 `components.Table` 覆盖），把 `token.Table` 映射为 `.dg-wrapper` inline CSS variables
 *   （`--ant-header-bg` 等，覆盖 tokens.css fallback）→ 视觉随 token 变化。
 *
 * === antd demo 要素（1:1 复刻）===
 *
 * 1. 动态控制面板（antd `<Form layout="inline">`）：
 *    - Switch × 10：Bordered / loading / Title / Column Header / Footer / Expandable /
 *      Checkbox / Fixed Header / Has Data / Ellipsis。
 *    - Radio.Group × 5：Size（large/medium/small）/ Table Scroll（unset/scroll/fixed columns）/
 *      Table Layout（unset/fixed）/ Pagination Top（topStart/topCenter/topEnd/none）/
 *      Pagination Bottom（bottomStart/bottomCenter/bottomEnd/none）。
 * 2. `<ConfigProvider theme={{ components: { Table: { ...token 覆盖 } } }}>`：
 *    覆盖 headerBg/headerColor/headerSortActiveBg/headerSortHoverBg/bodySortBg/rowHoverBg/
 *    rowSelectedBg/rowSelectedHoverBg/rowExpandedBg/cellPaddingBlock/Inline + MD + SM/
 *    borderColor/headerBorderRadius/footerBg/footerColor/cellFontSize + MD + SM/
 *    headerSplitColor/headerFilterHoverBg/filterDropdownMenuBg/filterDropdownBg/expandIconBg/
 *    colorBgContainer（data-grid 用 --ant-color-bg-container）。
 *    ★ token 字段名以 antd 6.4.4 `ComponentToken` 实测为准（components/table/style/index.ts）。
 * 3. `<Table>` 动态 props：bordered/loading/size/expandable/title/showHeader/footer/
 *    rowSelection/scroll/tableLayout/pagination(columns/dataSource 动态按 state 组装）。
 *
 * === 与 antd demo 的差异 ===
 *
 * - DownOutlined 自绘 SVG（不 import @ant-design/icons，与既有 demo 约定一致）。
 * - pagination placement 用 data-grid v6 数组语义（S11 实测：placement[0]=顶部、[1]=底部）。
 * - data-grid `pagination` 默认不分页（undefined/false 全显）；本 demo 显式传
 *   `{ placement: [top, bottom] }` 启用分页（与 antd 默认开启分页不同，但 demo 行为等价）。
 *
 * === 验证点（S30，UI 由验证者执行）===
 *
 * 1. 默认：表头蓝底（#1677ff）白字、单元格 padding 20、字号 16、footer 蓝底白字、
 *    borderColor #e6f4ff、headerBorderRadius 0、表体底色 #e6f4ff（colorBgContainer 覆盖）。
 * 2. 切 Size → medium/small：cell padding 随 cellPaddingBlockMD/SM 切换（12/8）。
 * 3. 切 Bordered/Title/Footer/Column Header/Expandable/Checkbox/Fixed Header/Has Data/
 *    Ellipsis/Table Scroll/Table Layout/Pagination Top/Bottom → 表格 props 实时变化。
 * 4. 回归：无 ConfigProvider theme.components.Table 的 demo（basic/head 等）视觉不变
 *    （tokens.css fallback + useToken 读默认值注入等价值）。
 */

import { useState } from 'react'
import type { RadioChangeEvent } from 'antd'
import { ConfigProvider, Form, Radio, Space, Switch } from 'antd'
import { Table } from '../table'
import type {
  ColumnType,
  Expandable,
  SizeType,
  TablePaginationPlacement,
  TableRowSelection,
} from '../table'

interface DataType {
  key: number
  name: string
  age: number
  address: string
  description: string
}

// DownOutlined 自绘 SVG（不 import @ant-design/icons，与既有 demo 约定一致）。
// 视觉对齐 antd DownOutlined（向下 caret）。
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

const columns: ColumnType<DataType>[] = [
  {
    title: 'Name',
    dataIndex: 'name',
  },
  {
    title: 'Age',
    dataIndex: 'age',
    sorter: (a, b) => a.age - b.age,
  },
  {
    title: 'Address',
    dataIndex: 'address',
    filters: [
      {
        text: 'London',
        value: 'London',
      },
      {
        text: 'New York',
        value: 'New York',
      },
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

const dataSource = Array.from({ length: 10 }).map<DataType>((_, i) => ({
  key: i,
  name: 'John Brown',
  age: Number(`${i}2`),
  address: `New York No. ${i} Lake Park`,
  description: `My name is John Brown, I am ${i}2 years old, living in New York No. ${i} Lake Park.`,
}))

const defaultExpandable: Expandable<DataType> = {
  expandedRowRender: (record: DataType) => <p>{record.description}</p>,
}

const defaultTitle = () => 'Here is title'
const defaultFooter = () => 'Here is footer'

export default function App() {
  const [bordered, setBordered] = useState(false)
  const [loading, setLoading] = useState(false)
  const [size, setSize] = useState<SizeType>('large')
  const [expandable, setExpandable] = useState<Expandable<DataType> | undefined>(
    defaultExpandable,
  )
  const [showTitle, setShowTitle] = useState(false)
  const [showHeader, setShowHeader] = useState(true)
  const [showFooter, setShowFooter] = useState(true)
  const [rowSelection, setRowSelection] = useState<TableRowSelection<DataType> | undefined>({})
  const [hasData, setHasData] = useState(true)
  const [tableLayout, setTableLayout] = useState<string>('unset')
  const [top, setTop] = useState<TablePaginationPlacement>('none')
  const [bottom, setBottom] = useState<TablePaginationPlacement>('bottomEnd')
  const [ellipsis, setEllipsis] = useState(false)
  const [yScroll, setYScroll] = useState(false)
  const [xScroll, setXScroll] = useState<string>('unset')

  const handleBorderChange = (enable: boolean) => {
    setBordered(enable)
  }

  const handleLoadingChange = (enable: boolean) => {
    setLoading(enable)
  }

  const handleSizeChange = (e: RadioChangeEvent) => {
    setSize(e.target.value)
  }

  const handleTableLayoutChange = (e: RadioChangeEvent) => {
    setTableLayout(e.target.value)
  }

  const handleExpandChange = (enable: boolean) => {
    setExpandable(enable ? defaultExpandable : undefined)
  }

  const handleEllipsisChange = (enable: boolean) => {
    setEllipsis(enable)
  }

  const handleTitleChange = (enable: boolean) => {
    setShowTitle(enable)
  }

  const handleHeaderChange = (enable: boolean) => {
    setShowHeader(enable)
  }

  const handleFooterChange = (enable: boolean) => {
    setShowFooter(enable)
  }

  const handleRowSelectionChange = (enable: boolean) => {
    setRowSelection(enable ? {} : undefined)
  }

  const handleYScrollChange = (enable: boolean) => {
    setYScroll(enable)
  }

  const handleXScrollChange = (e: RadioChangeEvent) => {
    setXScroll(e.target.value)
  }

  const handleDataChange = (newHasData: boolean) => {
    setHasData(newHasData)
  }

  // 决策 7：scroll.y 仅 true/undefined（不支持数字）。yScroll 开关 → y:true（CSS 自动适应高度）。
  const scroll: { x?: number | string; y?: true } = {}
  if (yScroll) {
    scroll.y = true
  }
  if (xScroll !== 'unset') {
    scroll.x = '100vw'
  }

  const tableColumns = (columns as ColumnType<DataType>[]).map((item) => ({
    ...item,
    ellipsis,
  }))
  if (xScroll === 'fixed') {
    tableColumns[0].fixed = true
    tableColumns[tableColumns.length - 1].fixed = 'right'
  }

  // tableLayout：'unset' → undefined（默认），否则 'fixed'。
  const resolvedTableLayout =
    tableLayout === 'fixed' ? ('fixed' as const) : undefined

  return (
    <>
      <Form layout="inline" className="table-demo-control-bar" style={{ marginBottom: 16 }}>
        <Form.Item label="Bordered">
          <Switch checked={bordered} onChange={handleBorderChange} />
        </Form.Item>
        <Form.Item label="loading">
          <Switch checked={loading} onChange={handleLoadingChange} />
        </Form.Item>
        <Form.Item label="Title">
          <Switch checked={showTitle} onChange={handleTitleChange} />
        </Form.Item>
        <Form.Item label="Column Header">
          <Switch checked={showHeader} onChange={handleHeaderChange} />
        </Form.Item>
        <Form.Item label="Footer">
          <Switch checked={showFooter} onChange={handleFooterChange} />
        </Form.Item>
        <Form.Item label="Expandable">
          <Switch checked={!!expandable} onChange={handleExpandChange} />
        </Form.Item>
        <Form.Item label="Checkbox">
          <Switch checked={!!rowSelection} onChange={handleRowSelectionChange} />
        </Form.Item>
        <Form.Item label="Fixed Header">
          <Switch checked={!!yScroll} onChange={handleYScrollChange} />
        </Form.Item>
        <Form.Item label="Has Data">
          <Switch checked={!!hasData} onChange={handleDataChange} />
        </Form.Item>
        <Form.Item label="Ellipsis">
          <Switch checked={!!ellipsis} onChange={handleEllipsisChange} />
        </Form.Item>
        <Form.Item label="Size">
          <Radio.Group value={size} onChange={handleSizeChange}>
            <Radio.Button value="large">Large</Radio.Button>
            <Radio.Button value="medium">Medium</Radio.Button>
            <Radio.Button value="small">Small</Radio.Button>
          </Radio.Group>
        </Form.Item>
        <Form.Item label="Table Scroll">
          <Radio.Group value={xScroll} onChange={handleXScrollChange}>
            <Radio.Button value="unset">Unset</Radio.Button>
            <Radio.Button value="scroll">Scroll</Radio.Button>
            <Radio.Button value="fixed">Fixed Columns</Radio.Button>
          </Radio.Group>
        </Form.Item>
        <Form.Item label="Table Layout">
          <Radio.Group value={tableLayout} onChange={handleTableLayoutChange}>
            <Radio.Button value="unset">Unset</Radio.Button>
            <Radio.Button value="fixed">Fixed</Radio.Button>
          </Radio.Group>
        </Form.Item>
        <Form.Item label="Pagination Top">
          <Radio.Group value={top} onChange={(e) => setTop(e.target.value)}>
            <Radio.Button value="topStart">TopStart</Radio.Button>
            <Radio.Button value="topCenter">TopCenter</Radio.Button>
            <Radio.Button value="topEnd">TopEnd</Radio.Button>
            <Radio.Button value="none">None</Radio.Button>
          </Radio.Group>
        </Form.Item>
        <Form.Item label="Pagination Bottom">
          <Radio.Group value={bottom} onChange={(e) => setBottom(e.target.value)}>
            <Radio.Button value="bottomStart">BottomStart</Radio.Button>
            <Radio.Button value="bottomCenter">BottomCenter</Radio.Button>
            <Radio.Button value="bottomEnd">BottomEnd</Radio.Button>
            <Radio.Button value="none">None</Radio.Button>
          </Radio.Group>
        </Form.Item>
      </Form>
      <ConfigProvider
        theme={{
          components: {
            Table: {
              colorBgContainer: '#e6f4ff',
              headerBg: '#1677ff',
              headerColor: '#fff',
              headerSortActiveBg: '#0958d9',
              headerSortHoverBg: '#69b1ff',
              bodySortBg: '#1677ff10',
              rowHoverBg: '#1677ff10',
              rowSelectedBg: '#bae0ff',
              rowSelectedHoverBg: '#91caff',
              rowExpandedBg: '#1677ff10',
              cellPaddingBlock: 20,
              cellPaddingInline: 20,
              cellPaddingBlockMD: 16,
              cellPaddingInlineMD: 16,
              cellPaddingBlockSM: 12,
              cellPaddingInlineSM: 12,
              borderColor: '#e6f4ff',
              headerBorderRadius: 0,
              footerBg: '#1677ff',
              footerColor: '#fff',
              cellFontSize: 16,
              cellFontSizeMD: 16,
              cellFontSizeSM: 14,
              headerSplitColor: '#fff',
              headerFilterHoverBg: 'rgba(0, 0, 0, 0.12)',
              filterDropdownMenuBg: '#fff',
              filterDropdownBg: '#fff',
              expandIconBg: '#e6f4ff',
            },
          },
        }}
      >
        {/* 决策 7：scroll.y:true 数据区域模式需父容器有明确 height。
            yScroll 开启时包一层固定高度容器（240px）；关闭时不包（零回归）。 */}
        <div style={yScroll ? { height: 240 } : undefined}>
          <Table<DataType>
            bordered={bordered}
            loading={loading}
            size={size}
            expandable={expandable}
            title={showTitle ? defaultTitle : undefined}
            showHeader={showHeader}
            footer={showFooter ? defaultFooter : undefined}
            rowSelection={rowSelection}
            scroll={scroll}
            tableLayout={resolvedTableLayout}
            pagination={{ placement: [top, bottom] }}
            columns={tableColumns}
            dataSource={hasData ? dataSource : []}
          />
        </div>
      </ConfigProvider>
    </>
  )
}
