import { Typography } from 'antd'
import {
  DocSection,
  DocsActionList,
  DocsCode,
  DocsDataGrid,
  DocsNote,
} from './components'
import type { DocsPageContext } from './types'

const { Text } = Typography

interface OverviewRow {
  key: string
  area: string
  purpose: string
  entry: string
}

interface PropRow {
  key: string
  field: string
  purpose: string
  note: string
}

interface CompatRow {
  key: string
  api: string
  status: string
  detail: string
}

interface DeprecatedRow {
  key: string
  member: string
  support: string
  behavior: string
  migration: string
}

interface GapRow {
  key: string
  topic: string
  boundary: string
  action: string
}

interface SemanticSlotRow {
  key: string
  slot: string
  antd: string
  dataGrid: string
  note: string
}

interface A11yRow {
  key: string
  attr: string
  antd: string
  dataGrid: string
  conclusion: string
}

interface ApiExportRow {
  key: string
  name: string
  kind: string
  stability: string
  description: string
}

interface ApiOptionRow {
  key: string
  field: string
  type: string
  defaultValue: string
  stability: string
  description: string
}

const QUICK_START_INSTALL = `import { Table } from '@nukepayload2/data-grid'
import type { ColumnType } from '@nukepayload2/data-grid'`

const MIGRATION_IMPORTS = `// before
import { Table } from 'antd'
import type { TableProps, ColumnsType } from 'antd'

// after
import { Table } from '@nukepayload2/data-grid'
import type { TableProps, ColumnsType } from '@nukepayload2/data-grid'`

const MIGRATION_SCROLL = `// before
<Table columns={columns} dataSource={rows} scroll={{ y: 400, x: 1200 }} />

// after
{/* 表格会占满父容器提供的可用空间；scroll.y 只负责打开纵向滚动模式。 */}
<Table columns={columns} dataSource={rows} scroll={{ y: true, x: 1200 }} />`

const QUICK_START_MINIMAL = `interface Record {
  key: string
  name: string
  age: number
}

const columns: ColumnType<Record>[] = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Age', dataIndex: 'age', key: 'age', align: 'end' },
]

const data: Record[] = [
  { key: '1', name: 'Alice', age: 28 },
  { key: '2', name: 'Bob', age: 34 },
]

export default function Demo() {
  return <Table rowKey="key" columns={columns} dataSource={data} />
}`

const JSX_COLUMNS = `<Table dataSource={data}>
  <Table.Column title="Name" dataIndex="name" key="name" />
  <Table.Column title="Age" dataIndex="age" key="age" />
</Table>`

const VIRTUAL_SCROLLING_CODE = `<section className="table-pane">
  {/* .table-pane 由页面布局分配剩余空间，例如 flex: 1; min-height: 0。 */}
  <Table
    columns={columns}
    dataSource={data}
    rowKey="id"
    scroll={{ x: 1200, y: true }}
    virtual
  />
</section>`

const THEMING_CODE = `import { ConfigProvider } from 'antd'
import { Table } from '@nukepayload2/data-grid'

export default function App() {
  return (
    <ConfigProvider
      theme={{
        components: {
          Table: {
            headerBg: '#f5f8ff',
          },
        },
      }}
    >
      <Table columns={columns} dataSource={data} rowKey="key" />
    </ConfigProvider>
  )
}`

const GRID_OPTIONS_CODE = `<Table
  columns={columns}
  dataSource={data}
  rowKey="id"
  gridOptions={{
    rowHeight: 48,
    headerHeight: 44,
    resizable: true,
    columnResizeMode: 'ResizeLeft',
  }}
/>`

const RECYCLING_CODE = `<Table
  columns={columns}
  dataSource={rows}
  rowKey="id"
  virtual
  scroll={{ y: true, x: 1200 }}
  gridOptions={{
    rowHeight: 48,
    virtualizationMode: 'recycling',
  }}
/>`

const GRID_COLUMN_OPTIONS_CODE = `const columns: ColumnType<Row>[] = [
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    gridColumnOptions: {
      renderCellReact: (params, slot) => (
        <StatusBadge key={slot.key} value={params.value} />
      ),
    },
  },
]`

const overviewRows: OverviewRow[] = [
  {
    key: 'quick-start',
    area: '快速开始',
    purpose: '安装、导入样式，再把 columns、dataSource 和 rowKey 接起来。',
    entry: '快速开始',
  },
  {
    key: 'migration',
    area: '从 antd 迁移',
    purpose: '复用熟悉 props，同时避开 scroll.y 和 DOM 形态差异。',
    entry: '迁移指南',
  },
  {
    key: 'table-api',
    area: 'Table API',
    purpose: '查看高频 Table、Column 和静态属性入口。',
    entry: 'API 参考',
  },
  {
    key: 'compat-matrix',
    area: '兼容矩阵',
    purpose: '确认完全兼容、部分兼容和明确不做的边界。',
    entry: '兼容状态',
  },
  {
    key: 'deprecated-members',
    area: '过时成员',
    purpose: '单独核对 deprecated antd Table 成员、旧写法和 data-grid 的降级行为。',
    entry: '过时成员',
  },
  {
    key: 'architecture',
    area: '架构',
    purpose: '用 CSS Grid 重做 antd Table，同时保持熟悉的 React API。',
    entry: '架构总览',
  },
  {
    key: 'compat',
    area: '兼容',
    purpose: '优先对齐真实业务常用的 antd v6 Table 行为。',
    entry: '兼容矩阵',
  },
  {
    key: 'scroll',
    area: '滚动',
    purpose: '把 scroll.y 定义为数据区模式，由容器高度驱动。',
    entry: 'scroll.y 语义',
  },
  {
    key: 'style',
    area: '样式',
    purpose: '复用 antd token，用语义槽位处理局部覆盖。',
    entry: '样式和主题',
  },
]

