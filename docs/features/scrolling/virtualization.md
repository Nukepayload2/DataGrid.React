# 虚拟滚动（virtualization）

`<Table virtual scroll={{ y: true }}>` 启用纵向虚拟滚动。data-grid 借鉴 [react-virtuoso](https://github.com/petyosi/react-virtuoso) 的动态行高测量方案（AATree sizeTree + offsetTree 前缀和缓存 + ResizeObserver 实测），而非 antd `rc-virtual-list` 的固定行高估算。本文说明虚拟窗口、动态行高测量、占位 track / FillerRow、强制 multi 路径、表头 sticky、虚拟 × 展开互斥语义、合并格跨边界已知简化。

## 触发条件

`virtual === true && scroll.y === true`（`scroll.y` 仅 `true`/`undefined`，不取数字高度——容器高度由 CSS flex 自适应）。`sticky` 启用时禁用虚拟（页面级与容器内虚拟互斥；sticky 下页面滚动，虚拟窗口失去意义）。

## 强制 multi 路径

虚拟下表头表体行号必须精确可控。flat 路径（`grid-auto-flow:column`）的 DOM 顺序布局无法插入"占位 track"，故虚拟一律走 multi 路径（显式 `grid-row` 定位）。若已无合并/多级，用 `maxDepth=1` 的 multi，与原 flat 路径视觉等价。

## 虚拟窗口

`useVirtualList` 用 **measured-first（实测优先）+ `getRowHeight`（约定行高）未测行兜底**算 `[start, end)` 可视区行号 + `paddingTop` / `paddingBottom`（可视区上方 / 下方剩余总高）。容器 `clientHeight` 由 ResizeObserver 实时测量，作为窗口高度。

行高口径：
- **固定模型**（默认）：`getRowHeight(i)` = `gridOptions.rowHeight`（数字/函数 → 数值 px），虚拟默认 56（对齐 antd virtual-list 表观行高）。
- **有界模型**（`minRowHeight` 与 `maxRowHeight` 同时为正）：行随内容在 `[min,max]` 变高，body track=`auto` + cell `min/max-height` 约束（详见 [../layout/row-height.md](../layout/row-height.md)）。

## 动态行高测量（AATree + offsetTree）

`useRowMeasurements` 实测每行真实 DOM 高 → `rowSizeSystem` 维护：

- **sizeTree**：AATree（平衡二叉搜索树），按行号区间存实测高，O(log n) 插入/查询。
- **offsetTree**：sizeTree 的前缀和缓存（也是 AATree），按行号查"该行之前所有行的累计高度"，O(log n) 查询 offset。
- **`data-known-size` 回填闭环**：每行首个可见格写 `data-known-size` = 本行最终/实测高，避免 ResizeObserver 反复报变化 → 死循环重渲染。实测优先（`sizeOf(i)`）；未测行回退 `getRowHeight(i)`。

测量模型分支（`effectiveRowHeight`）：
- **有界模式**：`sizeOf(i)` 实测优先 → `clamp` 到 `[min,max]`；未测回退 `getRowHeight`。body track=`auto`，cell 加 `min-height:minRowHeight; max-height:maxRowHeight`（`.dg-cell-bounded`，见 table.css）。
- **固定模式**：`getRowHeight(i)` 数值化。body track=`${effectiveRowHeight(i)}px`（measurement 跑但实测≈固定值，视觉不变）。

## 占位 track / FillerRow（spacer 解耦）

`grid-template-rows` 由 4 段组成：

```
headerTracks(maxDepth) + paddingTopTrack + 可视区数据行 tracks + paddingBottomTrack
```

- `paddingTopTrack` / `paddingBottomTrack` 大小均为 `'auto'`（不是 `${paddingTop}px`），由独立的 **FillerRow** grid item（`grid-column: 1/-1` + `height: paddingTop/Bottom`）撑高其 auto track。
- 数据格 `grid-row` 计算 = `headerRows + 1(paddingTop) + (i - start) + 1`。

**为何解耦**（Bug2 修复）：原方案把 `${paddingTop}px` 直接写进 `grid-template-rows`，每次滚动/测量数值变化 → 整串 track 重写 → 配合 `flushSync` 重渲染风暴出现瞬时 `0px`/异常 track → 视觉抖动。改 `'auto'` + FillerRow 单元素 height 变更：`grid-template-rows` 字符串恒定（只含 header `auto`/px + body tracks + 两条 `auto` padding track + summary `auto`），不再随 scrollTop 变化重写。浏览器布局增量更新，无整串重写抖动。

FillerRow 不打 `data-row-index` → `useRowMeasurements` 跳过它（与表体行区别）。`grid-column:1/-1` 跨整行不占用具体列线号，固定列 / 合并 cell 的 `grid-column`/`grid-row` 定位不受影响。

## 滚动容器

`.dg-scroll` 同时承载横向与纵向滚动（`overflow: auto`），高度由 CSS flex 自适应（`flex:1; min-height:0`，父容器需有明确 height）。`scroll.x` 时 `.dg-grid` 设 `min-width`（与固定列一致）。

原生横/纵滚动条由 `FloatingScrollBar` 包装层隐藏（`.dg-scroll-floating` 修饰类），改用悬浮条（详见 [scrollbar.md](scrollbar.md)）。

## 表头纵向 sticky

虚拟下表头不随滚动消失：表头格 `position: sticky; top: 0`（z-index 4，高于表体）。与固定列横向 sticky 共存（corner cell 双 sticky，浏览器原生支持）。**该机制与非虚拟 `scroll.y` 固定表头共用**——派生标志 `headerStickyTop = virtualEnabled || scrollYNonVirtual`，传入 HeaderCell / ColumnCells 的 `headerStickyTop` prop，统一驱动表头 sticky 行为。

`useHeaderRowHeights` 运行时测量每行表头高度，返回按行号升序的累计偏移数组（多级表头各表头行分层 sticky，避免堆叠在 top:0 重叠）。

## 虚拟 × 展开（收起态约定行高）

`useVirtualList` 的 `getRowHeight` 只取"收起态"约定行高，**不感知展开态**。展开内容 track 在可视区内插入（不参与虚拟窗口大小计算）——展开会让该行真实 DOM 更高，但虚拟窗口范围不变；展开内容溢出渲染（牺牲性能换稳定）。

具体：可见数据行 track 之间穿插展开 track；`paddingTop`/`paddingBottom` 仍按收起态 `totalSize` 计算（不受展开 track 影响）——这会导致展开时实际内容总高 > `totalSize`，浏览器原生滚动条位置可能轻微偏移，但窗口稳定不崩（与 antd virtual-list × 展开行为对齐：展开不重定位窗口）。

## 合并格跨边界已知简化

合并格（`rowSpan>1`）可能跨越可视区边界。本引擎只渲染 `[start, end)` 行，故若某 `rowSpan>1` 格的"左上角"在 `start` 之前、但延伸到 `[start, end)` 内，当前实现下该左上角不在渲染集中——其延伸部分（覆盖 `[start, end)` 中某些格）也不会渲染（被覆盖格本就不渲染），导致视觉上"缺一块"。这是已知简化。完整实现需如 rc-table BodyGrid 的 extraRender 机制补画跨边界的合并格。

## AATree（sizeTree 载体）

`AATree.ts` 是 AA 平衡树（Anderson-Andersson tree）的零依赖实现，同构移植自 react-virtuoso 的 `AATree.ts`。用于构建按行索引（key）→ 行高（value）的前缀和结构，支持 O(log n) 插入/删除/范围查询。

不变量：AA 树通过 `skew`（修复左水平链，左子同层 → 右旋）/ `split`（修复连续右水平链，右子及右子的右子同层 → 左旋 + 升层）/ `adjust`（删除/插入后修复层失衡三种情况）维持「右水平链 + 同层右链」规则，保持树高平衡。

关键 API：

- `insert(node, k, v)`：插入 (k, v)，k 已存在则覆盖 v。返回新根（不可变更新：路径复制 + rebalance）。
- `findMaxKeyValue(node, value, field='k')`：查找 field 值「小于等于 value」的最大节点，返回 `[k, v]`。用于行高查询（找行所在的高度段的 key）。
- `rangesWithin(node, startIndex, endIndex)`：返回与 `[startIndex, endIndex]` 相交的所有 Range（`adjustedStart` 用 `findMaxKeyValue` 把 startIndex 对齐到段起始 key）。
- `arrayToRanges(items, parser)`：把扁平数组（按 index 排序）转换为相邻段 Range 列表（每个 Range 延续到「下一个 index - 1」，最后一个 end 为 Infinity）。

## binaryArraySearch（offsetTree 二分查找）

`binaryArraySearch.ts` 是有序数组二分查找工具，同构移植自 react-virtuoso 的 `utils/binaryArraySearch.ts`。用于在 offsetTree（按 index/offset 升序排列的 OffsetPoint 数组）上做 O(log n) 查找。

比较器约定（与 offsetTree 查询配合）：comparator(item, value) 返回 -1（item < value，应往右找）/ 0（相等）/ 1（item > value，应往左找），描述「item 相对于 value 的位置」。

关键 API：

- `findClosestSmallerOrEqual(items, value, comparator)`：返回数组中「小于等于 value」的最大元素的**值**。
- `findIndexOfClosestSmallerOrEqual(items, value, comparator, start=0)`：返回其**索引**。关键边界：当 `items[end]` 仍 < value（match=-1 且 end-start<2）返回 index-1（回退到上一个更小的）；当 `items[start]` 已 ≥ value（match=1 且 end===start）返回 start（首个大于等于的当作候选下界）。`start` 参数用于复用已找到的下界，加速 `[startValue, endValue]` 区间双查。
- `findRange(items, startValue, endValue, comparator)`：返回区间内所有元素切片，复用第一次查找结果作为第二次的 start 下界，避免重复扫描前段。

## rowSizeSystem（前缀和纯函数系统）

`rowSizeSystem.ts` 是行尺寸纯函数系统（动态行高前缀和），同构移植自 react-virtuoso 的 `sizeSystem.ts` 纯函数部分（去除 urx/分组/recalc/log）。

核心数据结构（`RowSizeState`）：

- **sizeTree (AATree<number>)**：key=段起始行 index，value=该段行高。
- **offsetTree (OffsetPoint[])**：按 index 升序排列的「断点」，每点记录 `{index, offset=该行顶边到列表顶的距离, size=该行高度}`。是 sizeTree 的前缀和缓存，支持 O(log n) `offsetOf` 查询。
- **尾部缓存**：`lastIndex` / `lastOffset` / `lastSize`（offsetTree 最后一个点的字段），供 `totalHeight` O(1) 计算。

### 增量重建（applySizeRanges → createOffsetTree）

`applySizeRanges(state, ranges, gap)` 把新一批 SizeRange 应用到 state：

1. `insertRanges(sizeTree, ranges)`：合并 ranges 进 sizeTree，返回新 `[sizeTree, syncStart]`。合并逻辑：空树在 key=0 插第一段；否则取 `[startIndex-1, endIndex+1]` 的相邻段，新 range 已被某相邻段完全覆盖（同 start/end/size）→ 跳过去重；前邻段 size 不同 → 标记 shouldInsert；中间/后邻段起于新范围内或同高 → 删除（实现合并）；后邻段 end 越过 endIndex 且 size 不同 → 在 endIndex+1 插回原值。`syncStart` = 所有 range 中最早的 startIndex（首插时为 0）。
2. 去重：sizeTree 引用未变 → 无任何变化，返回原 state（避免下游重渲染）。
3. `createOffsetTree(prevOffsetTree, syncStart, sizeTree, gap)`：**增量重建**——只在变化的最早 index（syncStart）之后重算 offsetTree，之前的 OffsetPoint 直接复用（slice 保留），复杂度 O(变化段数)。

### gap 处理（关键）

行间距 gap。`createOffsetTree` 与 `offsetOf` 都必须加 gap，漏一处则偏移错位：

- `createOffsetTree` 中 `aOffset = (rangeStart - prevIndex) * prevSize + prevOffset + (rangeStart - prevIndex) * gap`（每段间都有 gap，故 indexOffset 个 gap）。
- `offsetOf(index)` 中 `top = size * itemCount + (itemCount - 1) * gap + offset`；`top > 0` 时再加一个 gap（行与前一断点行之间的 gap），否则不加（首行）。行间共 itemCount 个间距但第一项无前导 gap，故 (itemCount-1)。
- `totalHeight(count)` 中 `lastRowBottom + (count - 1) * gap`（行间 gap 共 count-1 个）。

### 查询 API

- `offsetOf(index, state, gap)`：第 index 行顶边 offset。O(log n)。二分找 index<=给定 index 的最大断点，段内偏移 + 段内项间 gap + 段起始 offset。
- `sizeOf(index, state)`：第 index 行高度。O(log n)。用 `findMaxKeyValue` 在 sizeTree 找 index 所在段的 size。空树返回 0（调用方回退到约定 `getRowHeight`）。
- `totalHeight(totalCount, state, gap)`：totalCount 行总高度。O(1)。`lastOffset + (totalCount - lastIndex) * lastSize + (totalCount - 1) * gap`。
- `rangesWithinOffsets(state, startOffset, endOffset, minStartIndex=0)`：给定像素区间相交的 offsetTree 段 Range 列表（渲染窗口计算用）。

## useVirtualList 算法细节

### 渲染窗口（measured-first + 约定值兜底）

`useVirtualList` 用 **measured-first（实测优先）+ `getRowHeight`（约定行高）未测行兜底**算 `[start, end)` 可视区行号 + `paddingTop` / `paddingBottom`。容器 `clientHeight` 由 ResizeObserver 实时测量作为窗口高度。

- `effectiveSizeOf(i)`：实测优先（`sizeOfInState`），未测回退 `getRowHeight(i)`。
- `effectiveOffsetOf(i)`：offsetTree 非空时用 `offsetOf`（含尾部外推），否则回退 `measurements[i].offsetStart`。
- `totalSize`：offsetTree 非空且 measuredTotal>0 时用 measuredTotal，否则回退 fallback（约定行高数组末尾 offsetEnd）。
- `findStartIndexByOffset(target, rowSizes, gap)`：在 offsetTree 上二分 + 段内除法定位 scrollTop 对应起始行 index（offset → index 换算）。二分找 offset<=target 的最大断点；段内推进 `advance = floor((target - point.offset + gap) / (point.size + gap))`，返回 `point.index + advance`。

### contentOffset（表头占高修正）

数据区在滚动容器内容中的"起始偏移"（px）。表头格在容器顶部（高 H = maxDepth × headerHeight）+ sticky top:0 时，表头视觉上始终占用容器顶部 H 高度，真正显示数据的高度 = clientHeight - H，真正的"数据 scrollTop" = el.scrollTop - H。传入 contentOffset 后 hook 把 scrollTop/viewportSize 调整后再算 `[start, end)`。

### flushSync 发布（smooth 期间改异步）

scroll 事件用 `flushSync(setScrollState)` 替代 RAF 合并——同步把 `{scrollTop, viewportHeight}` 推出，无一帧延迟；首测 `suppressFlushSync` 直接 set（避免挂载期间 flushSync 警告/重入）。

**smooth 滚动进行中改异步 publish（不 flushSync）**：smooth 动画期间 scroll 事件高频触发，每事件 flushSync 同步重渲染 → 行 DOM mount/unmount → 布局抖动干扰浏览器原生 smooth 每帧目标 → 最终 scrollTop 落点漂移。判定 `scrollTopTargetRef !== null`（smooth 在途）→ 走异步；smooth 结束（到达检测清 target）后下次 scroll 自动回到 flushSync 路径。

### isScrolling / scrollDirection（stateFlagsSystem 同款）

对齐 react-virtuoso stateFlagsSystem：

- `isScrolling`：duc(scrollTop) skip(1) → true；debounceTime(100) → false。
- `scrollDirection`：与 prev scrollTop 比 up/down；停止 throttleTime(50) → none。

### scrollTo（behavior/nearest/smooth + 到达检测）

- `{ index }` / `{ scrollTop }` / `{ offset }` / `{ align }`（'start'|'center'|'end'|'nearest'）/ `{ behavior }`（'auto' 瞬时 / 'smooth' 平滑）。
- **nearest**：目标行已完全在可视区时不滚动（不跳），仅当上方不可见→按 start、下方不可见→按 end（对齐 react-virtuoso `defaultCalculateViewLocation`）。
- **smooth**：JS RAF 驱动 easeOutExpo 缓动（`SMOOTH_SCROLL_FRAME_COUNT = 50` 帧，@60fps ≈833ms），末帧以 `behavior:'instant'` 落定精确 target。**弃用原生 `behavior:'smooth'`**：与虚拟化重渲染耦合会漂移。1000ms fallback timer（仅 RAF 异常时兜底强制收尾）。
- **到达检测**：scrollTop≈target（容差 1px）或触边界（0 / maxScroll）→ 清 target + 翻 `scrollingInProgress=false`。
- **短路**：目标 == 当前 scrollTop → 不滚动、直接同步一次状态。

## 接口

- `GridTableHandle.scrollTo(config)`：`config` 含 `index` / `scrollTop` / `offset` / `align`（'start'|'center'|'end'|'nearest'）/ `behavior`（'auto' 瞬时 / 'smooth' JS RAF easing 平滑动画 + 到达检测）。仅虚拟模式下有效；非虚拟调用为 no-op。

> 注：原生 `scroll-behavior: smooth` 与虚拟化耦合会漂移，故平滑滚动用 JS RAF easing 实现（非 CSS 原生 smooth）。

## 关联源码

- [`src/table/engine/useVirtualList.ts`](../../../src/table/engine/useVirtualList.ts) — 虚拟窗口计算、`scrollTo`、`isScrolling`。
- [`src/table/engine/useRowMeasurements.ts`](../../../src/table/engine/useRowMeasurements.ts) — ResizeObserver 实测 + `data-known-size` 闭环。
- [`src/table/engine/rowSizeSystem.ts`](../../../src/table/engine/rowSizeSystem.ts) — AATree sizeTree + offsetTree 前缀和缓存。
- [`src/table/engine/AATree.ts`](../../../src/table/engine/AATree.ts) — AA 平衡树（sizeTree 载体）。
- [`src/table/engine/binaryArraySearch.ts`](../../../src/table/engine/binaryArraySearch.ts) — offsetTree 二分查找工具。
- [`src/table/engine/GridTable.tsx`](../../../src/table/engine/GridTable.tsx) — `virtualEnabled` 判定、`useVirtualList` 调用、`effectiveRowHeight`、FillerRow 渲染、强制 multi 路径。
- [`src/table/engine/useHeaderRowHeights.ts`](../../../src/table/engine/useHeaderRowHeights.ts) — 多级表头逐行累计 sticky 偏移。
