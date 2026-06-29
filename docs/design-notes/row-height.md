# 行高（row height）

data-grid 用 CSS Grid 的 `grid-auto-rows` / track 管理行高，并提供有界行高模型（minRowHeight/maxRowHeight）对齐 antd `cellPadding` + `lineHeight` 的行高行为。本文说明有界行高模型、rowSpan 豁免、行 hover/选中态背景，以及与 antd 的差异。

## 有界行高模型（`.dg-grid-bounded`）

启用条件：`gridOptions.minRowHeight` 与 `maxRowHeight` 均设时，`GridTable` 加 `.dg-grid-bounded` 类 + 注入 `--dg-row-min-h` / `--dg-row-max-h` CSS 变量。

```css
.dg-grid.dg-grid-bounded .dg-cell-body {
  min-height: var(--dg-row-min-h);
  max-height: var(--dg-row-max-h);
  overflow: hidden;
}
```

作用：body track 用 `auto`（随内容自适应）+ cell 加 min-height/max-height 约束。

### 为何不用 `minmax(min, max)` track

`minmax(min,max)` track 会被 grid free-space 分配拉满到 max——`paddingBottom` track 撑大 grid 容器 → 大量 free space → 所有 minmax track 全部吸满到 max。`auto` track 不吸 free space，cell `min/max-height` 直接约束真实高，实测闭环正确。`overflow: hidden` 配合 max-height 裁剪超出内容（与 antd ellipsis 语义一致：内容超高不撑破行）。

## rowSpan 合并格豁免

`.dg-grid.dg-grid-bounded .dg-cell-body.dg-cell-rowspan`：

```css
min-height: 0;
max-height: none;
overflow: visible;
```

rowSpan > 1 的合并格**不**应用 min/max-height——合并格需跨多 track（如 rowSpan=4 跨 4 行），被 max-height 截断会让 grid 把它压回单 track 高度，破坏合并格对齐（实测：Group rowSpan=4 在 [40,120] 有界下被 max-height:120 截到 120，只盖首行）。

合并格的高度由其跨越的多个 auto track 之和自然决定（仍受各行 cell 的 min/max 间接约束）。`overflow: hidden` 也移除（合并格内容若超高应自然撑开跨 track，不裁剪）。

## cell line-height 对齐 antd

`.dg-cell` 显式声明 `line-height: var(--ant-line-height)`（unitless，跟随主题字号缩放）。antd `cell` 选择器自身不声明 line-height，靠 `.ant-table` 根节点经 `resetComponent(token)` 设 `lineHeight: token.lineHeight` 下推（默认主题 14px → 1.5715 unitless → @14px 解析 ≈ 22px）。data-grid cell 未声明 line-height 时继承浏览器默认 `normal`（≈18px@14px）——每行矮 4px，三档 size 行高均偏矮。本规则 +4px 对齐 antd。

### 为何不破坏

- **ellipsis 列**：`white-space: nowrap` 单行，line-height 不影响单行高度计算（nowrap 下 line-height 只影响行内基线，cell 高度仍由 padding + flex 决定）。
- **表头格**：antd 表头 cell 同样通过 resetComponent 继承 lineHeight（无独立表头 line-height），故表头 line-height 也应是 1.5715——本规则作用在 `.dg-cell`（表头/表体共同基类），表头同步对齐。
- **size 切换**：antd size 只改 padding + fontSize，line-height 恒为全局 token（1.5715 unitless，不随 size 变）。本规则用 unitless var，随 size 字号自动按比例缩放，与 antd 一致。

行高对齐 antd 实测：large 55 / medium 47 / small 39（padding + line-height 22）。原 line-height:normal(18px) 下 large 51 / medium 43 / small 35。

## 行 hover / 选中态背景

详见 [layout.md](layout.md)（行 hover JS 加 `dg-row-hover` 类）与 [selection.md](selection.md)（选中行 `dg-row-selected` 类）。

## 动态行高测量（虚拟模式）

虚拟模式下（详见 [virtualization.md](virtualization.md)），行高不能假设固定——需运行时实测每行 DOM 高度并构建前缀和缓存。`useRowMeasurements` + `rowSizeSystem` 组成测量闭环。

### useRowMeasurements（ResizeObserver 实测）

用**单个 ResizeObserver** 观察 body 内容容器，当容器尺寸变化时（行高变化 / 行增删 / 滚动后新行进入 DOM），遍历容器的**行级子元素**实测高度，与每个元素上记录的 `data-known-size`（上一次实测值，由 GridTable 渲染层回填）对比：

- 相同 → 跳过（去重，避免每帧重算 sizeTree / 重渲染）。
- 不同 → 记入 `SizeRange`；**相邻同高段合并**成一个 `{startIndex, endIndex, size}`。

合并后的 ranges 经 `onRanges` 回填给上层（`applySizeRanges(state, ranges, gap)` 增量更新 sizeTree / offsetTree）。

实测取整用 `Math.round(getBoundingClientRect().height)`（对齐 react-virtuoso `correctItemSize`）：grid track 实际高可能是小数（如 42.4px），取整避免 sizeTree 频繁写入浮点抖动；同时与 `data-known-size` 写入端（GridTable 也取整）保持一致，确保去重生效。

#### 隐藏行守卫（逐行）

