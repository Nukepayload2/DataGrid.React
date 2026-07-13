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

interface GapRow {
  key: string
  topic: string
  boundary: string
  action: string
}

const QUICK_START_INSTALL = `import { Table } from '@nukepayload2/data-grid'
import type { ColumnType } from '@nukepayload2/data-grid'
import '@nukepayload2/data-grid/style.css'`

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

const VIRTUAL_SCROLLING_CODE = `<div style={{ height: 520 }}>
  <Table
    columns={columns}
    dataSource={data}
    rowKey="id"
    scroll={{ x: 1200, y: true }}
    virtual
  />
</div>`

const THEMING_CODE = `import { ConfigProvider } from 'antd'

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
    columnReorder: true,
    autoScrollOnDrag: true,
    multiRowReorder: true,
  }}
/>`

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
  { key: 'components', field: 'components', purpose: '自定义单元格、行或表头。', note: 'data-grid 的 DOM 形态和原生 table 不完全相同。' },
  { key: 'classNames', field: 'classNames / styles', purpose: '语义化样式槽位。', note: '局部覆盖 root、header、body、cell 等部位。' },
  { key: 'sticky', field: 'sticky', purpose: '页面级 sticky 表头。', note: '适合和外层滚动容器组合使用。' },
  { key: 'gridOptions', field: 'gridOptions', purpose: 'data-grid 专属表级能力。', note: '例如行高、列宽拖拽、原生选择和拖拽增强。' },
]

const columnPropRows: PropRow[] = [
  { key: 'basic', field: 'title / dataIndex / key', purpose: '列标题、字段路径和稳定 key。', note: 'JSX 声明和 columns 数组都可用。' },
  { key: 'layout', field: 'width / fixed / align', purpose: '宽度、固定列和对齐方式。', note: '与滚动和 sticky 组合使用。' },
  { key: 'render', field: 'render', purpose: '自定义单元格内容。', note: '合并单元格优先走 onCell。' },
  { key: 'cell', field: 'onCell / onHeaderCell', purpose: '注入单元格或表头属性。', note: '也可用于 colSpan / rowSpan。' },
  { key: 'sort', field: 'sorter / filters', purpose: '排序和筛选。', note: '保留 antd 风格交互。' },
  { key: 'display', field: 'ellipsis / hidden / responsive', purpose: '展示控制。', note: '适合窄宽度和响应式场景。' },
  { key: 'gridColumnOptions', field: 'gridColumnOptions', purpose: 'data-grid 专属列级能力。', note: '例如列拖拽锁定。' },
]

const compatRows: CompatRow[] = [
  { key: 'base', api: 'dataSource / columns / rowKey', status: '完全兼容', detail: '基础数据、列定义和行 key 维持 antd 使用习惯。' },
  { key: 'selection', api: 'rowSelection', status: '部分兼容', detail: '常用选择、受控键、自定义选择项和 renderCell 已覆盖，DOM 形态存在适配差异。' },
  { key: 'expandable', api: 'expandable', status: '部分兼容', detail: '展开行、默认展开和 expandRowByClick 已覆盖，columnTitle/fixed 仍是 backlog。' },
  { key: 'scroll', api: 'scroll', status: '部分兼容', detail: 'x 支持常用形态；y 明确为 true，不接受 number/string max-height 语义。' },
  { key: 'components', api: 'components', status: '部分兼容', detail: '支持 header.cell、body.cell、body.row；wrapper/table 级替换不是原生 table 等价语义。' },
  { key: 'locale', api: 'locale', status: '部分兼容', detail: '表体空态、筛选下拉、选择菜单、排序和展开文案已接入 antd locale 链路。' },
]

const limitationRows: GapRow[] = [
  { key: 'semantic-dom', topic: 'semantic DOM', boundary: '不能完整复刻 thead / tbody / tr 层级。', action: '用 data-grid 语义槽位做适配。' },
  { key: 'scroll-y', topic: 'scroll.y', boundary: '不支持 antd number/string max-height 语义。', action: '使用 `scroll={{ y: true }}` 并给父容器高度。' },
  { key: 'rendered-cell', topic: 'RenderedCell', boundary: '`render` 返回 props 的 antd 形态未对齐。', action: '合并单元格统一走 `onCell`。' },
  { key: 'rtl', topic: 'RTL', boundary: '尚未系统处理方向、fixed、sticky 和拖拽方向。', action: '需要独立设计和回归范围。' },
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
      <DocSection id="install" eyebrow="安装" title="导入组件和样式">
        <DocsCode code={QUICK_START_INSTALL} height={180} ariaLabel="安装和导入代码" />
      </DocSection>

      <DocSection
        id="minimal"
        eyebrow="示例"
        title="最小表格"
        description="先用 columns、dataSource 和稳定 rowKey 跑通最小可用表格。"
      >
        <DocsCode code={QUICK_START_MINIMAL} height={340} ariaLabel="最小表格代码" />
      </DocSection>

      <DocSection
        id="jsx"
        eyebrow="JSX"
        title="JSX 列声明"
        description="需要和条件渲染混用时，可以改成 JSX 声明。"
      >
        <DocsCode code={JSX_COLUMNS} height={160} ariaLabel="JSX 列声明代码" />
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
        id="reuse"
        eyebrow="迁移"
        title="先复用熟悉的写法"
        description="第一步保持 columns、rowSelection、expandable、pagination 这些入口不变。"
      >
        <ul className="docs-bullet-list">
          <li><Text code>columns</Text>、<Text code>dataSource</Text>、<Text code>rowKey</Text></li>
          <li><Text code>rowSelection</Text>、<Text code>expandable</Text>、<Text code>pagination</Text></li>
          <li><Text code>sorter</Text> / <Text code>filters</Text></li>
          <li><Text code>Table.Column</Text> / <Text code>Table.ColumnGroup</Text></li>
        </ul>
      </DocSection>

      <DocSection id="differences" eyebrow="差异" title="最需要注意的地方">
        <DocsDataGrid<CompatRow>
          columns={[
            { title: 'API', dataIndex: 'api', key: 'api', width: '24%' },
            { title: '状态', dataIndex: 'status', key: 'status', width: '20%' },
            { title: '说明', dataIndex: 'detail', key: 'detail', width: '56%' },
          ]}
          dataSource={compatRows.slice(1, 5)}
          rowKey="key"
        />
      </DocSection>

      <DocSection id="demos" eyebrow="推荐" title="先看的 demo">
        <DocsActionList
          actions={[
            { label: '基础表格', kind: 'path', value: '/demos/basic-table' },
            { label: '固定列', kind: 'path', value: '/demos/fixed-columns' },
            { label: '固定列和表头', kind: 'path', value: '/demos/fixed-columns-and-header' },
            { label: '排序和筛选', kind: 'path', value: '/demos/sorting-and-filtering' },
            { label: '分页', kind: 'path', value: '/demos/pagination' },
            { label: '单元格编辑', kind: 'path', value: '/demos/cell-editing' },
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
          给表格外层容器明确高度，再传 <Text code>{'scroll={{ y: true }}'}</Text>。这样固定表头、虚拟滚动和底部滚动条使用同一套高度链。
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
        description="完整证据继续保留在 docs/reference/compat-matrix.md。"
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
      <DocSection id="examples" eyebrow="常见项" title="常用增强能力">
        <ul className="docs-bullet-list">
          <li>行高和测量策略。</li>
          <li>列拖拽和列拖拽锁定。</li>
          <li>行拖拽自动滚动。</li>
          <li>多行成块重排。</li>
          <li>DOM 复用虚拟化。</li>
        </ul>
      </DocSection>
    </>
  )
}
