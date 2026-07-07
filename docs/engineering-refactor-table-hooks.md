# 重构阶段：Table.tsx 抽 hook + 大文件可拆性盘点

> 关联：`docs/engineering-refactor-plan.md`（主重构计划）。本阶段专注 `Table.tsx`（1426 行）的内聚域抽取，并盘点其余大文件的安全拆分余地。
>
> 硬约束：**行为不变 · 热路径性能不变 · 仅重构 · 不 commit · 公共 API（`src/table/index.ts` 导出面）不变 · 抽出单元可独立单测**。

---

## 1. 背景

`Table.tsx` 是对外适配层（antd 兼容 `TableProps` → 内部引擎 `GridTable`）。它**每次 Table render 跑一次，不在滚动/渲染内循环**——热路径（纵向虚拟滚动）在引擎层（`useVirtualList`/`AATree`/`GridTable`/`BodyGrid`）。

`TableInner` 单函数体占 1155 行（L236–1391），内含多个内聚域（选择/展开/列树/分页/滚动条触摸/ref 桥接）。该文件已用 9 个自定义 hook（useSorter/useFilter/useTreeData/useRowSelection/useRowExpand/useResponsiveColumns/useSemanticClassNames/useTableThemeVars/usePagination），把内联域继续抽成 hook = 同构扩展，**hook 组合等价、memo 边界/effect 时序/依赖数组原样保留 → 行为与性能不变**。

这与 Stage3 对 `GridTable.tsx` 做的事完全同构（已抽出 useScrollMode/useRowHeightSystem/useGridLayout/useGridScrollSync + ScrollContainer，见 [[gridtable-stage3-architecture]]）。

---

## 2. 大文件可拆性总览（三档）

### ✅ 档一：安全且高价值（本阶段执行 Table.tsx 部分）

| 文件 | 行数 | 动作 |
|---|---|---|
| **`Table.tsx`** | 1426 | 抽 6 个 adapter hook/函数 → ~650 行薄编排层（**本阶段重点**） |
| `compatTypes.ts` | 1173 | 按业务域拆 ~10 子文件 + barrel re-export（纯类型 + 3 个 `as const` 哨兵，零运行时） |
| `useSorter.ts` | 501 | 纯函数（占 60%：getSortData/generateSorterInfo/applyCompare/…）→ `sorterUtils.ts` + 单测 |
| `useFilter.ts` | 303 | computeFilteredDataSource 等 → `filterUtils.ts` + 单测 |
| `useRowSelection.ts` | 584 | 树形联动 conductTreeCheck 等 → `selectionTreeConduction.ts` + 单测 |
| `useColumnDragSort.ts` | 720 | arrayMoveColumnsRespectLocks 等 → `columnDragSortUtils.ts` + 单测 |
| `useRowDragSort.ts` | 875 | arrayMove/arrayMoveBlock/overlay → `dragSortUtils.ts`（⚠️ 保 `index.ts` 导出路径） |
| `FilterDropdown.tsx` | 706 | 5 纯函数 → `filterDropdownUtils.ts`；SearchOutlined → 独立组件 |

### 🟡 档二：中风险/收益有限（后续可选）

- `engineTypes.ts` (984)：仅 atomic/filter/sort/state/semantic（~100 行）可拆；column 三接口 + EngineTableProps 强耦合，主体不动。
- `HeaderCell.tsx` (473) / `FlatColumnCells.tsx` (493)：单大组件，有测试兜底；仅在出现可测纯函数时才动。
- `FilterDropdown` builtinPanel（125 行 JSX）→ 子组件，props 透传多，谨慎。

### ❌ 档三：绝对不碰

| 文件 | 原因 |
|---|---|
| `useVirtualList.ts` hook 主体 (L156–555) | flushSync 时序 + 8 个 ref 闭包 + start/end useMemo，**零单测**。仅 L89–153 三个纯函数可抽 |
| `AATree.ts` (310) | 已是最优内聚算法单元 |
| `FloatingScrollBar.tsx` doSync/recompute/RO effect (L324–599) | Stage5/6 性能优化核心，密集 ref 共享 + RAF 节流 |
| `useRowHeightSystem.ts` 两个 callback | 内循环热路径，拆分无收益 |
| `BodyGrid.tsx` (460) | 滚动渲染热路径，renderBodyCells 已独立导出，不再拆 |
| `publicTypes.ts` (686) | 单巨型 interface `TableProps`，TS 不支持跨文件拆 |
| `GridTable.tsx` (802) | 已过 Stage3+followup，全部 hook 已抽出，勿重开已定决策 |

