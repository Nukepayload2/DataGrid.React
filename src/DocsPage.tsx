/** docs 视图：左侧目录，右侧正文。 */

import { useEffect } from 'react'
import type { CSSProperties } from 'react'
import { Typography, Tag } from 'antd'
import type { ColumnType, StickyConfig } from './table'
import { Table } from './table'
import { navigate } from './demos/registry'

const { Title, Paragraph, Text } = Typography

interface TocItem {
  key: string
  title: string
}

/** TOC 项（与章节 id 对应）。 */
const TOC_ITEMS: TocItem[] = [
  { key: 'intro', title: '介绍' },
  { key: 'quick-start', title: '快速开始' },
  { key: 'table-api', title: 'Table API' },
  { key: 'column-api', title: 'column API' },
  { key: 'antd-diffs', title: '与 antd 差异' },
]

/** 章节容器样式（锚点 offsetTop 顶部留白 + 段间距）。 */
const SECTION_STYLE: CSSProperties = {
  paddingTop: 24,
  paddingBottom: 16,
  scrollMarginTop: 80, // 锚点跳转后留出顶部 Header (~64) + 缝隙
}

/** 行内代码块（多行）样式。 */
const CODE_BLOCK_STYLE: CSSProperties = {
  background: 'rgba(0,0,0,0.04)',
  padding: '12px 16px',
  borderRadius: 6,
  overflow: 'auto',
  maxWidth: '100%',
  fontSize: 13,
  lineHeight: 1.6,
  margin: '12px 0',
  whiteSpace: 'pre',
}

/** API 表行数据。 */
interface ApiRow {
  prop: string
  desc: string
  type: string
  def: string
}

const API_TABLE_COLUMNS: Array<ColumnType<ApiRow>> = [
  {
    title: '属性',
    dataIndex: 'prop',
    key: 'prop',
    width: '16%',
    render: (value) => (
      <Text code style={{ fontSize: 12, wordBreak: 'break-word' }}>
        {value}
      </Text>
    ),
  },
  {
    title: '说明',
    dataIndex: 'desc',
    key: 'desc',
    width: '52%',
    render: (value) => (
      <span style={{ color: 'rgba(0,0,0,0.75)', lineHeight: 1.65 }}>
        {value}
      </span>
    ),
  },
  {
    title: '类型',
    dataIndex: 'type',
    key: 'type',
    width: '24%',
    render: (value) => (
      <Text code style={{ fontSize: 12, whiteSpace: 'normal', wordBreak: 'break-word' }}>
        {value}
      </Text>
    ),
  },
  {
    title: '默认值',
    dataIndex: 'def',
    key: 'def',
    width: '8%',
    render: (value) => (
      <Text type="secondary" style={{ fontSize: 12 }}>
        {value}
      </Text>
    ),
  },
]

const stickyContainer = (): HTMLElement | Window =>
  document.querySelector<HTMLElement>('.ant-layout-content') ?? window

const API_TABLE_STICKY: StickyConfig = {
  offsetHeader: 0,
  offsetScroll: 0,
  getContainer: stickyContainer,
}

/** 渲染 API 表：使用当前 data-grid，并启用页面级 sticky 表头。 */
function ApiTable({ rows }: { rows: ApiRow[] }) {
  return (
    <div className="docs-api-table">
      <Table<ApiRow>
        bordered
        columns={API_TABLE_COLUMNS}
        dataSource={rows}
        pagination={false}
        rowKey="prop"
        scroll={{ x: true }}
        size="small"
        sticky={API_TABLE_STICKY}
      />
    </div>
  )
}

/** 代码块。 */
function Code({ children }: { children: string }) {
  return (
    <pre style={CODE_BLOCK_STYLE}>
      <code>{children}</code>
    </pre>
  )
}

