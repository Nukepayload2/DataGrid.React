/**
 * 复刻 antd component-token demo：
 *   `G:\Projects\ant-design\components\table\demo\component-token.tsx`
 *
 * === 决策 9 双栏对照（S30 component-token 主题定制）===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致——`<ConfigProvider theme.components.Table>`
 *   token 覆盖由 data-grid 适配层 `theme.useToken()` 读取 → `buildTableTokenCssVars` 映射为
 *   `.dg-wrapper` inline `--ant-*` CSS variables 注入（覆盖 tokens.css fallback）→ 视觉随 token 变化。
 * - **右栏（antd Table）**：忠实复刻 antd component-token demo（antd v6 cssinjs 原生消费
 *   `:where(.ant-table)` component token）。**唯一改动**：antd demo 原本用
 *   `@ant-design/icons` 的 `DownOutlined`，本 demo 改为内联 SVG（不直接依赖
 *   @ant-design/icons，与既有 demo 约定一致），两侧共用。
 * - **共享控制条 + 共享 state**：10 Switch + 5 Radio.Group 的同一组 state 同时驱动两侧表格
 *   （bordered/loading/size/title/footer/.../pagination top/bottom）。任一切换，左右同步 diff。
 * - **共享 ConfigProvider**：两侧 Table 都包在同一个 ConfigProvider（theme.components.Table 27 token）
 *   内，token 对 data-grid（CSS variables 注入）与 antd（cssinjs）都生效。
 *
 * === antd demo 要素（1:1 复刻）===
 *
 * 1. 动态控制面板（antd `<Form layout="inline">`）：见下方 JSX（10 Switch + 5 Radio.Group）。
 * 2. ConfigProvider theme.components.Table 覆盖：headerBg/headerColor/headerSortActiveBg/
 *    headerSortHoverBg/bodySortBg/rowHoverBg/rowSelectedBg/rowSelectedHoverBg/rowExpandedBg/
 *    cellPaddingBlock/Inline + MD + SM/borderColor/headerBorderRadius/footerBg/footerColor/
 *    cellFontSize + MD + SM/headerSplitColor/headerFilterHoverBg/filterDropdownMenuBg/
 *    filterDropdownBg/expandIconBg/colorBgContainer（data-grid 用 --ant-color-bg-container）。
 *    ★ token 字段名以 antd 6.4.4 `ComponentToken` 实测为准（components/table/style/index.ts）。
 *
 * === 两侧已知差异（如实保留作为对照价值）===
 *
 * - DownOutlined：两侧共用内联 SVG（不依赖 @ant-design/icons；antd demo 原本 import 它，
 *   本 demo 改内联）。视觉一致。
 * - pagination placement：data-grid 用 v6 数组语义（S11 实测：placement[0]=顶部、[1]=底部）；
 *   antd 原生同。
 * - data-grid pagination 默认不分页；本 demo 显式传 { placement:[top,bottom] } 启用分页（与 antd
 *   默认开启分页不同，但 demo 行为等价）。
 * - scroll.y：决策 7——data-grid 用 `true`（CSS 自适应，父容器 240px）；antd 用 240（数字）。
 *
 * === ★ §9 S30 cellFontSize 消费（已对齐 antd）===
 *
 * 历史背景：主题注入重构（task #26/#27）前，cellFontSize token 虽注入但表头/表体字号
 * 未消费该变量（旧 demo 注释曾记「computed fontSize 14 非 token 16」gap）。重构后已对齐：
 *
 * 注入链（Table.tsx `tableTokenToCssVars`，逐 antd 源码复刻）：
 *   `cellFontSize` 在 antd `prepareComponentToken` 默认输出
 *   （`ant-design/components/table/style/index.ts:467`）→ `prefixToken` 重命名为
 *   `TableCellFontSize` → `transformToken` + `token2CSSVar` 产出
 *   `--ant-table-cell-font-size`（注意：是 `--ant-table-cell-font-size`，非旧注释误记的
 *   `--ant-cell-font-size`——cellFontSize 在 prepareComponentToken 默认输出故经 prefixToken 加
 *   `Table` 前缀，与 cellPaddingBlock → `--ant-table-cell-padding-block` 同款）。MD/SM 同理产出
 *   `--ant-table-cell-font-size-md` / `-sm`。
 *
 * 消费链（tokens.css + table.css）：
 *   `.dg-wrapper { font-size: var(--dg-font-size) }`（table.css:16）→
 *   `--dg-font-size: var(--ant-table-cell-font-size)`（tokens.css:160，base/large）；
 *   `.dg-wrapper.dg-size-middle` 覆盖 `--dg-font-size: var(--ant-table-cell-font-size-md)`
 *   （tokens.css:206）；`.dg-size-small` 覆盖为 `-sm`（tokens.css:212）。
 *   `.dg-cell` / `.dg-cell-header` 无 font-size 声明 → 继承 `.dg-wrapper` 的字号。
 *
 * 结论：本 demo `cellFontSize:16` / `cellFontSizeMD:16` / `cellFontSizeSM:14` →
 *   左栏 data-grid 表头/表体 computed fontSize=16（large/medium），small=14（与右栏 antd 一致）。
 *   antd `genSizeStyle`（style/size.ts:13-28）同样以 `tableFontSize`/`tableFontSizeMiddle`/
 *   `tableFontSizeSmall` 设 `.ant-table[-medium|-small] { font-size }`，单元格继承——机制等价。
 */

