/**
 * 复刻 antd dynamic-settings demo：
 *   `G:\Projects\ant-design\components\table\demo\dynamic-settings.tsx`
 *
 * === S33 动态设置（综合集成验收）===
 *
 * ★ 定位（集成验收 demo，非新功能）：
 *   S1-S32 + M1-M9 全部功能已实现。本 demo 把所有可动态切换的 Table 属性聚合到一个
 *   控制面板，用于「整体回归」——引擎零改动（功能已就位），S33 仅 demo 验收。
 *
 * === 与 S30 component-token demo 的关系 ===
 *   结构高度相似（同样 10 Switch + 5 Radio.Group + Table 动态 props + columns sorter/filters/
 *   Action + 10 行 + expandable + scroll + pagination placement）。唯一区别：
 *     - S30 有 `<ConfigProvider theme={{ components: { Table: { ...27 token } } }}>`（蓝色主题）；
 *     - S33 **无 ConfigProvider theme token**（默认主题），纯属性动态切换。
 *   故本 demo 直接复用 S30 的面板结构，去掉 ConfigProvider 包裹与 token 覆盖。
 *
 * === antd demo 要素（1:1 复刻）===
 *
 * 1. 动态控制面板（antd `<Form layout="inline">`）：
 *    - Switch × 10：Bordered / loading / Title / Column Header / Footer / Expandable /
 *      Checkbox / Fixed Header / Has Data / Ellipsis。
 *    - Radio.Group × 5：Size（large/medium/small）/ Table Scroll（unset/scroll/fixed columns）/
 *      Table Layout（unset/fixed）/ Pagination Top（topStart/topCenter/topEnd/none）/
 *      Pagination Bottom（bottomStart/bottomCenter/bottomEnd/none）。
 * 2. columns：Name / Age（sorter 函数）/ Address（filters + onFilter）/ Action
 *    （sorter:true，render 渲染 Delete + More actions + DownOutlined）。
 * 3. 10 行数据 + expandable.expandedRowRender（description）+ scroll（yScroll 240 /
 *    xScroll '100vw' 或 fixed 列）+ tableLayout + pagination placement 数组。
 *
 * === 与 antd demo 的差异 ===
 *
 * - DownOutlined 自绘 SVG（不 import @ant-design/icons，与既有 demo 约定一致）。
 * - pagination placement 用 data-grid v6 数组语义（S11 实测：placement[0]=顶部、[1]=底部）。
 * - data-grid `pagination` 默认不分页（undefined/false 全显）；本 demo 显式传
 *   `{ placement: [top, bottom] }` 启用分页（与 antd 默认开启分页不同，但 demo 行为等价）。
 *
 * === 验证点（S33 集成验收，UI 由验证者执行）===
 *
 * 1. 默认：默认主题（白底表头 + 标准字号/padding），无 ConfigProvider token 覆盖。
 * 2. 全量切换无报错：Bordered / loading / Title / Column Header / Footer / Expandable /
 *    Checkbox / Fixed Header / Has Data / Ellipsis / Size / Table Scroll / Table Layout /
 *    Pagination Top / Pagination Bottom —— 每个开关切换后表格 props 实时变化、console 无 error。
 * 3. 回归：现有 demo（component-token/head/basic/bordered/size/expand/rowSelection/
 *    scroll/ellipsis/pagination/loading/title/footer/tableLayout）全部不变（仅新增本 demo）。
 */

import { useState } from 'react'
import type { RadioChangeEvent } from 'antd'
import { Form, Radio, Space, Switch } from 'antd'
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

  const scroll: { x?: number | string; y?: number | string } = {}
  if (yScroll) {
    scroll.y = 240
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
    </>
  )
}
