# Demos E-H Comment Migration

本文件收拢了 `src/demos` 中 `e` 到 `h` 范围 demo 的设计说明、对照目的和兼容性说明。源码内已移除对应的长篇文件头注释，仅保留局部实现仍需要的短注释。

## `edit-cell`

来源：
- `src/demos/edit-cell.tsx`
- `src/demos/edit-cell.dg.tsx`
- `src/demos/edit-cell.antd.tsx`

说明：
- 该 demo 对照复刻 antd `edit-cell` 示例，展示单元格级编辑、增行和删行。
- 左右两栏分别是 data-grid 和 antd 实现，两边各自维护编辑与数据状态，避免共享状态互相干扰。
- data-grid 版本通过 `components.body.row/cell` 适配无 `td/tr` 的渲染层；antd 版本保持原生 `td/tr` 语义。
- 两侧共用一套可编辑单元格样式，运行时只注入一次。

## `edit-row`

来源：
- `src/demos/edit-row.tsx`
- `src/demos/edit-row.dg.tsx`
- `src/demos/edit-row.antd.tsx`

说明：
- 该 demo 对照复刻 antd `edit-row` 示例，展示行级编辑、保存、取消和分页。
- 左右两栏都各自维护 `form`、数据和 `editingKey`，初始数据一致但交互互不影响。
- data-grid 版本的可编辑单元格只返回内容节点，挂载在网格单元内部；antd 版本保持原生单元格结构。
- 两侧共用校验提示样式，运行时只注入一次。

## `ellipsis-custom-tooltip`

来源：
- `src/demos/ellipsis-custom-tooltip.tsx`
- `src/demos/ellipsis-custom-tooltip.dg.tsx`
- `src/demos/ellipsis-custom-tooltip.antd.tsx`

说明：
- 该 demo 对照复刻 antd `ellipsis-custom-tooltip` 示例。
- 左右两栏共享 `bordered` 开关和同一份数据。
- 自定义提示由 `Tooltip` 接管，区别于默认 `title` 提示。

## `ellipsis`

来源：
- `src/demos/ellipsis.tsx`
- `src/demos/ellipsis.dg.tsx`
- `src/demos/ellipsis.antd.tsx`

说明：
- 该 demo 对照复刻 antd `ellipsis` 示例。
- 左栏验证 data-grid 的 `column.ellipsis` 行为，包括省略样式和默认原生提示。
- 右栏保持 antd 的原生省略行为。
- `bordered` 控制条用于对照两侧边框状态下的省略视觉。

## `expand-sticky`

来源：
- `src/demos/expand-sticky.tsx`
- `src/demos/expand-sticky.dg.tsx`
- `src/demos/expand-sticky.antd.tsx`

说明：
- 该 demo 参考 antd `expand-sticky` 示例，验证展开列位置和合并单元格场景。
- 左右两栏共享受控的 `expandedRowKeys`，并提供一键展开/收起。
- `EXPAND_COLUMN` 哨兵用于控制展开列位置。
- antd 侧保留与官方 demo 对齐的 `expandedRowOffset` 背景语义说明；源码中不再保留长篇兼容性注释。

## `expand`

来源：
- `src/demos/expand.tsx`
- `src/demos/expand.dg.tsx`
- `src/demos/expand.antd.tsx`

说明：
- 该 demo 对照 data-grid 与 antd 的行展开能力。
- 左右两栏共享受控的 `expandedRowKeys`，并提供展开全部与全部收起。
- `"Not Expandable"` 行通过 `rowExpandable` 排除，不参与批量展开。
- data-grid 侧额外验证点击整行展开和展开行样式。

## `filter-in-tree`

来源：
- `src/demos/filter-in-tree.tsx`
- `src/demos/filter-in-tree.dg.tsx`
- `src/demos/filter-in-tree.antd.tsx`

说明：
- 该 demo 对照树形筛选菜单和搜索。
- `Name` 列使用 `filterMode: 'tree'`，筛选项带 `children`。
- 排序和筛选保持非受控，交由表格内部管理。
- 两侧都保留 `onChange` 参数输出，便于比对排序和筛选结果。

