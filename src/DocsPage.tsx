/**
 * DocsPage（Part 2）—— data-grid 类 antd 文档页（实质内容）。
 *
 * 左 Affix + Anchor TOC（6 章 id 锚点），右内容区（maxWidth ~900）。
 * 内容来源：`src/table/types.ts` 公开类型（TableProps / ColumnType / Expandable /
 * TableRowSelection / TablePaginationConfig / TableComponents 等导出注释），
 * 以及 `src/demos/index.ts` 各 demo description 反映的能力面。
 *
 * App.tsx 用默认导入：`import DocsPage from './DocsPage'`。
 * 可选 props.section（来自路由 `#/docs/<section>`）—— 挂载后滚到对应 id。
 */

import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { Affix, Anchor, Col, Row, Typography, Alert, Tag } from 'antd'
import type { AnchorProps } from 'antd'

const { Title, Paragraph, Text } = Typography

/** TOC 项（与章节 id 对应）。 */
const TOC_ITEMS: AnchorProps['items'] = [
  { key: 'intro', href: '#intro', title: '介绍' },
  { key: 'features', href: '#features', title: '特性' },
  { key: 'quick-start', href: '#quick-start', title: '快速开始' },
  { key: 'table-api', href: '#table-api', title: 'Table API' },
  { key: 'column-api', href: '#column-api', title: 'column API' },
  { key: 'antd-diffs', href: '#antd-diffs', title: '与 antd 差异' },
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
  fontSize: 13,
  lineHeight: 1.6,
  margin: '12px 0',
}

/** API 表行数据。 */
interface ApiRow {
  prop: string
  desc: string
  type: string
  def: string
}

