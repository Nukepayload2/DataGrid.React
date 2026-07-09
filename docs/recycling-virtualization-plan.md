# Recycling virtualization plan

本文记录 `gridOptions.virtualizationMode = 'recycling'` 的目标实现。该模式不是在 React cell 内复用子元素，而是让 recycling 路径完整接管虚拟数据区普通 body cells 的 DOM 创建、更新、复用和销毁。React 只保留表格外壳、滚动容器、header、summary、empty、pagination、filter dropdown、title、footer 等非大量数据 cell 结构。

## 目标

在普通虚拟数据区中降低快速滚动时的 React reconciliation、DOM 创建/销毁和 GC 压力。

目标用例：

- `size="small"`。
- 一屏约 30 行、17 列。
- 单元格内容是纯文本展示或非常轻量的 DOM。
- 快速纵向滚动时，主要压力来自数据区普通 cell 的 React 组件 churn、外层 DOM churn、inner DOM churn 和 GC。

recycling 模式的目标是：

- React 不逐个渲染数据区 body cell。
- 数据区普通 body cell 外层 `.dg-cell.dg-cell-body` 由 imperative recycler 创建和复用。
- `.dg-cell-inner` 内部 HTMLElement 由列级 `renderCellElement` 创建和更新。
- 滚动窗口变化时，由 body-level recycler 批量 diff、release、acquire、patch DOM。

## 非目标

- 不让 `column.render` 返回 DOM element。`column.render` 仍是 antd 兼容 API，返回 `ReactNode`。
- 不让 React 管理 recycling 数据区普通 cell。
- 不让 React 管理 recycling cell 的 `.dg-cell-inner` 子元素。
- 不接管 header、summary、empty、pagination、filter dropdown、title、footer。
- 不支持 tree、expand、rowSpan/colSpan、`components.body.row`、`components.body.cell` 等 antd body 兼容能力。
- 不改变 sticky 禁用虚拟化的现状；sticky 启用时 recycling 不启用。
- 不把 recycling 作为默认虚拟化模式。
- 不做横向列虚拟化。横向不可见列仍会参与当前虚拟行窗口的渲染，除非未来单独实现 column virtualization。

## API

### 表级开关

```ts
type VirtualizationMode = 'standard' | 'recycling'

interface TableProps<RecordType> {
  gridOptions?: {
    virtualizationMode?: VirtualizationMode
  }
}
```

语义：

- `undefined`：遵循现有行为。满足 `virtual === true && scroll.y === true` 且虚拟化前置条件时，启用当前 React 管理的虚拟化。
- `'standard'`：显式使用当前 React 管理的虚拟化渲染。
- `'recycling'`：在支持条件满足时，由 imperative recycler 接管虚拟数据区普通 body cells。

`undefined` 和 `'standard'` 必须与当前行为一致，不调用 `gridColumnOptions.renderCellElement`。

### 列级命令式 renderer

```ts
interface GridCellElementRenderParams<RecordType> {
  value: unknown
  record: RecordType
  rowIndex: number
  columnIndex: number
  columnKey: string
  dataIndex?: string | number | Array<string | number>
  rowKey: string | number | undefined
}

type DisposeCellElementReason =
  | 'recycle'
  | 'replace'
  | 'discard'
  | 'unmount'

interface GridColumnOptions<RecordType> {
  renderCellElement?: (
    params: GridCellElementRenderParams<RecordType>,
    oldElement: HTMLElement | undefined,
  ) => HTMLElement
  disposeCellElement?: (
    element: HTMLElement,
    reason: DisposeCellElementReason,
    params: GridCellElementRenderParams<RecordType> | undefined,
  ) => void
}
```

`gridOptions` / `gridColumnOptions` 的优先级高于 antd 兼容 API。`virtualizationMode = 'recycling'` 下，支持命令式 cell element 的列应使用 `gridColumnOptions.renderCellElement`，不依赖 `column.render`。

`oldElement` 规则：

- 只有 recycling 复用同列 inner element 时，`oldElement` 才可能是旧元素。
- 若列没有空闲 inner element，`oldElement` 为 `undefined`。
- 若 renderer 返回了不同于 `oldElement` 的 HTMLElement，旧元素按 `replace` 清理。
- `standard` 和 `undefined` 不调用 `renderCellElement`。

## 渲染边界

### React 负责

- 表格根结构。
- 滚动容器。
- grid 容器。
- FillerRow / padding track。
- header。
- summary。
- empty。
- pagination。
- filter dropdown。
- title / footer。
- 非 recycling 路径的 standard body。