const tablePropRows: PropRow[] = [
  { key: 'columns', field: 'columns', purpose: '列配置数组。', note: '列定义集中在这一个入口。' },
  { key: 'dataSource', field: 'dataSource', purpose: '表格数据数组。', note: '配合稳定 rowKey 使用。' },
  { key: 'rowKey', field: 'rowKey', purpose: '行唯一标识。', note: '选择、展开和滚动定位都依赖它。' },
  { key: 'scroll', field: 'scroll', purpose: '横向滚动和数据区滚动。', note: '`scroll.y` 使用 `true` 开启，实际高度由容器决定。' },
  { key: 'virtual', field: 'virtual', purpose: '开启虚拟滚动。', note: '适合大表格或复杂滚动场景。' },
  { key: 'rowSelection', field: 'rowSelection', purpose: 'antd 风格行选择。', note: '保持使用者熟悉的 API 形状。' },
  { key: 'expandable', field: 'expandable', purpose: '展开行和树表。', note: '支持树形层级和展开交互。' },
  { key: 'pagination', field: 'pagination', purpose: '分页配置。', note: '未传时默认启用，传 `false` 关闭。' },
  { key: 'components', field: 'components', purpose: '自定义表体单元格或行。', note: '当前消费 body.cell / body.row；不支持 header.cell 替换。' },
  { key: 'classNames', field: 'classNames / styles', purpose: '语义化样式槽位。', note: '局部覆盖 root、header、body、cell 等部位。' },
  { key: 'sticky', field: 'sticky', purpose: '页面级 sticky 表头。', note: '适合和外层滚动容器组合使用。' },
  { key: 'gridOptions', field: 'gridOptions', purpose: 'data-grid 专属表级能力。', note: '例如行高、列宽拖拽、原生选择和拖拽排序。' },
]

const publicApiRows: ApiExportRow[] = [
  { key: 'table', name: 'Table', kind: 'value', stability: 'stable', description: 'data-grid 表格组件。' },
  { key: 'getRowKey', name: 'getRowKey', kind: 'value', stability: 'stable', description: '与 Table 内部一致的 rowKey 解析工具。' },
  { key: 'sentinel', name: 'EXPAND_COLUMN / SELECTION_COLUMN', kind: 'value', stability: 'stable', description: 'antd 兼容哨兵列，用于控制展开列和选择列位置。' },
  { key: 'selection-sentinel', name: 'SELECTION_ALL / SELECTION_NONE / SELECTION_INVERT', kind: 'value', stability: 'stable', description: 'antd 兼容选择菜单哨兵。' },
  { key: 'summary', name: 'Summary / Table.Summary', kind: 'value', stability: 'stable', description: 'antd 兼容 summary API。' },
  { key: 'table-types', name: 'TableProps / ColumnType / TableRef', kind: 'type', stability: 'stable', description: '主要公开类型入口。' },
  { key: 'grid-types', name: 'GridSelectionOptions / GridColumnOptions / VirtualizationMode', kind: 'type', stability: 'stable', description: 'data-grid 专属命名空间类型。' },
]

const gridOptionRows: ApiOptionRow[] = [
  { key: 'rowHeight', field: 'rowHeight', type: 'number | (record, index) => number', defaultValue: '虚拟模式 56', stability: 'stable', description: '行高约定；虚拟模式未测量行用它兜底。' },
  { key: 'virtualizationMode', field: 'virtualizationMode', type: "'standard' | 'recycling'", defaultValue: "'standard'", stability: 'stable', description: '虚拟渲染模式；只在 virtual + scroll.y=true 时生效。' },
  { key: 'minRowHeight', field: 'minRowHeight', type: 'number', defaultValue: 'undefined', stability: 'stable', description: '有界行高下限；需与 maxRowHeight 同时设置。' },
  { key: 'maxRowHeight', field: 'maxRowHeight', type: 'number', defaultValue: 'undefined', stability: 'stable', description: '有界行高上限；需与 minRowHeight 同时设置。' },
  { key: 'headerHeight', field: 'headerHeight', type: 'number | string', defaultValue: 'auto', stability: 'stable', description: '表头行高约定，多级表头每层使用同一高度。' },
  { key: 'resizable', field: 'resizable', type: 'boolean', defaultValue: 'false', stability: 'stable', description: '启用列宽拖拽；true 且未设 columnResizeMode 时等同 ResizeLeft。' },
  { key: 'columnResizeMode', field: 'columnResizeMode', type: "'Disabled' | 'ResizeLeft' | 'ResizeSibling'", defaultValue: "'Disabled'", stability: 'stable', description: '列宽拖拽模式。' },
  { key: 'resizableMinWidth', field: 'resizableMinWidth', type: 'number | (key) => number', defaultValue: '30', stability: 'stable', description: '列宽拖拽最小宽度。' },
  { key: 'resizableMaxWidth', field: 'resizableMaxWidth', type: 'number | (key) => number', defaultValue: 'Infinity', stability: 'stable', description: '列宽拖拽最大宽度。' },
  { key: 'scrollBarFoldMode', field: 'scrollBarFoldMode', type: 'ScrollBarFoldMode', defaultValue: '常驻细条', stability: 'stable', description: '悬浮滚动条显示和折叠策略。' },
  { key: 'selection', field: 'selection', type: 'GridSelectionOptions', defaultValue: 'undefined', stability: 'stable', description: 'data-grid 原生选择配置，优先级高于 rowSelection。' },
  { key: 'rowDragSort', field: 'rowDragSort', type: '{ onSort, handleSelector?, enabled?, autoScroll? }', defaultValue: 'undefined', stability: 'stable', description: '行拖拽排序入口；onSort 中提交新的 dataSource。' },
  { key: 'columnDragSort', field: 'columnDragSort', type: '{ onSort, enabled?, autoScroll? }', defaultValue: 'undefined', stability: 'stable', description: '列拖拽排序入口；onSort 中提交新的 columns。' },
  { key: 'autoScrollOnDrag', field: 'autoScrollOnDrag', type: 'boolean', defaultValue: 'true', stability: 'stable', description: '行/列拖到滚动容器边缘时自动滚动。' },
  { key: 'columnReorder', field: 'columnReorder', type: 'boolean', defaultValue: 'true', stability: 'stable', description: '列拖拽重排总开关。' },
  { key: 'multiRowReorder', field: 'multiRowReorder', type: 'boolean', defaultValue: 'true', stability: 'stable', description: '多选行拖拽时按选中块整体移动。' },
]

const selectionOptionRows: ApiOptionRow[] = [
  { key: 'selectionMode', field: 'selectionMode', type: "'disabled' | 'single' | 'multiple' | 'extended'", defaultValue: '按 rowSelection.type 推导', stability: 'stable', description: '原生行点击选择模式。' },
  { key: 'showSelectionColumn', field: 'showSelectionColumn', type: 'boolean', defaultValue: 'true', stability: 'stable', description: '是否显示选择列；关闭后仍可通过行点击或受控值选中。' },
  { key: 'getSelectionValue', field: 'getSelectionValue', type: '(record, index) => GridSelectionValue', defaultValue: '回退到 rowKey', stability: 'stable', description: '提取业务选中值；推荐返回稳定且唯一的 string/number。' },
  { key: 'selectedValues', field: 'selectedValues', type: 'readonly GridSelectionValue[]', defaultValue: 'undefined', stability: 'stable', description: '受控业务选中值。' },
  { key: 'defaultSelectedValues', field: 'defaultSelectedValues', type: 'readonly GridSelectionValue[]', defaultValue: 'undefined', stability: 'stable', description: '非受控初始业务选中值。' },
  { key: 'onSelectedValuesChange', field: 'onSelectedValuesChange', type: '(values, rows, info) => void', defaultValue: 'undefined', stability: 'stable', description: '业务选中值变化回调。' },
]