/** 渲染 API 表（简单 table，避免 antd Table 嵌套展示的样式噪音）。 */
function ApiTable({ rows }: { rows: ApiRow[] }) {
  return (
    <div style={{ overflowX: 'auto', margin: '12px 0 20px' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 13,
          minWidth: 600,
        }}
      >
        <thead>
          <tr style={{ background: 'rgba(0,0,0,0.02)', textAlign: 'left' }}>
            <th style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', width: '22%' }}>
              属性
            </th>
            <th style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>说明</th>
            <th style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', width: '30%' }}>
              类型
            </th>
            <th style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', width: '14%' }}>
              默认值
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.prop}>
              <td
                style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid #f5f5f5',
                  verticalAlign: 'top',
                }}
              >
                <Text code style={{ fontSize: 12 }}>
                  {r.prop}
                </Text>
              </td>
              <td
                style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid #f5f5f5',
                  color: 'rgba(0,0,0,0.75)',
                  verticalAlign: 'top',
                }}
              >
                {r.desc}
              </td>
              <td
                style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid #f5f5f5',
                  verticalAlign: 'top',
                }}
              >
                <Text code style={{ fontSize: 12 }}>
                  {r.type}
                </Text>
              </td>
              <td
                style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid #f5f5f5',
                  color: 'rgba(0,0,0,0.45)',
                  verticalAlign: 'top',
                  fontSize: 12,
                }}
              >
                {r.def}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
  { prop: 'columns', desc: '列定义数组；可混入 Table.EXPAND_COLUMN / Table.SELECTION_COLUMN 哨兵控制展开/选择列位置；与 JSX children（<Table.Column>/<Table.ColumnGroup>）二选一，两者都传时 columns 优先。', type: 'ColumnType[] | 哨兵混入', def: '-' },
  { prop: 'dataSource', desc: '数据源数组（record[]）。树形数据时 record[childrenColumnName] 非空数组视为子行。', type: 'RecordType[]', def: '-' },
  { prop: 'rowKey', desc: '行 key 取值方式：字符串（record 字段名）或函数 (record)=>string|number。用于行选择/展开/虚拟 scrollTo({key}) 等。', type: 'string | ((record)=>Key)', def: '-' },
  { prop: 'column', desc: 'Table 级列默认属性（v6），浅合并到每列（含多级表头递归）；列自身同名字段覆盖。哨兵豁免（不破坏引用相等）。', type: 'Partial<ColumnType>', def: '-' },
  { prop: 'bordered', desc: '是否显示边框。与固定列/多级表头组合时边框按 grid track 渲染。', type: 'boolean', def: 'false' },
  { prop: 'size', desc: '表格尺寸。同时兼容 v5 的 middle 与 v6 的 medium（视觉等价）；compact 视觉等价 small。', type: "'large' | 'middle' | 'medium' | 'small' | 'compact'", def: "'large'" },
  { prop: 'showHeader', desc: '是否显示表头。', type: 'boolean', def: 'true' },
  { prop: 'title', desc: '表格标题（顶部），接收当前页全量数据（filteredDataSource）。', type: '(currentPageData)=>ReactNode', def: '-' },
  { prop: 'footer', desc: '表格脚注（底部），接收当前页全量数据。', type: '(currentPageData)=>ReactNode', def: '-' },
  { prop: 'scroll', desc: '滚动配置。x=横向内容最小宽（number→px）；y 仅支持 true（数据区域模式：表头固定 + 表体滚动 + 悬浮滚动条，高度 CSS 自动适应，父容器需有约束高），不支持数字。', type: '{ x?: number|string; y?: true }', def: '-' },
  { prop: 'virtual', desc: '虚拟滚动开关。与 scroll.y 组合启用纵向虚拟（只渲染可视区+overscan，行高走 gridOptions.rowHeight 约定）。横向 scroll.x 仍走 M2 容器。', type: 'boolean', def: 'false' },
  { prop: 'gridOptions', desc: 'data-grid 专属命名空间（与 antd 不兼容，T8 硬迁移收口）。含 rowHeight/minRowHeight/maxRowHeight（行高/有界行高模型）、headerHeight（表头行高）、resizable/resizableMinWidth/resizableMaxWidth（M7 列宽拖拽）。', type: '{ rowHeight?, minRowHeight?, maxRowHeight?, headerHeight?, resizable?, resizableMinWidth?, resizableMaxWidth? }', def: '-' },
  { prop: 'tableLayout', desc: '透传到底层布局，本阶段仅接收不强制。', type: "'auto' | 'fixed'", def: '-' },
  { prop: 'rowSelection', desc: '行选择配置。传入即自动插入选择列（默认最前；columns 含 SELECTION_COLUMN 哨兵则插在该位置）。支持 checkbox/radio、受控 selectedRowKeys、getCheckboxProps 禁用、selections 自定义菜单、preserveSelectedRowKeys 跨页保留、checkStrictly 父子联动（树形）、renderCell 自定义勾选格。', type: 'TableRowSelection', def: '-' },
  { prop: 'expandable', desc: '行展开配置。自动插入展开图标列（默认最前；columns 含 EXPAND_COLUMN 哨兵则插该位置），可展开行下方插 0fr↔1fr 过渡 track（纯 CSS 动画）。支持 expandedRowRender、rowExpandable、受控 expandedRowKeys、树形 childrenColumnName/indentSize。', type: 'Expandable', def: '-' },
  { prop: 'pagination', desc: '分页配置。★ data-grid 默认不分页（undefined/false 不渲染分页器、数据全显）；传对象才启用。受控 current/pageSize；placement 为 v6 数组语义（默认 [bottomEnd]）。', type: 'false | TablePaginationConfig', def: 'false' },
  { prop: 'loading', desc: '加载态，用 antd <Spin> 包裹整个表格内容。boolean 或 SpinProps（spinning 字段优先）。', type: 'boolean | SpinProps', def: 'false' },
  { prop: 'onChange', desc: '排序/筛选/分页变化的统一回调：(pagination, filters, sorter, extra)。filters 形态 {[key]: value[]|null}；sorter 0/1 列为对象，>=2 列为数组（按 multiple 升序）；extra.action ∈ sort/filter/paginate。', type: '(pagination, filters, sorter, extra)=>void', def: '-' },
  { prop: 'showSorterTooltip', desc: '全局排序提示 tooltip 开关；单列可由 column.showSorterTooltip 覆盖。', type: 'boolean | { target?: "full-header"|"sorter-icon" }', def: 'true' },
  { prop: 'childrenColumnName', desc: '树形数据子字段名（默认 "children"）。record 此字段非空数组视为子行；expandable.childrenColumnName 优先级更高。', type: 'string', def: "'children'" },
  { prop: 'components', desc: '自定义组件（v6 TableComponents 子集）。body.cell 替换单元格内部内容、body.row 渲染每行包裹层、header.cell 替换表头格。典型：单元格编辑。', type: 'TableComponents', def: '-' },
  { prop: 'classNames', desc: '语义化 classNames（v6），支持对象或 (info)=>对象（按 size/bordered/virtual 动态）。部位：root/section/content/title/footer/header.{wrapper,row,cell}/body.{wrapper,row,cell}/pagination.{root,item}。', type: 'TableClassNames', def: '-' },
  { prop: 'styles', desc: '语义化 styles（v6），结构与 classNames 同构，值为 CSSProperties；同样支持函数。', type: 'TableStyles', def: '-' },
  { prop: 'locale', desc: '本地化文案。本阶段覆盖 emptyText（表体空状态，空数据/筛选无结果共用；ConfigProvider.renderEmpty("Table") 兜底；"Table.filter" 是 filter 下拉内独立语义）。', type: '{ emptyText?: ReactNode }', def: '-' },
  { prop: 'summary', desc: '汇总栏（表体底部）。函数收到当前页数据（pagedDataSource，排序+筛选+分页切片后），返回 Table.Summary/Row/Cell 组合；fixed: true 时 sticky bottom。', type: '((currentPageData)=>ReactNode) | ReactNode', def: '-' },
  { prop: 'sticky', desc: '页面级粘性表头（区别 scroll.y 容器内固定）。表头 position: sticky; top: offsetHeader 相对 viewport；额外渲染底部 StickyScrollBar 同步横向滚动。与 scroll.y 互斥（sticky 优先）。', type: 'boolean | StickyConfig', def: 'false' },
  { prop: 'onHeaderRow', desc: '表头行 props 注入 (columns, index)=>HTMLAttributes。grid 布局下无独立 <tr>，返回值透传到该表头行所有表头格。', type: '(columns, index)=>HTMLAttributes', def: '-' },
  { prop: 'onRow', desc: '表体行 props 注入 (record, index)=>HTMLAttributes。透传到该行所有数据单元格（onClick 等）。注意：返回 onMouseEnter/Leave 会覆盖内置 hover 视觉。', type: '(record, index)=>HTMLAttributes', def: '-' },
  { prop: 'rowClassName', desc: '表体行 className（字符串统一 / 函数按行）。grid 下透传到该行所有单元格 className。', type: 'string | ((record,index)=>string)', def: '-' },
  { prop: 'rowHoverable', desc: '行是否可 hover 高亮（默认 true，hover 加 dg-row-hover 类）。false 仅关内置视觉，不影响 onRow 自定义事件。', type: 'boolean', def: 'true' },
  { prop: 'getPopupContainer', desc: '筛选下拉挂载容器 (triggerNode)=>HTMLElement。Table 级默认，列级 filterDropdownProps.getPopupContainer 优先。', type: '(triggerNode)=>HTMLElement', def: '-' },
  { prop: 'className', desc: '根 className（与 classNames.root 合并到 .dg-wrapper）。', type: 'string', def: '-' },
  { prop: 'style', desc: '根 inline style。', type: 'CSSProperties', def: '-' },
  { prop: 'children', desc: 'JSX 子元素声明列（<Table.Column>/<Table.ColumnGroup>）；columns prop 优先。', type: 'ReactNode', def: '-' },
  { prop: 'ref', desc: 'ref 句柄（TableRef）：scrollTo({index|key|scrollTop|top, offset, align}) 仅虚拟模式生效。', type: 'Ref<TableRef>', def: '-' },
]

