# 拖拽排序（drag sort）

data-grid 用 CSS Grid 渲染，"行"/"列"不是 DOM 元素——单元格直接是 grid item（`grid-column`/`grid-row` 显式定位），故 drag 排序无法套用 `@dnd-kit` 的"DOM 元素 transform"模型（会破坏 Grid 布局）。本文说明自研 pointer 拖拽机制：行拖（含手柄 / 多行成块）、列拖（含锁定列）、离散让位、auto-scroll 边缘滚动，以及与 antd dnd-kit 的差异。

## 为什么不用 dnd-kit（grid 渲染不兼容）

data-grid 的"行"/"列"不是单一 DOM 元素：

- **行拖**：dnd-kit `useSortable` 需要"行 DOM"挂 `setNodeRef`/`transform`/`listeners`。若引入"行容器 div"（`grid-column:1/-1` + 内部 subgrid），会切断固定列（单元格自身 sticky，行容器阻断 sticky 祖先链）、合并格（`grid-row span` 在行容器内失效）、虚拟（行 track 按行算，行容器破坏 track 布局）、展开（展开 track `grid-column:1/-1` 与行容器冲突）。CSS `subgrid` 浏览器支持有限且与上述能力仍冲突。
- **列拖**：dnd-kit 的 transform 平移整列内容会与 grid item 的 `grid-column` 定位冲突，且 dnd-kit 的 DragOverlay 在 grid 下无对应"列容器"概念。

故 data-grid 拖拽一律自研 pointer（事件委托 + `setPointerCapture` + hit-test + 指示线 + arrayMove），不引入 `@dnd-kit/*`。

## 事件委托（命中判定）

调用方在外层容器挂 `containerProps.onPointerDown`，hook 内部用 `target.closest(selector)` 命中引擎给单元格打的 data 属性：

- **行拖**：命中 `[data-row-index]` body 单元格（`useRowDragSort`）。引擎给每个 body 单元格打 `data-row-index="<行号>"`。
- **列拖**：命中 `[data-leaf-index]` 叶子表头格（`useColumnDragSort`）。引擎给每个叶子表头格打 `data-leaf-index="<叶子列号>"`；分组表头格 `data-leaf='0'` 无 `data-leaf-index`，故天然不触发列拖（多级表头下仅叶子列可拖，正确）。

事件委托的好处：无需修改引擎渲染层、无需 components 机制、无需 `onCell`/`onHeaderCell` 透传。

## 拖拽手势（共用模式）

行拖 / 列拖 / 列宽拖拽共用同一套 pointer 手势：

1. **pointerdown**：仅左键（`button===0`）启动；`preventDefault + stopPropagation`（避免触发排序点击 / 列宽拖拽 / 文本选区）；`target.setPointerCapture(pointerId)` 锁定后续 pointermove/up 到该元素，即使指针移出单元格/窗口也不丢事件；记录起始态（dragging index、起始 clientX/Y、pointerId）。
2. **pointermove**：实时 hit-test 算 over index + 更新指示线 / 让位 transform。
3. **pointerup**：释放 pointer capture，清拖拽态；若 over ≠ dragging → 调用 `onSort(arrayMove(...))`，调用方 setState 重排 dataSource / columns。

`arrayMove` 算法对齐 `@dnd-kit/sortable`（from → to：先删 from 再插 to）。

## hit-test（实时读 DOM）

行高 / 列宽在 data-grid 下非固定（`auto` / `max-content` / resizable），故 hit-test 不假设固定尺寸，每帧实时读 DOM：

- **行 hit-test**：容器内所有 `[data-row-index]` body 单元格按 row-index 分组，取每行 `getBoundingClientRect()`（top/bottom），pointer Y 落在某行"上半部分" → over = 该行 index（插入到该行之前）；"下半部分" → over = 该行 index + 1。
- **列 hit-test**：容器内所有 `[data-leaf-index]` 表头格按 leaf-index 取每个的 left/right，pointer X 落在某列"左半部分" → over = 该列 index；"右半部分" → over = 该列 index + 1。

仅对应方向 hit-test（行拖只看 Y，列拖只看 X，等效 dnd-kit 的 `restrictToVerticalAxis` / `restrictToHorizontalAxis`）。每帧只读一次 DOM（O(rows/cols)，典型表格 <1ms）。

## 指示线（独立浮层）

返回 `indicator` 样式，调用方在**外层相对定位容器**内渲染一条绝对定位线（行拖为横线、列拖为竖线），指示"松手后该行/列会插入的位置"。