const scrollBarFoldRows: ApiOptionRow[] = [
  { key: 'showOnTableHover', field: 'showOnTableHover', type: 'boolean', defaultValue: 'false', stability: 'stable', description: 'true 时仅 hover/触摸表格后显示悬浮滚动条。' },
  { key: 'expandOnHover', field: 'expandOnHover', type: 'boolean', defaultValue: 'true', stability: 'stable', description: 'hover 滚动条 hit 区时是否从细指示器展开为粗滚动条。' },
]

const gridColumnOptionRows: ApiOptionRow[] = [
  { key: 'dragColumnLock', field: 'dragColumnLock', type: "'lockDrag' | 'lockPosition'", defaultValue: 'undefined', stability: 'stable', description: '列拖拽锁定；lockPosition 保持最终 index 不变。' },
  { key: 'renderCellElement', field: 'renderCellElement', type: '(params, oldElement) => HTMLElement', defaultValue: 'undefined', stability: 'advanced', description: 'recycling cell 的低层 HTMLElement 渲染 hook。' },
  { key: 'renderCellReact', field: 'renderCellReact', type: '(params, slot) => ReactElement | null', defaultValue: 'undefined', stability: 'advanced', description: 'recycling cell 的 React slot 渲染 hook，返回元素必须使用 slot.key。' },
  { key: 'disposeCellElement', field: 'disposeCellElement', type: '(element, reason, params) => void', defaultValue: 'undefined', stability: 'advanced', description: '清理 renderCellElement 创建的 HTMLElement 副作用。' },
]

const columnPropRows: PropRow[] = [
  { key: 'basic', field: 'title / dataIndex / key', purpose: '列标题、字段路径和稳定 key。', note: 'JSX 声明和 columns 数组都可用。' },
  { key: 'layout', field: 'width / fixed / align', purpose: '宽度、固定列和对齐方式。', note: '与滚动和 sticky 组合使用。' },
  { key: 'render', field: 'render', purpose: '自定义单元格内容。', note: '兼容返回 ReactNode 或 `{ children, props }`。' },
  { key: 'cell', field: 'onCell / onHeaderCell', purpose: '注入单元格或表头属性。', note: '也可用于 colSpan / rowSpan。' },
  { key: 'sort', field: 'sorter / filters', purpose: '排序和筛选。', note: '保留 antd 风格交互。' },
  { key: 'display', field: 'ellipsis / hidden / responsive', purpose: '展示控制。', note: '适合窄宽度和响应式场景。' },
  { key: 'gridColumnOptions', field: 'gridColumnOptions', purpose: 'data-grid 专属列级能力。', note: '用于列拖拽锁定和 recycling cell 低层渲染 hook。' },
]

const compatRows: CompatRow[] = [
  { key: 'base', api: 'dataSource / columns / rowKey', status: '完全兼容', detail: '基础数据、列定义和行 key 维持 antd 使用习惯。' },
  { key: 'selection', api: 'rowSelection', status: '部分兼容', detail: '常用选择、受控键、自定义选择项和 renderCell 已覆盖，DOM 形态存在适配差异。' },
  { key: 'expandable', api: 'expandable', status: '部分兼容', detail: '展开行、默认展开和 expandRowByClick 已覆盖，columnTitle/fixed 仍是 backlog。' },
  { key: 'scroll', api: 'scroll', status: '部分兼容', detail: 'x 支持常用形态；y 明确为 true，不接受 number/string max-height 语义。' },
  { key: 'components', api: 'components', status: '部分兼容', detail: '支持 body.cell、body.row；header.cell、wrapper/table 级替换不是当前公开能力。' },
  { key: 'locale', api: 'locale', status: '部分兼容', detail: '表体空态、筛选下拉、选择菜单、排序和展开文案已接入 antd locale 链路。' },
]

const deprecatedRows: DeprecatedRow[] = [
  {
    key: 'rendered-cell',
    member: 'column.render 返回 { children, props }',
    support: '部分兼容',
    behavior: '识别 legacy RenderedCell 对象，但只消费 children；props 不会合并到单元格。',
    migration: '返回普通 ReactNode；合并格和单元格 props 改用 column.onCell。',
  },
  {
    key: 'rendered-cell-props',
    member: 'RenderedCell.props',
    support: '保留类型但忽略',
    behavior: 'props 字段仍在类型里，但运行时 normalizeRenderedCell 会丢弃它。',
    migration: '不要在 render 返回对象中放 colSpan、rowSpan、className、style 或事件。',
  },
  {
    key: 'on-select-multiple',
    member: 'rowSelection.onSelectMultiple',
    support: '兼容触发',
    behavior: 'antd v6 已标记 deprecated；shift range 多选时仍按 (selected, selectedRows, changeRows) 调用。',
    migration: '新逻辑优先用 rowSelection.onChange，并读取 info.type === "multiple"。',
  },
  {
    key: 'expanded-row-offset',
    member: 'expandable.expandedRowOffset',
    support: '兼容支持',
    behavior: '转换为展开内容起始 grid column；非法值、负数和越界值会 clamp。',
    migration: '用 Table.EXPAND_COLUMN 在 columns 中控制展开列位置。',
  },
  {
    key: 'filter-checkall',
    member: 'locale.filterCheckall',
    support: '兼容别名',
    behavior: '读取顺序为 filterCheckall ?? filterCheckAll ?? 默认文案。',
    migration: '改用 locale.filterCheckAll。',
  },
  {
    key: 'fixed-true',
    member: 'column.fixed: true',
    support: '旧写法兼容',
    behavior: '归一化为左固定，即内部 start。',
    migration: '明确写 fixed: "left" / "start" 或 fixed: "right" / "end"。',
  },
  {
    key: 'filter-dropdown-open',
    member: 'column.filterDropdownOpen',
    support: '未暴露',
    behavior: '当前 ColumnType 没有这个 deprecated 字段。',
    migration: '使用 column.filterDropdownProps.open。',
  },
  {
    key: 'filter-dropdown-open-change',
    member: 'column.onFilterDropdownOpenChange',
    support: '未暴露',
    behavior: '当前 ColumnType 没有这个 deprecated 回调字段。',
    migration: '使用 column.filterDropdownProps.onOpenChange。',
  },
]