## `filter-search`

来源：
- `src/demos/filter-search.tsx`
- `src/demos/filter-search.dg.tsx`
- `src/demos/filter-search.antd.tsx`

说明：
- 该 demo 对照筛选面板内的搜索能力。
- 两侧都保留树形筛选模式和 `filterSearch` 行为。
- 筛选状态保持非受控，不额外引入父级筛选状态管理。

## `fixed-columns-header`

来源：
- `src/demos/fixed-columns-header.tsx`
- `src/demos/fixed-columns-header.dg.tsx`
- `src/demos/fixed-columns-header.antd.tsx`

说明：
- 该 demo 对照固定列与固定表头同时存在时的表现。
- data-grid 与 antd 共享 `bordered`、`size` 和虚拟化开关。
- antd 在虚拟滚动场景下对 `scroll.x` 的取值限制由实现代码处理，说明迁移到本文件。

## `fixed-columns`

来源：
- `src/demos/fixed-columns.tsx`
- `src/demos/fixed-columns.dg.tsx`
- `src/demos/fixed-columns.antd.tsx`

说明：
- 该 demo 对照固定首尾列与横向滚动。
- data-grid 使用逻辑方向的 `start/end` 固定列语义，对齐 antd `left/right` 能力。
- 共享控制条驱动边框、尺寸和虚拟化。

## `fixed-gapped-columns`

来源：
- `src/demos/fixed-gapped-columns.tsx`
- `src/demos/fixed-gapped-columns.dg.tsx`
- `src/demos/fixed-gapped-columns.antd.tsx`

说明：
- 该 demo 对照分散固定列堆叠，而不是连续固定列。
- 左侧验证 data-grid 在列序中累加固定偏移的表现。
- 右侧保持 antd 官方列结构，并在虚拟滚动模式下把 `scroll.x` 转成数值宽度。

## `fixed-header`

来源：
- `src/demos/fixed-header.tsx`
- `src/demos/fixed-header.dg.tsx`
- `src/demos/fixed-header.antd.tsx`

说明：
- 该 demo 对照固定表头与纵向滚动。
- 两侧共享边框、尺寸和虚拟化开关。
- 父容器高度换算和数据区布局说明已从源码迁移到文档。

## `grouping-columns`

来源：
- `src/demos/grouping-columns.tsx`
- `src/demos/grouping-columns.dg.tsx`
- `src/demos/grouping-columns.antd.tsx`

说明：
- 该 demo 对照多级表头、固定列、筛选和排序的组合场景。
- data-grid 侧验证任意深度 `children`、`start/end` 固定列和筛选排序配置。
- antd 侧保持官方 grouping-columns 示例列结构。
- 父容器高度、分页条预留和虚拟滚动布局说明已从源码迁移到文档。

## `head`

来源：
- `src/demos/head.tsx`
- `src/demos/head.dg.tsx`
- `src/demos/head.antd.tsx`

说明：
- 该 demo 对照复刻 antd `head` 示例，覆盖排序与筛选共存。
- 左右两栏共享 `bordered`、虚拟化开关和 `remountKey`。
- `Reset` 通过 remount 清空排序和筛选的草稿态与激活态，避免把原本非受控的 demo 改成受控实现。
- `Name`、`Age`、`Address` 列的 sorter、filters、`defaultSortOrder` 和 `showSorterTooltip` 配置保持对照。
- data-grid 侧对带 `children` 的筛选项做扁平化处理；antd 侧保持原生下拉菜单行为。

## `hidden-columns`

来源：
- `src/demos/hidden-columns.tsx`
- `src/demos/hidden-columns.dg.tsx`
- `src/demos/hidden-columns.antd.tsx`

说明：
- 该 demo 对照顶部 `Checkbox.Group` 驱动列显隐。
- 左右两栏共享同一份 `checkedList`。
- data-grid 隐藏列通过保留 grid track 并标记隐藏类来维持线号稳定，详细背景见 `docs/design-notes/hidden-column.md`。
- `checkedList` 的默认值保持全选，避免 props 缺失时出现空表。