### Imperative recycler 负责

在 recycling 启用时，数据区普通 body cells 完全由 recycler 管理：

- 创建、更新、复用、销毁 `.dg-cell.dg-cell-body` 外层 DOM。
- 设置外层 cell 的 className、style、dataset、ARIA 属性。
- 设置 `data-row-index`。
- 设置 `data-column-key`.
- 设置 `data-known-size`。
- 设置 `data-align`。
- 设置 `gridColumn` / `gridRow`。
- 设置 fixed column class、sticky style、edge shadow class。
- 设置 hidden class。
- 设置 selected / hover / sorted class。
- 设置 semantic body row/cell class 和 style。
- 绑定和更新 row hover 事件。
- 绑定和更新 `onRow` 事件。
- 管理 `.dg-cell-inner` 容器。
- 调用列级 `renderCellElement` 和 `disposeCellElement`。

recycling 数据区不允许 React 为每个 cell 创建组件，也不允许每个 cell 单独跑 React hook/effect。滚动窗口变化应由一个 body-level effect 或等价调度批量处理。

## 支持范围

recycling 只接管普通二维数据区：

```text
virtual row window x leafColumns
```

支持：

- 扁平数据。
- 普通叶子列。
- fixed columns 相关外层 class/style。
- hidden columns 的外层状态。
- selected / hover / sorted class。
- rowClassName。
- onRow 事件 props。
- semantic body row/cell class/style。
- 固定或可测量行高模型要求的 `data-known-size`。

不支持：

- tree data。
- expandable / expanded row content。
- rowSpan / colSpan。
- `components.body.row`。
- `components.body.cell`。
- `column.render` 的 ReactNode 输出。
- 其它会破坏普通 `rowIndex x leafColumn` 映射的 body 能力。

这些能力在 `standard` / `undefined` 下继续保持现状。

## Merge plan 说明

standard body 为了兼容 antd 的 `rowSpan` / `colSpan`，会根据列的 `onCell` 结果计算 merge plan。

普通 body 是二维矩阵：

```text
rowIndex x leafColumn
```

`onCell` 可以返回：

```ts
{ rowSpan: 2 }
{ colSpan: 3 }
{ rowSpan: 0 }
{ colSpan: 0 }
```

这会改变真实 DOM 结构：

- `rowSpan` / `colSpan > 1`：一个真实 cell 占据多个逻辑位置。
- `rowSpan` / `colSpan === 0`：当前位置被合并隐藏，不渲染真实 cell。
- 逻辑矩阵和 DOM cell 不再一一对应。

recycling 依赖稳定映射：

```text
visible logical cell -> one outer cell -> one .dg-cell-inner -> one managed HTMLElement
```

因此 recycling 不接入 merge plan。需要合并单元格时应使用 standard path。

## 复用模型

需要复用两层元素：

1. outer cell element  
   `.dg-cell.dg-cell-body`

2. inner content element  
   `renderCellElement` 返回的 HTMLElement，挂在 `.dg-cell-inner` 内。

### 外层 cell 池

外层 cell 可以按列池化，避免跨列带入脏状态：

```text
activeOuter: row identity -> column identity -> HTMLElement
outerPool: column identity -> HTMLElement[]
```

outer cell release 时需要：

- 移除或覆盖旧 className。
- 移除或覆盖旧 style。
- 清理旧 dataset / ARIA。
- 清理旧事件。
- 清空或复用 `.dg-cell-inner`。

### 内层 element 池

内层 element 也按列池化：

```text
activeInner: row identity -> column identity -> HTMLElement
innerPool: column identity -> HTMLElement[]
```

同列复用时：

1. 从 inner pool 取旧元素。
2. 调用 `renderCellElement(params, oldElement)`。
3. 将返回元素挂入 `.dg-cell-inner`。
4. 如果返回元素不同于 oldElement，旧元素按 `replace` 清理。

### identity 规则

- row identity 优先使用 `rowKey`。
- 没有 `rowKey` 时，fallback 到 `record` reference。
- column identity 优先使用 `columnKey`。
- 没有稳定 `columnKey` 时，fallback 到 column reference。
- 内部管理不强求拼接字符串 key；可以使用嵌套 `Map` 或引用 ID。
- DOM attribute、调试输出、计数面板等需要字符串时，再派生可显示字符串。

### pool 上限

- 每列 outer pool 和 inner pool 都应有上限。
- 初始建议：`visibleRowCount + overscan * 2`。
- 超出上限时丢弃元素，避免 pool 自身变成内存压力。