const limitationRows: GapRow[] = [
  { key: 'semantic-dom', topic: 'semantic DOM', boundary: '不能完整复刻 thead / tbody / tr 层级。', action: '用 data-grid 语义槽位做适配。' },
  { key: 'scroll-y', topic: 'scroll.y', boundary: '不支持 antd number/string max-height 语义。', action: '改成 `scroll={{ y: true }}`，表格占满父容器可用空间。' },
  { key: 'rtl', topic: 'RTL', boundary: '尚未系统处理方向、fixed、sticky 和拖拽方向。', action: '需要独立设计和回归范围。' },
]

const semanticSlotRows: SemanticSlotRow[] = [
  { key: 'root', slot: 'root', antd: '.ant-table-wrapper', dataGrid: '.dg-wrapper', note: '根元素，承载表格容器和主题变量。' },
  { key: 'title', slot: 'title', antd: '.ant-table-title', dataGrid: '.dg-title', note: '标题元素，两侧均直接落点。' },
  { key: 'content', slot: 'content', antd: '.ant-table-content', dataGrid: '.dg-grid', note: 'data-grid 的表格主体是 CSS Grid。' },
  { key: 'section', slot: 'section', antd: '.ant-table-container', dataGrid: '.dg-scroll-wrap', note: '滚动包装容器；sticky 模式使用 sticky viewport。' },
  { key: 'header-wrapper', slot: 'header.wrapper', antd: '.ant-table-thead', dataGrid: '未消费', note: 'data-grid 无独立 thead 容器，当前不为该槽位伪造 DOM 落点。' },
  { key: 'header-row', slot: 'header.row', antd: 'thead > tr', dataGrid: '表头行内所有 header cell', note: 'data-grid 无 tr，行级样式透传到同一逻辑行的所有表头单元格。' },
  { key: 'header-cell', slot: 'header.cell', antd: 'th.ant-table-cell', dataGrid: '.dg-cell-header', note: '表头单元格直接落点，包含排序状态。' },
  { key: 'body-wrapper', slot: 'body.wrapper', antd: '.ant-table-tbody', dataGrid: '未消费', note: 'data-grid 无独立 tbody 容器，当前不为该槽位伪造 DOM 落点。' },
  { key: 'body-row', slot: 'body.row', antd: 'tbody > tr', dataGrid: '表体行内所有 body cell', note: 'data-grid 无 tr，行级样式透传到同一逻辑行的所有数据单元格。' },
  { key: 'body-cell', slot: 'body.cell', antd: 'td.ant-table-cell', dataGrid: '.dg-cell-body', note: '主体单元格直接落点。' },
  { key: 'footer', slot: 'footer', antd: '.ant-table-footer', dataGrid: '.dg-footer', note: '底部元素，两侧均直接落点。' },
  { key: 'pagination-root', slot: 'pagination.root', antd: '.ant-pagination', dataGrid: '.dg-pagination', note: '分页根元素。' },
  { key: 'pagination-item', slot: 'pagination.item', antd: '.ant-pagination-item / prev / next', dataGrid: 'antd Pagination 根节点', note: '当前合并到内部 antd Pagination 组件 className/style，不逐项透传。' },
]

const semanticA11yRows: A11yRow[] = [
  { key: 'table', attr: 'role="table"（根）', antd: '天然（<table>）', dataGrid: '不输出', conclusion: '无 rowgroup / row 层级时，单独声明 role=table 不能形成有效表格语义。' },
  { key: 'rowgroup', attr: 'role="rowgroup"（thead/tbody）', antd: '天然（<thead>/<tbody>）', dataGrid: '不输出', conclusion: 'CSS Grid 路径没有 thead / tbody 容器，避免伪造不存在的层级。' },
  { key: 'row', attr: 'role="row"（tr）', antd: '天然（<tr>）', dataGrid: '不输出', conclusion: 'data-grid 的一行由多个 grid cell 直接铺开，没有可承载 role=row 的行容器。' },
  { key: 'columnheader', attr: 'role="columnheader"（th）', antd: '天然（<th>）', dataGrid: '不输出', conclusion: 'columnheader 需要位于有效 row 中，当前 DOM 结构不满足父子关系。' },
  { key: 'gridcell', attr: 'role="gridcell"（td）', antd: '天然（<td>）', dataGrid: '不输出', conclusion: 'gridcell 需要位于有效 row 中，当前 DOM 结构不满足父子关系。' },
  { key: 'rowheader', attr: 'role="rowheader"（rowScope 列）', antd: '天然（<th scope="row">）', dataGrid: '不输出', conclusion: 'rowheader 同样依赖 row 层级；data-grid 保留 rowScope 对照，但不伪造 ARIA 树。' },
  { key: 'aria-sort', attr: 'aria-sort（可排序列表头）', antd: '显式', dataGrid: '已支持', conclusion: 'Age 列排序时输出 ascending / descending；未排序时不输出属性。' },
  { key: 'aria-expanded', attr: 'aria-expanded（展开行）', antd: '显式', dataGrid: '已支持', conclusion: '展开按钮语义与 antd 对齐。' },
  { key: 'aria-label', attr: 'aria-label（表头/控件）', antd: '部分支持', dataGrid: '部分支持', conclusion: '选择控件、调整列宽控件等交互点输出明确标签。' },
  { key: 'aria-colspan', attr: 'aria-colspan（合并数据格）', antd: '天然（<td colspan>）', dataGrid: '已支持', conclusion: 'colSpan >= 2 的数据格输出 aria-colspan。' },
  { key: 'aria-rowspan', attr: 'aria-rowspan（合并数据格）', antd: '天然（<td rowspan>）', dataGrid: '已支持', conclusion: 'rowSpanTracks >= 2 的数据格输出 aria-rowspan。' },
]

export function renderIntro({ onOpen }: DocsPageContext) {
  return (
    <>
      <DocSection
        id="start"
        title="阅读路径"
        description="第一次接入时先看快速开始；迁移和排查时再进入 API、兼容矩阵和核心概念。"
      >
        <DocsDataGrid<OverviewRow>
          columns={[
            { title: '范围', dataIndex: 'area', key: 'area', width: '18%' },
            { title: '说明', dataIndex: 'purpose', key: 'purpose', width: '56%' },
            {
              title: '入口',
              dataIndex: 'entry',
              key: 'entry',
              width: '26%',
              render: (value, record) => (
                <button
                  type="button"
                  className="docs-table-action"
                  onClick={() => {
                    const target = {
                      'quick-start': 'quick-start',
                      migration: 'migrate-from-antd',
                      'table-api': 'table-api',
                      'compat-matrix': 'compat-matrix',
                      'deprecated-members': 'deprecated-antd-members',
                      architecture: 'architecture-overview',
                      compat: 'compat-matrix',
                      scroll: 'scroll-y',
                      style: 'styling-and-theme',
                    }[record.key]
                    if (target) onOpen({ label: value, kind: 'doc', value: target })
                  }}
                >
                  {value}
                </button>
              ),
            },
          ]}
          dataSource={overviewRows}
          rowKey="key"
        />
      </DocSection>
    </>
  )
}