指示线是外层容器的子元素，**不是 grid item**，不参与 `grid-template-rows/columns` 计算（零回归，不影响布局）。

## 离散让位（dnd-kit 风格，行拖专用）

行拖拽中**不**把整行 transform 平移到指针位置（会破坏 grid track），而是离散让位：

- **被拖行视觉**：pointerdown 时克隆当前行单元格到 fixed overlay，overlay 脱离 `.dg-scroll`，只跟随指针位移，不会被虚拟窗口卸载。
- **被拖行源格**（`rowIndex === fromIndex`）：源格保留在表体内参与占位 / hit-test；有 overlay 时加 `dg-drag-row-source` 隐藏，源格 transform 仍叠加滚动位移以抵消表体滚动。
- **让位行**（from → over 中间行）：`transform = translateY(±draggedHeight)`（向上拖负、向下拖正）+ `dg-drag-row-yield` 类（`transition: transform 150ms ease`，平滑让位动画）。
- **其余行**：清 inline transform + 清两个让位类（复位）。
- `from === over`：无让位行（仅被拖行抬起，其余行复位）。

被拖行高度在拖拽开始时**一次性快照**（用该行首个 `[data-row-index]` cell 的 `getBoundingClientRect` 高度），后续让位 transform 用此高度算位移量。过程中行高不变（grid track 未重排，dataSource 未变），无需 ResizeObserver 跟踪。

松手前调 `clearYieldTransforms()` 清场（移除全部 cell 的 transform + 让位类），再 `arrayMove` 重排 dataSource（grid 重新计算 track，cell 复用但无残留位移）。

### 为何用 transform 而非改 grid track

CSS transform 不影响 grid item 的 grid-track 定位（纯视觉位移），不动 `grid-row` 槽位。若改 track（如临时插空 track），会触发整串 `grid-template-rows` 重写 + 配合 flushSync 重渲染风暴出现抖动。transform 是最低成本实现"被拖行跟手 + 中间行让位"视觉的方式。

## 虚拟模式健壮性（pointer 监听挂 window）

行拖在虚拟模式下（如 1 万行），原实现把 pointermove/up/cancel 监听挂在被拖行首个 cell（`el`）上并依赖 `el.setPointerCapture` 路由事件。当用户拖拽 + auto-scroll 让 from cell（el）滚出可视区时，虚拟引擎会把它从 DOM 卸载（detached）。Pointer Events 规范：capture target 被 detached 后 pointer capture 自动丢失，此后事件 target 回到 hit-test 结果并冒泡；但监听挂在已 detached 的 el 上 → 收不到 → pointerup 不触发 → drop 卡死。

修复：pointermove/up/cancel 监听改挂 `window`（永远存在、不受虚拟卸载影响），用 `AbortController` 批量管理（`{ signal: ac.signal }`），nativeUp 内 `ac.abort()` 一次性移除全部三个监听，卸载 cleanup / 重入守卫也 abort()。`setPointerCapture` 仍保留（el 在 DOM 时防选区 + 锁定事件路由）；nativeMove/nativeUp 开头用 `ev.pointerId !== drag.pointerId` 过滤（挂 window 后会收到所有 pointer 事件，必须靠 pointerId 只处理本拖拽会话）。

## auto-scroll（拖到边缘自动滚动）

虚拟列表下只渲染可视区行；当用户把行拖到容器底部边缘下方时，可视区外的行没有 DOM，hit-test 会"卡住"在可视区最后一行——drop 目标永远在末行，无法到达远处位置。

`useAutoScrollOnDrag` 解决：拖拽中指针接近容器边缘 → 渐进加速滚动容器 → scroll 事件触发虚拟引擎重算已渲染行 → DOM 行边界变化 → 下一帧 hit-test 自动跟随到新位置。

### 机制（自研 RAF，非 dnd-kit autoscroll）

dnd-kit 的 autoscroll 与其 DndContext/useDraggable 强耦合——data-grid 自研拖拽 hook 不在 DndContext 内，无法享受。自研 RAF 循环足够简单（边缘检测 + scrollBy + cleanup），且与现有 hit-test（每帧重新读 DOM）兼容。