const TABLE_API_ROWS: ApiRow[] = [
  { prop: 'columns', desc: '列配置数组。每一项描述表头、字段、宽度、排序、筛选、渲染等；可放入 Table.EXPAND_COLUMN 或 Table.SELECTION_COLUMN 控制展开列、选择列的位置。传了 columns 时会优先于 JSX 子列。', type: 'ColumnType[]', def: '-' },
  { prop: 'dataSource', desc: '表格数据数组。数组中的每个对象对应一行；树形数据可通过 childrenColumnName 指定子行字段。', type: 'RecordType[]', def: '-' },
  { prop: 'rowKey', desc: '行唯一标识。传字符串时读取 record 上同名字段；传函数时由函数返回 key。行选择、展开、滚动定位都依赖稳定 rowKey。', type: 'string | ((record)=>Key)', def: "'key'" },
  { prop: 'column', desc: '给所有列设置默认列属性，例如统一 align、ellipsis、width。单列自己的同名配置优先。', type: 'Partial<ColumnType>', def: '-' },
  { prop: 'bordered', desc: '是否显示表格边框。适合数据密集或需要清晰单元格分隔的场景。', type: 'boolean', def: 'false' },
  { prop: 'size', desc: '表格尺寸。large 更宽松，small 更紧凑；middle/medium 为兼容不同 antd 版本的中等尺寸；compact 近似 small。', type: "'large' | 'middle' | 'medium' | 'small' | 'compact'", def: "'large'" },
  { prop: 'showHeader', desc: '是否显示表头。设为 false 时只显示数据行。', type: 'boolean', def: 'true' },
  { prop: 'title', desc: '表格顶部内容。函数形式会收到当前筛选后的数据，可用于展示标题、工具栏或统计信息。', type: '(currentPageData)=>ReactNode', def: '-' },
  { prop: 'footer', desc: '表格底部内容。函数形式会收到当前筛选后的数据，可用于说明或合计信息。', type: '(currentPageData)=>ReactNode', def: '-' },
  { prop: 'scroll', desc: '滚动配置。x 为 true 时只开启横向滚动；传 number 或 string 时同时设置横向内容最小宽度。y 设为 true 时启用表格容器内纵向滚动并固定表头，父容器需要有明确高度。', type: '{ x?: true|number|string; y?: true }', def: '-' },
  { prop: 'virtual', desc: '是否启用虚拟滚动。配合 scroll.y 可只渲染可视区域数据，适合大数据量列表；普通表格保持 false 即可。', type: 'boolean', def: 'false' },
  { prop: 'gridOptions', desc: 'data-grid 的扩展选项命名空间。用于行高、表头高度、列宽拖拽、滚动条显示策略、原生选择模式、行列拖拽等能力，避免占用未来 antd 顶层 props。', type: '{ rowHeight?, headerHeight?, resizable?, columnResizeMode?, selection?, ... }', def: '-' },
  { prop: 'tableLayout', desc: '表格布局模式。保留与 antd 同名配置，通常无需手动设置；固定宽度列较多时可传 fixed。', type: "'auto' | 'fixed'", def: '-' },
  { prop: 'rowSelection', desc: '行选择配置。传入后显示选择列，支持 checkbox/radio、受控 selectedRowKeys、默认选中、禁用行、自定义选择菜单和 renderCell。', type: 'TableRowSelection', def: '-' },
  { prop: 'expandable', desc: '行展开配置。可渲染展开内容、控制哪些行可展开、设置默认展开或受控展开；可用 EXPAND_COLUMN 调整展开图标列位置。', type: 'Expandable', def: '-' },
  { prop: 'pagination', desc: '分页配置。未传时默认开启分页；传 false 关闭分页并展示全部数据；传对象可控制 current、pageSize、total、placement 等。', type: 'false | TablePaginationConfig', def: '{}' },
  { prop: 'loading', desc: '加载状态。传 true 显示加载中；传 SpinProps 可配置 delay、tip、spinning 等。', type: 'boolean | SpinProps', def: 'false' },
  { prop: 'onChange', desc: '分页、排序、筛选变化时触发。回调参数依次为 pagination、filters、sorter、extra，可据此请求远程数据或同步外部状态。', type: '(pagination, filters, sorter, extra)=>void', def: '-' },
  { prop: 'showSorterTooltip', desc: '是否显示排序提示。可全局关闭，也可配置提示绑定到整个表头或排序图标；单列配置优先。', type: 'boolean | { target?: "full-header"|"sorter-icon" }', def: 'true' },
  { prop: 'childrenColumnName', desc: '树形数据的子行字段名。默认读取 children；如果你的数据使用 childrenList、nodes 等字段，可在这里指定。', type: 'string', def: "'children'" },
  { prop: 'components', desc: '自定义表格内部组件。常用于可编辑单元格、自定义行包装、表头单元格交互等；body.cell 接收默认内容和 onCell 返回的扩展 props。', type: 'TableComponents', def: '-' },
  { prop: 'classNames', desc: '语义化 className 配置。可按 root、title、header.cell、body.cell、pagination.root 等部位注入类名，也可用函数按当前表格状态返回。', type: 'TableClassNames', def: '-' },
  { prop: 'styles', desc: '语义化 style 配置。结构与 classNames 相同，用于给特定部位注入内联样式。', type: 'TableStyles', def: '-' },
  { prop: 'locale', desc: '本地化文案。可覆盖空状态、筛选、选择、排序提示、展开按钮等文案；优先级高于 ConfigProvider 的 Table locale。', type: 'TableLocale', def: '-' },
  { prop: 'summary', desc: '汇总栏。函数形式接收当前页数据，通常返回 Table.Summary、Table.Summary.Row、Table.Summary.Cell 组合；也可直接传 ReactNode。', type: '((currentPageData)=>ReactNode) | ReactNode', def: '-' },
  { prop: 'sticky', desc: '页面级粘性表头，对应 sticky demo：文档或页面滚动时表头吸附在滚动视口顶部，并可配合底部悬浮横向滚动条。它不同于 column.fixed 固定列；需要表格容器内固定表头时使用 scroll.y。', type: 'boolean | StickyConfig', def: 'false' },
  { prop: 'onHeaderRow', desc: '给表头行注入事件或属性。函数收到该层表头列和行号，返回 onClick、className、style 等。', type: '(columns, index)=>HTMLAttributes', def: '-' },
  { prop: 'onRow', desc: '给数据行注入事件或属性。函数收到 record 和 index，返回 onClick、onDoubleClick、onContextMenu、className、style 等。', type: '(record, index)=>HTMLAttributes', def: '-' },
  { prop: 'rowClassName', desc: '给数据行添加 className。可传固定字符串，也可按 record 和 index 返回不同类名。', type: 'string | ((record,index)=>string)', def: '-' },
  { prop: 'rowHoverable', desc: '是否启用行 hover 高亮。false 只关闭内置 hover 视觉，不影响 onRow 中的鼠标事件。', type: 'boolean', def: 'true' },
  { prop: 'getPopupContainer', desc: '设置筛选下拉等弹层的挂载容器。表格放在弹窗、抽屉或滚动容器内时常用；列级 filterDropdownProps 可覆盖它。', type: '(triggerNode)=>HTMLElement', def: '-' },
  { prop: 'className', desc: '表格根节点 className。适合接入页面级样式或测试选择器。', type: 'string', def: '-' },
  { prop: 'style', desc: '表格根节点内联样式。可设置宽度、高度、外边距等。', type: 'CSSProperties', def: '-' },
  { prop: 'children', desc: 'JSX 方式声明列。可使用 <Table.Column> 和 <Table.ColumnGroup>；未传 columns 时生效。', type: 'ReactNode', def: '-' },
  { prop: 'ref', desc: '表格实例引用。提供 nativeElement 和 scrollTo；scrollTo 可按 index、key 或 scrollTop 定位，主要用于虚拟滚动场景。', type: 'Ref<TableRef>', def: '-' },
]