export function renderQuickStart({ onOpen }: DocsPageContext) {
  return (
    <>
      <DocSection id="install" eyebrow="安装" title="导入组件">
        <DocsCode code={QUICK_START_INSTALL} height={100} ariaLabel="安装和导入代码" />
      </DocSection>

      <DocSection
        id="minimal"
        eyebrow="示例"
        title="最小表格"
        description="先用 columns、dataSource 和稳定 rowKey 跑通最小可用表格。"
      >
        <DocsCode code={QUICK_START_MINIMAL} height={280} ariaLabel="最小表格代码" />
      </DocSection>

      <DocSection
        id="jsx"
        eyebrow="JSX"
        title="JSX 列声明"
        description="需要和条件渲染混用时，可以改成 JSX 声明。"
      >
        <DocsCode code={JSX_COLUMNS} height={120} ariaLabel="JSX 列声明代码" />
      </DocSection>

      <DocSection id="next" eyebrow="继续" title="下一步">
        <DocsActionList
          actions={[
            { label: '打开基础表格 demo', kind: 'path', value: '/demos/basic-table' },
            { label: '看迁移指南', kind: 'doc', value: 'migrate-from-antd' },
            { label: '看 Table API', kind: 'doc', value: 'table-api' },
          ]}
          onOpen={onOpen}
        />
      </DocSection>
    </>
  )
}

export function renderMigration({ onOpen }: DocsPageContext) {
  return (
    <>
      <DocSection
        id="step-1"
        eyebrow="步骤 1"
        title="先接入 data-grid"
        description="把 antd Table 的 import 和类型 import 切到 data-grid；多数 ColumnsType、Table.Column 和 Table.ColumnGroup 写法可直接保留，列对齐值按 data-grid 类型调整。"
      >
        <DocsCode code={MIGRATION_IMPORTS} height={240} ariaLabel="迁移 import 代码" />
      </DocSection>

      <DocSection
        id="step-2"
        eyebrow="步骤 2"
        title="改滚动高度"
        description="把 antd 的 scroll.y 数字或字符串改成 data-grid 的 y:true；表格会占满父容器提供的可用空间，不再传高度值。"
      >
        <DocsCode code={MIGRATION_SCROLL} height={220} ariaLabel="迁移 scroll.y 代码" />
      </DocSection>

      <DocSection
        id="deprecated-members"
        eyebrow="迁移前检查"
        title="核对过时 antd Table 成员"
        description="迁移前先检查业务代码是否依赖 antd/rc-table 已标记过时的成员。data-grid 对这类入口只保留迁移兼容，不作为新代码推荐写法。"
      >
        <DocsNote title="重点">
          <Text code>render</Text> 返回 <Text code>{'{ children, props }'}</Text> 时，data-grid 只消费
          <Text code>children</Text>；<Text code>props</Text> 不会合并到单元格。合并格和 cell props
          改用 <Text code>column.onCell</Text>。
        </DocsNote>
        <DocsActionList
          actions={[
            { label: '查看过时成员说明', kind: 'doc', value: 'deprecated-antd-members' },
            { label: '查看兼容矩阵', kind: 'doc', value: 'compat-matrix' },
          ]}
          onOpen={onOpen}
        />
      </DocSection>
    </>
  )
}

export function renderArchitecture() {
  return (
    <>
      <DocSection
        id="layers"
        eyebrow="系统分层"
        title="四层职责"
        description="data-grid 的目标是用 CSS Grid 重做 antd Table，并保持 antd v6 的 React API 和 token 生态尽量可迁移。"
      >
        <DocsDataGrid<OverviewRow>
          columns={[
            { title: '层级', dataIndex: 'area', key: 'area', width: '20%' },
            { title: '职责', dataIndex: 'purpose', key: 'purpose', width: '60%' },
            { title: '文档入口', dataIndex: 'entry', key: 'entry', width: '20%' },
          ]}
          dataSource={[
            { key: 'render', area: '渲染层', purpose: '列轨道、表头、表体、固定列、合并和虚拟化。', entry: '渲染模型' },
            { key: 'compat', area: '兼容层', purpose: '暴露与 antd Table 尽量一致的 TableProps、ColumnType 和 JSX API。', entry: '兼容矩阵' },
            { key: 'style', area: '样式层', purpose: '复用 antd v6 token 和 CSS variables。', entry: '样式和主题' },
            { key: 'demo', area: 'demo 站点', purpose: '用左右对照验证 data-grid 与 antd 官方示例的差异。', entry: 'demo' },
          ]}
          rowKey="key"
        />
      </DocSection>

      <DocSection id="boundaries" eyebrow="产品边界" title="什么自研，什么复用">
        <ul className="docs-bullet-list">
          <li>表格核心自研：grid 渲染、列树、固定列、合并、虚拟滚动、排序、筛选、选择、展开。</li>
          <li>非表格核心复用 antd：Pagination、Spin、Tooltip、Dropdown、Empty 及其它通用控件。</li>
          <li>兼容目标以真实业务和 antd demo 为主，不追求所有历史兼容 API。</li>
        </ul>
      </DocSection>
    </>
  )
}

export function renderRenderingModel() {
  return (
    <>
      <DocSection id="css-grid" eyebrow="渲染" title="CSS Grid 是核心结构">
        <p>data-grid 不是包装原生 table，而是用 CSS Grid 明确管理列轨道、行轨道、固定列和合并单元格。这样可以在固定列、虚拟滚动和动态行高之间保持同一套布局模型。</p>
      </DocSection>
      <DocSection id="dom" eyebrow="DOM" title="DOM 形态与 antd 不完全相同">
        <DocsNote title="迁移影响">
          行和单元格相关定制优先用 <Text code>onRow</Text>、<Text code>onCell</Text>、<Text code>components</Text>、<Text code>classNames</Text> 和 <Text code>styles</Text>，不要依赖固定的 table/tr/td 层级。
        </DocsNote>
      </DocSection>
    </>
  )
}

