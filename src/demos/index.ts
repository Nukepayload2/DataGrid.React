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
]