const COLUMN_API_ROWS: ApiRow[] = [
  { prop: 'title', desc: '表头内容。可传字符串、数字、图标、Tooltip 或任意 ReactNode。', type: 'ReactNode', def: '-' },
  { prop: 'dataIndex', desc: '从 record 中读取单元格值的字段名或路径。数组路径可读取嵌套对象，例如 ["user", "name"]。', type: 'string | number | (string|number)[]', def: '-' },
  { prop: 'key', desc: '列唯一标识。排序、筛选回调中的 columnKey 会使用它；不传时通常回退到 dataIndex。', type: 'string | number', def: '-' },
  { prop: 'width', desc: '列宽。数字按 px 处理，字符串按 CSS 宽度处理；设置 scroll.x 时宽表可横向滚动。', type: 'number | string', def: '-' },
  { prop: 'align', desc: '单元格和表头对齐方式。start 为起始边，center 居中，end 为结束边。', type: "'start' | 'center' | 'end'", def: '-' },
  { prop: 'fixed', desc: '固定列。left/start 固定在左侧，right/end 固定在右侧，true 等同左固定。它是列固定能力，不是 Table.sticky 的页面级表头吸顶。', type: "'left' | 'right' | 'start' | 'end' | boolean", def: '-' },
  { prop: 'render', desc: '自定义单元格内容。参数为当前值、整行 record、行索引；返回 ReactNode。', type: '(text, record, index)=>ReactNode', def: '-' },
  { prop: 'ellipsis', desc: '内容过长时省略。true 使用默认 title 提示；{ showTitle:false } 关闭默认提示，方便自己包 Tooltip。', type: 'boolean | { showTitle?: boolean }', def: 'false' },
  { prop: 'hidden', desc: '隐藏列。true 时该叶子列不显示；分组列请通过隐藏子列控制。', type: 'boolean', def: 'false' },
  { prop: 'children', desc: '子列配置，用于多级表头。父列主要提供分组标题，实际数据列来自最底层叶子列。', type: 'ColumnType[]', def: '-' },
  { prop: 'colSpan', desc: '表头横向跨列。大于 1 时表示该表头覆盖后续列；被覆盖列通常需要设置 colSpan: 0。', type: 'number', def: '1' },
  { prop: 'rowScope', desc: '把该列作为行标题列。常用于首列，让辅助技术知道这一列代表行名。', type: "'row'", def: '-' },
  { prop: 'onCell', desc: '给数据单元格注入属性。可返回 onClick、className、style，也可返回 colSpan/rowSpan 做单元格合并；编辑表格常用它传递编辑参数。', type: '(record, index)=>Record<string, any>', def: '-' },
  { prop: 'onHeaderCell', desc: '给表头单元格注入属性。可用于表头点击、拖拽标识、自定义 className 或 style。', type: '(column, index)=>HTMLAttributes', def: '-' },
  { prop: 'sorter', desc: '排序配置。true 使用默认比较；函数自定义比较；对象可配置 compare 和 multiple 实现多列排序。', type: 'boolean | CompareFn | { compare?, multiple? }', def: '-' },
  { prop: 'sortOrder', desc: '受控排序方向。传入后排序状态由外部控制，通常与 onChange 配合更新 dataSource。', type: "'ascend' | 'descend' | null", def: '-' },
  { prop: 'defaultSortOrder', desc: '非受控初始排序方向。只在首次渲染时生效；后续由表格内部状态管理。', type: 'SortOrder', def: '-' },
  { prop: 'sortDirections', desc: '点击表头时的排序循环顺序。例如 ["descend"] 表示第一次降序、再点取消排序。', type: "Array<'ascend'|'descend'>", def: "['ascend','descend']" },
  { prop: 'showSorterTooltip', desc: '该列排序提示开关。优先级高于 Table.showSorterTooltip。', type: 'boolean | { target? }', def: '-' },
  { prop: 'filters', desc: '筛选项列表。每项包含 text 和 value；可带 children 用于 tree 模式。配置 onFilter 后会显示筛选入口。', type: 'ColumnFilterItem[]', def: '-' },
  { prop: 'onFilter', desc: '筛选判定函数。返回 true 表示当前 record 命中该筛选值；多选时命中任一值即可保留。', type: '(value, record)=>boolean', def: '-' },
  { prop: 'filterMultiple', desc: '是否允许多选筛选项。true 使用多选，false 使用单选。', type: 'boolean', def: 'true' },
  { prop: 'filterMode', desc: '筛选面板模式。menu 为列表，tree 为树形筛选；配置 filterDropdown 时自定义面板会接管显示。', type: "'menu' | 'tree'", def: "'menu'" },
  { prop: 'filterSearch', desc: '是否在内置筛选面板中启用搜索。true 使用默认包含匹配；函数形式可自定义筛选项匹配逻辑。', type: 'true | ((input, record)=>boolean)', def: '-' },
  { prop: 'filterDropdown', desc: '自定义筛选面板。函数形式可拿到 selectedKeys、setSelectedKeys、confirm、clearFilters、close 等参数。', type: 'ReactNode | ((props)=>ReactNode)', def: '-' },
  { prop: 'filterIcon', desc: '自定义筛选图标。函数形式会收到 filtered，用于区分是否已有筛选条件。', type: 'ReactNode | ((filtered)=>ReactNode)', def: '-' },
  { prop: 'filterDropdownProps', desc: '传给筛选下拉的附加属性。可控制 open、onOpenChange、overlayClassName、getPopupContainer 等。', type: 'ColumnFilterDropdownProps', def: '-' },
  { prop: 'filteredValue', desc: '受控筛选值。传入数组或 null 后，筛选状态由外部控制；通常配合 onChange 使用。', type: '(string|number)[] | null', def: '-' },
  { prop: 'defaultFilteredValue', desc: '非受控初始筛选值。只在首次渲染时生效。', type: '(string|number)[]', def: '-' },
  { prop: 'filterOnClose', desc: '关闭筛选面板时是否立即应用筛选。false 时需要点击确定才应用。', type: 'boolean', def: 'true' },
  { prop: 'responsive', desc: '响应式列显示。仅当当前视口匹配数组中的任一断点时显示该列；不匹配时整列移除。', type: 'Breakpoint[]', def: '-' },
  { prop: 'shouldCellUpdate', desc: '控制自定义单元格是否需要重渲染。返回 false 可跳过更新，适合复杂编辑单元格优化。', type: '(prevRecord, nextRecord)=>boolean', def: '-' },
  { prop: 'className', desc: '该列单元格和表头的 className。用于整列样式。', type: 'string', def: '-' },
  { prop: 'style', desc: '该列单元格和表头的内联样式。用于整列样式。', type: 'CSSProperties', def: '-' },
  { prop: 'gridColumnOptions', desc: 'data-grid 的列级扩展选项命名空间。当前用于列拖拽锁定等能力，避免占用 antd 同名字段。', type: 'GridColumnOptions', def: '-' },
]