export function renderScrollY() {
  return (
    <>
      <DocSection
        id="meaning"
        eyebrow="语义"
        title="scroll.y 只接受 true"
        description="data-grid 把 scroll.y 定义为数据区滚动模式，而不是 antd 的 max-height 数字语义。"
      >
        <DocsCode code={VIRTUAL_SCROLLING_CODE} height={220} ariaLabel="scroll.y 示例代码" />
      </DocSection>
      <DocSection id="layout" eyebrow="布局" title="高度由父容器提供">
        <DocsNote title="实践规则">
          表格会占满父容器分配给它的可用空间；把父级做成自适应剩余空间的布局，再传 <Text code>{'scroll={{ y: true }}'}</Text>。
        </DocsNote>
      </DocSection>
    </>
  )
}

export function renderApiNamespace() {
  return (
    <>
      <DocSection id="compatible" eyebrow="兼容 API" title="顶层优先保持 antd 习惯">
        <p>可迁移的表格能力保留在 Table props 和 Column props 中，例如 columns、rowSelection、expandable、pagination、sorter 和 filters。</p>
      </DocSection>
      <DocSection id="native" eyebrow="专属能力" title="data-grid 能力进入 gridOptions">
        <DocsDataGrid<ApiOptionRow>
          columns={[
            { title: '字段', dataIndex: 'field', key: 'field', width: 220 },
            { title: '类型', dataIndex: 'type', key: 'type', width: 260 },
            { title: '说明', dataIndex: 'description', key: 'description', width: 420 },
          ]}
          dataSource={gridOptionRows.slice(0, 6)}
          rowKey="key"
          scrollX={900}
        />
        <DocsCode code={GRID_OPTIONS_CODE} height={260} ariaLabel="gridOptions 示例代码" />
      </DocSection>
    </>
  )
}

export function renderFeaturePage(topic: 'columns' | 'layout' | 'scrolling' | 'interaction' | 'styling' | 'api') {
  const content = {
    columns: {
      title: '列能力入口',
      body: '列宽、固定列、隐藏列、响应式列和列默认值都以 ColumnType 为中心组织。',
      actions: [
        { label: '全固定列宽 demo', kind: 'path' as const, value: '/demos/all-columns-fixed-width' },
        { label: '固定列 demo', kind: 'path' as const, value: '/demos/fixed-columns' },
        { label: '调整列宽 demo', kind: 'path' as const, value: '/demos/resizable-columns' },
        { label: '隐藏列 demo', kind: 'path' as const, value: '/demos/hidden-columns' },
      ],
    },
    layout: {
      title: '布局能力入口',
      body: '表头、多级表头、合并单元格、summary、边框和 sticky 都落在 CSS Grid 布局模型上。',
      actions: [
        { label: '分组表头 demo', kind: 'path' as const, value: '/demos/grouped-header' },
        { label: '合并单元格 demo', kind: 'path' as const, value: '/demos/merged-cells' },
        { label: '总结栏 demo', kind: 'path' as const, value: '/demos/summary-row' },
      ],
    },
    scrolling: {
      title: '滚动和虚拟化',
      body: '大数据、固定列、页面级 sticky 和 DOM 复用都先从容器高度、rowKey 和 scroll 配置开始。',
      actions: [
        { label: '虚拟列表 demo', kind: 'path' as const, value: '/demos/virtual-list' },
        { label: 'DOM 复用 demo', kind: 'path' as const, value: '/demos/dom-recycled-virtual-list' },
        { label: '页面级 sticky demo', kind: 'path' as const, value: '/demos/page-sticky-header' },
      ],
    },
    interaction: {
      title: '交互能力入口',
      body: '选择、展开、树形、筛选排序、分页、编辑和拖拽都保留 antd 风格入口，并补充 data-grid 专属增强。',
      actions: [
        { label: '行选择 demo', kind: 'path' as const, value: '/demos/basic-row-selection' },
        { label: '展开行 demo', kind: 'path' as const, value: '/demos/expandable-rows' },
        { label: '拖拽行排序 demo', kind: 'path' as const, value: '/demos/drag-row-sorting' },
      ],
    },
    styling: {
      title: '样式和主题',
      body: '全局走 antd ConfigProvider token，局部结构差异使用 classNames 和 styles 语义槽位。',
      actions: [
        { label: 'Semantic DOM 文档', kind: 'doc' as const, value: 'semantic-dom' },
        { label: '组件主题令牌 demo', kind: 'path' as const, value: '/demos/component-theme-tokens' },
        { label: '语义化样式 demo', kind: 'path' as const, value: '/demos/semantic-styling' },
        { label: '语义化 DOM 插槽 demo', kind: 'path' as const, value: '/demos/semantic-dom-slots' },
      ],
    },
    api: {
      title: 'API 扩展点',
      body: 'JSX 列声明、components、onRow/onCell 和语义样式槽位是主要扩展路径。',
      actions: [
        { label: 'JSX 列声明 demo', kind: 'path' as const, value: '/demos/jsx-columns' },
        { label: '单元格编辑 demo', kind: 'path' as const, value: '/demos/cell-editing' },
        { label: '语义 DOM demo', kind: 'path' as const, value: '/demos/semantic-dom-slots' },
      ],
    },
  }[topic]

  return ({ onOpen }: DocsPageContext) => (
    <>
      <DocSection id="overview" eyebrow="指南" title={content.title}>
        <p>{content.body}</p>
      </DocSection>
      {topic === 'styling' ? (
        <DocSection id="theme-code" eyebrow="代码" title="ConfigProvider token">
          <DocsCode code={THEMING_CODE} height={300} ariaLabel="主题代码" />
        </DocSection>
      ) : null}
      <DocSection id="demos" eyebrow="对照" title="优先查看的 demo">
        <DocsActionList actions={content.actions} onOpen={onOpen} />
      </DocSection>
    </>
  )
}