const COLUMN_API_ROWS: ApiRow[] = [
  { prop: 'title', desc: '表头文案（任意 ReactNode）。', type: 'ReactNode', def: '-' },
  { prop: 'dataIndex', desc: '字段名/路径，支持 string|number|string[] 路径（与 antd 一致）。', type: 'string | number | (string|number)[]', def: '-' },
  { prop: 'key', desc: '列标识（排序/筛选 onChange 的 columnKey 来源；无 key 时退化为 dataIndex）。', type: 'string | number', def: '-' },
  { prop: 'width', desc: '列宽（number→px，string 原样）。grid track 大小来源。', type: 'number | string', def: '-' },
  { prop: 'align', desc: '对齐（start/center/end）。', type: "Align ('start'|'center'|'end')", def: '-' },
  { prop: 'fixed', desc: '固定列方向。接受 left/right/start/end/boolean（true 等价 left，内部归一化为 start/end）。', type: "FixedInput ('left'|'right'|'start'|'end'|boolean)", def: '-' },
  { prop: 'render', desc: '单元格渲染 (text, record, index)=>ReactNode。', type: '(text, record, index)=>ReactNode', def: '-' },
  { prop: 'ellipsis', desc: '省略号。true 加 ellipsis CSS + 默认 native title；{ showTitle:false } 关 title 让 render 内接 Tooltip；false/undefined 不省略。', type: 'boolean | { showTitle?: boolean }', def: 'false' },
  { prop: 'hidden', desc: '隐藏该叶子列（grid track 置 0fr + visibility:hidden，线号不变，0fr↔原宽 过渡）。分组列 hidden 无效（隐藏通过隐藏子叶子实现）。', type: 'boolean', def: 'false' },
  { prop: 'children', desc: '子列（多级表头，任意深度）。有 children 时该列视为分组列；叶子属性取自无 children 节点。', type: 'ColumnType[]', def: '-' },
  { prop: 'colSpan', desc: '表头格横向跨列数（单层表头里某列跨多列）。N>=2 时后续 N-1 个叶子列须 colSpan:0。与 children 多级表头不同机制，勿混用。', type: 'number', def: '1' },
  { prop: 'rowScope', desc: '行语义 "row"：该列渲染为 <th scope="row">（首列常用，视觉加粗）。不影响布局。', type: "'row'", def: '-' },
  { prop: 'onCell', desc: '单元格事件 + 合并入口 (record,index)=>{colSpan?,rowSpan?,onClick?,...}。colSpan/rowSpan 接入 M3 合并算法（0=被覆盖不渲染）；其余字段透传给 components.body.cell（编辑 props）。', type: '(record, index)=>Record<string, any>', def: '-' },
  { prop: 'onHeaderCell', desc: '表头格 props 注入 (column, index)=>HTMLAttributes。典型：列拖拽 dnd 标识。与 onCell 对称（表头 vs 数据格）。', type: '(column, index)=>HTMLAttributes', def: '-' },
  { prop: 'sorter', desc: '排序器。true=默认比较（按 dataIndex 升序）；函数=自定义 (a,b,sortOrder?)=>number；{ compare, multiple }=多列排序（multiple=优先级数字）。', type: 'boolean | CompareFn | { compare?, multiple? }', def: '-' },
  { prop: 'sortOrder', desc: '受控排序方向（ascend/descend/null）。传入即受控，引擎不主动排序。与 defaultSortOrder 互斥，sortOrder 优先。', type: "SortOrder ('ascend'|'descend'|null)", def: '-' },
  { prop: 'defaultSortOrder', desc: '非受控初始排序方向（仅 sortOrder 未传时生效）。', type: 'SortOrder', def: '-' },
  { prop: 'sortDirections', desc: '点击表头切换排序的循环顺序（不含 null；末尾隐式回退 null 取消）。', type: "Array<'ascend'|'descend'>", def: "['ascend','descend']" },
  { prop: 'showSorterTooltip', desc: '该列是否显示排序提示 tooltip（覆盖 Table.showSorterTooltip）。', type: 'boolean | { target? }', def: '-' },
  { prop: 'filters', desc: '筛选项列表 [{text, value, children?}]。非空 + 配 onFilter 时渲染漏斗；children 用于 S7 树形筛选（menu 模式扁平化）。', type: 'ColumnFilterItem[]', def: '-' },
  { prop: 'onFilter', desc: '筛选判定 (value, record)=>boolean。true=命中；多选命中任一保留（OR 语义）。', type: '(value, record)=>boolean', def: '-' },
  { prop: 'filterMultiple', desc: '是否多选（Checkbox.Group）。false=单选 Radio.Group。', type: 'boolean', def: 'true' },
  { prop: 'filterMode', desc: '筛选下拉模式。menu=内置扁平下拉；tree=内置树形下拉（antd <Tree checkable>，父子联动）。filterDropdown 存在时取代两者。', type: "'menu' | 'tree'", def: "'menu'" },
  { prop: 'filterSearch', desc: '筛选项搜索。true=默认 contains（item.text trim+toLowerCase）；函数=自定义 (input, record)=>boolean。仅内置下拉生效，自定义面板不消费。', type: 'true | ((input, record)=>boolean)', def: '-' },
  { prop: 'filterDropdown', desc: '自定义筛选下拉面板（取代内置 Checkbox/Radio/Tree）。函数收 props（selectedKeys/setSelectedKeys/confirm/clearFilters/close/visible/filters/prefixCls），也可直接传 ReactNode。', type: 'ReactNode | ((props: FilterDropdownProps)=>ReactNode)', def: '-' },
  { prop: 'filterIcon', desc: '自定义漏斗图标 (filtered:boolean)=>ReactNode，或直接 ReactNode。缺省 FilterOutlined/FilterFilled。', type: 'ReactNode | ((filtered)=>ReactNode)', def: '-' },
  { prop: 'filterDropdownProps', desc: '透传给筛选下拉 antd Dropdown 的 props（受控 open/onOpenChange、triggerClassName/overlayClassName/getPopupContainer/align）。', type: 'ColumnFilterDropdownProps', def: '-' },
  { prop: 'filteredValue', desc: '受控筛选值（传入即受控，引擎不主动过滤）。[] 显式空、非空激活、undefined 非受控。', type: '(string|number)[] | null', def: '-' },
  { prop: 'defaultFilteredValue', desc: '非受控初始筛选值（filteredValue 未传时生效）。', type: '(string|number)[]', def: '-' },
  { prop: 'filterOnClose', desc: '关闭下拉即应用筛选（对齐 v6 默认）。false=必须点确定才应用。', type: 'boolean', def: 'true' },
  { prop: 'responsive', desc: '响应式列显隐（Breakpoint[]）。仅当任一列出的断点在当前视口激活时该列才显示，否则整体移除（表头+表体不渲染）。断点：xs/sm/md/lg/xl/xxl/xxxl（含及以上）。', type: 'Breakpoint[]', def: '-' },
  { prop: 'shouldCellUpdate', desc: '单元格重渲染优化 (prevRecord, nextRecord)=>boolean。false 不重渲染。仅 components.body.cell 提供时消费。', type: '(prevRecord, nextRecord)=>boolean', def: '-' },
  { prop: 'className', desc: '该列单元格额外 className（透传到本列所有 dg-cell-body + dg-cell-header）。', type: 'string', def: '-' },
  { prop: 'style', desc: '该列单元格额外 inline style（透传到本列所有单元格，覆盖同名字段）。', type: 'CSSProperties', def: '-' },
]