---

## 3. Table.tsx 抽 hook 设计（本阶段蓝图）

### 3.1 依赖图与调用顺序

```
props
 ├→ useScrollbarTouch               (独立)
 ├→ useSorter/useFilter/useTreeData  (已存在 hook，不动)
 ├→ useSelectionAdapter             (选择域，最大)
 │    └ 输出 selection/fireSelectionChange/effectiveSelectedKeys/...
 ├→ useRowExpand                    (已存在，不动) → expand
 ├→ selectionNode/expandNode 构建    (留 Table.tsx，用 selection/expand 输出)
 ├→ useColumnTreeBuilder            (接收 selectionNode/expandNode + sort/filter maps)
 ├→ useScrollbarTouch 输出 → wrapperClass
 ├→ buildTableRefHandle(纯函数) → 喂 useImperativeHandle
 ├→ useExpandRowBinding             (依赖 selection 输出 + expand)
 ├→ paginationStateRef(留 Table.tsx 顶部,在 useSorter 前声明)
 │    ├→ useSorter/useFilter 的 onChange 包装(留 Table.tsx,读 ref)
 │    └→ usePaginationAdapter       (写 ref + 切片 + 分页节点)
 └→ render
```

**关键顺序约束**（Rules of Hooks，必须保持）：
- `paginationStateRef` 必须在 `useSorter` 之前声明（当前 L343），抽 hook 后**仍留在 Table.tsx 顶部**，作为参数传给 `usePaginationAdapter`（写）与 useSorter/useFilter 的 onChange 包装（读）。
- useSorter/useFilter 的 `onChange` 包装闭包（读 `paginationStateRef.current`/`currentSorterResult`/`getFiltersArg`）**留在 Table.tsx**，不进 hook。

### 3.2 六个抽取单元接口

#### ① `useScrollbarTouch`（批1 · 独立）
新文件：`src/table/useScrollbarTouch.ts`
源：`Table.tsx` L844–862（state + callback）+ L864–870（卸载清理 effect）。
```ts
export interface UseScrollbarTouchOptions {
  scrollBarFoldMode: ScrollBarFoldMode | undefined
}
export interface UseScrollbarTouchResult {
  scrollBarShowOnTableHover: boolean
  scrollBarExpandOnHover: boolean
  scrollBarTouchedActive: boolean
  activateScrollBarByTouch: (event: React.PointerEvent<HTMLDivElement>) => void
}
export function useScrollbarTouch(options: UseScrollbarTouchOptions): UseScrollbarTouchResult
```

#### ② `buildTableRefHandle`（批1 · 纯函数）
新文件：`src/table/buildTableRefHandle.ts`
源：`Table.tsx` L918–963 的 `useImperativeHandle` factory。`useImperativeHandle` 调用留 Table.tsx，factory 提为纯函数。
```ts
export interface TableEngineLike {
  scrollTo: (config: {
    index?: number; scrollTop?: number; offset?: number
    align?: 'start' | 'center' | 'end' | 'nearest'; behavior?: 'auto' | 'smooth'
  }) => void
}
export function buildTableRefHandle<RecordType>(
  engine: TableEngineLike | null,
  nativeElement: HTMLDivElement | null,
  flattenedDataSource: Array<RecordType>,
  rowKey: string | ((record: RecordType) => string | number),
): TableRef
```

#### ③ `useColumnTreeBuilder`（批1 · 接收 selectionNode/expandNode 入参）
新文件：`src/table/useColumnTreeBuilder.ts`
源：`Table.tsx` L705–824（`columnTree` + `columnTreeWithSortAndFilter` 两个 useMemo）。
```ts
export interface UseColumnTreeBuilderOptions<RecordType> {
  visibleColumns: Array<ColumnOrSentinel<RecordType>>
  selectionNode: EngineColumnNode<RecordType> | null
  expandNode: EngineColumnNode<RecordType> | null
  showSorterTooltip: TableProps<RecordType>['showSorterTooltip']
  sortOrderMap: Map<string, SortOrder>
  sortPriorityMap: Map<string, number>
  filteredValueMap: Map<string, Array<React.Key>>
}
export function useColumnTreeBuilder<RecordType>(
  options: UseColumnTreeBuilderOptions<RecordType>,
): { columnTreeWithSortAndFilter: Array<EngineColumnNode<RecordType>> }
```
内含：哨兵遍历插入（含共享 `anonCounter`）+ 默认位置 unshift/splice + 邻列 fixed 继承（含 EXPAND_COLUMN 反向继承）+ 排序/筛选回填（`applySortOrderToNode`/`applyFilterToNode`，含 hasAnySorter/hasAnyFilter 短路优化）。**所有逻辑机械搬运，依赖数组原样**。