export function renderSemanticDom({ onOpen }: DocsPageContext) {
  return (
    <>
      <DocSection
        id="slots"
        eyebrow="classNames / styles"
        title="Semantic DOM 槽位矩阵"
        description="data-grid 对齐 antd Table 的 Semantic DOM 槽位命名；CSS Grid 渲染路径不会伪造 thead、tbody、tr 这类不存在的 DOM 层级，未消费槽位会明确标出。"
      >
        <DocsDataGrid<SemanticSlotRow>
          columns={[
            { title: '槽位', dataIndex: 'slot', key: 'slot', width: 180, render: (value) => <Text code>{value}</Text> },
            { title: 'antd 落点', dataIndex: 'antd', key: 'antd', width: 240 },
            { title: 'data-grid 落点', dataIndex: 'dataGrid', key: 'dataGrid', width: 260 },
            { title: '说明', dataIndex: 'note', key: 'note', width: 420 },
          ]}
          dataSource={semanticSlotRows}
          rowKey="key"
          scrollX={1100}
        />
      </DocSection>

      <DocSection
        id="a11y"
        eyebrow="a11y"
        title="a11y 属性兼容矩阵"
        description="可在不破坏 ARIA 父子层级的前提下补齐的属性直接输出；需要 table / row 层级的角色不伪造。"
      >
        <DocsDataGrid<A11yRow>
          columns={[
            { title: '属性 / role', dataIndex: 'attr', key: 'attr', width: 260, render: (value) => <Text code>{value}</Text> },
            { title: 'antd', dataIndex: 'antd', key: 'antd', width: 220 },
            { title: 'data-grid', dataIndex: 'dataGrid', key: 'dataGrid', width: 160 },
            { title: '结论', dataIndex: 'conclusion', key: 'conclusion', width: 480 },
          ]}
          dataSource={semanticA11yRows}
          rowKey="key"
          scrollX={1120}
        />
      </DocSection>

      <DocSection id="demo" eyebrow="demo" title="交互验证">
        <DocsActionList
          actions={[
            { label: '打开 Semantic DOM demo', kind: 'path', value: '/demos/semantic-dom-slots' },
          ]}
          onOpen={onOpen}
        />
      </DocSection>
    </>
  )
}

export function renderTableApi() {
  return (
    <>
      <DocSection id="table-props" eyebrow="表格" title="Table props">
        <DocsDataGrid<PropRow>
          columns={[
            { title: '属性', dataIndex: 'field', key: 'field', width: '24%' },
            { title: '用途', dataIndex: 'purpose', key: 'purpose', width: '36%' },
            { title: '说明', dataIndex: 'note', key: 'note', width: '40%' },
          ]}
          dataSource={tablePropRows}
          rowKey="key"
        />
      </DocSection>
      <DocSection id="static" eyebrow="静态属性" title="Table 静态入口">
        <ul className="docs-bullet-list">
          <li><Text code>Table.Column</Text> / <Text code>Table.ColumnGroup</Text></li>
          <li><Text code>Table.EXPAND_COLUMN</Text> / <Text code>Table.SELECTION_COLUMN</Text></li>
          <li><Text code>Table.Summary</Text> / <Text code>Table.Summary.Row</Text> / <Text code>Table.Summary.Cell</Text></li>
          <li><Text code>Table.SELECTION_ALL</Text> / <Text code>Table.SELECTION_INVERT</Text> / <Text code>Table.SELECTION_NONE</Text></li>
        </ul>
      </DocSection>
    </>
  )
}

function apiOptionColumns() {
  return [
    { title: '字段', dataIndex: 'field', key: 'field', width: 220 },
    { title: '类型', dataIndex: 'type', key: 'type', width: 300 },
    { title: '默认值', dataIndex: 'defaultValue', key: 'defaultValue', width: 160 },
    { title: '稳定性', dataIndex: 'stability', key: 'stability', width: 120 },
    { title: '说明', dataIndex: 'description', key: 'description', width: 420 },
  ]
}

export function renderPublicApi() {
  return (
    <>
      <DocSection
        id="exports"
        eyebrow="入口"
        title="主入口导出"
        description="这些 API 从包主入口导出并面向用户承诺。"
      >
        <DocsDataGrid<ApiExportRow>
          columns={[
            { title: '名称', dataIndex: 'name', key: 'name', width: 320 },
            { title: '类型', dataIndex: 'kind', key: 'kind', width: 120 },
            { title: '稳定性', dataIndex: 'stability', key: 'stability', width: 120 },
            { title: '说明', dataIndex: 'description', key: 'description', width: 460 },
          ]}
          dataSource={publicApiRows}
          rowKey="key"
          scrollX={1020}
        />
      </DocSection>

      <DocSection
        id="native"
        eyebrow="命名空间"
        title="data-grid 专属 API"
        description="antd 没有的能力统一进入 gridOptions 或 gridColumnOptions。"
      >
        <DocsDataGrid<ApiOptionRow>
          description="表级专属能力。"
          columns={apiOptionColumns()}
          dataSource={gridOptionRows}
          rowKey="key"
          scrollX={1220}
        />
        <DocsDataGrid<ApiOptionRow>
          description="列级专属能力。"
          columns={apiOptionColumns()}
          dataSource={gridColumnOptionRows}
          rowKey="key"
          scrollX={1220}
        />
      </DocSection>

      <DocSection id="internal" eyebrow="边界" title="拖拽 hooks 不作为公开 API">
        <DocsNote title="使用方式">
          拖拽排序通过 <Text code>gridOptions.rowDragSort</Text> 和
          <Text code>gridOptions.columnDragSort</Text> 启用；列锁定写在
          <Text code>column.gridColumnOptions.dragColumnLock</Text>。内部 hook 不从包主入口导出，
          demo 站点也不得直接导入内部 hook。
        </DocsNote>
      </DocSection>
    </>
  )
}

export function renderColumnApi() {
  return (
    <DocSection id="column-props" eyebrow="列" title="Column props">
      <DocsDataGrid<PropRow>
        columns={[
          { title: '属性', dataIndex: 'field', key: 'field', width: '30%' },
          { title: '用途', dataIndex: 'purpose', key: 'purpose', width: '36%' },
          { title: '说明', dataIndex: 'note', key: 'note', width: '34%' },
        ]}
        dataSource={columnPropRows}
        rowKey="key"
      />
    </DocSection>
  )
}

export function renderCompatMatrix() {
  return (
    <DocSection id="matrix" eyebrow="参考" title="兼容状态摘要">
      <DocsDataGrid<CompatRow>
        description="完整证据继续保留在 docs/reference/compat-matrix.md；过时成员另见“过时成员”。"
        columns={[
          { title: 'API', dataIndex: 'api', key: 'api', width: '26%' },
          { title: '支持度', dataIndex: 'status', key: 'status', width: '18%' },
          { title: '说明', dataIndex: 'detail', key: 'detail', width: '56%' },
        ]}
        dataSource={compatRows}
        rowKey="key"
      />
    </DocSection>
  )
}

