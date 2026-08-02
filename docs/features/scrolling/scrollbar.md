# 滚动条（scrollbar）

data-grid 用自研的 `FloatingScrollBar` 组件替代原生滚动条（macOS 风格细线 + hover 变粗），并系统性地消除所有原生滚动条来源。本文说明悬浮条机制、原生条消除策略，以及与 antd 的差异。

## 三处原生条来源全消除

data-grid 不让任何原生横/纵滚动条出现，横向滚动统一由 `FloatingScrollBar`（或页面滚动）承接：

| 来源 | 处理 |
|---|---|
| `.dg-wrapper` | `overflow-x: hidden`（line 39）—— wrapper 自身永不出横条，仅保留圆角裁剪 |
| `.dg-wrapper.dg-data-area` | `overflow-x: hidden`（line 158）—— 数据区域模式显式抑制 wrapper 横条，把横滚交给内部 `.dg-scroll`（FloatingScrollBar 包装） |
| `.dg-wrapper.dg-content-scrolled` | `overflow-x: hidden`（line 260）—— 有 pagination/footer 时把横滚交给内部 `.dg-scroll`（Table 组装层） |

纵向滚动条来源（非 sticky 模式）：`.dg-scroll`（`.dg-scroll-floating` 修饰类下）隐藏原生纵条（见下），由 `.dg-floating-scrollbar-v` 接管。

## 悬浮条机制

触发：`scroll.y` 启用（固定表头 / 虚拟滚动）时，`GridTable` 用 `FloatingScrollBar` 组件包装滚动容器，外层加 `.dg-scroll-wrap.dg-scroll-floating`。

### 1. 隐藏原生滚动条

`.dg-scroll-floating .dg-scroll`（包装层内的滚动容器）：

```css
scrollbar-width: none;          /* Firefox */
::-webkit-scrollbar { width: 0; height: 0 }   /* Chrome/Safari/Edge */
```

滚动行为保留（容器仍 `overflow-y: auto`，滚轮/程序 scrollTop/scroll 事件照常）——只隐藏视觉。

### 2. 包装层定位上下文

`.dg-scroll-wrap` 设 `position: relative`（悬浮条 absolute 锚定到此），`overflow` 默认 visible（不拦截 grid 内部 sticky 上下文，与 `.dg-scroll` 的 overflow 解耦）。

### 3. hit 容器 `.dg-floating-scrollbar`

- 绝对定位：top/bottom/left/right 由 JS 注入。
- 纵向：`right: 0; width: 8px`（thumb 展开后宽度，整个 8px 都是抓取/hover 区；thumb 贴右边缘，默认 2px thumb + 左侧 6px 透明扩展；hover 8px thumb 填满整个 8px hit 区）。
- 横向：`height: 8px`（同理垂直方向）。
- `z-index` 高于单元格（盖在内容上）；纵向 hit 容器 z-index 11 高于横向的 10——滚到底 thumb 在角落时悬停激活竖（非横），竖是数据区域主导滚动条。
- `pointer-events: auto` 让 8px hit 区可抓/hover；区外（hit 8px 之外）点击穿透到下方表格内容。

### 4. thumb `.dg-floating-scrollbar-thumb`（纵向） / `.dg-floating-scrollbar-thumb-h`（横向）

| 状态 | 纵向 thumb | 横向 thumb |
|---|---|---|
| 默认 | width 2px，半透明灰 `--ant-table-scroll-thumb-bg`，贴右边缘（`right:0; left:auto`），transform 仅 translateY | height 2px，同色，贴底边缘（`bottom:0; top:auto`），transform 仅 translateX |
| hover / hit 区 hover | width `--ant-table-scroll-thumb-size`，向左生长（右边缘不动），`--dg-scrollbar-thumb-active-bg` | height `--ant-table-scroll-thumb-size`，向上生长（底边缘不动） |
| 圆角 | `var(--ant-table-sticky-scroll-bar-border-radius)`（=100，胶囊） | 同 |

## token 取值

thumb 默认色、hover 色、track 色和展开尺寸消费 data-grid 显式补齐的 `--ant-table-scroll-*` 变量。这组变量来自 antd Table 内部派生 token：

| 用途 | data-grid 消费 | antd 源 component token | 原因 |
|---|---|---|---|
| 默认色 | `--ant-table-scroll-thumb-bg` | `tableScrollThumbBg` / `stickyScrollBarBg` | `tableTokenToCssVars` 显式补齐，避免内部派生 token 未出现在 CSS vars 中。 |
| hover 色 | `--ant-table-scroll-thumb-bg-hover` | `tableScrollThumbBgHover` | 同上，对齐 sticky fake scrollbar active/hover 色。 |
| track 色 | `--ant-table-scroll-bg` | `tableScrollBg` | 同上，对齐 antd `scrollbarColor` 的 track 色。 |
| 展开尺寸 | `--ant-table-scroll-thumb-size` | `tableScrollThumbSize` | 同上，默认 8px。 |
| 圆角 | `--ant-table-sticky-scroll-bar-border-radius` | （component token） | 非数字 alias 引用，未被剪枝 |