跳过 `offsetParent === null` 的隐藏行（`display:none` 或祖先隐藏），避免把 0 / 旧值写回。react-virtuoso 是容器级整体跳过，本表是**逐行**判定（更细粒度）。

#### 首次挂载 flush

挂载即调用一次 flush（不等首个 RO 事件）：首屏首次写入实测行高，避免「空 sizeTree → 回退约定行高撑 track → 一帧后 RO 触发修正」的一次性闪烁。

#### RAF 合并

RO 多次触发只排一次 flush（`rafRef.current !== -1` 时跳过），cleanup cancel。防 layout thrash。

### data-known-size 闭环（防死循环）

GridTable 渲染每行时需把 `sizeOf(i)` 写到该行 DOM 的 `data-known-size`。这样：测量得到 size → 写入 sizeTree → 下次渲染回填到 data-known-size → 下次 RO 事件读到 `size === knownSize` → 跳过。否则每次 RO 都报变化 → 死循环重渲染。

### FillerRow 占位

FillerRow（`grid-column:1/-1` 的空 div，详见 [virtualization.md](virtualization.md)）不打 `data-row-index` → `useRowMeasurements` 遍历子元素时跳过它（`getChangedRowSizes` 中 `if (idxAttr === null) continue`），不影响测量。

### rowSizeSystem（前缀和纯函数系统）

详见 [virtualization.md](virtualization.md) 的「rowSizeSystem」节。

## 多级表头逐行 sticky 偏移（useHeaderRowHeights）

`headerStickyTop` 启用（虚拟 / 非虚拟 scroll.y / 页面级 sticky）时，表头格被设 `position:sticky; top:0`。单行表头 OK；但**多行表头**（grouping-columns，maxDepth>1）所有表头行都 sticky 到容器顶 0 → 多行表头格全部堆叠在同一 y，后渲染盖住先渲染 → 重叠。

### 修复（逐行分层 sticky）

表头格按其 `grid-row-start`（表头行号 1..maxDepth）**逐行分层 sticky**：

- grid-row-start=1 → sticky top: 0
- grid-row-start=2 → sticky top: h1（row1 高度）
- grid-row-start=N → sticky top: Σ h[0..N-2]（该行上方所有表头行的累计高度）

`useHeaderRowHeights` 返回**按表头行号升序的逐行累计偏移数组** `cumulativeOffsets`：index 0 = 0；index k = Σ h[0..k-1]。GridTable 渲染表头格时按 `cell.gridRowStart` 取 `cumulativeOffsets[gridRowStart - 1]` 传入。

### 测量法（grid-template-rows track 累计）

读 `getComputedStyle(grid).gridTemplateRows`（形如 `'42.4px 42.4px 42.4px 43.2px 0px ...'`，前 maxDepth 个 track = 表头逐行，其后为表体行），取**前 len（=maxDepth）个** track 高度累计。

为何用此法而非"按 grid-row-start 分组取 max(bottom)-min(top)"：后者会把跨行表头格（grouping 的 Name/Gender，`grid-row: 1/5`）的 bottom 计入其**起始行**组的 maxBottom，把 row1 算成跨行格的全高（应 42.4 算成 170.4），进而后续行的累计偏移被推到超过容器可视高 → 滚到中段时某些表头行被推到容器外不可见。

`grid-template-rows` 是 CSS Grid 布局引擎按内容自动求解的**每行真实 track 高度**，跨行格只占用其覆盖的各 track 的实际高度、不会把自身整体 bottom 塞进某一个 track——因此**天然避开跨行格 bottom 污染**，逐行 track 高度即真实表头行高。

### 零回归

- 单行表头（maxDepth=1）：只有一组 row1 → cumulativeOffsets=[0] → 所有格 top=0，行为与改造前一致。
- showHeader=false：无表头格 → cumulativeOffsets=[] → 无影响。
- 首测前各行为 0（同 useStickyColumns 首测为 0 的惯例），ResizeObserver 首帧后修正。

## 与 antd 差异

| | data-grid | antd |
|---|---|---|
| 行高载体 | grid track（`auto`） + cell min/max-height | `<tr>` 自然高 + cell padding + lineHeight |
| 有界模型 | `.dg-grid-bounded` + cell 约束 | 无（antd 行高完全由内容 + padding + lineHeight 决定，不裁剪） |
| rowSpan 豁免 | 合并格不应用 min/max | 原生 rowspan 自然跨行 |

## 关联源码

- [`src/table/style/table.css`](../../src/table/style/table.css) — `.dg-cell { line-height }`、`.dg-grid-bounded .dg-cell-body`、`.dg-cell-rowspan` 豁免。
- [`src/table/engine/GridTable.tsx`](../../src/table/engine/GridTable.tsx) — `gridOptions` 注入 + `.dg-grid-bounded` 类判定、`data-known-size` 回填。
- [`src/table/engine/useRowMeasurements.ts`](../../src/table/engine/useRowMeasurements.ts) — ResizeObserver 实测行高 + 去重/合并 + RAF flush。
- [`src/table/engine/rowSizeSystem.ts`](../../src/table/engine/rowSizeSystem.ts) — 行高前缀和系统（sizeTree + offsetTree）。
- [`src/table/engine/useHeaderRowHeights.ts`](../../src/table/engine/useHeaderRowHeights.ts) — 多级表头逐行累计 sticky 偏移。