export function renderDeprecatedAntdMembers({ onOpen }: DocsPageContext) {
  return (
    <>
      <DocSection
        id="policy"
        eyebrow="迁移策略"
        title="只为迁移保留，不作为新代码入口"
        description="data-grid 优先兼容 antd v6 当前公共 API。已被 antd/rc-table 标记为 deprecated 的成员会按迁移价值选择保留、降级或不暴露。"
      >
        <DocsNote title="判定方式">
          旧成员如果依赖原生 <Text code>table/tr/td</Text> DOM，data-grid 只保留可表达的语义；
          不能保留的 DOM 细节会明确忽略或引导到当前 API。
        </DocsNote>
      </DocSection>

      <DocSection
        id="members"
        eyebrow="成员"
        title="过时成员支持状态"
        description="这里列的是源码当前实际暴露或消费的旧入口。未暴露项不会被业务代码当作 data-grid API 使用。"
      >
        <DocsDataGrid<DeprecatedRow>
          columns={[
            { title: '成员', dataIndex: 'member', key: 'member', width: 280, render: (value) => <Text code>{value}</Text> },
            { title: '支持', dataIndex: 'support', key: 'support', width: 140 },
            { title: 'data-grid 行为', dataIndex: 'behavior', key: 'behavior', width: 440 },
            { title: '迁移建议', dataIndex: 'migration', key: 'migration', width: 420 },
          ]}
          dataSource={deprecatedRows}
          rowKey="key"
          scrollX={1280}
        />
      </DocSection>

      <DocSection
        id="dom"
        eyebrow="DOM 差异"
        title="旧写法常和原生表格 DOM 绑定"
        description="data-grid 的主体是 CSS Grid div 结构，不存在完整 table/tr/td 层级。"
      >
        <ul className="docs-bullet-list">
          <li><Text code>components.body.cell</Text> 替换单元格内容层，不替换整个 <Text code>td</Text>。</li>
          <li><Text code>onRow</Text> / <Text code>onHeaderRow</Text> 表达行级 props 意图，实际会分发到同一逻辑行的 cells 或行包装层。</li>
          <li><Text code>column.className</Text> / <Text code>column.style</Text> 合并到 data-grid cell div，不是原生 <Text code>td</Text> / <Text code>th</Text>。</li>
          <li>依赖 <Text code>tbody &gt; tr &gt; td</Text> 的选择器需要迁移到 <Text code>.dg-*</Text> 或已输出的 <Text code>.ant-table-*</Text> alias。</li>
        </ul>
      </DocSection>

      <DocSection
        id="not-deprecated"
        eyebrow="容易混淆"
        title="非 antd deprecated 的旧写法"
      >
        <DocsNote title="scroll.y">
          <Text code>{'scroll={{ y: number }}'}</Text> 是 antd/rc-table 的 max-height 语义；
          data-grid 不支持，必须改为 <Text code>{'scroll={{ y: true }}'}</Text> 并由父容器提供高度。
        </DocsNote>
        <DocsNote title="size compact">
          antd Table 本身没有 <Text code>compact</Text> size。data-grid 保留它用于全局 size 兜底，并映射为
          {' '}<Text code>small</Text> 视觉。
        </DocsNote>
      </DocSection>

      <DocSection id="related" eyebrow="关联" title="继续核对">
        <DocsActionList
          actions={[
            { label: '兼容矩阵', kind: 'doc', value: 'compat-matrix' },
            { label: 'Table API', kind: 'doc', value: 'table-api' },
            { label: 'Column API', kind: 'doc', value: 'column-api' },
          ]}
          onOpen={onOpen}
        />
      </DocSection>
    </>
  )
}

export function renderKnownLimitations() {
  return (
    <>
      <DocSection id="boundaries" eyebrow="边界" title="架构边界和兼容缺口">
        <DocsDataGrid<GapRow>
          columns={[
            { title: '主题', dataIndex: 'topic', key: 'topic', width: '22%' },
            { title: '边界', dataIndex: 'boundary', key: 'boundary', width: '42%' },
            { title: '处理方式', dataIndex: 'action', key: 'action', width: '36%' },
          ]}
          dataSource={limitationRows}
          rowKey="key"
        />
      </DocSection>
      <DocSection id="backlog" eyebrow="Backlog" title="可实施兼容项">
        <ul className="docs-bullet-list">
          <li><Text code>expandable.columnTitle</Text>、<Text code>expandable.fixed</Text></li>
          <li><Text code>column.filtered</Text>、<Text code>column.sortIcon</Text>、<Text code>column.filterResetToDefaultFilteredValue</Text></li>
          <li><Text code>filterDropdownProps</Text> 更完整透传。</li>
          <li><Text code>dataIndex</Text> 的 DeepNamePath 类型增强。</li>
          <li><Text code>sticky.offsetSummary</Text></li>
        </ul>
      </DocSection>
    </>
  )
}

export function renderGridOptions() {
  return (
    <>
      <DocSection
        id="namespace"
        eyebrow="命名空间"
        title="data-grid 专属能力进入 gridOptions"
        description="这些能力不是 antd Table 顶层兼容面的一部分，放入 gridOptions 可以避免和兼容 API 混淆。"
      >
        <DocsCode code={GRID_OPTIONS_CODE} height={260} ariaLabel="gridOptions 示例代码" />
      </DocSection>
      <DocSection id="examples" eyebrow="表级" title="gridOptions 成员">
        <DocsDataGrid<ApiOptionRow>
          columns={apiOptionColumns()}
          dataSource={gridOptionRows}
          rowKey="key"
          scrollX={1220}
        />
      </DocSection>
      <DocSection id="selection" eyebrow="选择" title="gridOptions.selection">
        <DocsDataGrid<ApiOptionRow>
          columns={apiOptionColumns()}
          dataSource={selectionOptionRows}
          rowKey="key"
          scrollX={1220}
        />
      </DocSection>
      <DocSection id="scrollbar" eyebrow="滚动条" title="scrollBarFoldMode">
        <DocsDataGrid<ApiOptionRow>
          columns={apiOptionColumns()}
          dataSource={scrollBarFoldRows}
          rowKey="key"
          scrollX={1220}
        />
      </DocSection>
      <DocSection id="column-options" eyebrow="列级" title="gridColumnOptions">
        <DocsDataGrid<ApiOptionRow>
          columns={apiOptionColumns()}
          dataSource={gridColumnOptionRows}
          rowKey="key"
          scrollX={1220}
        />
        <DocsCode code={GRID_COLUMN_OPTIONS_CODE} height={300} ariaLabel="gridColumnOptions 示例代码" />
      </DocSection>
      <DocSection id="recycling" eyebrow="虚拟化" title="recycling 渲染模式">
        <DocsNote title="使用条件">
          <Text code>virtualizationMode: 'recycling'</Text> 只在 <Text code>virtual</Text> 与
          <Text code>{'scroll={{ y: true }}'}</Text> 同时启用时生效。普通业务优先使用默认
          <Text code>standard</Text>，只有超大表格或低层 DOM 集成需要 recycling。
        </DocsNote>
        <DocsCode code={RECYCLING_CODE} height={260} ariaLabel="recycling 虚拟化示例代码" />
      </DocSection>
    </>
  )
}