#### ④ `usePaginationAdapter`（批1 · 接收 paginationStateRef 入参）
新文件：`src/table/usePaginationAdapter.ts`
源：`Table.tsx` L1122–1224。
```ts
export interface UsePaginationAdapterOptions<RecordType> {
  pagination: false | TablePaginationConfig | undefined
  flattenedDataSource: Array<RecordType>
  paginationStateRef: React.MutableRefObject<TablePaginationState>
  onChange: TableProps<RecordType>['onChange']
  getFiltersArg: () => Record<string, Array<React.Key> | null>
  currentSorterResult: SorterResult<RecordType> | Array<SorterResult<RecordType>>
  size: SizeType | undefined
  classNamesResolved: TableSemanticClassNames | undefined
  stylesResolved: TableSemanticStyles | undefined
}
export interface UsePaginationAdapterResult<RecordType> {
  paginationEnabled: boolean
  pagedDataSource: Array<RecordType>
  effectivePaginationState: TablePaginationState
  topPaginationNode: React.ReactNode | null
  bottomPaginationNode: React.ReactNode | null
  showPagination: boolean
}
export function usePaginationAdapter<RecordType>(
  options: UsePaginationAdapterOptions<RecordType>,
): UsePaginationAdapterResult<RecordType>
```
内含：`paginationEnabled`/`paginationConfig` 派生 → `usePagination` 调用 → `paginationStateRef.current` 写入（L1161）→ `slicePage` 切片 → `resolvePlacement` + `showPagination` + `getPaginationSize` + `renderPaginationNode`。**`paginationStateRef` 由外部传入**。

#### ⑤ `useSelectionAdapter`（批2 · 最大，选择域）
新文件：`src/table/useSelectionAdapter.ts`
源：`Table.tsx` L425–659。
```ts
export interface UseSelectionAdapterOptions<RecordType> {
  rowSelection: TableRowSelection<RecordType> | undefined
  gridSelection: GridSelectionOptions<RecordType> | undefined
  flattenedDataSource: Array<RecordType>
  filteredDataSource: Array<RecordType>
  treeEnabled: boolean
  childrenColumnName: string
  rowKey: string | ((r: RecordType) => string | number)
  parentChildrenMap: Map<React.Key, Array<React.Key>> // tree.parentChildrenMap
}
export interface UseSelectionAdapterResult<RecordType> {
  selectionEnabled: boolean
  nativeSelectionConfigured: boolean
  resolvedSelectionMode: GridSelectionMode
  resolvedRowSel: TableRowSelection<RecordType> | undefined
  showSelectionColumn: boolean
  selection: ReturnType<typeof useRowSelection<RecordType>>
  effectiveSelectedKeys: Array<React.Key>
  fireSelectionChange: (
    nextKeys: Array<React.Key>,
    method: RowSelectMethod,
    trigger?: SelectionChangeTrigger<RecordType>,
  ) => void
  selectionAnchorKey: React.Key | null
  setSelectionAnchorKey: (k: React.Key | null) => void
  getSelectionValue: (record: RecordType, index: number) => GridSelectionValue
  mapKeysToValues: (keys: ReadonlyArray<React.Key> | undefined) => Array<GridSelectionValue>
}
export function useSelectionAdapter<RecordType>(
  options: UseSelectionAdapterOptions<RecordType>,
): UseSelectionAdapterResult<RecordType>
```
内含：模式解析（native vs compat）+ `selectionLookup`（keyToValue/valueToKey）+ mapKeysToValues/mapValuesToKeys + 受控/非受控 state（3 个 useState）+ `useRowSelection` 调用 + `fireSelectionChange`（preserve/filter 树形存在性判定 + onSelect/onSelectAll/onSelectInvert/onSelectNone 分发）。**依赖数组逐字搬运**。