active/hover 最终绘制色使用 `--dg-scrollbar-thumb-active-bg`：

```css
color-mix(in srgb, var(--ant-table-scroll-thumb-bg-hover) 25%, transparent)
```

这里的 25% 是对 antd hover token 的混合权重，不是独立硬编码色。底色仍然来自 `tableScrollThumbBgHover` / `colorTextHeading`，因此亮暗主题和主题编辑器覆盖都会继续生效；最终 alpha 会随源 token 自身透明度变化。以 antd light 默认 `rgba(0,0,0,0.88)` 为例，25% 混合后实际约为 `rgba(0,0,0,0.22)`，避免 active 态过重。

## 页面级 sticky 的 fake scrollbar

`.dg-sticky-scroll-bar-thumb`（GridTable 的 StickyScrollBar thumb）：hover 以 `--ant-table-scroll-thumb-bg-hover` 为底色派生 `--dg-scrollbar-thumb-active-bg`。仅 sticky 启用时渲染。

## 与 antd 差异

| | data-grid | antd |
|---|---|---|
| 纵向滚动条 | 自研 FloatingScrollBar（细线 + hover 变粗） | 原生条 或 `setScrollSticky` fake scrollbar |
| 横向滚动条 | 原生条永不出现（3 处来源全消除）+ FloatingScrollBar | `.ant-table-content` 内原生条 |
| 出现条件 | 永远占位（细线），hover 变粗 | 溢出时才出现 |

## 特殊情况

### hit 容器 hover 触发 thumb 展开

hit 容器 `pointer-events: auto`，进入 8px hit 区即触发 `.dg-floating-scrollbar-v:hover .dg-floating-scrollbar-thumb`（thumb 2px→8px 向左生长填满整个 8px hit 区，右边缘不动）。这让 thumb 即使在自身 2px 之外（hit 区 6px 透明部分）也能 hover 展开。

### 角落优先级

纵向 hit 容器 z-index 11 高于横向的 10，让竖在右下角重叠区胜出——滚到底 thumb 在角落时悬停激活竖（非横）。

### thumb 位置由 DOM 单一路径负责（state 不含 transform）

`FloatingScrollBar` 的 thumb 几何（height/width）+ 可见性（display）放在 React state（`vThumbStyle`/`hThumbStyle`），但**位置（transform）刻意不放 state**——`recomputeVertical`/`recomputeHorizontal` 与 `onScroll` 都通过 `thumb.style.transform = ...` 直接写 DOM。

原因：滚动时 `onScroll` 高频触发，若 transform 走 state，React 重渲染会用 state.transform 覆盖 DOM 上 `onScroll` 刚写的 transform，造成「state transform ↔ DOM transform 竞争覆盖」→ 滚动中 thumb 闪烁。state 只管低频变化的几何/可见性（且在 setState 前判等跳过，避免 ResizeObserver 频繁触发引起不必要重渲）。

### 拖动时 pointerdown 闭包存 hitEl

`onPointerDown` 绑在 hit 容器（整个 8px hit 区可靠抓取），内部 `setPointerCapture` + 在 window 上注册 `pointermove`/`pointerup`。`pointerup` 触发时原 pointerdown 事件对象 `e.currentTarget` 已为 null（事件已结束），直接 `e.currentTarget.releasePointerCapture` 会抛 null。

解决：在 pointerdown 入口（`e.currentTarget` = hit 容器仍有效）把捕获目标元素引用存进闭包变量 `hitEl`，后续 set/release 都用同一元素。

### 轨道点击按页跳转（#33）

老版本 `FloatingScrollBar` 在 hit 容器 `pointerdown` 立即进入「增量拖动模式」：不管点在 thumb 上还是轨道空白，都建立 drag state、`setPointerCapture`、注册 window `pointermove`。结果是单击轨道空白不会触发任何跳页（与 antd #53813 同病）——只是建立一个 dy=0 的"原地拖动"，行为没有意义。

新版本在 pointerdown 入口先做**命中检测**，分流两条路径：