const FEATURE_LIST: Array<{ title: string; desc: string }> = [
  { title: '多级表头', desc: 'children 任意深度嵌套；分组列随之自动跨列。' },
  { title: '左右固定列', desc: "fixed: 'left'|'right'|true，sticky 偏移按叶子列宽累加。" },
  { title: '单元格合并', desc: 'onCell 返回 colSpan/rowSpan；表头用 column.colSpan 跨列。' },
  { title: '万行虚拟滚动', desc: 'virtual + scroll.y；只渲染可视区+overscan；ref.scrollTo({index|key|scrollTop})。' },
  { title: '单列 / 多列排序', desc: 'sorter（boolean|fn|{compare,multiple}）；sortOrder 受控/非受控；sortDirections 循环。' },
  { title: '菜单 / 树形 / 自定义筛选', desc: 'filters+onFilter；filterMode=menu|tree；filterDropdown 自定义面板；filterSearch 搜索项。' },
  { title: '行选择 + 自定义菜单', desc: 'rowSelection（checkbox/radio、selections、preserveSelectedRowKeys、renderCell）。' },
  { title: '行展开与嵌套表', desc: 'expandable（0fr↔1fr CSS 过渡 track）；EXPAND_COLUMN 哨兵控位置。' },
  { title: '树形数据', desc: 'childrenColumnName；缩进展开；checkStrictly 父子勾选联动。' },
  { title: '单元格 / 行编辑', desc: 'components.body.cell/row + onCell 注入编辑 props；shouldCellUpdate 性能优化。' },
  { title: '行 / 列拖拽排序', desc: '行拖拽（pointer，指示线+arrayMove）；列拖拽（onHeaderCell 注入 dnd 标识）。' },
  { title: '分页', desc: 'pagination（v6 placement 数组语义）；默认不分页。' },
  { title: '服务端模式', desc: 'loading + 受控 dataSource/sortOrder/filteredValue/pagination；preserveSelectedRowKeys 跨页。' },
  { title: '主题（dark/light + token）', desc: '兼容 antd v6 CSS variables（--ant-*）；ConfigProvider theme.components.Table token 注入。' },
  { title: '列省略 / Tooltip', desc: 'ellipsis（默认 native title；{showTitle:false} 接管 Tooltip）。' },
  { title: '列宽拖拽', desc: 'resizable + resizableMinWidth/resizableMaxWidth（pointer 实时改宽）。' },
  { title: '响应式断点显隐', desc: 'column.responsive（Breakpoint[]），不匹配则整列移除。' },
  { title: '页面级粘性表头', desc: 'sticky（相对 viewport 固定 + 底部悬浮横向滚动条）。' },
  { title: '隐藏列动画', desc: 'column.hidden（grid track 0fr↔原宽 过渡，线号稳定）。' },
  { title: '语义化样式', desc: 'classNames/styles（对象或函数），root/section/content/header.{wrapper,row,cell}/body.*/pagination.{root,item}。' },
]