const ANTD_DIFFS: Array<{ title: string; desc: string }> = [
  {
    title: 'scroll.y 只接受 true',
    desc: 'antd 可用数字设置纵向滚动高度；data-grid 使用 scroll={{ y: true }} 开启容器内滚动和固定表头，高度由外层容器决定。迁移时请给表格或父容器设置明确 height / flex 高度。',
  },
  {
    title: '自有能力集中在 gridOptions / gridColumnOptions',
    desc: '行高、列宽拖拽、原生选择模式、行列拖拽等 data-grid 扩展能力不放在 Table 顶层或 Column 顶层，而是分别放入 gridOptions 和 gridColumnOptions。antd 同名 props 保持兼容语义。',
  },
  {
    title: '滚动条是悬浮交互样式',
    desc: '横向或纵向滚动开启后，data-grid 使用悬浮滚动条，避免原生滚动条占位影响列宽和表头对齐。滚动行为仍然可拖动、可同步，但针对浏览器原生 scrollbar 的样式不会生效。',
  },
  {
    title: 'components.body.cell 自定义的是单元格内容',
    desc: 'antd 示例中常把 body.cell 当作 td 替换点使用；在 data-grid 中它接收默认 children 和 onCell 返回的参数，用来替换单元格内容区域。不要依赖 td/tr DOM 结构做选择器或 DOM 查询。',
  },
  {
    title: '行级 props 按行作用，但不要依赖 tr',
    desc: 'onRow、onHeaderRow、rowClassName 仍按“行”理解和使用；事件、className、style 会作用到该行可见单元格。业务代码应通过这些 API 表达行交互，而不是查找 tr 元素。',
  },
]