## 数据变化规则

排序、过滤、分页和替换 `dataSource` 都视为 active 数据映射变化。

处理规则：

- 不因数据变化销毁 pool。
- active 元素先 release，再按新的虚拟窗口重新 acquire / patch / render。
- 重新 render 时传入新的 `params.record`、`params.value`、`params.rowIndex`、`params.rowKey`。
- 旧 DOM 内容由 recycler 和 `renderCellElement` 使用新 params 覆盖。
- 如果没有 `rowKey` 且 `dataSource` 每次重建 record 对象，row identity 会随 reference 改变；这是允许的，代价是 active 映射更频繁重建。

列变化规则：

- column identity 不变且 `renderCellElement` / `disposeCellElement` identity 不变时，对应 pool 可以保留。
- column identity 消失、renderer identity 改变或模式切换时，受影响 active 和 pool 元素需要 `unmount` 清理。
- 不允许把 A 列 outer 或 inner 元素传给 B 列。

## 实现结构

建议新增独立 recycling 数据区路径：

- `src/table/engine/RecyclingBodyGrid.tsx`
- `src/table/engine/useRecyclingBody.ts`
- `src/table/engine/recyclingCellTypes.ts`
- `src/table/engine/recyclingDomUtils.ts`
- `src/table/engine/recyclingIdentity.ts`

`RecyclingBodyGrid` 在 React 中只渲染一个数据区 mount 容器，或复用现有 `.dg-grid` 作为 mount root 的直接子元素管理器。它不为每个 cell 返回 ReactNode。

推荐形态：

```tsx
function RecyclingBodyGrid(props) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  useRecyclingBody(rootRef, props)
  return null
}
```

如果直接让 recycler 向 `.dg-grid` 追加 cell，必须保证：

- 不破坏 header、filler、summary、empty 等 React 管理的 grid item。
- recycling cell 的插入/删除不会被 React reconciliation 覆盖。
- React key 管理范围和 imperative DOM 管理范围清晰隔离。

更稳的做法是在 `.dg-grid` 内保留一个不影响布局的 mount 占位或明确的 imperative region，但不能为了每个 cell 多加 DOM 层。是否允许一个 region marker 节点需要在实现前评估 CSS Grid 行为；如果 marker 作为 grid item 会影响布局，则不能使用。

## 外层 cell patch 规则

recycler 每次 patch outer cell 时应完整设置当前状态，而不是在旧状态基础上局部追加。

必须覆盖：

- `className`
- `style.cssText` 或逐项 style
- `dataset.rowIndex`
- `dataset.columnKey`
- `dataset.knownSize`
- `dataset.align`
- `aria-colspan`
- `aria-rowspan`
- event handlers
- `title` 或 inner title

必须避免：

- 旧行 selected class 残留到新行。
- 旧 hover class 残留到新行。
- 旧 sorted class 残留到新列。
- 旧 sticky offset 残留到非 fixed 列。
- 旧 semantic style 残留。
- 旧 `onRow` 事件残留。

## Hover / selection / sorted 状态

这些状态由表格管理，不由用户 renderer 管理。

要求：

- hover 状态变化时，recycler 可以只 patch 受影响行的 outer class，不重跑全部 `renderCellElement`。
- selection 状态变化时，recycler 可以只 patch 受影响行的 outer class。
- sorted column 变化时，recycler 可以只 patch 受影响列的 outer class。
- 这些 patch 不应触发 inner renderer，除非 cell params 本身变化。

## 行高测量

`useRowMeasurements` 依赖 body grid 直接子元素上的 `data-row-index` 和 `data-known-size`。

recycling 外层 cell 必须继续满足：

- 数据 cell 是 grid 容器可被测量逻辑发现的元素。
- 首个可见列或约定列写入 `data-known-size`。
- FillerRow 不写 `data-row-index`。
- 行高变化时，测量逻辑能观察到真实 DOM 高度。

如果 renderer 写入会改变行高，需要确认：

- outer cell 高度能被测量。
- `data-known-size` 能被及时更新。
- 虚拟窗口 offsetTree 能收到变化。

## 接入条件

recycling 路径启用条件：

```text
virtualEnabled
&& !stickyEnabled
&& gridOptions.virtualizationMode === 'recycling'
&& simple body model
```

simple body model 要求：

- 无 tree。
- 无 expand。
- 无 rowSpan / colSpan / onCell merge。
- 无 `components.body.row`。
- 无 `components.body.cell`。
- 无其它破坏普通二维 body 的能力。