const ANTD_DIFFS: Array<{ title: string; desc: string }> = [
  {
    title: '渲染层：CSS Grid 而非 <table>',
    desc: 'data-grid 用 display:grid + grid-template-columns/rows 渲染（div.dg-cell 作 grid item），不使用 <table>/<tr>/<td> 元素。这对 a11y 标记（<th scope>）与屏幕阅读器有取舍——rowScope 列会渲染 <th scope="row"> 语义。',
  },
  {
    title: "scroll.y 仅支持 true | undefined（不支持数字）",
    desc: '决策 7：scroll.y:true 是数据区域模式——表头固定 + 表体滚动 + 悬浮纵向滚动条，高度由纯 CSS（flex/grid）自动适应，不用 JS 算数字。调用方需确保 .dg-wrapper 父容器有明确高度（固定 height / flex / 100vh 等），否则表体高度退化为内容自然高。旧 scroll.y:<number> 语义已废弃，迁移到 true。',
  },
  {
    title: '横向滚动用 macOS 风格悬浮细滚动条',
    desc: '决策 8：scroll.x 启用时隐藏原生横向滚动条，额外渲染 HorizontalFloatingScrollBar（细线 2px + hit 上下各 8px + hover 变粗 8px + 拖动/同步），定位在数据区域底部（summary 上方）。视觉更现代，但行为与原生等价。',
  },
  {
    title: '默认不分页',
    desc: 'data-grid 的 pagination 默认 undefined/false 不渲染分页器、数据全显（与 antd 默认开启分页不同）。显式传 pagination 对象才启用。',
  },
  {
    title: 'components.body.cell 替换的是单元格内容（非整个 td）',
    desc: '因无 td（用 div.dg-cell 作 grid item），body.cell 替换的是 dg-cell div 内部内容（返回 ReactNode），而非整个 td。其余 dg-cell div（grid 定位/sticky/hover/align）由引擎维持。body.row 渲染每行包裹层（Form/Context）而非 <tr>。',
  },
  {
    title: 'onRow / rowClassName / onHeaderRow 透传到该行所有单元格',
    desc: 'grid 布局下无独立 <tr>，行级 props（事件/className/style）透传到该行每个 grid item 单元格。注意 onRow 返回 onMouseEnter/Leave 会覆盖引擎内置 hover（dg-row-hover），如需保留 hover 请自行处理或 rowHoverable:false。',
  },
  {
    title: 'filterDropdown.prefixCls 恒定 dg-filter',
    desc: '自定义筛选面板收到的 prefixCls 本实现恒定为 "dg-filter"（data-grid 自有样式前缀），保留字段以兼容 antd demo 原样拷贝。filters 在自定义面板下恒为 []（自定义面板不消费内置筛选项）。',
  },
  {
    title: 'v6 CSS variables（--ant-*）兼容',
    desc: 'data-grid 兼容 antd v6 的 CSS variables 主题层（ConfigProvider 注入的 --ant-* 全套 token）。组件 token（theme.components.Table）也通过 transformToken + realToken 注入到 .dg-wrapper inline style。dark/light 主题随 ConfigProvider 切换。',
  },
  {
    title: '虚拟行高：RO 动态测量（measured-first + 约定兜底）',
    desc: '决策 1：仅指不实现 antd measureRowRender 糟粕兼容 API（隐藏测量行重渲染），与虚拟路径采用的 virtuoso 式 RO 测量是两回事。虚拟路径行高：useRowMeasurements 实测每行真实 DOM 高（measured-first）+ getRowHeight 约定 rowHeight 未测兜底；非虚拟路径走约定 track 不测。决策 2：展开内容不参与虚拟窗口大小（窗口按"收起状态"行高算 offset/padding，展开溢出渲染，牺牲性能换稳定）。',
  },
  {
    title: 'size 同时兼容 v5 middle 与 v6 medium',
    desc: "size 接受 'large'|'middle'|'medium'|'small'|'compact'。'middle'（v5）与 'medium'（v6）视觉等价（共用 dg-size-middle）；'compact' 视觉等价 'small'（antd Table 本身无 compact size，保留仅供 ConfigProvider componentSize 兜底）。",
  },
]