- **滚动容器定位**（`findScrollContainer`）：拖拽 hook 的 `containerRef`（外层相对定位 div）不是滚动容器本身。data-grid 的滚动容器是它内部的 `.dg-scroll`。优先 `containerRef.current.querySelector('.dg-scroll')`；找不到则向上遍历 `offsetParent` 链找最近的可滚动祖先（overflow-x/y 非 visible）兜底；都失败则 auto-scroll 为 no-op。
- **边缘检测 + 加速**：每帧（RAF）读最新 pointer（指针坐标由调用方在 pointermove 时实时写到 ref）+ 滚动容器 `getBoundingClientRect()`：
  - 距边缘 < 阈值（`EDGE_THRESHOLD = 100px`，对齐 ag-grid `SCROLL_MOVE_WIDTH`）→ 触发滚动。
  - 速度 = `(1 - dist/threshold) * MAX_SPEED`（dist=0 贴边时 = MAX_SPEED；dist=threshold 边缘时 = 0；线性渐进）。
  - `MAX_SPEED = 15 px/帧`（@60fps ≈ 900 px/s，确保跟上用户拖拽速度）。
  - 行拖（`vertical=true`）→ 纵向滚动；列拖（`vertical=false`）→ 横向滚动。
- **生命周期**：拖拽开始时 `start()`；拖拽结束 / 卸载时 `stop()`（cancelAnimationFrame + 重置指针坐标 ref）。
- **零回归**：仅在拖拽中且指针在阈值内才触发 scrollBy；中间拖拽（距边缘 > 阈值）速度为 0；`autoScroll=false` 时整个 hook 完全 no-op。

### hit-test 不会随 scroll 自动重跑（调用方需自行监听）

`scrollContainer.scrollBy` 会触发原生 scroll 事件 → useVirtualList 重算可视区 + 新行进入 DOM + FloatingScrollBar 同步悬浮条 thumb。**但 hit-test 不会随 scroll 自动重跑**——指针停在容器边缘不动时没有 pointermove 事件，被拖行/让位行的 over/yield 会冻结在旧值。

故调用方（`useRowDragSort`）需在拖拽期间自行监听 scroll：`scroll` 事件 → `requestAnimationFrame`（延迟一帧确保虚拟引擎已 flush 新行 DOM）→ 用最后已知 clientY 重跑 `recomputeFromPointer`（hit-test → over 换算 → setDragState → setIndicator → applyYieldTransforms）。RAF 去重（scroll 一帧可能触发多次，dragRef.scrollRafId !== null 时跳过）保证每帧只重算一次。

## 行拖：手柄列限定（drag-sorting-handler）

`useRowDragSort` 的 `handleSelector` option 限定仅手柄列触发拖拽（区别任意 body 单元格触发）：

- 传入 `handleSelector`（如 `.dg-drag-handle`）→ pointerdown 仅当 `target.closest(handleSelector)` 命中手柄元素（且仍在某行 `[data-row-index]` body 单元格内）才启动拖拽；点 Name/Age/Address 等非手柄列不启动。
- 不传 → 任意 body 单元格触发（整行均可拖）。

手柄列 render 的 DragHandle 元素需带匹配 class（如 `<Button className="dg-drag-handle">`）。

## 行拖：多行成块重排（multi-row block move）

`useRowDragSort` 的 `multiRowReorder` option（默认 true）：当被拖行属于多选 selection（`selectedRowKeys` 含 ≥2 个且包含被拖行）时，把所有选中行作为**一块**移到目标位置（保持选中行间相对顺序），而非只移被拖行。

- 边界：被拖行未选中 → 只移它；selection 含被拖行+其它 → 成块移；目标落在选中块内部 → no-op；单选 / 无 selection → 退化为单行重排（零回归）。
- 成块移动用 `arrayMoveBlock`：先把 block 行按原顺序抽出（剩余行自动收拢），再把整块插到目标位置（位置以"剔除 block 后的剩余数组"坐标修正：to 减去其左侧已被抽走的 block 行数）。
- 目标位置语义转换：单行 `arrayMove` 的 overIndex 是"目标行 index"（先删 from 再插）；成块 `arrayMoveBlock` 的 toIndex 是"插入位置"（0..len），需把 overIndex 还原成插入位置（over <= from 时插入位置=over；over > from 时插入位置=over+1）。

## 列拖：锁定列（lockPosition）

`useColumnDragSort` 的 `arrayMoveColumnsRespectLocks` 算法让锁定列（`gridColumnOptions.lockPosition === true`）保持原 index 不动——只在非锁定列子序列上做 arrayMove，再把结果按原位填回（锁定列保持原 index 不动）：