| 命中位置 | 行为 |
|---|---|
| 点在 thumb 本体（含边界） | 进入增量拖动模式（与原行为一致）：`setPointerCapture` + window `pointermove` 换算 delta → 更新容器 scroll |
| 点在 thumb 之前的轨道空白（垂直=上方 / 水平=左方） | **按页向上/左跳**：`container.scrollTop/Left = clamp(currentScroll − viewportSize, minScroll, maxScroll)`，**不**进入拖动循环 |
| 点在 thumb 之后的轨道空白（垂直=下方 / 水平=右方） | **按页向下/右跳**：`container.scrollTop/Left = clamp(currentScroll + viewportSize, minScroll, maxScroll)`，**不**进入拖动循环 |

行为对齐浏览器原生滚动条轨道点击（Windows/Chrome/Firefox 标准行为：点 track 上方→上一页，下方→下一页）。

#### 命中检测纯函数 `computeTrackJump`

算法抽成纯函数（无 DOM/React 依赖），单独导出便于独立单测：

```ts
// src/table/engine/floatingScrollBarUtils.ts
export type TrackHitZone = 'thumb' | 'before' | 'after'

export function computeTrackJump(options: {
  currentScroll: number     // 当前 scrollTop/scrollLeft
  viewportSize: number      // 一页的尺寸（可见数据区高度/宽度）
  clientPos: number         // pointerdown 的 clientY/clientX
  thumbStart: number        // thumb 屏幕坐标 top/left
  thumbEnd: number          // thumb 屏幕坐标 bottom/right
  minScroll?: number        // 默认 0
  maxScroll: number         // geometry.maxScroll
}): { zone: TrackHitZone; nextScroll: number }
```

- `zone === 'thumb'`：nextScroll === currentScroll（caller 沿用增量拖动逻辑）。
- `zone === 'before'` / `'after'`：nextScroll = clamp(currentScroll ∓ viewportSize)，caller 直接赋值给 `container.scrollTop/Left`。

#### viewportSize 的语义

"一页"= 可见数据区的尺寸（不是整个滚动容器的 `clientHeight/clientWidth`）：

- **垂直**：`clientHeight − headerH − summaryH`（去除 sticky 表头 / sticky summary 占用的非数据区）。
- **水平**：`clientWidth − left inset − right inset`（横向 hit 容器 `left:0; right:0`，inset 通常都为 0，故等于 `clientWidth`）。

caller 在 pointerdown 入口从 `geometryRef.clientSize` 与 `trackInsetRef` 预算好 viewportSize 再传入。

#### 非目标（当前不实现）

- **跳到点击位置（jump-to-position）**：macOS 原生滚动条是"点 track 把 thumb 中心跳到点击位置"（jump-to-position）；本实现采用 Windows/Linux 标准"按页跳"（page jump），与任务规约一致。

#### Windows repeat button（按住连续翻页）

对齐 Windows 原生滚动条 / repeat button 手感：pointerdown 命中轨道空白后**按住不放**会持续按页翻，而不是只跳一次。

行为时序：

1. `pointerdown` 命中轨道空白 → **立即跳一页**（同前）。
2. **初始延迟 500ms**（`TRACK_REPEAT_DELAY_MS`）内不跳；500ms 触发后**立即跑首次 repeat tick**（再跳一页），之后**每 50ms（= 20 CPS，`TRACK_REPEAT_INTERVAL_MS`）跳一页**。
3. 每次 repeat tick 重新调 `computeTrackJump`（基于**当前** `scrollTop/Left` 与**当前** thumb 屏幕坐标重算下一页），不缓存首次的 delta——因为每次跳一页后 thumb 跟着位移，下一跳的 currentScroll / thumbStart / thumbEnd 都变了。
4. **停止条件（任一满足即停 repeat，清两个定时器 + 移除 window 监听）**：
   - **pointerup / pointercancel**（不管 pointer 位置，对齐 Windows 行为：按住期间持续翻直到松开）。
   - **到边界**：`computeTrackJump` 算出的 `nextScroll === currentScroll`（已 clamp 到 minScroll/maxScroll，无变化）。
   - **pointer 进入 thumb**：repeat 期间监听 `pointermove`，若 pointer 屏幕坐标（`clientY/X`）落在 thumb 的 `getBoundingClientRect()` 范围内 → 停止 repeat（用户可能想转去拖 thumb 了）。
5. thumb 命中分支（`zone === 'thumb'`）不触发 repeat，仍维持增量拖动语义。

实现要点：

- 常量 `TRACK_REPEAT_DELAY_MS = 500` / `TRACK_REPEAT_INTERVAL_MS = 50` 单独导出在 `floatingScrollBarUtils.ts`，便于单测断言"边界等待 + 节奏"。
- 定时器 id 存 ref（`vRepeatTimeoutRef` / `vRepeatIntervalRef` + 横向对应），`stop()` 函数同时清两个 + 移除 `pointerup`/`pointercancel`/`pointermove` 三个 window 监听。
- 防泄漏：组件 unmount 的 effect cleanup 也会调一次 `vRepeatStopRef.current?.()` / `hRepeatStopRef.current?.()`，确保卸载时未触发的 repeat 不会残留。
- repeat 期间不进拖动循环（不 `setPointerCapture`，不建立 drag state），每次 tick 直接赋 `container.scrollTop/Left = nextScroll`。

