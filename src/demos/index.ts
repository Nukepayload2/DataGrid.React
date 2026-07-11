import type { DemoMeta } from './registry'
export const demos: DemoMeta[] = [
  {
    name: 'basic',
    title: 'Basic',
    description: '最简表格，对齐 antd basic demo（验收基线）+ 双栏对照。',
    element: () => import('./basic'),
    compare: true,
    category: '基础',
  },
  {
    name: 'grouping-columns',
    title: 'Grouping Columns',
    description:
      '多级表头，任意深度嵌套 children + 固定列 + scroll.x + 双栏对照。',
    element: () => import('./grouping-columns'),
    compare: true,
    category: '多级表头与合并',
  },
  {
    name: 'fixed-columns',
    title: 'Fixed Columns',
    description:
      '左右固定列 + 横向滚动 sticky + 双栏对照。',
    element: () => import('./fixed-columns'),
    compare: true,
    category: '固定列与表头',
  },
  {
    name: 'fixed-gapped-columns',
    title: 'Fixed Gapped Columns',
    description:
      '分散固定列堆叠 + bordered + 双栏对照。',
    element: () => import('./fixed-gapped-columns'),
    compare: true,
    category: '固定列与表头',
  },
  {
    name: 'fixed-columns-header',
    title: 'Fixed Columns Header',
    description:
      '固定列 + 表头纵向固定（corner cell 双 sticky）+ 双栏对照。',
    element: () => import('./fixed-columns-header'),
    compare: true,
    category: '固定列与表头',
  },
  {
    name: 'fixed-header',
    title: 'Fixed Header',
    description:
      '固定表头：scroll.y 表体限高纵向滚动、表头 sticky top 钉顶 + 双栏对照。',
    element: () => import('./fixed-header'),
    compare: true,
    category: '固定列与表头',
  },
  {
    name: 'colspan-rowspan',
    title: 'ColSpan / RowSpan',
    description:
      '合并单元格：表头列合并 + 单元格行/列合并 + 双栏对照。',
    element: () => import('./colspan-rowspan'),
    compare: true,
    category: '多级表头与合并',
  },
  {
    name: 'virtual-list',
    title: 'Virtual List',
    description:
      '万行虚拟滚动 + 固定列 + scrollTo + 合并 + 左右对比（data-grid / antd 并排）。',
    element: () => import('./virtual-list'),
    compare: true,
    category: '虚拟与汇总',
  },
  {
    name: 'virtual-list-recycling',
    title: 'Virtual Recycling',
    description:
      'data-grid 专属 recycling 虚拟数据区：30x17 small 文本表格 + 同列 HTMLElement 复用计数。',
    element: () => import('./virtual-list-recycling'),
    compare: false,
    category: '虚拟与汇总',
  },
  {
    name: 'row-selection',
    title: 'Row Selection',
    description:
      '行选择状态机：checkbox/radio 切换、getCheckboxProps 禁用、onChange + 双栏对照。',
    element: () => import('./row-selection'),
    compare: true,
    category: '行选择',
  },
  {
    name: 'row-selection-and-operation',
    title: 'Row Selection & Operation',
    description:
      '受控 selectedRowKeys + 批量操作清空 + 双栏对照。',
    element: () => import('./row-selection-and-operation'),
    compare: true,
    category: '行选择',
  },
  {
    name: 'row-selection-custom',
    title: 'Row Selection Custom',
    description:
      'rowSelection.selections 自定义选择项菜单 + 双栏对照。',
    element: () => import('./row-selection-custom'),
    compare: true,
    category: '行选择',
  },
  {
    name: 'row-selection-advanced',
    title: 'Row Selection Advanced',
    description:
      'rowSelection.columnTitle / getTitleCheckboxProps / onCell / onSelectMultiple + 双栏对照。',
    element: () => import('./row-selection-advanced'),
    compare: true,
    category: '行选择',
  },
  {
    name: 'row-selection-native',
    title: 'Row Selection Native',
    description:
      'gridOptions.selection（selectedValues、showSelectionColumn、extended：普通点击单选、Ctrl 多选、Shift 连续选择）+ rowSelection 兼容回调并存。',
    element: () => import('./row-selection-native'),
    compare: false,
    category: '行选择',
  },
  {
    name: 'hidden-columns',
    title: 'Hidden Columns',
    description:
      '隐藏列 column.hidden + grid track 0fr↔原宽 过渡 + 双栏对照。',
    element: () => import('./hidden-columns'),
    compare: true,
    category: '列',
  },
  {
    name: 'resizable',
    title: 'Resizable Columns',
    description:
      '列宽拖拽调整 resizable + pointer 拖拽 + min/max 约束 + 双栏对照（右栏 antd 无原生对应，显示说明 + 静态基线）。',
    element: () => import('./resizable'),
    compare: true,
    category: '列',
  },
  {
    name: 'expand',
    title: 'Expand',
    description:
      '行展开 expandable：grid 0fr↔1fr 过渡 + 展开图标列 + rowExpandable 禁用 + 双栏对照。',
    element: () => import('./expand'),
    compare: true,
    category: '展开与嵌套',
  },
  {
    name: 'expand-sticky',
    title: 'Expand Sticky',
    description:
      '展开列位置（Table.EXPAND_COLUMN）+ 合并行 × 展开组合 + 双栏对照。',
    element: () => import('./expand-sticky'),
    compare: true,
    category: '展开与嵌套',
  },
  {
    name: 'order-column',
    title: 'Order Column',
    description:
      'Table.EXPAND_COLUMN + Table.SELECTION_COLUMN 哨兵控制展开/选择列位置 + 双栏对照。',
    element: () => import('./order-column'),
    compare: true,
    category: '行选择',
  },
  {
    name: 'row-selection-fixed',
    title: 'Row Selection Fixed',
    description:
      'selection 列邻列 fixed 继承（对齐 antd useSelection.tsx:694-717：nextCol 优先，其次 prevCol）+ 显式 fixed 覆盖。控制条切换 type / 首列 fixed / rowSelection.fixed，scroll.x=1200 横向滚动对照。',
    element: () => import('./row-selection-fixed'),
    compare: true,
    category: '行选择',
  },
  {
    name: 'head',
    title: 'Head (Sorter & Filter)',
    description:
      '单列排序 sorter + 基础列筛选 filters/onFilter/filterMultiple/filterOnClose + 双栏对照。',
    element: () => import('./head'),
    compare: true,
    category: '排序与筛选',
  },
  {
    name: 'multiple-sorter',
    title: 'Multiple Sorter',
    description:
      '多列排序 sorter.multiple 优先级 + 表头优先级序号 + onChange 数组 + 双栏对照。',
    element: () => import('./multiple-sorter'),
    compare: true,
    category: '排序与筛选',
  },
  {
    name: 'reset-filter',
    title: 'Reset Filter',
    description:
      '受控 filteredValue/sortOrder 组合 + 外部按钮一键重置（须指定 column.key）+ 双栏对照。',
    element: () => import('./reset-filter'),
    compare: true,
    category: '排序与筛选',
  },
  {
    name: 'custom-filter-panel',
    title: 'Custom Filter Panel',
    description:
      'filterDropdown（自定义下拉 + Input 搜索 + 高亮）+ filterIcon + filterDropdownProps + confirm/clearFilters + 双栏对照。',
    element: () => import('./custom-filter-panel'),
    compare: true,
    category: '排序与筛选',
  },
  {
    name: 'filter-search',
    title: 'Filter Search',
    description:
      'filterSearch（true 默认 contains / 函数自定义）：内置 menu 面板顶部搜索框实时过滤筛选项 + 双栏对照。',
    element: () => import('./filter-search'),
    compare: true,
    category: '排序与筛选',
  },
  {
    name: 'filter-in-tree',
    title: 'Filter In Tree',
    description:
      'filterMode=tree 树形筛选 + children + filterSearch + 双栏对照。',
    element: () => import('./filter-in-tree'),
    compare: true,
    category: '排序与筛选',
  },
  {
    name: 'pagination',
    title: 'Pagination',
    description:
      '分页集成 + placement 位置 + 双栏对照。',
    element: () => import('./pagination'),
    compare: true,
    category: '分页与远程',
  },
  {
    name: 'scroll-to-first-row',
    title: 'Scroll To First Row',
    description:
      'scroll.scrollToFirstRowOnChange：分页变化后滚回首行，可关闭 + 双栏对照。',
    element: () => import('./scroll-to-first-row'),
    compare: true,
    category: '分页与远程',
  },
  {
    name: 'ajax',
    title: 'Ajax',
    description:
      '远程数据 loading + 服务端分页/排序/筛选 + preserveSelectedRowKeys（本地 mock）+ 双栏对照。',
    element: () => import('./ajax'),
    compare: true,
    category: '分页与远程',
  },
  {
    name: 'tree-data',
    title: 'Tree Data',
    description:
      '树形数据 childrenColumnName + 缩进展开 + checkStrictly 父子联动 + 双栏对照。',
    element: () => import('./tree-data'),
    compare: true,
    category: '树形数据',
  },
  {
    name: 'tree-table-preserveSelectedRowKeys',
    title: 'Tree Table Preserve Selected',
    description:
      '树形×分页×checkStrictly×preserveSelectedRowKeys（issue #50621）+ 双栏对照。',
    element: () => import('./tree-table-preserveSelectedRowKeys'),
    compare: true,
    category: '树形数据',
  },
  {
    name: 'edit-cell',
    title: 'Edit Cell',
    description:
      'components.body.cell/row + onCell 编辑 + 增删行 + shouldCellUpdate + 双栏对照。',
    element: () => import('./edit-cell'),
    compare: true,
    category: '编辑',
  },
  {
    name: 'edit-row',
    title: 'Edit Row',
    description:
      '行级编辑 editingKey + Edit/Save/Cancel + InputNumber(age)/Input + 100行分页 + Form外层 + 双栏对照。',
    element: () => import('./edit-row'),
    compare: true,
    category: '编辑',
  },
  {
    name: 'drag-sorting',
    title: 'Drag Sorting',
    description:
      '行拖拽排序（自研 pointer，不依赖 @dnd-kit/*，指示线 + arrayMove）+ 双栏对照。',
    element: () => import('./drag-sorting'),
    compare: true,
    category: '拖拽排序',
  },
  {
    name: 'drag-sorting-handler',
    title: 'Drag Sorting Handler',
    description:
      '手柄列拖拽排序（复用 useRowDragSort + handleSelector 限定手柄列触发）+ 双栏对照。',
    element: () => import('./drag-sorting-handler'),
    compare: true,
    category: '拖拽排序',
  },
  {
    name: 'drag-column-sorting',
    title: 'Drag Column Sorting',
    description:
      '列拖拽排序（列方向 useColumnDragSort）+ 双栏对照。',
    element: () => import('./drag-column-sorting'),
    compare: true,
    category: '拖拽排序',
  },
  {
    name: 'drag-virtual-list',
    title: 'Drag Virtual List (AutoScroll)',
    description:
      '10000 行虚拟列表 + 行拖拽手柄 + autoScrollOnDrag（拖到容器边缘自动滚动）。验收虚拟下行拖出可视区不卡住。',
    element: () => import('./drag-virtual-list'),
    compare: false,
    category: '拖拽排序',
  },
  {
    name: 'drag-multi-row-reorder',
    title: 'Drag Multi-Row Reorder',
    description:
      '行选择（checkbox 多选）+ 行拖手柄 + gridOptions.multiRowReorder。选中 3 行拖其中一行→3 行成块移动到目标位置。',
    element: () => import('./drag-multi-row-reorder'),
    compare: false,
    category: '拖拽排序',
  },
  {
    name: 'ellipsis',
    title: 'Ellipsis',
    description:
      'column.ellipsis 省略号 + 默认 title 提示 + 双栏对照。',
    element: () => import('./ellipsis'),
    compare: true,
    category: '列',
  },
  {
    name: 'ellipsis-custom-tooltip',
    title: 'Ellipsis Custom Tooltip',
    description:
      'ellipsis showTitle:false + 自定义 Tooltip + 双栏对照。',
    element: () => import('./ellipsis-custom-tooltip'),
    compare: true,
    category: '列',
  },
  {
    name: 'summary',
    title: 'Summary',
    description:
      'summary 总结栏 + Table.Summary/Row/Cell + fixed sticky bottom + 双栏对照。',
    element: () => import('./summary'),
    compare: true,
    category: '虚拟与汇总',
  },
  {
    name: 'custom-empty',
    title: 'Custom Empty',
    description:
      'locale.emptyText + ConfigProvider.renderEmpty 自定义空状态 + 双栏对照。',
    element: () => import('./custom-empty'),
    compare: true,
    category: '虚拟与汇总',
  },
  {
    name: 'nested-table',
    title: 'Nested Table',
    description:
      '展开行嵌套子 Table + defaultExpandedRowKeys + 多 size + 双栏对照。',
    element: () => import('./nested-table'),
    compare: true,
    category: '展开与嵌套',
  },
  {
    name: 'tree-table-ellipsis',
    title: 'Tree Table Ellipsis',
    description:
      '树形首列 ellipsis+fixed 组合（issue #36583）+ 双栏对照。',
    element: () => import('./tree-table-ellipsis'),
    compare: true,
    category: '树形数据',
  },
  {
    name: 'bordered',
    title: 'Bordered',
    description:
      'bordered 边框 + title/footer + 固定列组合边框 + 双栏对照。',
    element: () => import('./bordered'),
    compare: true,
    category: '尺寸响应与样式',
  },
  {
    name: 'size',
    title: 'Size',
    description:
      '尺寸 size：large/medium/small 行高 padding 对照 + 双栏对照。',
    element: () => import('./size'),
    compare: true,
    category: '尺寸响应与样式',
  },
  {
    name: 'narrow',
    title: 'Narrow',
    description:
      '窄容器（width:300）+ 200 行 + size=small + pagination defaultCurrent:13（窄容器列宽）+ 双栏对照。',
    element: () => import('./narrow'),
    compare: true,
    category: '尺寸响应与样式',
  },
  {
    name: 'responsive',
    title: 'Responsive',
    description:
      'column.responsive 按断点显隐列（Grid.useBreakpoint 检测视口）+ 双栏对照。',
    element: () => import('./responsive'),
    compare: true,
    category: '尺寸响应与样式',
  },
  {
    name: 'style-class',
    title: 'Style Class',
    description:
      'classNames/styles 语义化样式（对象/函数）。作用于 root/header.{cell,row,wrapper}/body.{cell,row,wrapper}/title/footer/pagination.{root,item}/section/content + 双栏对照。',
    element: () => import('./style-class'),
    compare: true,
    category: '尺寸响应与样式',
  },
  {
    name: 'component-token',
    title: 'Component Token',
    description:
      'ConfigProvider theme.components.Table token → CSS variables + 动态面板（useToken 读取 + .dg-wrapper inline 注入）+ 双栏对照。',
    element: () => import('./component-token'),
    compare: true,
    category: '尺寸响应与样式',
  },
  {
    name: 'jsx',
    title: 'JSX',
    description:
      'Table.Column/ColumnGroup JSX 子元素声明列（children → columns 转换，ColumnGroup 嵌套复用多级表头）+ 双栏对照。',
    element: () => import('./jsx'),
    compare: true,
    category: '列',
  },
  {
    name: 'column-defaults',
    title: 'Column Defaults',
    description: 'Table 级 column 默认属性，单列覆盖 + 双栏对照。',
    element: () => import('./column-defaults'),
    compare: true,
    category: '列',
  },
  {
    name: 'dynamic-settings',
    title: 'Dynamic Settings',
    description: '综合集成验收：全量动态切换 + 双栏对照。',
    element: () => import('./dynamic-settings'),
    compare: true,
    category: '尺寸响应与样式',
  },
  {
    name: 'sticky',
    title: 'Sticky',
    description:
      '文档流页面级 sticky 表头 + gridOptions.scrollBarFoldMode 滚动条折叠模式。',
    element: () => import('./sticky'),
    compare: true,
    category: '固定列与表头',
  },
  {
    name: 'nest-table-border-debug',
    title: 'Nest Table Border Debug',
    description:
      '嵌套表格父子 bordered 隔离（主表 + expandedRowRender 子 Table 各自 Switch）+ 双栏对照。',
    element: () => import('./nest-table-border-debug'),
    compare: true,
    category: '展开与嵌套',
  },
  {
    name: 'row-selection-custom-debug',
    title: 'Row Selection Custom Debug',
    description:
      'rowSelection.renderCell 自定义勾选格 + rowSpan 合并行（接入 cellMerge）+ 双栏对照。',
    element: () => import('./row-selection-custom-debug'),
    compare: true,
    category: '行选择',
  },
  {
    name: 'semantic-dom',
    title: 'Semantic DOM',
    description:
      'Semantic DOM 兼容对照：13 槽位 classNames/styles 染色 + a11y 矩阵（aria-sort/expanded/colspan/rowspan + role 兼容天花板）+ 排序 aria-sort 专项验证。',
    element: () => import('./semantic-dom'),
    compare: true,
    category: '尺寸响应与样式',
  },
  // Theme editor now opens from the top-bar modal instead of a demo route.
]