import { useState } from 'react'
import type { RadioChangeEvent, TableProps as AntdTableProps } from 'antd'
import { ConfigProvider, Form, Radio, Space, Switch, Table as AntdTable } from 'antd'
import { Table } from '../table'
import type {
  ColumnType,
  Expandable,
  TablePaginationPlacement,
  TableRowSelection,
} from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import {
  dataSource as sharedData,
  defaultFooter,
  defaultTitle,
  type RecordType,
} from './_compare/component-token.shared'

// ---------------------------------------------------------------------------
// 两侧共享 columns 形状 + 共用 DownOutlined 内联 SVG（不依赖 @ant-design/icons）
// ---------------------------------------------------------------------------

/**
 * 内联 DownOutlined（More 链接右侧的小箭头）——避免直接依赖 @ant-design/icons
 * （仅 antd 间接依赖，与 nested-table / custom-filter-panel / drag-sorting-handler 约定一致）。
 * SVG 路径取自 ant-design-icons DownOutlined。**两侧共用**（左 data-grid + 右 antd）。
 */
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

// antd defaultExpandable（结构同 data-grid，类型独立；两者字段重叠，运行时兼容）。
const antdDefaultExpandable: NonNullable<
  AntdTableProps<RecordType>['expandable']
> = {
  expandedRowRender: (record: RecordType) => <p>{record.description}</p>,
}

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

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function ComponentTokenDemo() {
  // ★ 共享 state：同一组 state 同时驱动两侧表格。
  // 共享 size 类型：'large'/'medium'/'small' 在两侧都被接受
  // （data-grid 用 'medium'（= 'middle'）；antd v6 也接受 'medium' 别名（= 'middle'），
  // 不含 data-grid 独有的 'compact'，避免与 antd SizeType 不兼容）。
  type SharedSize = 'large' | 'medium' | 'small'
  const [bordered, setBordered] = useState(false)
  const [loading, setLoading] = useState(false)
  const [size, setSize] = useState<SharedSize>('large')
  const [expandableEnabled, setExpandableEnabled] = useState(true)
  const [showTitle, setShowTitle] = useState(false)
  const [showHeader, setShowHeader] = useState(true)
  const [showFooter, setShowFooter] = useState(true)
  const [rowSelectionEnabled, setRowSelectionEnabled] = useState(true)
  const [hasData, setHasData] = useState(true)
  const [tableLayout, setTableLayout] = useState<'unset' | 'fixed'>('unset')
  const [top, setTop] = useState<TablePaginationPlacement>('none')
  const [bottom, setBottom] = useState<TablePaginationPlacement>('bottomEnd')
  const [ellipsis, setEllipsis] = useState(false)
  const [yScroll, setYScroll] = useState(false)
  const [xScroll, setXScroll] = useState<'unset' | 'scroll' | 'fixed'>('unset')

  // 派生：data-grid expandable / antd expandable 各自类型化（共用同一开关）。
  const dgExpandable = expandableEnabled ? dgDefaultExpandable : undefined
  const antdExpandable = expandableEnabled ? antdDefaultExpandable : undefined
  // 派生：data-grid rowSelection / antd rowSelection（共用同一开关 + 类型独立）。
  // antd TableProps['rowSelection'] 允许 undefined（故类型标注用 Optional）。
  const dgRowSelection: TableRowSelection<RecordType> | undefined = rowSelectionEnabled
    ? {}
    : undefined
  const antdRowSelection: AntdTableProps<RecordType>['rowSelection'] = rowSelectionEnabled
    ? {}
    : undefined

  // 决策 7：scroll.y 仅 true/undefined（不支持数字）。yScroll 开关 → y:true（CSS 自适应高度）。
  const dgScroll: { x?: number | string; y?: true } = {}
  const antdScroll: { x?: number | string; y?: number } = {}
  if (yScroll) {
    dgScroll.y = true
    antdScroll.y = 240
  }
  if (xScroll !== 'unset') {
    dgScroll.x = '100vw'
    antdScroll.x = '100vw'
  }

  const dgTableColumns = (dgColumns as ColumnType<RecordType>[]).map((item) => ({
    ...item,
    ellipsis,
  }))
  const antdTableColumns = antdColumns.map((item) => ({ ...item, ellipsis }))
  if (xScroll === 'fixed') {
    dgTableColumns[0].fixed = true
    dgTableColumns[dgTableColumns.length - 1].fixed = 'right'
    antdTableColumns[0].fixed = true
    antdTableColumns[antdTableColumns.length - 1].fixed = 'right'
  }

  const resolvedTableLayout = tableLayout === 'fixed' ? ('fixed' as const) : undefined

  return (
    <div style={{ padding: 24 }}>
      {/* ★ 共享控制条：全宽，在 SplitDemo 上方。antd <Form layout="inline"> 风格。 */}
      <Form layout="inline" className="table-demo-control-bar" style={{ marginBottom: 16 }}>
        <Form.Item label="Bordered">
          <Switch checked={bordered} onChange={setBordered} />
        </Form.Item>
        <Form.Item label="loading">
          <Switch checked={loading} onChange={setLoading} />
        </Form.Item>
        <Form.Item label="Title">
          <Switch checked={showTitle} onChange={setShowTitle} />
        </Form.Item>
        <Form.Item label="Column Header">
          <Switch checked={showHeader} onChange={setShowHeader} />
        </Form.Item>
        <Form.Item label="Footer">
          <Switch checked={showFooter} onChange={setShowFooter} />
        </Form.Item>
        <Form.Item label="Expandable">
          <Switch
            checked={expandableEnabled}
            onChange={setExpandableEnabled}
          />
        </Form.Item>
        <Form.Item label="Checkbox">
          <Switch
            checked={rowSelectionEnabled}
            onChange={setRowSelectionEnabled}
          />
        </Form.Item>
        <Form.Item label="Fixed Header">
          <Switch checked={yScroll} onChange={setYScroll} />
        </Form.Item>
        <Form.Item label="Has Data">
          <Switch checked={hasData} onChange={setHasData} />
        </Form.Item>
        <Form.Item label="Ellipsis">
          <Switch checked={ellipsis} onChange={setEllipsis} />
        </Form.Item>
        <Form.Item label="Size">
          <Radio.Group value={size} onChange={(e: RadioChangeEvent) => setSize(e.target.value)}>
            <Radio.Button value="large">Large</Radio.Button>
            <Radio.Button value="medium">Medium</Radio.Button>
            <Radio.Button value="small">Small</Radio.Button>
          </Radio.Group>
        </Form.Item>
        <Form.Item label="Table Scroll">
          <Radio.Group
            value={xScroll}
            onChange={(e: RadioChangeEvent) => setXScroll(e.target.value)}
          >
            <Radio.Button value="unset">Unset</Radio.Button>
            <Radio.Button value="scroll">Scroll</Radio.Button>
            <Radio.Button value="fixed">Fixed Columns</Radio.Button>
          </Radio.Group>
        </Form.Item>
        <Form.Item label="Table Layout">
          <Radio.Group
            value={tableLayout}
            onChange={(e: RadioChangeEvent) => setTableLayout(e.target.value)}
          >
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

      {/*
        ★ 共享 ConfigProvider：两侧 Table 都包在同一个 ConfigProvider（theme.components.Table
        27 token）内。对 data-grid（useToken 读 → CSS variables 注入 .dg-wrapper）与 antd
        （cssinjs :where(.ant-table)）都生效，对照可见主题变化。
        minPaneWidth=600 → 横排阈值 ≈ 1216。常规笔记本视口（≥1280）即可横排；窄视口竖排。
      */}
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
        <SplitDemo
          minPaneWidth={600}
          left={
            /* 决策 7：scroll.y:true 数据区域模式需父容器有明确 height。
               yScroll 开启时包一层固定高度容器（240px，等价 antd 240 视觉）；关闭时不包（零回归）。 */
            <div style={yScroll ? { height: 240 } : undefined}>
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
              />
            </div>
          }
          right={
            /* 忠实复刻 antd component-token demo：antd 原生 Table + scroll.y:240（数字）。 */
            <div style={yScroll ? { height: 240 } : undefined}>
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
              />
            </div>
          }
        >
          <div>
            <strong>对照说明（决策 9 B19 / S30 component-token 主题定制）：</strong>
            左右并排呈现 data-grid 与 antd component-token demo（ConfigProvider theme
            27 token + 动态面板），方便对照 token 注入效果。
            <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
              <li>
                <strong>共享 ConfigProvider</strong>：两侧 Table 都包在同一个
                <code> ConfigProvider theme.components.Table</code>（27 token，蓝底表头白字 +
                padding 20 + 字号 16 + borderColor #e6f4ff + 圆角 0）。对 data-grid
                （useToken 读 → CSS variables 注入 .dg-wrapper）与 antd（cssinjs）都生效。
              </li>
              <li>
                <strong>共享动态面板</strong>：10 Switch + 5 Radio.Group 的同一组 state
                同时驱动两侧——bordered/loading/title/footer/header/expandable/checkbox/
                fixedHeader/hasData/ellipsis + size/tableScroll/tableLayout/paginationTop/
                paginationBottom。任一切换，左右同步 diff。
              </li>
              <li>
                <strong>DownOutlined</strong>：两侧共用内联 SVG（不依赖
                <code> @ant-design/icons</code>；antd demo 原本 import 它，本 demo 改内联）。
                视觉一致。
              </li>
              <li>
                <strong>scroll.y</strong>（决策 7）：左栏 data-grid
                <code> scroll:&#123;y:true&#125;</code>（CSS 自适应，父容器 240px）；右栏 antd
                <code> scroll:&#123;y:240&#125;</code>（数字）。
              </li>
              <li>
                <strong>★ §9 S30 cellFontSize 消费（已对齐）</strong>：ConfigProvider theme
                <code> cellFontSize:16</code>（large）/ <code>cellFontSizeMD:16</code>（medium）/
                <code>cellFontSizeSM:14</code>（small）→ 经 <code>tableTokenToCssVars</code> 注入
                <code>.dg-wrapper</code> inline <code>--ant-table-cell-font-size[-md|-sm]</code>
                变量 → <code>.dg-wrapper&#123;font-size:var(--dg-font-size)&#125;</code>（<code>--dg-font-size</code>
                按 size 桥接 <code>--ant-table-cell-font-size[-md|-sm]</code>）→ 表头/表体格继承 →
                <strong> 左右两栏 computed fontSize 均为 16（large/medium）/ 14（small），逐值一致</strong>。
                antd <code>genSizeStyle</code>（style/size.ts）同款机制（<code>.ant-table&#123;font-size:tableFontSize&#125;</code>
                + <code>.ant-table-medium/-small</code> 覆盖，单元格继承）。旧 §9「未消费」gap
                在主题注入重构（task #26/#27）后已闭合，本 demo 字号现已对齐。
              </li>
              <li>
                <strong>pagination</strong>（已知差异）：data-grid 默认不分页；本 demo 显式传
                <code> &#123; placement:[top,bottom] &#125;</code> 启用分页（与 antd 默认开启
                分页不同，但 demo 行为等价）。
              </li>
            </ul>
          </div>
        </SplitDemo>
      </ConfigProvider>
    </div>
  )
}