如果 requested recycling 但 simple body model 不满足，必须退回 standard path，保证功能正确。退回 standard path 时不调用 `renderCellElement`。

## Demo

新增或调整独立 demo：

- `src/demos/virtual-list-recycling.tsx`
- `src/demos/virtual-list-recycling.dg.tsx`

demo 要求：

- 固定 `size="small"`。
- 使用纯文本数据展示。
- 约 17 列。
- 容器高度控制到一屏约 30 行。
- 开启 `virtual scroll={{ y: true }}`。
- 支持 `standard` / `recycling` 切换。
- 两种模式视觉一致，避免视觉差异影响性能判断。
- recycling 模式使用 `gridColumnOptions.renderCellElement`。
- standard 模式使用 `column.render` 或默认 React 内容。
- 计数面板展示 create / reuse / render / recycle / discard。
- console log 默认关闭；可提供手动开关或 `window.__dgRecyclingLog` 供排查。

demo 说明要明确：

- 当前不做横向列虚拟化。
- standard 与 recycling 的主要差异是数据区普通 cell 是否由 React 逐 cell 管理。
- 如果 cell 极轻，性能差异可能不明显；recycling 主要应降低快速滚动时的 React/DOM churn 和 GC 峰值。

## 测试

优先补 Vitest：

- `undefined` / `'standard'` 不调用 `renderCellElement`。
- requested recycling 且 simple body model 满足时，React 不逐个返回 body cell ReactNode。
- recycler 创建 outer cell。
- recycler 复用同列 outer cell。
- recycler 不跨列复用 outer cell。
- recycler 复用同列 inner element，并传为 `oldElement`。
- recycler 不跨列复用 inner element。
- renderer 返回新 inner element 时旧 element 触发 `replace`。
- pool 超上限触发 `discard`。
- 表格卸载触发 `unmount`。
- 列移除或 renderer identity 变化时清理受影响 pool。
- 排序、过滤、分页、替换 `dataSource` 时不销毁 pool，并用新 params patch / render。
- 无 `rowKey` 时 record reference fallback 行为。
- column key 缺失时 column reference fallback 行为。
- hover 变化只 patch outer class，不重跑 inner renderer。
- selection 变化只 patch outer class，不重跑 inner renderer。
- sorted column 变化只 patch outer class，不重跑 inner renderer。
- sticky / tree / expand / components body / merge 条件退回 standard path，且不调用 `renderCellElement`。

必要时补 Playwright smoke：

- 打开 recycling demo。
- 切换 standard / recycling。
- 快速滚动。
- 验证可见文本正确。
- 验证 recycling 模式 create 次数显著低于进入窗口的 cell 次数。
- 验证空闲时计数不增长。
- 验证 console 无 error / warn。

## 风险和约束

- 这是 opt-in 高性能模式，用户承担命令式 inner DOM 的生命周期责任。
- `disposeCellElement` 必须写清楚，否则用户绑定的 listener、observer、第三方实例会泄漏。
- 不能把 React element、React state、context、effect 放进 recycling cell 内部。
- 表格状态 class/style 必须由 recycler 管理，不能转嫁给用户 renderer。
- Imperative DOM 与 React DOM 必须有清晰边界，避免 React reconciliation 删除或复用 recycler 管理的节点。
- 外层 cell patch 必须覆盖旧状态，脏 class/style/event 是主要风险。
- 行高测量必须继续工作，否则虚拟 offset 会漂移。
- 不做横向列虚拟化时，宽表仍会渲染所有列，recycling 只解决纵向窗口下的 cell 管理成本。

## 验收标准

- `undefined` 和 `'standard'` 与当前虚拟化行为一致。
- `'recycling'` 在普通虚拟数据区不由 React 逐 cell 渲染 body cells。
- `'recycling'` 复用 outer body cell DOM。
- `'recycling'` 复用同列 inner HTMLElement。
- 表格管理 selected、hover、sorted、fixed、align、hidden、semantic 等外层状态。
- hover / selection / sorted 变化不重跑 inner renderer。
- 排序、过滤、分页、替换 `dataSource` 不销毁 pool，并能正确显示新数据。
- 不支持的复杂 body 能力自动退回 standard path，功能正确，且不调用 `renderCellElement`。
- demo 能稳定展示 30x17 small 文本表格快速滚动，并支持 standard / recycling 对比。
- 快速滚动时 create/reuse/dispose 计数符合 outer + inner 按列池预期。
- 空闲时计数不增长。
- `pnpm run tsc`、`pnpm run lint`、`pnpm run test`、`pnpm run build` 通过。