1. 把原 columns 分成两组索引：`movableIdxs`（非锁定列的原 index 列表，按原顺序）+ `lockedIdxs`（锁定列的原 index 集合）。
2. 在 movableIdxs 上找到 from 对应的可动列序号（`fromMovable`）+ to 对应的可动列序号（`toMovable`）。toIndex 落在锁定列上时，根据拖拽方向取最近的可动列序号（避免把可动列"插入"到锁定列的固定槽位之间错乱）。
3. 对 `movableIdxs` 做 arrayMove（fromMovable → toMovable）得到新的可动列 index 序列。
4. 重建数组：锁定列保持原位（按 lockedIdxs 的原 index），可动列按重排后的顺序依次填入剩余槽位。

无任何锁定列时内部退化为普通 arrayMoveColumns（零回归 + 性能更优）。

## 列重排 / 行重排粒度开关

- **列拖**：`gridOptions.columnReorder`（默认 true）是全局总闸（对齐 ag-grid `suppressMovableColumns`）；单列粒度 `gridColumnOptions.movable === false`（suppressMovable）+ `gridColumnOptions.lockPosition === true`。某列可发起拖 ⟺ `reorder !== false && movable !== false && !lockPosition`。
- **行拖**：`gridOptions.autoScrollOnDrag`（默认 true）控制边缘自动滚动；`gridOptions.multiRowReorder`（默认 true）控制多行成块。

## 与 antd 差异

| | data-grid | antd |
|---|---|---|
| 行拖视觉 | fixed overlay 跟手 + 中间行离散让位 + 指示线（横线） | dnd-kit `useSortable` transform 跟随指针平移整行 |
| 列拖视觉 | 垂直指示线（竖线）提示插入位置 + 松手重排 columns（列瞬间到新位置） | dnd-kit `useSortable` transform 跟随指针平移整列 + body cell 虚线边 + DragOverlay 预览 |
| 手势挂载 | 事件委托（外层容器 onPointerDown，命中 data 属性） | `<tr>`/`<th>` 挂 listeners（drag-sorting）或手柄 setActivatorNodeRef（drag-sorting-handler） |
| 锁定列 | `lockPosition` + 可动列子序列重排算法 | dnd-kit 的 `disabled` / restrict |

视觉与 antd 略异（antd 整行/整列跟手指针；data-grid 被拖行抬起 + 中间行让位 + 指示线），但功能等价（行/列重排），且不破坏 CSS Grid 布局。

## 已知简化

- **列拖虚拟 + autoScroll 场景**：列拖的 pointer 监听挂 `el`（不像行拖挂 window），若 from cell 滚出视口被虚拟引擎卸载会丢 move/up 监听导致 drop 卡死（与行拖同款 BUG，待对称修复）。
- **多级表头列重排**：多级表头下叶子列重排仅在同父分组内才有语义意义，跨分组重排复杂；demo 用单层表头。
- **树形 / 展开行重排**：展开/树形行重排语义复杂（子树跟随？），未覆盖。
- **虚拟模式让位 transform**：`querySelectorAll('[data-row-index]')` 只命中当前可见的 cell；被拖行视觉由 fixed overlay 保留，不受虚拟卸载影响。让位行滚出视口后会被卸载，新可见行在下一帧 `recomputeFromPointer` 中重新计算让位。

## 关联源码

- [`src/table/engine/useRowDragSort.ts`](../../src/table/engine/useRowDragSort.ts) — 行拖拽 hook（事件委托 + hit-test + 离散让位 + 多行成块 + 手柄限定 + window 监听 + scroll RAF）。
- [`src/table/engine/useColumnDragSort.ts`](../../src/table/engine/useColumnDragSort.ts) — 列拖拽 hook（事件委托 + 水平 hit-test + 垂直指示线 + 锁定列友好重排）。
- [`src/table/engine/useAutoScrollOnDrag.ts`](../../src/table/engine/useAutoScrollOnDrag.ts) — auto-scroll RAF 循环（边缘检测 + scrollBy + 滚动容器定位）。
- [`src/table/engine/GridTable.tsx`](../../src/table/engine/GridTable.tsx) — 给 body 单元格打 `data-row-index`、叶子表头格打 `data-leaf-index`。
- [`src/table/style/table.css`](../../src/table/style/table.css) — `.dg-drag-row-active` / `.dg-drag-row-yield` / `.dg-drag-handle` 样式。