## 关联源码

- [`src/table/style/table.css`](../../../src/table/style/table.css) — `.dg-wrapper` / `.dg-wrapper.dg-data-area` / `.dg-wrapper.dg-content-scrolled` 的 `overflow-x: hidden`；`.dg-scroll-floating .dg-scroll` 隐藏原生条；`.dg-floating-scrollbar*` 全套悬浮条规则。
- [`src/table/engine/FloatingScrollBar.tsx`](../../../src/table/engine/FloatingScrollBar.tsx) — 悬浮条组件，注入 thumb 高度/位置。
- [`src/table/engine/GridTable.tsx`](../../../src/table/engine/GridTable.tsx) — 渲染 `.dg-scroll-wrap` + StickyScrollBar。

## 滚动容器路由（TS 视角）

`GridTable` 按模式路由滚动容器（`renderGrid()` 之后的外层包装）：

### 1. sticky 模式（`stickyEnabled`）

grid **不包** overflow 容器（避免 overflow 祖先拦截表头 sticky 上下文）。grid 直接渲染 + `min-width: scrollX` 撑宽页面；表头 grid item 用 `stickyHeaderOffset` 驱动（`position: sticky; top: offsetHeader`，相对 viewport 固定）。grid 之后渲染 `StickyScrollBar` 作为底部固定横向滚动条；fixed summary 使用 `offsetSummary` 时，横向滚动条会叠加 summary 高度和偏移，继续停在 summary 上方。

关键：grid 不包 overflow 容器 → grid 的最近可滚动祖先是 window（页面）→ 表头 sticky 相对 viewport 固定（页面纵向滚动时表头钉在视口顶部 offsetHeader 处）。这是 sticky 与容器内固定表头的本质区别（容器内固定表头相对 `.dg-fixed-header-scroll` 容器固定，容器内滚动）。

横向滚动依赖页面原生滚动条（页面横向滚动）；StickyScrollBar 额外提供"底部固定"的同步 thumb（视觉对齐 antd fake scrollbar）。

### 2. 非 sticky 模式（默认）— 横向滚动统一 FloatingScrollBar

- 横向滚动统一悬浮条（用户规约：绝不出占布局的原生横滚动条）：
  - 非 sticky 模式一律走 `FloatingScrollBar`（`horizontal=true`）。
  - 滚动容器 `.dg-scroll` 始终 `overflow-x:auto` 作为"滚动源"，原生横滚动条由 `.dg-scroll-floating` 修饰类（FloatingScrollBar 自动添加）隐藏 `width/height:0`。
  - 横向不溢出时 thumb 自动 `display:none` → 无任何条；溢出时显示悬浮条（细线 2px + hit 上下各 8px + hover 变粗 8px + 拖动/同步 translateX）。
  - 因此原生横滚动条**永不出现**：basic / fixed-columns / scroll.x / scroll.y / virtual 全部覆盖。
- 纵向滚动（`scroll.y === true`，数据区域模式）：
  - 高度 CSS 自动适应：`.dg-scroll-wrap`（FloatingScrollBar 包装）`flex:1; min-height:0`，`.dg-scroll`（滚动容器）`flex:1; min-height:0; overflow-y:auto`。外层 `.dg-wrapper.dg-data-area`（Table.tsx 注入）`display:flex; flex-direction:column; height:100%`，让 wrap 填满父容器剩余空间——**不用 JS 算数字**。
  - 表头 sticky top（HeaderCell 的 `headerStickyTop` 标志驱动）钉顶，表体限高滚动。
  - 纵向悬浮滚动条（FloatingScrollBar 组件 vertical）。
- 虚拟滚动：`scrollContainerRef` 必须传入（`virtualScrollRef`），供 `useVirtualList` 测量 `clientHeight` 与监听 `scroll`。

### 容器 className 路由

`containerClasses`（合并到 `.dg-scroll`）：

| 类 | 启用条件 | 用途 |
|---|---|---|
| `dg-virtual-scroll` | `virtualEnabled` | 虚拟滚动容器标记（CSS 可据此调整） |
| `dg-fixed-header-scroll` | `scrollYNonVirtual`（非虚拟 + scroll.y） | 容器内固定表头模式标记 |
| `dg-x-scroll` | `scrollXEnabled && !scrollYEnabled` | 仅横向滚动模式（无纵向）标记 |