export default function DocsPage({ section }: { section?: string }) {
  // 可选 props.section（来自路由 #/docs/<section>）—— 挂载后滚到对应 id。
  useEffect(() => {
    if (!section) return
    const id = section.startsWith('#') ? section.slice(1) : section
    const el = document.getElementById(id)
    if (el) {
      // 让浏览器原生 anchor 滚动生效（scroll-margin-top 已在 SECTION_STYLE 设置）。
      el.scrollIntoView({ behavior: 'auto', block: 'start' })
    }
  }, [section])

  const activeSection = section ?? 'intro'
  const goSection = (key: string) => {
    navigate(`/docs/${key}`)
    document.getElementById(key)?.scrollIntoView({ behavior: 'auto', block: 'start' })
  }

  return (
    <div className="docs-layout">
      {/* 左：路由感知 TOC，避免 antd Anchor 把 hash 改成 #id。 */}
      <aside className="docs-toc" aria-label="文档目录">
        {TOC_ITEMS.map((item) => (
          <a
            key={item.key}
            className={item.key === activeSection ? 'docs-toc-link docs-toc-link-active' : 'docs-toc-link'}
            href={`#/docs/${item.key}`}
            onClick={(event) => {
              event.preventDefault()
              goSection(item.key)
            }}
          >
            {item.title}
          </a>
        ))}
      </aside>

      {/* 右：内容 */}
      <main className="docs-content">
          {/* 1. 介绍 */}
          <section id="intro" style={SECTION_STYLE}>
            <Title level={1} style={{ marginTop: 0 }}>
              data-grid
            </Title>
            <Paragraph>
              <Text strong>data-grid</Text> 以 antd Table 兼容 API 为主导，在 props
              层面、配置上下文层面和主题 CSS 变量层面提供兼容。data-grid 自有属性集中在{' '}
              <Text code>gridOptions</Text> 与 <Text code>gridColumnOptions</Text>，不占用
              antd 顶层字段，降低未来版本兼容风险。
            </Paragraph>
            <Paragraph>
              虚拟滚动面向 Excel 级数据规模优化，可选 HTML 元素渲染模式突破 React
              渲染瓶颈。在 <a href="#/demos/virtual-list-recycling">1048576 行 17 列</a>{' '}
              数据上快速不间断滚动时，约 40 FPS。
            </Paragraph>
            <Paragraph type="secondary" style={{ fontSize: 12, marginTop: -4 }}>
              测试环境为 Windows 11 25H2 Build 26200.8737, Microsoft Edge 150,
              Intel Core i5 13600K, DDR4 3200 MT/s 双通道。
            </Paragraph>
            <Paragraph>
              它通过 CSS grid 和悬浮滚动条从根本上规避 antd Table 难以彻底消除的一类问题，
              包括滚动条抖动、列宽不服从配置、固定列和拖拽体验不稳定等。
            </Paragraph>
          </section>

          {/* 2. 快速开始 */}
          <section id="quick-start" style={SECTION_STYLE}>
            <Title level={2}>快速开始</Title>
            <Paragraph>
              从 <Text code>./table</Text> 导入 <Text code>Table</Text>，传{' '}
              <Text code>columns</Text> 与 <Text code>dataSource</Text> 即可：
            </Paragraph>
            <Code>{`import { Table } from './table'
import type { ColumnType } from './table/types'

interface Record { key: string; name: string; age: number }

const columns: ColumnType<Record>[] = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Age', dataIndex: 'age', key: 'age', align: 'end' },
]

const data: Record[] = [
  { key: '1', name: 'Alice', age: 28 },
  { key: '2', name: 'Bob', age: 34 },
]

export default function Demo() {
  return <Table columns={columns} dataSource={data} />
}`}</Code>
            <Paragraph>
              也可用 <Text strong>JSX 风格</Text>声明列：
            </Paragraph>
            <Code>{`import { Table } from './table'

<Table dataSource={data}>
  <Table.Column title="Name" dataIndex="name" key="name" />
  <Table.Column title="Age" dataIndex="age" key="age" />
</Table>`}</Code>
          </section>

          {/* 3. Table API */}
          <section id="table-api" style={SECTION_STYLE}>
            <Title level={2}>Table API</Title>
            <Paragraph type="secondary">
              <Text code>&lt;Table&gt;</Text> 的 props（以{' '}
              <Text code>src/table/types.ts</Text> 的{' '}
              <Text code>TableProps</Text> 导出为准）。
            </Paragraph>
            <ApiTable rows={TABLE_API_ROWS} />
            <Title level={4}>Table 静态属性</Title>
            <ul style={{ paddingLeft: 20, lineHeight: 2 }}>
              <li>
                <Text code>Table.Column</Text>
                <span style={{ color: 'rgba(0,0,0,0.65)' }}>
                  {' '}
                  — JSX 子元素声明单列（叶子列，禁止 children）。
                </span>
              </li>
              <li>
                <Text code>Table.ColumnGroup</Text>
                <span style={{ color: 'rgba(0,0,0,0.65)' }}>
                  {' '}
                  — JSX 子元素声明多级表头分组列。
                </span>
              </li>
              <li>
                <Text code>Table.EXPAND_COLUMN</Text>
                <span style={{ color: 'rgba(0,0,0,0.65)' }}>
                  {' '}
                  — 展开列占位哨兵，插入 columns 数组控制展开列位置。
                </span>
              </li>
              <li>
                <Text code>Table.SELECTION_COLUMN</Text>
                <span style={{ color: 'rgba(0,0,0,0.65)' }}>
                  {' '}
                  — 选择列占位哨兵，控制选择列位置。
                </span>
              </li>
              <li>
                <Text code>Table.Summary</Text> /{' '}
                <Text code>Table.Summary.Row</Text> /{' '}
                <Text code>Table.Summary.Cell</Text>
                <span style={{ color: 'rgba(0,0,0,0.65)' }}>
                  {' '}
                  — 汇总栏组件族（fixed: true 时 sticky bottom）。
                </span>
              </li>
              <li>
                <Text code>Table.SELECTION_ALL</Text> /{' '}
                <Text code>Table.SELECTION_INVERT</Text> /{' '}
                <Text code>Table.SELECTION_NONE</Text>
                <span style={{ color: 'rgba(0,0,0,0.65)' }}>
                  {' '}
                  — rowSelection.selections 内置哨兵项。
                </span>
              </li>
            </ul>
          </section>

          {/* 4. column API */}
          <section id="column-api" style={SECTION_STYLE}>
            <Title level={2}>column API</Title>
            <Paragraph type="secondary">
              <Text code>columns[]</Text> 中每列的字段（以{' '}
              <Text code>ColumnType</Text> 导出为准；多级表头用{' '}
              <Text code>children</Text> 嵌套）。
            </Paragraph>
            <ApiTable rows={COLUMN_API_ROWS} />
          </section>

          {/* 5. 与 antd 差异 */}
          <section id="antd-diffs" style={SECTION_STYLE}>
            <Title level={2}>与 antd 差异</Title>
            <Paragraph type="secondary">
              已知差异（迁移时需注意的点）。
            </Paragraph>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
              {ANTD_DIFFS.map((d, i) => (
                <div
                  key={d.title}
                  style={{
                    border: '1px solid #f0f0f0',
                    borderRadius: 6,
                    padding: '12px 16px',
                    background: '#fafafa',
                  }}
                >
                  <div style={{ marginBottom: 6 }}>
                    <Tag color="orange" style={{ marginRight: 8 }}>
                      差异 {i + 1}
                    </Tag>
                    <Text strong>{d.title}</Text>
                  </div>
                  <div style={{ color: 'rgba(0,0,0,0.75)', fontSize: 13, lineHeight: 1.7 }}>
                    {d.desc}
                  </div>
                </div>
              ))}
            </div>
          </section>
      </main>
    </div>
  )
}
