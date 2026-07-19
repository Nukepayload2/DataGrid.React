import { Table as AntdTable, Typography } from 'antd'
import type { TableColumnsType } from 'antd'
import { Table as GridTable } from '../table'
import type { ColumnType } from '../table'
import { SplitDemo } from '../demos/_compare/SplitDemo'
import {
  ApiRefTable,
  DocSection,
  DocsActionList,
  DocsCode,
  DocsDataGrid,
  DocsNote,
  getApiMembers,
} from './components'
import { GLOSSARY } from './glossary'
import { docsScope } from './liveScope'
import type { DocsPageContext } from './types'

const { Text } = Typography

interface OverviewRow {
  key: string
  area: string
  purpose: string
  entry: string
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
{/* 表格会占满父容器提供的可用空间；scroll.y 只负责打开数据区域模式。 */}
<Table columns={columns} dataSource={rows} scroll={{ y: true, x: 1200 }} />`

// --- 迁移活对照：scroll.y 语义差异 ----------------------------------------
// 在 docs 内容区直接渲染两张真实表格，让读者一眼看清 antd 数字 max-height
// 语义与 data-grid 数据区域模式（父容器高度驱动）的差别。
// 复用示例区 SplitDemo 布局（pure CSS flex-wrap，docs 窄列自动竖排）。

interface MigrationRow {
  key: string | number
  name: string
  age: number
  address: string
}

const migrationCompareRows: MigrationRow[] = Array.from({ length: 50 }).map((_, i) => ({
  key: i,
  name: `Edward King ${i}`,
  age: 32,
  address: `London, Park Lane no. ${i}`,
}))

const migrationCompareColumns: ColumnType<MigrationRow>[] = [
  { title: 'Name', dataIndex: 'name', width: 140 },
  { title: 'Age', dataIndex: 'age', width: 70 },
  { title: 'Address', dataIndex: 'address' },
]

const migrationCompareAntdColumns: TableColumnsType<MigrationRow> = [
  { title: 'Name', dataIndex: 'name', width: 140 },
  { title: 'Age', dataIndex: 'age', width: 70 },
  { title: 'Address', dataIndex: 'address' },
]

/**
 * 迁移活对照：左侧 data-grid 用 `scroll={{ y: true }}` + 固定高度父容器；
 * 右侧 antd 用 `scroll={{ y: 280 }}` 数字 max-height。两侧同数据同列，
 * 视觉与代码差异同时可见。
 */
function MigrationScrollCompare() {
  return (
    <SplitDemo
      minPaneWidth={360}
      // 静态插图：两侧高度都由组件自身决定（左 data-grid 父容器固定 320px、
      // 右 antd scroll.y: 280），不应随顶栏全局 Virtual 开关改变可用高度。
      virtualizable={false}
      leftTitle="data-grid：y: true + 父容器高度"
      rightTitle="antd：y: 280（max-height）"
      left={
        // data-grid 数据区域模式：父容器分配 320px，表格填满；scroll.y 只是开关。
        <div style={{ height: 320 }}>
          <GridTable<MigrationRow>
            columns={migrationCompareColumns}
            dataSource={migrationCompareRows}
            rowKey="key"
            scroll={{ y: true }}
            pagination={false}
            size="small"
            bordered
          />
        </div>
      }
      right={
        // antd 数字 max-height：表体最高 280px；父容器无需约束。
        <AntdTable<MigrationRow>
          columns={migrationCompareAntdColumns}
          dataSource={migrationCompareRows}
          rowKey="key"
          scroll={{ y: 280 }}
          pagination={false}
          size="small"
          bordered
        />
      }
    >
      <strong>差异要点：</strong>
      左侧 <Text code>{'scroll={{ y: true }}'}</Text> 是数据区域模式开关，高度由父容器
      <Text code>{'style={{ height: 320 }}'}</Text> 决定，表格填满；右侧 antd
      <Text code>{'scroll={{ y: 280 }}'}</Text> 是表体 max-height，与父容器无关。迁移时必须同时调整父容器布局。
    </SplitDemo>
  )
}

const QUICK_START_MINIMAL = `import { Table } from '@nukepayload2/data-grid'
import type { ColumnType } from '@nukepayload2/data-grid'

interface Record {
  key: string
  name: string
  age: number
}

const columns: ColumnType<Record>[] = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Age', dataIndex: 'age', key: 'age' },
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

const compatRows: CompatRow[] = [
  { key: 'base', api: 'dataSource / columns / rowKey', status: '完全兼容', detail: '基础数据、列定义和行 key 维持 antd 使用习惯。' },
  { key: 'selection', api: 'rowSelection', status: '部分兼容', detail: '常用选择、受控键、自定义选择项和 renderCell 已覆盖；DOM 形态存在适配差异。具体过时成员（如 onSelectMultiple）见过时成员页。' },
  { key: 'expandable', api: 'expandable', status: '部分兼容', detail: '展开行、默认展开和 expandRowByClick 已覆盖；columnTitle / fixed 仍是 backlog；expandedRowOffset 见过时成员页。' },
  { key: 'scroll', api: 'scroll', status: '部分兼容', detail: 'x 支持常用形态；y 只接受 true（数据区域模式，高度由父容器驱动）。详见 #/docs/scroll-y。' },
  { key: 'components', api: 'components', status: '部分兼容', detail: '支持 body.cell、body.row；header.cell、wrapper / table 级替换不是当前公开能力。落点差异见 Semantic DOM 页。' },
  { key: 'locale', api: 'locale', status: '部分兼容', detail: '表体空态、筛选下拉、选择菜单、排序和展开文案已接入 antd locale 链路；filterCheckall 兼容别名见过时成员页。' },
  { key: 'sticky', api: 'sticky', status: '部分兼容', detail: '表头吸顶与 offsetHeader 已支持；offsetSummary 仍是 backlog。' },
  { key: 'summary', api: 'Table.Summary', status: '完全兼容', detail: '以 Table.Summary 容器 + Row + Cell 三段组合声明汇总栏（与 antd v6 对齐）。' },
  { key: 'pagination', api: 'pagination', status: '完全兼容', detail: '复用 antd Pagination 组件，props 直接透传。' },
  { key: 'size', api: 'size', status: '部分兼容', detail: '合法取值 large / middle / medium / small / compact；缺省视觉等价 large（与 antd v6 默认一致）。middle ≡ medium、compact ≡ small 视觉等价；antd v3 旧名 default 不支持。' },
]

const deprecatedRows: DeprecatedRow[] = [
  {
    key: 'rendered-cell',
    member: 'column.render 返回 { children, props }',
    support: '部分兼容',
    behavior: '识别 legacy RenderedCell 对象（render 返回的 `{ children, props }` 旧形态），但只消费 children；props 不会合并到单元格。',
    migration: '返回普通 ReactNode；合并格和单元格 props 改用 column.onCell。',
  },
  {
    key: 'rendered-cell-props',
    member: 'RenderedCell.props',
    support: '保留类型但忽略',
    behavior: 'props 字段仍在类型里，但 data-grid 不会合并到单元格。',
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
  { key: 'scroll-y', topic: 'scroll.y', boundary: '不支持 antd number/string max-height 语义。', action: '改成 `scroll={{ y: true }}`，表格占满父容器可用空间（详见 #/docs/scroll-y）。' },
  { key: 'rtl', topic: 'RTL', boundary: '尚未系统处理方向、fixed、sticky 和拖拽方向。', action: '需要独立设计和回归范围。' },
]

const semanticSlotRows: SemanticSlotRow[] = [
  { key: 'root', slot: 'root', antd: '.ant-table-wrapper', dataGrid: '根容器', note: '承载表格容器与主题变量。' },
  { key: 'title', slot: 'title', antd: '.ant-table-title', dataGrid: '标题容器', note: '标题元素，两侧均直接落点。' },
  { key: 'content', slot: 'content', antd: '.ant-table-content', dataGrid: '表格主体', note: 'data-grid 的表格主体是 CSS Grid 容器。' },
  { key: 'section', slot: 'section', antd: '.ant-table-container', dataGrid: '滚动包装容器', note: 'sticky 模式使用 sticky viewport。' },
  { key: 'header-wrapper', slot: 'header.wrapper', antd: '.ant-table-thead', dataGrid: '未消费', note: '不为该槽位伪造 DOM 落点。' },
  { key: 'header-row', slot: 'header.row', antd: 'thead > tr', dataGrid: '表头行的全部单元格', note: '行级样式会透传到同一行的全部表头单元格。' },
  { key: 'header-cell', slot: 'header.cell', antd: 'th.ant-table-cell', dataGrid: '表头单元格', note: '直接落点，包含排序状态。' },
  { key: 'body-wrapper', slot: 'body.wrapper', antd: '.ant-table-tbody', dataGrid: '未消费', note: '不为该槽位伪造 DOM 落点。' },
  { key: 'body-row', slot: 'body.row', antd: 'tbody > tr', dataGrid: '表体行的全部单元格', note: '行级样式会透传到同一行的全部数据单元格。' },
  { key: 'body-cell', slot: 'body.cell', antd: 'td.ant-table-cell', dataGrid: '表体单元格', note: '主体单元格直接落点。' },
  { key: 'footer', slot: 'footer', antd: '.ant-table-footer', dataGrid: '底部容器', note: '底部元素，两侧均直接落点。' },
  { key: 'pagination-root', slot: 'pagination.root', antd: '.ant-pagination', dataGrid: '分页根容器', note: '分页根元素。' },
  { key: 'pagination-item', slot: 'pagination.item', antd: '.ant-pagination-item / prev / next', dataGrid: 'antd Pagination 根节点', note: '合并到 antd Pagination 组件的 className / style，不逐项透传。' },
]

const semanticA11yRows: A11yRow[] = [
  { key: 'table', attr: 'role="table"（根）', antd: '天然（<table>）', dataGrid: '不输出', conclusion: '不支持。' },
  { key: 'rowgroup', attr: 'role="rowgroup"（thead/tbody）', antd: '天然（<thead>/<tbody>）', dataGrid: '不输出', conclusion: '不支持。' },
  { key: 'row', attr: 'role="row"（tr）', antd: '天然（<tr>）', dataGrid: '不输出', conclusion: '不支持。' },
  { key: 'columnheader', attr: 'role="columnheader"（th）', antd: '天然（<th>）', dataGrid: '不输出', conclusion: '不支持。' },
  { key: 'gridcell', attr: 'role="gridcell"（td）', antd: '天然（<td>）', dataGrid: '不输出', conclusion: '不支持。' },
  { key: 'rowheader', attr: 'role="rowheader"（rowScope 列）', antd: '天然（<th scope="row">）', dataGrid: '不输出', conclusion: '不支持。' },
  { key: 'aria-sort', attr: 'aria-sort（可排序列表头）', antd: '显式', dataGrid: '已支持', conclusion: '支持。可排序列表头按排序状态输出 ascending / descending。' },
  { key: 'aria-expanded', attr: 'aria-expanded（展开行）', antd: '显式', dataGrid: '已支持', conclusion: '支持。展开按钮语义与 antd 对齐。' },
  { key: 'aria-label', attr: 'aria-label（表头/控件）', antd: '部分支持', dataGrid: '部分支持', conclusion: '部分支持。选择、列宽等交互控件输出明确标签。' },
  { key: 'aria-colspan', attr: 'aria-colspan（合并数据格）', antd: '天然（<td colspan>）', dataGrid: '已支持', conclusion: '支持。colSpan >= 2 的合并数据格输出。' },
  { key: 'aria-rowspan', attr: 'aria-rowspan（合并数据格）', antd: '天然（<td rowspan>）', dataGrid: '已支持', conclusion: '支持。rowSpan >= 2 的合并数据格输出。' },
]

export function renderIntro({ onOpen }: DocsPageContext) {
  return (
    <>
      <DocSection
        id="what-is"
        eyebrow="data-grid 是什么"
        title="用 CSS Grid 重做的 React 表格组件"
        description="data-grid 把表格布局交给 CSS Grid——不再输出原生 table / thead / tbody / tr 结构，让多级表头、合并单元格、固定列、动态行高这些原本要互相迁就的能力可以在同一套布局下共存，并原生支持大数据量虚拟滚动、列宽拖拽、行/列拖拽排序。"
      >
        <p>
          <Text strong>适合</Text>：多级表头 + 合并 + 固定列组合、超大数据量（万行级）、动态行高、列宽拖拽、行/列拖拽排序等真实业务常见但原 React 表格库难处理的场景。
        </p>
        <p>
          <Text strong>不追求</Text>：完整复刻 antd Table 全量历史 API；输出原生 <Text code>{'<table>'}</Text> / <Text code>{'<thead>'}</Text> / <Text code>{'<tbody>'}</Text> / <Text code>{'<tr>'}</Text> DOM（爬虫、第三方表格插件按 <Text code>tbody tr td</Text> 写的样式选择器会失效）；伪造完整 ARIA table / row / rowgroup role 树；RTL 系统支持。
        </p>
        <p>
          如果你已熟悉 antd Table，多数顶层 props 和 Column 字段可以平滑迁移（详见 <a href="#/docs/migrate-from-antd">从 antd 迁移</a>）；如果你是新接入，从下面的最小例子开始即可。
        </p>
      </DocSection>

      <DocSection
        id="minimal"
        eyebrow="最小例子"
        title="一段代码跑通最小表格"
        description="columns + dataSource + 稳定 rowKey 三件套就能跑通；下方代码可直接编辑，活预览实时反映修改。"
      >
        <DocsCode
          code={QUICK_START_MINIMAL}
          editable
          scope={docsScope}
          height={280}
          ariaLabel="最小表格代码"
        />
      </DocSection>

      <DocSection
        id="paths"
        eyebrow="下一步"
        title="选一条主路径继续"
        description="两条路径覆盖最常见的两种使用场景；按当前需要选一条即可。"
      >
        <DocsActionList
          actions={[
            { label: '快速用（5 分钟跑通基础）', kind: 'doc', value: 'quick-start' },
            { label: '从 antd Table 迁移', kind: 'doc', value: 'migrate-from-antd' },
          ]}
          onOpen={onOpen}
        />
      </DocSection>

      <DocSection
        id="glossary"
        eyebrow="术语"
        title="术语速查"
        description="本站用到的关键术语统一写法；遇到同物异名时以这里为准。"
      >
        <ul className="docs-bullet-list">
          <li>
            <Text strong>{GLOSSARY.dataAreaMode.canonical}</Text>：{GLOSSARY.dataAreaMode.summary}
          </li>
          <li>
            <Text strong>{GLOSSARY.slot.canonical}</Text>：{GLOSSARY.slot.summary}
          </li>
          <li>
            <Text strong>{GLOSSARY.deprecatedMember.canonical}</Text>：{GLOSSARY.deprecatedMember.summary}
          </li>
          <li>
            <Text strong>{GLOSSARY.escapeHatch.canonical}</Text>：{GLOSSARY.escapeHatch.summary}
          </li>
          <li>
            <Text strong>{GLOSSARY.compatApi.canonical}</Text>：{GLOSSARY.compatApi.summary}
          </li>
          <li>
            <Text strong>{GLOSSARY.rcTable.canonical}</Text>：{GLOSSARY.rcTable.summary}
          </li>
          <li>
            <Text strong>{GLOSSARY.sentinelColumn.canonical}</Text>：{GLOSSARY.sentinelColumn.summary}
          </li>
          <li>
            <Text strong>{GLOSSARY.configProviderToken.canonical}</Text>：{GLOSSARY.configProviderToken.summary}
          </li>
          <li>
            <Text strong>{GLOSSARY.renderedCell.canonical}</Text>：{GLOSSARY.renderedCell.summary}
          </li>
          <li>
            <Text strong>{GLOSSARY.summaryThreePart.canonical}</Text>：{GLOSSARY.summaryThreePart.summary}
          </li>
        </ul>
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
        title="最小表格（可编辑）"
        description="先用 columns、dataSource 和稳定 rowKey 跑通最小可用表格。下方代码可直接编辑并应用，活预览会实时反映修改。"
      >
        <DocsCode
          code={QUICK_START_MINIMAL}
          editable
          scope={docsScope}
          height={280}
          ariaLabel="最小表格代码"
        />
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
        <div style={{ margin: '20px 0' }}>
          <div
            style={{
              display: 'inline-block',
              padding: '2px 8px',
              marginBottom: 10,
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--docs-primary-text, #fff)',
              background: 'var(--docs-primary)',
              borderRadius: 3,
            }}
          >
            活对照
          </div>
          <MigrationScrollCompare />
        </div>
        <DocsNote title="父容器必须先有高度">
          <Text code>{'scroll={{ y: true }}'}</Text> 只打开数据区域模式，高度由父容器决定。如果父容器没有约束高度，表格会随内容无限撑高，看上去“没生效”。常见做法：给父级
          <Text code>flex: 1</Text> + <Text code>min-height: 0</Text>，或直接固定高度。
        </DocsNote>
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
            { label: '动手前先看选型页', kind: 'doc', value: 'when-to-migrate' },
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
            { key: 'compat', area: '兼容层', purpose: '暴露 TableProps、ColumnType 和 JSX API，与 antd Table 同名同义以便直接迁移。', entry: '兼容矩阵' },
            { key: 'style', area: '样式层', purpose: '复用 antd v6 token 和 CSS variables。', entry: '样式和主题' },
            { key: 'demo', area: 'demo 站点', purpose: '用左右对照验证 data-grid 与 antd 官方示例的差异。', entry: 'demo' },
          ]}
          rowKey="key"
        />
      </DocSection>

      <DocSection id="boundaries" eyebrow="产品边界" title="什么自研，什么复用">
        <ul className="docs-bullet-list">
          <li>表格核心自研：多级表头、固定列、合并、虚拟滚动、排序、筛选、选择、展开。</li>
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
        description="data-grid 把 scroll.y 定义为数据区域模式，而不是 antd 的 max-height 数字语义。"
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

export function renderApiNamespace({ onOpen }: DocsPageContext) {
  return (
    <>
      <DocSection
        id="compatible"
        eyebrow="分工"
        title="兼容 API 留顶层，专属能力进命名空间"
        description="data-grid 的 API 表面分为两层：可迁移的 antd Table 能力留在顶层 Table props / Column props，data-grid 独有的能力（行高模型、列宽拖拽、原生选择、行/列拖拽排序、recycling 虚拟化）统一进入 gridOptions 与 gridColumnOptions 命名空间。这样 antd 用户能直接复用熟悉的字段，新能力也不会污染兼容层。"
      >
        <DocsNote title="判定规则">
          <ul className="docs-bullet-list">
            <li>
              <Text code>TableProps.*</Text> / <Text code>ColumnType.*</Text>：与 antd v6 同名同义的字段（columns、dataSource、rowKey、rowSelection、expandable、pagination、scroll、sorter、filters、components、classNames、styles、sticky、onRow、onHeaderRow、rowClassName、loading、bordered、size 等）。
            </li>
            <li>
              <Text code>gridOptions.*</Text>：表级专属能力 — 行高模型、列宽拖拽、悬浮滚动条策略、原生选择、行/列拖拽排序、虚拟化模式。
            </li>
            <li>
              <Text code>column.gridColumnOptions.*</Text>：列级专属能力 — 列拖拽锁定与 recycling 虚拟化的逃逸舱（escape-hatch）回调。
            </li>
          </ul>
        </DocsNote>
        <DocsCode code={GRID_OPTIONS_CODE} height={260} ariaLabel="gridOptions 示例代码" />
      </DocSection>
      <DocSection id="native" eyebrow="参考入口" title="去看完整清单">
        <p>
          命名空间成员的字段、类型、签名、默认值与详细语义在参考页统一维护，不在本概念页重复罗列。
        </p>
        <DocsActionList
          actions={[
            { label: 'Table API 参考页', kind: 'doc', value: 'table-api' },
            { label: 'Column API 参考页', kind: 'doc', value: 'column-api' },
            { label: 'gridOptions / gridColumnOptions 参考页', kind: 'doc', value: 'grid-options' },
            { label: '公开导出清单', kind: 'doc', value: 'public-api' },
          ]}
          onOpen={onOpen}
        />
      </DocSection>
    </>
  )
}

const featureRows: OverviewRow[] = [
  {
    key: 'columns',
    area: '列',
    purpose:
      '列宽、固定列、隐藏列、响应式列与列默认值都收敛到 ColumnType 同一个列定义上配置，不需要切换 API 面；data-grid 专属列级能力（拖拽锁定、recycling 虚拟化逃逸舱回调）归 gridColumnOptions。',
    entry: 'Column API · gridOptions',
  },
  {
    key: 'layout',
    area: '布局',
    purpose:
      '多级表头、合并单元格、summary 与 sticky 共用 CSS Grid 布局模型，因此可以自由组合而不会互相拆台；需要局部结构差异时优先用 classNames / styles 的语义槽位。',
    entry: '渲染模型 · Semantic DOM',
  },
  {
    key: 'interaction',
    area: '交互',
    purpose:
      '行选择、展开、树形、筛选排序、分页、编辑保留 antd 风格的 props；行 / 列拖拽排序等原生增强进入 gridOptions，不污染兼容 API。',
    entry: '兼容矩阵 · gridOptions',
  },
  {
    key: 'api-extension',
    area: 'API 扩展点',
    purpose:
      '扩展 data-grid 的主要路径：JSX 列声明、components 按槽位替换、onRow / onCell 行级钩子与 classNames / styles 语义槽位；字段级细节去 Table / Column API 参考页。',
    entry: 'Table API · Column API · Semantic DOM',
  },
]

export function renderFeatures({ onOpen }: DocsPageContext) {
  return (
    <>
      <DocSection
        id="overview"
        eyebrow="能力总览"
        title="data-grid 能力清单"
        description="data-grid 的能力按 4 个域组织：列、布局、交互、API 扩展点。下表是每个域的一句话说明与主要入口；具体 demo 与参考页在下方按域分组列出。"
      >
        <DocsDataGrid<OverviewRow>
          columns={[
            { title: '能力域', dataIndex: 'area', key: 'area', width: '16%' },
            { title: '说明', dataIndex: 'purpose', key: 'purpose', width: '64%' },
            { title: '主要入口', dataIndex: 'entry', key: 'entry', width: '20%' },
          ]}
          dataSource={featureRows}
          rowKey="key"
        />
      </DocSection>

      <DocSection id="demos" eyebrow="demo" title="按能力域分类的 demo 入口">
        <p>
          <Text strong>列</Text>：列宽、固定列、隐藏列与列默认值等列级能力。
        </p>
        <DocsActionList
          actions={[
            { label: '全固定列宽 demo', kind: 'path', value: '/demos/all-columns-fixed-width' },
            { label: '固定列 demo', kind: 'path', value: '/demos/fixed-columns' },
            { label: '调整列宽 demo', kind: 'path', value: '/demos/resizable-columns' },
            { label: '隐藏列 demo', kind: 'path', value: '/demos/hidden-columns' },
          ]}
          onOpen={onOpen}
        />
        <p>
          <Text strong>布局</Text>：多级表头、合并单元格、summary 等共用 CSS Grid 布局模型的能力。
        </p>
        <DocsActionList
          actions={[
            { label: '分组表头 demo', kind: 'path', value: '/demos/grouped-header' },
            { label: '合并单元格 demo', kind: 'path', value: '/demos/merged-cells' },
            { label: '总结栏 demo', kind: 'path', value: '/demos/summary-row' },
          ]}
          onOpen={onOpen}
        />
        <p>
          <Text strong>交互</Text>：行选择、展开、拖拽排序等保留 antd 风格的交互能力。
        </p>
        <DocsActionList
          actions={[
            { label: '行选择 demo', kind: 'path', value: '/demos/basic-row-selection' },
            { label: '展开行 demo', kind: 'path', value: '/demos/expandable-rows' },
            { label: '拖拽行排序 demo', kind: 'path', value: '/demos/drag-row-sorting' },
          ]}
          onOpen={onOpen}
        />
        <p>
          <Text strong>API 扩展点</Text>：JSX 列声明、components 替换、行级钩子等扩展路径。
        </p>
        <DocsActionList
          actions={[
            { label: 'JSX 列声明 demo', kind: 'path', value: '/demos/jsx-columns' },
            { label: '单元格编辑 demo', kind: 'path', value: '/demos/cell-editing' },
            { label: '语义 DOM demo', kind: 'path', value: '/demos/semantic-dom-slots' },
          ]}
          onOpen={onOpen}
        />
      </DocSection>

      <DocSection id="references" eyebrow="交叉参考" title="相关文档">
        <DocsActionList
          actions={[
            { label: 'Table API', kind: 'doc', value: 'table-api' },
            { label: 'Column API', kind: 'doc', value: 'column-api' },
            { label: 'gridOptions', kind: 'doc', value: 'grid-options' },
            { label: '渲染模型', kind: 'doc', value: 'rendering-model' },
            { label: 'Semantic DOM', kind: 'doc', value: 'semantic-dom' },
            { label: '兼容矩阵', kind: 'doc', value: 'compat-matrix' },
          ]}
          onOpen={onOpen}
        />
      </DocSection>
    </>
  )
}

export function renderScrolling({ onOpen }: DocsPageContext) {
  return (
    <>
      <DocSection id="overview" eyebrow="指南" title="滚动和虚拟化">
        <p>
          滚动能力分两层：常规 <Text code>{'scroll={{ x, y }}'}</Text> 覆盖大部分场景；超大数据量时再启用 <Text code>virtual</Text>，必要时切到 <Text code>recycling</Text> 虚拟化走 DOM 复用路径。所有路径都要求父容器有明确高度。
        </p>
        <p>
          <Text code>scroll.y</Text> 只接受 <Text code>true</Text>（数据区域模式，高度由父容器驱动，不接受 antd 的 number/string max-height）。详见{' '}
          <a href="#/docs/scroll-y">scroll.y 语义页</a>。
        </p>
      </DocSection>
      <DocSection id="demos" eyebrow="对照" title="优先查看的 demo">
        <DocsActionList
          actions={[
            { label: '虚拟列表 demo', kind: 'path', value: '/demos/virtual-list' },
            { label: 'DOM 复用 demo', kind: 'path', value: '/demos/dom-recycled-virtual-list' },
            { label: '页面级 sticky demo', kind: 'path', value: '/demos/page-sticky-header' },
          ]}
          onOpen={onOpen}
        />
      </DocSection>
      <DocSection id="references" eyebrow="交叉参考" title="相关文档">
        <DocsActionList
          actions={[
            { label: 'scroll.y 语义', kind: 'doc', value: 'scroll-y' },
            { label: 'gridOptions（VirtualizationMode）', kind: 'doc', value: 'grid-options' },
          ]}
          onOpen={onOpen}
        />
      </DocSection>
    </>
  )
}

export function renderStyling({ onOpen }: DocsPageContext) {
  return (
    <>
      <DocSection id="overview" eyebrow="指南" title="样式和主题">
        <p>
          全局主题走 antd <Text code>ConfigProvider</Text> 的 Table token，data-grid 复用整套 token 并把 CSS 变量映射到单元格、表头、边框等视觉模块。局部结构差异通过 <Text code>classNames</Text> / <Text code>styles</Text> 的语义槽位覆盖。
        </p>
        <p>
          槽位落点与 a11y 兼容状态见 Semantic DOM 页；主题编辑器在顶栏 Modal，可实时预览 token 改动。
        </p>
      </DocSection>
      <DocSection
        id="theme-code"
        eyebrow="代码"
        title="ConfigProvider token"
        description="ConfigProvider token 是 antd 主题系统的设计令牌（design token），通过 `<ConfigProvider theme={{ token: {...} }}>` 注入；data-grid 复用同一套 token 以保持视觉一致。"
      >
        <DocsCode code={THEMING_CODE} height={300} ariaLabel="主题代码" />
      </DocSection>
      <DocSection id="demos" eyebrow="对照" title="优先查看的 demo">
        <DocsActionList
          actions={[
            { label: 'Semantic DOM 文档', kind: 'doc', value: 'semantic-dom' },
            { label: '组件主题令牌 demo', kind: 'path', value: '/demos/component-theme-tokens' },
            { label: '语义化样式 demo', kind: 'path', value: '/demos/semantic-styling' },
            { label: '语义化 DOM 插槽 demo', kind: 'path', value: '/demos/semantic-dom-slots' },
          ]}
          onOpen={onOpen}
        />
      </DocSection>
      <DocSection id="references" eyebrow="交叉参考" title="相关文档">
        <DocsActionList
          actions={[
            { label: 'Semantic DOM 槽位矩阵', kind: 'doc', value: 'semantic-dom' },
            { label: 'Table API', kind: 'doc', value: 'table-api' },
          ]}
          onOpen={onOpen}
        />
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
        description="data-grid 提供 Semantic DOM 槽位命名，与 antd Table 对齐；未消费的槽位会明确标出，避免给业务代码承诺不存在的 DOM 落点。"
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

export function renderTableApi({ onOpen }: DocsPageContext) {
  return (
    <>
      <DocSection
        id="table-props"
        eyebrow="表格"
        title="Table props"
        description="属性清单由 src/docs/generated/api.json 自动生成（extract-api.mjs 提取 TableProps 公开成员）。每条属性都带稳定锚点，可在页面内或外链深指。"
      >
        <ApiRefTable
          members={getApiMembers('table')}
          anchorPrefix="table-prop"
          onOpenDoc={(slug) => onOpen({ kind: 'doc', value: slug, label: slug })}
          description="data-grid 顶层 Table props（兼容 antd v6 TableProps 子集 + data-grid 专属 gridOptions 命名空间）。"
        />
      </DocSection>
      <DocSection
        id="table-ref"
        eyebrow="ref"
        title="TableRef"
        description="ref 句柄成员（由 api.json 自动生成）。与 antd Table ref.scrollTo 接口对齐，并额外暴露最外层根 DOM 节点。"
      >
        <ApiRefTable
          members={getApiMembers('tableRef')}
          anchorPrefix="table-ref"
          onOpenDoc={(slug) => onOpen({ kind: 'doc', value: slug, label: slug })}
          description="Table 实例 ref 暴露的方法与属性。scrollTo 仅在 virtual 模式下生效；非虚拟模式调用为 no-op。"
        />
      </DocSection>

      <DocSection id="static" eyebrow="静态属性" title="Table 静态入口">
        <ul className="docs-bullet-list">
          <li><Text code>Table.Column</Text> / <Text code>Table.ColumnGroup</Text></li>
          <li><Text code>Table.EXPAND_COLUMN</Text> / <Text code>Table.SELECTION_COLUMN</Text></li>
          <li><Text code>Table.Summary</Text> / <Text code>Table.Summary.Row</Text> / <Text code>Table.Summary.Cell</Text></li>
          <li><Text code>Table.SELECTION_ALL</Text> / <Text code>Table.SELECTION_INVERT</Text> / <Text code>Table.SELECTION_NONE</Text></li>
        </ul>
        <DocsActionList
          actions={[
            { label: '看公开导出清单', kind: 'doc', value: 'public-api' },
          ]}
          onOpen={onOpen}
        />
      </DocSection>
    </>
  )
}

// 关键公开导出的人工描述映射（api.json 的 re-export 没带 JSDoc，这里 layered
// 补一层）。spec 列出的关键导出全部覆盖；其余按 name/kind/from 显示。
const EXPORT_DESCRIPTIONS: Record<string, string> = {
  // === 值导出（组件 / 哨兵 / 工具，8 条）===
  Table: 'data-grid 表格组件（兼容 antd v6 Table）。',
  getRowKey: '与 Table 内部一致的 rowKey 解析工具；用于业务侧复现选中 / 展开锚点。',
  EXPAND_COLUMN: '展开列占位哨兵；插入 columns 数组即控制展开列渲染位置（不传则默认最前）。',
  SELECTION_COLUMN: '选择列占位哨兵；插入 columns 数组即控制选择列渲染位置（不传则默认最前）。',
  SELECTION_ALL: '选择菜单"全选"操作哨兵；放入 rowSelection.selections 即在选择下拉里渲染"全选当前页"项。',
  SELECTION_NONE: '选择菜单"清空"操作哨兵；放入 rowSelection.selections 即在选择下拉里渲染"清空选中"项。',
  SELECTION_INVERT: '选择菜单"反选"操作哨兵；放入 rowSelection.selections 即在选择下拉里渲染"反选当前页"项。',
  Summary: '表体底部汇总栏组件；以 Summary / Summary.Row / Summary.Cell 三段式声明总计或统计行。',
  // === 类型导出：summary 域 ===
  SelectionItem: '选择菜单单项类型；rowSelection.selections 数组元素（哨兵或自定义项）。',
  SummaryProps: '`<Summary>` 容器组件的 props 类型（含 fixed 控制 sticky bottom）。',
  SummaryRowProps: '`<Summary.Row>` 行组件的 props 类型。',
  SummaryCellProps: '`<Summary.Cell>` 单元格的 props 类型（含 index 列号 / colSpan 跨列 / align 对齐）。',
  // === 类型导出：Table / 列基础 ===
  TableProps: 'Table 组件的 props 类型。',
  ColumnType: '单列定义类型（含 key / title / dataIndex / width / render / sorter / filter 等字段）。',
  ColumnsType: '列数组类型别名（`Array<ColumnType>`；分组列通过 children 嵌套表达）。',
  TableColumnType: 'ColumnType 的命名空间风格别名（`Table.Column` 形态导入兼容）。',
  TableColumnsType: 'ColumnsType 的命名空间风格别名（`Table.Columns` 形态导入兼容）。',
  TableRef: 'Table ref 句柄类型，暴露 `scrollTo` API。',
  RowKeyType: '行 key 取值方式类型（字段名字符串或 `(record) => string | number` 函数）。',
  SizeType: '表格密度取值类型（large / middle / medium / small / compact；缺省视觉等价 large）。',
  Align: '单元格内容对齐方式类型（start / center / end；CSS Logical Properties 风格）。',
  FixedInput: '固定列方向输入类型（true / left / right / start / end；布尔值内部归一化为左固定）。',
  RenderedCell: '列 render 返回的旧对象形态类型（@deprecated 仅消费 children；建议改用普通 ReactNode）。',
  ColumnOrSentinel: '列定义或哨兵联合类型（columns 数组元素；可混入 EXPAND_COLUMN / SELECTION_COLUMN）。',
  // === 类型导出：选择域 ===
  TableRowSelection: '行选择配置类型（rowSelection prop 的形状；含 selectedRowKeys / onChange / selections 等）。',
  GridSelectionOptions: 'data-grid 原生行选择配置类型（优先级高于 `rowSelection`）。',
  GridSelectionMode: 'data-grid 原生行选择模式枚举（disabled / single / multiple / extended；extended 支持 Ctrl/Shift）。',
  GridSelectionValue: 'data-grid 原生选择的业务选中值类型（string / number / boolean / symbol；建议 string/number）。',
  RowSelectionType: '行选择模式枚举（checkbox 多选 / radio 单选）。',
  RowSelectMethod: '行选择操作类型枚举（all / none / invert / single / multiple；onChange info.type 取值）。',
  RowCheckboxProps: '行勾选 checkbox 的 props 子集（disabled / name；不含 checked，由状态机驱动）。',
  Expandable: '行展开配置类型（expandable prop 的形状；含 expandedRowRender / rowExpandable / expandedRowKeys 等）。',
  // === 类型导出：排序域 ===
  SortOrder: '排序方向枚举（ascend / descend / null）。',
  SortDirections: '排序方向循环数组类型（如 [ascend, descend]；点击表头按序循环）。',
  CompareFn: '行比较函数类型 `(a, b) => number`；自定义排序比较，返回值同 `Array.prototype.sort`。',
  ColumnSorter: '列排序器类型（boolean 开启默认比较 / CompareFn 自定义 / 对象多列排序）。',
  SorterResult: '排序结果对象类型（column / order / field / columnKey；onChange 第三参的元素形态）。',
  TableCurrentDataSource: 'onChange 第四参 extra 的类型（含 currentDataSource 当前数据源 + action 触发动作）。',
  // === 类型导出：筛选域 ===
  ColumnFilterItem: '单个筛选项类型（text 展示文案 / value 取值 / children 树形子项）。',
  FilterConfirmProps: '自定义筛选面板 `confirm()` 入参类型（含 closeDropdown 控制确认后是否关闭下拉）。',
  FilterResetProps: '自定义筛选面板 `clearFilters()` 入参类型（含 closeDropdown / confirm）。',
  FilterDropdownProps: '自定义筛选面板渲染函数收到的 props 类型（selectedKeys / setSelectedKeys / confirm / clearFilters / visible 等）。',
  ColumnFilterDropdownProps: '透传给筛选下拉底层 Dropdown 的 props 类型（open / onOpenChange / overlayClassName 等）。',
  // === 类型导出：分页域 ===
  TablePaginationConfig: '分页配置类型（current / pageSize / total / placement 等；透传给底层 antd Pagination）。',
  TablePaginationPlacement: '分页位置枚举（topStart / topCenter / topEnd / bottomStart / bottomCenter / bottomEnd / none）。',
  TablePaginationState: 'onChange 第一参 pagination 类型（含 current / pageSize / total 当前实际分页状态）。',
  // === 类型导出：classNames / styles / sticky / locale / scrollbar ===
  TableClassNames: 'classNames prop 的类型（TableSemanticClassNames 对象 或 `(info) => 对象` 函数）。',
  TableStyles: 'styles prop 的类型（TableSemanticStyles 对象 或 `(info) => 对象` 函数）。',
  TableSemanticClassNames: '按部位注入的 classNames 对象形态（root / header.cell / body.cell / pagination 等部位 → className 字符串）。',
  TableSemanticStyles: '按部位注入的 styles 对象形态（结构与 TableSemanticClassNames 同构，值为 CSSProperties）。',
  TableSemanticInfo: 'classNames/styles 函数形态收到的 info 参数类型（含 size / bordered / virtual / scroll / pagination 子集）。',
  StickyConfig: 'sticky prop 的对象配置类型（offsetHeader / offsetScroll / getContainer）。',
  ScrollBarFoldMode: '悬浮滚动条折叠或显示策略类型（showOnTableHover / expandOnHover）。',
  TableLocale: '本地化文案配置类型（filterConfirm / filterReset / emptyText / selectAll 等文案字段）。',
  // === 类型导出：recycling cell 域 ===
  GridColumnOptions: 'data-grid 列级专属选项类型（dragColumnLock / recycling cell 回调）。',
  VirtualizationMode: '虚拟渲染模式类型（standard 默认 / recycling DOM 复用）。',
  DisposeCellElementReason: 'recycling cell element 被释放的原因枚举（recycle / replace / discard / unmount）。',
  GridCellRenderParams: 'recycling cell 渲染回调共用的基础参数类型（value / record / rowIndex / columnIndex / columnKey 等）。',
  GridCellElementRenderParams: 'recycling cell HTMLElement 渲染回调的参数类型（继承 GridCellRenderParams）。',
  GridCellReactSlotProps: 'recycling cell React slot 渲染回调的 slot 参数类型（含 key，必须用作返回元素 key）。',
}

export function renderPublicApi({ onOpen }: DocsPageContext) {
  // Split the 60-entry flat export list into value exports (components /
  // sentinels / tools — `isTypeOnly: false`) and type-only re-exports
  // (`isTypeOnly: true`). Avoids a 60-row wall; each group is independently
  // scrollable and conceptually distinct.
  const allExports = getApiMembers('exports')
  const valueExports = allExports.filter((m) => !m.isTypeOnly)
  const typeExports = allExports.filter((m) => m.isTypeOnly)
  const openDoc = (slug: string) => onOpen({ kind: 'doc', value: slug, label: slug })

  return (
    <>
      <DocSection
        id="exports"
        eyebrow="入口"
        title="主入口导出"
        description="清单由 src/docs/generated/api.json 自动生成（extract-api.mjs 扫描包主入口 re-export）。再导出本身没有 JSDoc，关键导出的描述由文档层 layered on top 补齐。"
      >
        <ApiRefTable
          members={valueExports}
          anchorPrefix="export"
          variant="exports"
          summaryOverrides={EXPORT_DESCRIPTIONS}
          onOpenDoc={openDoc}
          description={`值导出（组件 / 哨兵 / 工具，共 ${valueExports.length} 条）。`}
        />
        <ApiRefTable
          members={typeExports}
          anchorPrefix="export-type"
          variant="exports"
          summaryOverrides={EXPORT_DESCRIPTIONS}
          onOpenDoc={openDoc}
          description={`类型导出（props / options / 枚举类型别名，共 ${typeExports.length} 条）。`}
        />
      </DocSection>

      <DocSection
        id="native"
        eyebrow="命名空间"
        title="data-grid 专属 API 入口"
        description="antd 没有的能力统一进入 gridOptions 或 gridColumnOptions；下面是两个公开入口，完整字段见 gridOptions 参考页。"
      >
        <DocsNote title="行 / 列拖拽排序">
          拖拽排序通过 <Text code>gridOptions.rowDragSort</Text> 和
          <Text code>gridOptions.columnDragSort</Text> 启用，业务方在
          <Text code>onSort</Text> 回调内提交新的 dataSource / columns。
          单列锁定写在 <Text code>column.gridColumnOptions.dragColumnLock</Text>。
        </DocsNote>
        <DocsActionList
          actions={[
            { label: '看 gridOptions 完整字段', kind: 'doc', value: 'grid-options' },
            { label: '看 Table API（顶层兼容字段）', kind: 'doc', value: 'table-api' },
          ]}
          onOpen={onOpen}
        />
      </DocSection>
    </>
  )
}

export function renderColumnApi({ onOpen }: DocsPageContext) {
  return (
    <DocSection
      id="column-props"
      eyebrow="列"
      title="Column props"
      description="属性清单由 src/docs/generated/api.json 自动生成（extract-api.mjs 提取 ColumnType 公开成员）。data-grid 专属列级能力（拖拽锁定、recycling cell 回调）归入 gridColumnOptions，参考 gridOptions 页。"
    >
      <ApiRefTable
        members={getApiMembers('column')}
        anchorPrefix="column-prop"
        onOpenDoc={(slug) => onOpen({ kind: 'doc', value: slug, label: slug })}
        description="data-grid ColumnType（兼容 antd v6 列定义）。"
      />
    </DocSection>
  )
}

export function renderCompatMatrix({ onOpen }: DocsPageContext) {
  return (
    <DocSection
      id="matrix"
      eyebrow="参考"
      title="兼容状态摘要"
      description="每个 API 领域一行：一眼看清完全 / 部分 / 未暴露。本页只讲领域级状态，具体过时成员的迁移动作不在这里展开——见过时成员页。"
    >
      <DocsDataGrid<CompatRow>
        columns={[
          { title: 'API', dataIndex: 'api', key: 'api', width: '26%' },
          { title: '支持度', dataIndex: 'status', key: 'status', width: '18%' },
          { title: '说明', dataIndex: 'detail', key: 'detail', width: '56%' },
        ]}
        dataSource={compatRows}
        rowKey="key"
      />
      <DocsNote title="本页与过时成员页的分工">
        本页回答「某个 API 领域整体兼容到什么程度」；过时 antd Table 成员页回答「具体某个 deprecated 成员怎么改」。同一主题不在两页重复展开——遇到部分兼容时，按上方说明里的指引跳到对应细节页。
      </DocsNote>
      <div style={{ marginTop: 16 }}>
        <DocsActionList
          actions={[
            { label: '具体过时成员迁移动作', kind: 'doc', value: 'deprecated-antd-members' },
            { label: 'Semantic DOM 槽位落点', kind: 'doc', value: 'semantic-dom' },
            { label: 'scroll.y 语义', kind: 'doc', value: 'scroll-y' },
          ]}
          onOpen={onOpen}
        />
      </div>
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
        description="data-grid 优先兼容 antd v6 当前公共 API。对 antd / rc-table 已标记为 deprecated 的成员，data-grid 会根据迁移价值分别处理：能继续承接的保留兼容，语义对不上的降级或忽略，并在下方逐条说明。"
      >
        <DocsNote title="本页与兼容矩阵的分工">
          本页逐条列出具体 deprecated 成员的支持状态、data-grid 行为和迁移动作——回答「用了 X 该改成什么」。如果想看某个 API 领域整体是「完全 / 部分 / 未暴露」，去兼容矩阵；同一主题不在两页重复展开。
        </DocsNote>
        <DocsNote title="判定方式">
          旧成员如果依赖原生 <Text code>table/tr/td</Text> DOM，data-grid 只保留可表达的语义；
          无法保留的 DOM 细节会被明确忽略，并指向等价的当前 API。
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
          <li><Text code>onRow</Text> / <Text code>onHeaderRow</Text> 表达行级 props 意图，实际会分发到同一行的全部 cells 或行包装层。</li>
          <li><Text code>column.className</Text> / <Text code>column.style</Text> 合并到 data-grid 单元格，不是原生 <Text code>td</Text> / <Text code>th</Text>。</li>
          <li>依赖 <Text code>tbody &gt; tr &gt; td</Text> 的选择器需要改用 <Text code>classNames</Text> / <Text code>styles</Text> 的语义槽位，或迁移到 data-grid 仍输出的 <Text code>.ant-table-*</Text> 别名。</li>
        </ul>
      </DocSection>

      <DocSection id="related" eyebrow="关联" title="继续核对">
        <DocsActionList
          actions={[
            { label: '领域级兼容状态（兼容矩阵）', kind: 'doc', value: 'compat-matrix' },
            { label: 'Table API', kind: 'doc', value: 'table-api' },
            { label: 'Column API', kind: 'doc', value: 'column-api' },
          ]}
          onOpen={onOpen}
        />
      </DocSection>
    </>
  )
}

export function renderKnownLimitations({ onOpen }: DocsPageContext) {
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
        <DocsNote title="本页与兼容矩阵 / 过时成员页的分工">
          本页回答「data-grid 在架构层有哪些边界与 backlog」——DOM 形态、ARIA、RTL、scroll.y 数字语义、components 替换范围等。想看某个 API 领域整体兼容到什么程度，去兼容矩阵；想看具体某个 deprecated 成员怎么改，去过时成员页。
        </DocsNote>
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
      <DocSection id="related" eyebrow="相关" title="相关边界细节页">
        <DocsActionList
          actions={[
            { label: 'scroll.y 语义', kind: 'doc', value: 'scroll-y' },
            { label: 'Semantic DOM 槽位落点', kind: 'doc', value: 'semantic-dom' },
            { label: '兼容矩阵', kind: 'doc', value: 'compat-matrix' },
          ]}
          onOpen={onOpen}
        />
      </DocSection>
    </>
  )
}

export function renderGridOptions({ onOpen }: DocsPageContext) {
  return (
    <>
      <DocSection
        id="namespace"
        eyebrow="命名空间"
        title="data-grid 专属能力进入 gridOptions"
        description="这些能力不是 antd Table 顶层兼容面的一部分，放入 gridOptions 可以避免和兼容 API 混淆。下面所有清单由 src/docs/generated/api.json 自动生成。"
      >
        <DocsCode code={GRID_OPTIONS_CODE} height={260} ariaLabel="gridOptions 示例代码" />
      </DocSection>
      <DocSection id="examples" eyebrow="表级" title="gridOptions 成员">
        <ApiRefTable
          members={getApiMembers('gridOptions')}
          anchorPrefix="grid-options"
          onOpenDoc={(slug) => onOpen({ kind: 'doc', value: slug, label: slug })}
          description="表级专属能力（行高模型 / 列宽拖拽 / 悬浮滚动条 / 原生选择 / 行列拖拽 / 虚拟化模式）。"
        />
      </DocSection>
      <DocSection id="selection" eyebrow="选择" title="gridOptions.selection">
        <ApiRefTable
          members={getApiMembers('selection')}
          anchorPrefix="grid-selection"
          onOpenDoc={(slug) => onOpen({ kind: 'doc', value: slug, label: slug })}
          description="data-grid 原生行选择配置（优先级高于 antd rowSelection）。"
        />
      </DocSection>
      <DocSection id="virtualization-mode" eyebrow="虚拟化" title="VirtualizationMode">
        <ApiRefTable
          members={getApiMembers('virtualizationMode')}
          anchorPrefix="virtualization-mode"
          onOpenDoc={(slug) => onOpen({ kind: 'doc', value: slug, label: slug })}
          description="虚拟渲染模式枚举（`standard` 默认 / `recycling` DOM 复用路径）。"
        />
      </DocSection>
      <DocSection id="column-options" eyebrow="列级" title="gridColumnOptions">
        <ApiRefTable
          members={getApiMembers('gridColumnOptions')}
          anchorPrefix="grid-column-options"
          onOpenDoc={(slug) => onOpen({ kind: 'doc', value: slug, label: slug })}
          description="data-grid 列级专属能力（dragColumnLock 与 recycling 逃逸舱回调）。"
        />
        <DocsCode code={GRID_COLUMN_OPTIONS_CODE} height={300} ariaLabel="gridColumnOptions 示例代码" />
      </DocSection>
      <DocSection id="recycling" eyebrow="虚拟化" title="recycling 渲染模式">
        <DocsNote title="使用条件">
          <Text code>virtualizationMode: 'recycling'</Text> 只在 <Text code>virtual</Text> 与
          <Text code>{'scroll={{ y: true }}'}</Text>（详见{' '}
          <a href="#/docs/scroll-y">scroll.y 语义</a>）同时启用时生效。普通业务优先使用默认
          <Text code>standard</Text>，只有超大表格或需要在 DOM 层做深度集成时才考虑 recycling。
        </DocsNote>
        <DocsCode code={RECYCLING_CODE} height={260} ariaLabel="recycling 虚拟化示例代码" />
      </DocSection>
    </>
  )
}

export function renderWhenToMigrate({ onOpen }: DocsPageContext) {
  return (
    <>
      <DocSection
        id="fit"
        eyebrow="适合迁移"
        title="data-grid 能明显赢过 antd Table 的场景"
        description="data-grid 不是 antd Table 的全量替代，而是在特定场景下做了取舍的继任者。下面这些场景是 data-grid 的强项，迁移收益最直接。"
      >
        <ul className="docs-bullet-list">
          <li>
            <Text strong>大数据表格 / 长列表性能</Text>：内置虚拟滚动（
            <Text code>virtual</Text> + <Text code>{'scroll={{ y: true }}'}</Text>），并额外提供
            <Text code>recycling</Text> 虚拟化模式（DOM 复用，适合超大数据量和高频滚动）。
          </li>
          <li>
            <Text strong>动态行高</Text>：支持测量行高 + 有界行高（
            <Text code>gridOptions.minRowHeight</Text> / <Text code>maxRowHeight</Text>），并在虚拟滚动下保持一致布局模型。
          </li>
          <li>
            <Text strong>列宽拖拽</Text>：<Text code>gridOptions.resizable</Text> 与
            <Text code>columnResizeMode</Text> 直接可用，无需自行实现 resize 逻辑。
          </li>
          <li>
            <Text strong>行 / 列拖拽排序</Text>：通过
            <Text code>gridOptions.rowDragSort</Text> / <Text code>columnDragSort</Text> 启用，业务侧在
            <Text code>onSort</Text> 内提交新顺序，无需拼装 DnD 库。
          </li>
          <li>
            <Text strong>多级表头 + 合并 + 固定列组合</Text>：CSS Grid 渲染模型让三者能在同一套布局下共存，避免传统 React 表格底层库（如 rc-table）在复杂组合下的对齐漂移。
          </li>
          <li>
            <Text strong>antd v6 兼容 API + grid 渲染</Text>：希望继续用
            <Text code>TableProps</Text>、<Text code>ColumnType</Text>、<Text code>rowSelection</Text>、
            <Text code>expandable</Text> 等熟悉 props，同时拿到 grid 布局的红利。
          </li>
        </ul>
      </DocSection>

      <DocSection
        id="avoid"
        eyebrow="先别迁"
        title="这些场景 data-grid 明确不做或未系统支持"
        description="data-grid 有清晰的边界。下面这些场景迁过来会撞墙——要么改业务方预期，要么留到 backlog 解决。"
      >
        <ul className="docs-bullet-list">
          <li>
            <Text strong>架构边界 / 兼容缺口</Text>：data-grid 不复刻原生 table / thead / tbody / tr DOM、不伪造完整 ARIA table / row / rowgroup role 树、
            <Text code>scroll.y</Text> 不接受数字 / 字符串 max-height、RTL 未系统支持、
            <Text code>components</Text> 仅暴露 <Text code>body.cell</Text> / <Text code>body.row</Text>（无 header.cell / wrapper / table）。详见{' '}
            <a href="#/docs/known-limitations">已知限制页</a>。
          </li>
          <li>
            <Text strong>依赖大量 deprecated antd 成员</Text>：例如
            <Text code>column.filterDropdownOpen</Text> / <Text code>column.onFilterDropdownOpenChange</Text> 等已 deprecated 字段未暴露；旧
            <Text code>render</Text> 返回的 <Text code>props</Text> 字段会被忽略。
          </li>
          <li>
            <Text strong>需要逐字对齐 antd 历史所有 API</Text>：data-grid 优先对齐真实业务常用的 antd v6 Table 行为，不追求全量历史兼容 API。
          </li>
        </ul>
      </DocSection>

      <DocSection id="next" eyebrow="继续" title="相关参考">
        <DocsActionList
          actions={[
            { label: '从 antd 迁移', kind: 'doc', value: 'migrate-from-antd' },
            { label: '已知限制', kind: 'doc', value: 'known-limitations' },
            { label: '兼容矩阵', kind: 'doc', value: 'compat-matrix' },
            { label: '过时成员', kind: 'doc', value: 'deprecated-antd-members' },
            { label: 'Semantic DOM', kind: 'doc', value: 'semantic-dom' },
            { label: 'gridOptions 能力清单', kind: 'doc', value: 'grid-options' },
          ]}
          onOpen={onOpen}
        />
      </DocSection>
    </>
  )
}
