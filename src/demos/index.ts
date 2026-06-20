import type { DemoMeta } from './registry'

/**
 * demo 注册表。后续任务把自己的 demo 加到这里即可挂到路由。
 */
export const demos: DemoMeta[] = [
  {
    name: 'basic',
    title: 'Basic',
    description: '最简表格，对齐 antd basic demo（F1/F2/F3/F4 验收基线）。',
    element: () => import('./basic'),
  },
  {
    name: 'grouping-columns',
    title: 'Grouping Columns',
    description: '多级表头，任意深度嵌套 children（M1 移植任务）。',
    element: () => import('./grouping-columns'),
  },
  {
    name: 'fixed-columns',
    title: 'Fixed Columns',
    description: '左右固定列 + 横向滚动 sticky（M2 移植任务）。',
    element: () => import('./fixed-columns'),
  },
  {
    name: 'fixed-gapped-columns',
    title: 'Fixed Gapped Columns',
    description: '分散固定列堆叠 + bordered（M2 移植任务）。',
    element: () => import('./fixed-gapped-columns'),
  },
  {
    name: 'fixed-columns-header',
    title: 'Fixed Columns Header',
    description: '固定列 + 表头纵向固定（列固定 M2 + 表头固定 M8，corner cell 双 sticky）。',
    element: () => import('./fixed-columns-header'),
  },
  {
    name: 'fixed-header',
    title: 'Fixed Header',
    description: '固定表头：scroll.y 表体限高纵向滚动、表头 sticky top 钉顶（M8 移植任务）。',
    element: () => import('./fixed-header'),
  },
  {
    name: 'colspan-rowspan',
    title: 'ColSpan / RowSpan',
    description: '合并单元格：表头列合并 + 单元格行/列合并（M3 移植任务）。',
    element: () => import('./colspan-rowspan'),
  },
  {
    name: 'virtual-list',
    title: 'Virtual List',
    description: '万行虚拟滚动 + 固定列 + scrollTo + 合并（M4 移植任务）。',
    element: () => import('./virtual-list'),
  },
  {
    name: 'row-selection',
    title: 'Row Selection',
    description: '行选择状态机：checkbox/radio 切换、getCheckboxProps 禁用、onChange（M5 移植任务）。',
    element: () => import('./row-selection'),
  },
  {
    name: 'row-selection-and-operation',
    title: 'Row Selection & Operation',
    description: '受控 selectedRowKeys + 批量操作清空（S8 自研任务）。',
    element: () => import('./row-selection-and-operation'),
  },
  {
    name: 'row-selection-custom',
    title: 'Row Selection Custom',
    description: 'rowSelection.selections 自定义选择项菜单（S9 自研任务）。',
    element: () => import('./row-selection-custom'),
  },
  {
    name: 'hidden-columns',
    title: 'Hidden Columns',
    description: '隐藏列 column.hidden + grid track 0fr↔原宽 过渡（M6 移植任务）。',
    element: () => import('./hidden-columns'),
  },
  {
    name: 'resizable',
    title: 'Resizable Columns',
    description: '列宽拖拽调整 resizable + pointer 拖拽 + min/max 约束（M7 移植任务）。',
    element: () => import('./resizable'),
  },
  {
    name: 'expand',
    title: 'Expand',
    description: '行展开 expandable：grid 0fr↔1fr 过渡 + 展开图标列 + rowExpandable 禁用（M9 移植任务）。',
    element: () => import('./expand'),
  },
  {
    name: 'expand-sticky',
    title: 'Expand Sticky',
    description: '展开列位置（Table.EXPAND_COLUMN）+ 合并行 × 展开组合（M9 移植任务）。',
    element: () => import('./expand-sticky'),
  },
  {
    name: 'order-column',
    title: 'Order Column',
    description: 'Table.EXPAND_COLUMN + Table.SELECTION_COLUMN 哨兵控制展开/选择列位置（M9 + M5）。',
    element: () => import('./order-column'),
  },
  {
    name: 'head',
    title: 'Head (Sorter & Filter)',
    description: '单列排序 sorter + 基础列筛选 filters/onFilter/filterMultiple/filterOnClose（S1 + S3 自研任务）。',
    element: () => import('./head'),
  },
  {
    name: 'multiple-sorter',
    title: 'Multiple Sorter',
    description: '多列排序 sorter.multiple 优先级 + 表头优先级序号 + onChange 数组（S2 自研任务）。',
    element: () => import('./multiple-sorter'),
  },
  {
    name: 'reset-filter',
    title: 'Reset Filter',
    description: '受控 filteredValue/sortOrder 组合 + 外部按钮一键重置（须指定 column.key）（S4 自研任务）。',
    element: () => import('./reset-filter'),
  },
  {
    name: 'custom-filter-panel',
    title: 'Custom Filter Panel',
    description: 'filterDropdown（自定义下拉 + Input 搜索 + 高亮）+ filterIcon + filterDropdownProps + confirm/clearFilters（S5 自研任务）。',
    element: () => import('./custom-filter-panel'),
  },
  {
    name: 'filter-search',
    title: 'Filter Search',
    description: 'filterSearch（true 默认 contains / 函数自定义）：内置 menu 面板顶部搜索框实时过滤筛选项（S6 自研任务）。',
    element: () => import('./filter-search'),
  },
  {
    name: 'filter-in-tree',
    title: 'Filter In Tree',
    description: 'filterMode=tree 树形筛选 + children + filterSearch（S7 自研任务）。',
    element: () => import('./filter-in-tree'),
  },
  {
    name: 'pagination',
    title: 'Pagination',
    description: '分页集成 + placement 位置（S11 自研任务）。',
    element: () => import('./pagination'),
  },
  {
    name: 'ajax',
    title: 'Ajax',
    description:
      '远程数据 loading + 服务端分页/排序/筛选 + preserveSelectedRowKeys（S12 自研任务，本地 mock）。',
    element: () => import('./ajax'),
  },
  {
    name: 'tree-data',
    title: 'Tree Data',
    description:
      '树形数据 childrenColumnName + 缩进展开 + checkStrictly 父子联动（S13 自研任务）。',
    element: () => import('./tree-data'),
  },
  {
    name: 'tree-table-preserveSelectedRowKeys',
    title: 'Tree Table Preserve Selected',
    description:
      '树形×分页×checkStrictly×preserveSelectedRowKeys（issue #50621，S14 自研任务）。',
    element: () => import('./tree-table-preserveSelectedRowKeys'),
  },
  {
    name: 'edit-cell',
    title: 'Edit Cell',
    description:
      'components.body.cell/row + onCell 编辑 + 增删行 + shouldCellUpdate（S15 自研任务）。',
    element: () => import('./edit-cell'),
  },
  {
    name: 'edit-row',
    title: 'Edit Row',
    description:
      '行级编辑 editingKey + Edit/Save/Cancel + InputNumber(age)/Input + 100行分页 + Form外层（S16 自研任务）。',
    element: () => import('./edit-row'),
  },
  {
    name: 'drag-sorting',
    title: 'Drag Sorting',
    description:
      '行拖拽排序（S17 自研任务；方案 B 自研 pointer，不依赖 @dnd-kit/*，指示线 + arrayMove）。',
    element: () => import('./drag-sorting'),
  },
  {
    name: 'drag-sorting-handler',
    title: 'Drag Sorting Handler',
    description:
      '手柄列拖拽排序（S18 自研任务，复用 S17 useRowDragSort + handleSelector 限定手柄列触发）。',
    element: () => import('./drag-sorting-handler'),
  },
  {
    name: 'drag-column-sorting',
    title: 'Drag Column Sorting',
    description:
      '列拖拽排序（S19 自研任务，列方向 useColumnDragSort）。',
    element: () => import('./drag-column-sorting'),
  },
  {
    name: 'ellipsis',
    title: 'Ellipsis',
    description:
      'column.ellipsis 省略号 + 默认 title 提示（S20 自研任务）。',
    element: () => import('./ellipsis'),
  },
  {
    name: 'ellipsis-custom-tooltip',
    title: 'Ellipsis Custom Tooltip',
    description:
      'ellipsis showTitle:false + 自定义 Tooltip（S21 自研任务）。',
    element: () => import('./ellipsis-custom-tooltip'),
  },
  {
    name: 'summary',
    title: 'Summary',
    description:
      'summary 总结栏 + Table.Summary/Row/Cell + fixed（S22 自研任务）。',
    element: () => import('./summary'),
  },
  {
    name: 'custom-empty',
    title: 'Custom Empty',
    description:
      'locale.emptyText + ConfigProvider.renderEmpty 自定义空状态（S23 自研任务）。',
    element: () => import('./custom-empty'),
  },
  {
    name: 'nested-table',
    title: 'Nested Table',
    description:
      '展开行嵌套子 Table + defaultExpandedRowKeys + 多 size（S24 自研任务）。',
    element: () => import('./nested-table'),
  },
  {
    name: 'tree-table-ellipsis',
    title: 'Tree Table Ellipsis',
    description:
      '树形首列 ellipsis+fixed 组合（issue #36583，S25 自研任务）。',
    element: () => import('./tree-table-ellipsis'),
  },
  {
    name: 'bordered',
    title: 'Bordered',
    description:
      'bordered 边框 + title/footer + 固定列组合边框（S26 自研任务）。',
    element: () => import('./bordered'),
  },
  {
    name: 'size',
    title: 'Size',
    description:
      '尺寸 size：medium（dg-size-middle 12/8）+ small（dg-size-small 8/8）行高 padding 对照（S27 自研任务）。',
    element: () => import('./size'),
  },
  {
    name: 'narrow',
    title: 'Narrow',
    description:
      '窄容器（width:300）+ 200 行 + size=small + pagination defaultCurrent:13（S27 自研任务；窄容器列宽属 §9 gap）。',
    element: () => import('./narrow'),
  },
  {
    name: 'responsive',
    title: 'Responsive',
    description:
      'column.responsive 按断点显隐列（S28 自研任务；Grid.useBreakpoint 检测视口）。',
    element: () => import('./responsive'),
  },
  {
    name: 'style-class',
    title: 'Style Class',
    description:
      'classNames/styles 语义化样式（对象/函数，S29 自研任务）。作用于 root/header.{cell,row,wrapper}/body.{cell,row,wrapper}/title/footer/pagination.{root,item}/section/content。',
    element: () => import('./style-class'),
  },
  {
    name: 'component-token',
    title: 'Component Token',
    description:
      'ConfigProvider theme.components.Table token → CSS variables + 动态面板（S30 自研任务；useToken 读取 + .dg-wrapper inline 注入）。',
    element: () => import('./component-token'),
  },
  {
    name: 'jsx',
    title: 'JSX',
    description:
      'Table.Column/ColumnGroup JSX 子元素声明列（S31 自研任务；children → columns 转换，ColumnGroup 嵌套复用 M1）。',
    element: () => import('./jsx'),
  },
  {
    name: 'column-defaults',
    title: 'Column Defaults',
    description: 'Table 级 column 默认属性，单列覆盖（S32 自研任务）。',
    element: () => import('./column-defaults'),
  },
  {
    name: 'dynamic-settings',
    title: 'Dynamic Settings',
    description: '综合集成验收：全量动态切换（S33 自研任务）。',
    element: () => import('./dynamic-settings'),
  },
  {
    name: 'sticky',
    title: 'Sticky',
    description: 'sticky 页面级表头固定 + offsetHeader + 横向滚动条（S34 自研任务）。',
    element: () => import('./sticky'),
  },
  {
    name: 'nest-table-border-debug',
    title: 'Nest Table Border Debug',
    description:
      '嵌套表格父子 bordered 隔离（主表 + expandedRowRender 子 Table 各自 Switch，D1 边缘任务）。',
    element: () => import('./nest-table-border-debug'),
  },
  {
    name: 'row-selection-custom-debug',
    title: 'Row Selection Custom Debug',
    description:
      'rowSelection.renderCell 自定义勾选格 + rowSpan 合并行（接入 M3 cellMerge，D1 边缘任务）。',
    element: () => import('./row-selection-custom-debug'),
  },
]