#### ⑥ `useExpandRowBinding`（批2 · 依赖 selection 输出）
新文件：`src/table/useExpandRowBinding.ts`
源：`Table.tsx` L986–1091（expandRowByClick + onRowWithExpand + rowClassNameWithExpand）。
```ts
export interface UseExpandRowBindingOptions<RecordType> {
  expandEnabled: boolean
  expandable: Expandable<RecordType> | undefined
  expand: ReturnType<typeof useRowExpand<RecordType>>
  onRow: TableProps<RecordType>['onRow']
  rowClassName: TableProps<RecordType>['rowClassName']
  rowKey: string | ((r: RecordType) => string | number)
  // selection 耦合入参
  nativeSelectionConfigured: boolean
  resolvedSelectionMode: GridSelectionMode
  selection: ReturnType<typeof useRowSelection<RecordType>>
  selectionAnchorKey: React.Key | null
  setSelectionAnchorKey: (k: React.Key | null) => void
  effectiveSelectedKeys: Array<React.Key>
  fireSelectionChange: UseSelectionAdapterResult<RecordType>['fireSelectionChange']
}
export interface UseExpandRowBindingResult<RecordType> {
  onRowWithExpand: TableProps<RecordType>['onRow']
  rowClassNameWithExpand: TableProps<RecordType>['rowClassName']
}
export function useExpandRowBinding<RecordType>(
  options: UseExpandRowBindingOptions<RecordType>,
): UseExpandRowBindingResult<RecordType>
```
内含：expandRowByClick/expandedRowClassName 派生 + onRowWithExpand（行点击 single/multiple/extended-shift 选择 + expandRowByClick 叠加 + 用户 onClick 保留）+ rowClassNameWithExpand（展开行追加 class）。**含 shift 范围选择 + ctrl/meta 累加逻辑，依赖数组逐字搬运**。

### 3.3 抽取后 Table.tsx 形态

~650 行薄编排层：imports + Column/ColumnGroup 静态 API + `TableInner`（按调用顺序串联各 hook + 构建 selectionNode/expandNode + paginationStateRef 声明 + useSorter/useFilter onChange 包装 + 最终 JSX 组装）。

---

## 4. 测试策略

每个新 hook 配单测（`src/table/__tests__/*.test.ts(x)`），风格对齐 `useScrollMode.test.ts`：`vitest` + `@testing-library/react` `renderHook` + table-driven 组合矩阵。

优先覆盖的复杂逻辑（**行为保真是首要目标**——证明抽出前后等价）：
- `useColumnTreeBuilder`：哨兵命中/未命中插入位置、邻列 fixed 继承（含 EXPAND 反向）、排序/筛选回填短路。
- `useSelectionAdapter`：compat/native 模式解析、受控/非受控、preserveSelectedRowKeys 过滤（树形存在性走全树）、onSelect/onSelectAll/onSelectInvert/onSelectNone 分发。
- `useExpandRowBinding`：expandRowByClick 叠加、行点击 single/multiple/extended（shift 范围、ctrl/meta 累加）、expandedRowClassName 追加。
- `usePaginationAdapter`：未启用/启用、placement、服务端 total 不切片、paginationStateRef 写入。
- `useScrollbarTouch`：showOnTableHover 解析、触摸激活/超时清理、mouse 指针忽略。
- `buildTableRefHandle`：key→index 解析（命中/未命中）、scrollTop/top 合并、nativeElement 透传。

**写测试 worker 必须额外跑 `pnpm run tsc`**（vitest 不做类型检查，见 [[vitest-no-typecheck]]）。

---

## 5. 任务分解与批次

遵循 [[refactor-granularity-coarse]]（粗粒度、整批设计→执行→一次验证）+ Table.tsx 高危属性（授权"高危分批"）：

- **批 1（低耦合 4 单元）**：useScrollbarTouch + buildTableRefHandle + useColumnTreeBuilder + usePaginationAdapter。相对独立，一起抽 + 测试 + 验证。
- **批 2（高耦合 2 单元）**：useSelectionAdapter + useExpandRowBinding。耦合深，一起抽 + 测试 + 验证。
- **收尾**：全量 `pnpm test` + `pnpm run tsc` + 浏览器手测对比（需用户起 `! pnpm dev`，按 [[verification-workflow]] 用隔离 chrome-devtools agent）。

调度模式（[[orchestrator-no-direct-code-edits]] + [[subagents-no-agent-tool]] + [[autonomous-loop-no-commits]]）：main 只调度，implementer/verifier subagent 串行交替，TaskCreate/TaskUpdate 驱动，工作树堆改动，不 commit。

---

## 6. 验证方法

- 类型：`pnpm run tsc`（tsgo -b）必须 0 错。
- 单测：`pnpm test`（vitest run）全绿（含新测试 + 既有 469 测试不回归）。
- 行为等价：verifier 比对 git diff，确认抽取为**纯机械搬运**（逻辑/依赖数组/闭包不变）。
- 浏览器手测：批 2 完成后，用户起 `! pnpm dev`，chrome-devtools 隔离 agent 跑 demo 对比（选择/展开/分页/排序/筛选/拖拽 demo 重点）。
