# Public API reference

本文只记录当前承诺给用户的主入口 API。antd 兼容 API 仍以 [compat-matrix.md](compat-matrix.md) 为迁移判定；data-grid 专属 API 必须进入 `gridOptions` / `gridColumnOptions`，不放在顶层污染 antd 兼容面。

## 主入口导出

| API | 稳定性 | 说明 |
|---|---|---|
| `Table` | stable | data-grid 表格组件。 |
| `getRowKey` | stable | 与 Table 内部一致的 row key 解析工具。 |
| `EXPAND_COLUMN` / `SELECTION_COLUMN` | stable | antd 兼容哨兵列。 |
| `SELECTION_ALL` / `SELECTION_NONE` / `SELECTION_INVERT` | stable | antd 兼容选择菜单哨兵。 |
| `Summary` / `Table.Summary` | stable | antd 兼容 summary API。 |
| `TableProps` / `ColumnType` / `TableColumnType` / `TableRef` | stable | 公开类型入口。 |
| `GridSelectionOptions` / `GridColumnOptions` / `VirtualizationMode` | stable | data-grid 专属命名空间类型。 |

拖拽 hooks（例如内部的 `useRowDragSort` / `useColumnDragSort`）不从主入口导出。拖拽能力面向用户时只通过 `gridOptions` / `gridColumnOptions` 开关表达，避免要求业务方自己组装拖拽引擎。

## gridOptions

`gridOptions` 是 data-grid 专属表级命名空间。antd Table 没有这些字段。

| 字段 | 类型 | 默认值 | 稳定性 | 说明 |
|---|---|---|---|---|
| `rowHeight` | `number \| (record, index) => number` | 虚拟模式 56 | stable | 行高约定。虚拟模式下未测量行用它兜底；非虚拟固定行高场景用作 grid track。 |
| `virtualizationMode` | `'standard' \| 'recycling'` | `'standard'` | stable | 虚拟渲染模式。仅在 `virtual` 且 `scroll={{ y: true }}` 时生效。 |
| `minRowHeight` | `number` | undefined | stable | 有界行高下限；必须和 `maxRowHeight` 同时设置才启用。 |
| `maxRowHeight` | `number` | undefined | stable | 有界行高上限；必须和 `minRowHeight` 同时设置才启用。 |
| `headerHeight` | `number \| string` | auto | stable | 表头行高约定，多级表头每层使用同一高度。 |
| `resizable` | `boolean` | `false` | stable | 启用列宽拖拽。`true` 且未设置 `columnResizeMode` 时等同 `ResizeLeft`。 |
| `columnResizeMode` | `'Disabled' \| 'ResizeLeft' \| 'ResizeSibling'` | `Disabled` | stable | 列宽拖拽模式。 |
| `resizableMinWidth` | `number \| (key) => number` | 30 | stable | 列宽拖拽最小宽度。 |
| `resizableMaxWidth` | `number \| (key) => number` | `Infinity` | stable | 列宽拖拽最大宽度。 |
| `scrollBarFoldMode` | `ScrollBarFoldMode` | 常驻细滚动条，hover 展开 | stable | 悬浮滚动条显示/折叠策略。 |
| `selection` | `GridSelectionOptions` | undefined | stable | data-grid 原生选择配置，优先级高于 antd 兼容层 `rowSelection`。 |
| `autoScrollOnDrag` | `boolean` | `true` | stable | 行/列拖拽到滚动容器边缘时自动滚动。 |
| `columnReorder` | `boolean` | `true` | stable | 列拖拽重排总开关。 |
| `multiRowReorder` | `boolean` | `true` | stable | 多选行拖拽时按选中块整体移动。 |

## gridOptions.selection

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `selectionMode` | `'disabled' \| 'single' \| 'multiple' \| 'extended'` | 按 `rowSelection.type` 推导 | 原生行点击选择模式。 |
| `showSelectionColumn` | `boolean` | `true` | 是否显示选择列；关闭后仍可通过行点击或受控值选中。 |
| `getSelectionValue` | `(record, index) => string \| number \| boolean \| symbol` | 回退到 `rowKey` | 提取业务选中值。推荐返回稳定且唯一的 string/number。 |
| `selectedValues` | `readonly GridSelectionValue[]` | undefined | 受控业务选中值。 |
| `defaultSelectedValues` | `readonly GridSelectionValue[]` | undefined | 非受控初始业务选中值。 |
| `onSelectedValuesChange` | `(values, rows, info) => void` | undefined | 业务选中值变化回调。 |

## scrollBarFoldMode

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `showOnTableHover` | `boolean` | `false` | `true` 时仅 hover/触摸表格后显示悬浮滚动条。 |
| `expandOnHover` | `boolean` | `true` | hover 滚动条 hit 区时是否从细指示器展开为粗滚动条。 |

## gridColumnOptions

`gridColumnOptions` 是 data-grid 专属列级命名空间，写在 `column.gridColumnOptions`。

| 字段 | 类型 | 默认值 | 稳定性 | 说明 |
|---|---|---|---|---|
| `dragColumnLock` | `'lockDrag' \| 'lockPosition'` | undefined | stable | 列拖拽锁定。`lockDrag` 禁止作为拖拽起点；`lockPosition` 还保持最终 index 不变。 |
| `renderCellElement` | `(params, oldElement) => HTMLElement` | undefined | advanced | recycling cell 的低层 HTMLElement 渲染 hook。优先复用 `oldElement`，并在返回前自行更新内容。 |
| `renderCellReact` | `(params, slot) => ReactElement \| null` | undefined | advanced | recycling cell 的 React slot 渲染 hook。返回元素必须使用 `slot.key`。 |
| `disposeCellElement` | `(element, reason, params) => void` | undefined | advanced | 清理 `renderCellElement` 创建的 HTMLElement 副作用。 |

普通业务优先使用 `render`、`onCell` 和 `components.body.cell`。`renderCellElement` / `renderCellReact` / `disposeCellElement` 是 recycling 虚拟化的低层逃生口，应只在确有性能或第三方 DOM 集成需求时使用。

## 虚拟化模式

`virtualizationMode: 'recycling'` 公开给用户，但不是默认路径。启用前应确认：

- 已启用 `virtual` 和 `scroll={{ y: true }}`。
- cell 内容没有依赖 DOM mount 次数表达业务状态。
- 使用 `renderCellElement` 时清理事件监听和第三方资源。
- 使用 `renderCellReact` 时返回元素带 `slot.key`。

相关功能说明见 [../features/scrolling/virtualization.md](../features/scrolling/virtualization.md)。
