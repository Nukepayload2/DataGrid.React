import { Typography } from 'antd'
import {
  ApiRefTable,
  DocSection,
  DocsActionList,
  DocsNote,
  getApiMembers,
} from '../components'
import type { DocsPageContext } from '../types'

const { Text } = Typography

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