export default function DocsPage({ section }: { section?: string }) {
  const contentRef = useRef<HTMLDivElement>(null)

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

  return (
    <Row gutter={24} style={{ alignItems: 'flex-start' }}>
      {/* 左：Affix + Anchor TOC */}
      <Col style={{ width: 220, flex: '0 0 220px' }}>
        <Affix offsetTop={64}>
          <Anchor
            items={TOC_ITEMS}
            offsetTop={64}
            targetOffset={80}
            affix={false}
            style={{ padding: '8px 0' }}
          />
        </Affix>
      </Col>

      {/* 右：内容 */}
      <Col flex="1 1 0">
        <div ref={contentRef} style={{ maxWidth: 900, padding: '0 16px 48px' }}>
          {/* 1. 介绍 */}
          <section id="intro" style={SECTION_STYLE}>
            <Title level={1} style={{ marginTop: 0 }}>
              data-grid
            </Title>
            <Paragraph>
              <Text strong>data-grid</Text> 是用{' '}
              <Text code>display:grid</Text> +{' '}
              <Text code>grid-template-columns</Text>/{' '}
              <Text code>grid-template-rows</Text>{' '}
              重新实现的 antd <Text code>Table</Text>——兼容 antd{' '}
              <Text mark>v6 CSS variables（--ant-*）</Text> 与 React 接口。它是纯
              React 实现，<Text strong>不使用 &lt;table&gt; 元素</Text>
              （用 div.dg-cell 作 grid item），所有列结构、固定列、合并、虚拟滚动等
              都在 grid 布局上原生化重做。
            </Paragraph>
            <Paragraph>
              非核心控件（pagination、filter 下拉、tooltip、Spin、Dropdown 等）复用
              antd，既保证视觉一致又减少自研负担。目标是：在 grid 渲染层获得{' '}
              <Text strong>任意深度多级表头、固定列与数据流正交、0fr↔1fr 过渡动画</Text>{' '}
              等用 &lt;table&gt; 难以实现的能力，同时保持 antd Table 的 API{' '}
              <Text strong>直接替换</Text>体验。
            </Paragraph>
            <Alert
              type="info"
              showIcon
              style={{ margin: '16px 0' }}
              title="设计目标"
              description={
                <span>
                  用 CSS Grid 重做 antd Table，接口与 antd v6 同名同语义，便于直接替换；视觉与
                  antd v6 CSS variables 主题层完全兼容（含 dark/light + 组件 token）。
                </span>
              }
            />
          </section>

          {/* 2. 特性 */}
          <section id="features" style={SECTION_STYLE}>
            <Title level={2}>特性</Title>
            <Paragraph type="secondary">
              data-grid 覆盖 antd Table 几乎全部常用能力，并在 grid 渲染层上获得原生化的组合（固定列×多级表头×虚拟×合并 等正交）。
            </Paragraph>
            <ul style={{ paddingLeft: 20, lineHeight: 2 }}>
              {FEATURE_LIST.map((f) => (
                <li key={f.title}>
                  <Text strong>{f.title}</Text>
                  <span style={{ color: 'rgba(0,0,0,0.65)' }}> — {f.desc}</span>
                </li>
              ))}
            </ul>
            <Paragraph type="secondary" style={{ marginTop: 12 }}>
              每项特性都有对应的对比 demo（见首页「Demos」），可与 antd 原生并排对照。
            </Paragraph>
          </section>

          {/* 3. 快速开始 */}
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
              也可用 <Text strong>JSX 风格</Text>声明列（与 antd jsx demo 一致）：
            </Paragraph>
            <Code>{`import { Table } from './table'

<Table dataSource={data}>
  <Table.Column title="Name" dataIndex="name" key="name" />
  <Table.Column title="Age" dataIndex="age" key="age" />
</Table>`}</Code>
            <Alert
              type="warning"
              showIcon
              style={{ margin: '16px 0' }}
              title="默认不分页"
              description={
                <span>
                  与 antd 默认开启分页不同，data-grid 的{' '}
                  <Text code>pagination</Text> 默认 <Text code>undefined</Text>/
                  <Text code>false</Text> 时<strong>不渲染分页器、数据全显</strong>
                  。需要分页请显式传 <Text code>{'pagination={{ current: 1, pageSize: 10 }}'}</Text>。
                </span>
              }
            />
          </section>

          {/* 4. Table API */}
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

          {/* 5. column API */}
          <section id="column-api" style={SECTION_STYLE}>
            <Title level={2}>column API</Title>
            <Paragraph type="secondary">
              <Text code>columns[]</Text> 中每列的字段（以{' '}
              <Text code>ColumnType</Text> 导出为准；多级表头用{' '}
              <Text code>children</Text> 嵌套）。
            </Paragraph>
            <ApiTable rows={COLUMN_API_ROWS} />
            <Alert
              type="info"
              showIcon
              style={{ margin: '16px 0 0' }}
              title="colSpan 与 children 不混用"
              description={
                <span>
                  <Text code>column.colSpan</Text>（单层表头里某列横向跨多列）与{' '}
                  <Text code>children</Text>（多级表头多层结构）是{' '}
                  <strong>不同机制</strong>，不要在同一列上混用（与 antd 行为一致）。
                </span>
              }
            />
          </section>

          {/* 6. 与 antd 差异 */}
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
            <Alert
              type="success"
              showIcon
              style={{ margin: '24px 0 0' }}
              title="其余 API 与 antd v6 同名同语义"
              description={
                <span>
                  未列出的字段（rowSelection、expandable、pagination、onChange 等签名）均与
                  antd v6 同语义，可直接替换；个别字段类型签名因 grid 渲染有适配说明，详见
                  <Text code> src/table/types.ts</Text> 各字段注释。
                </span>
              }
            />
          </section>
        </div>
      </Col>
    </Row>
  )
}
