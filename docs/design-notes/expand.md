# 行展开（expand）

`<Table expandable>` 启用行展开。`.dg-expand-icon` 复刻 antd 6.4.4 的展开图标（带边框方块 + 内部 +/- 标记，三态切换），展开内容 track 用 `0fr`↔`1fr` 过渡（详见 [column-width.md](column-width.md)）。本文说明图标画法、三态、伪类 color，以及与 antd 的差异。

## 展开图标（`.dg-expand-icon`）

antd 6.4.4 实测（`#/demos/expand` 右栏 computed style）：

- 容器 17×17px，`border: 0.8px solid tableBorderColor`，`border-radius: 6px`，`background: #fff`，`transform: scale(0.9412)`（17→视觉 16px，对齐 antd `expandIconScale = controlInteractiveSize/expandIconSize`）。
- `::before`（横线）：absolute，`top: 7px; inset-inline: 3px; height: 1px; background: currentColor`。
- `::after`（竖线）：absolute，`top/bottom: 3px; inset-inline-start: 7px; width: 1px; background: currentColor`，默认 `rotate(90deg)`（与横线重叠 → 视觉 "-"）。

data-grid 取 0.8px 是 sub-pixel 实测值（antd expand style 用 `tableBorder`），颜色走 `--ant-table-border-color` 跟随主题。

## 三态（对齐 antd `&-collapsed` / `&-expanded` / `&-spaced`）

| 态 | ::before | ::after | 视觉 |
|---|---|---|---|
| collapsed（未展开） | `rotate(-180deg)` | `rotate(0deg)` | "+"（收起，可展开） |
| expanded（已展开） | transform none | `rotate(90deg)` | "-"（已展开，可收起） |
| spaced（disabled / 不可展开行） | `display: none; content: none` | `display: none; content: none` | 空占位（背景透明、border 0、visibility:hidden） |

`::before`/`::after` 的 transform 过渡（motionDurationSlow）与展开 track 的 0fr↔1fr 过渡同步发生，视觉一致。

## 伪类 color（`color: inherit` + hover/focus/active）

antd `expand.ts` 用 `color: 'inherit'`——继承所在 `<td>`（body cell）的文字色。antd cell 文字色来自 `resetComponent(colorText)`。data-grid `.dg-wrapper` 已显式 `color: var(--ant-color-text)`（colorText），故 `inherit` 在 data-grid 解析为 colorText（与 antd 一致）。

antd `expand.ts` 第 55 行 `...operationUnit(token)` 先于 `color: 'inherit'` 注入 hover/focus/active 的 color——`operationUnit`（`components/style/index.tsx:169-198`）规则：

- `:hover/:focus { color: colorLinkHover }`
- `:active { color: colorLinkActive }`

默认主题 `colorLinkHover = #69b1ff`、`colorLinkActive = #0958d9`。`expand.ts` 第 60 行 `color: 'inherit'` 覆盖默认态 color，但**不覆盖** hover/focus/active 的 color（后者在 `operationUnit` 展开对象内，与 `&:focus,&:hover,&:active { borderColor }` 同为伪类规则）。→ hover 时 currentcolor 解析为 colorLinkHover，borderColor 同色。

data-grid 复刻：

```css
.dg-expand-icon:not(:disabled):hover,
.dg-expand-icon:not(:disabled):focus {
  color: var(--ant-color-link-hover);
  border-color: currentcolor;
}
.dg-expand-icon:not(:disabled):active {
  color: var(--ant-color-link-active);
  border-color: currentcolor;
}
```

## 展开内容容器（`.dg-row-expanded`）

- grid item，跨整行 `grid-column: 1/-1`。
- `overflow: hidden; min-height: 0`：配合展开内容 track 的 `0fr`（收起裁剪到 0）/ `1fr`（展开自然高）。
- 背景 `--ant-table-row-expanded-bg`（antd 展开行淡灰底）。
- 内边距：`var(--dg-cell-padding-block) var(--dg-cell-padding-inline)`（与单元格 padding 一致）。

## 展开列单元格

与选择列类似，居中。`.dg-cell[data-align='center']` 已提供 `justify-content: center`。

## 与 antd 差异

| | data-grid | antd |
|---|---|---|
| 图标画法 | `::before`/`::after` 伪元素 +/-（精确复刻 antd） | 同款伪元素 |
| 展开动画 | track `0fr`↔`1fr` 过渡 + 图标 transform 过渡 | rc-table 同款 |
| expanded 容器 | grid item `grid-column:1/-1` | `<tr class="ant-table-expanded-row"><td>` |

## 引擎状态机（useRowExpand）

`useRowExpand` 自研行展开状态管理 hook（纯 React 实现）。

### 核心职责

1. **受控/非受控 expandedRowKeys 管理**：
   - 受控（`expandedRowKeys` 传入）：直接以该数组为真理源；切换时只回调 `onExpandedRowsChange`/`onExpand`。
   - 非受控（仅 `defaultExpandedRowKeys` / `defaultExpandAllRows`）：内部 useState 持有当前展开 keys。
2. **可展开行判定**：综合 `expandable.rowExpandable(record)` 与 `expandedRowRender(record,...)` 是否返回 null/undefined，决定某行是否"真正可展开"（会渲染展开图标 + 插入展开 track）。
3. **展开切换**：`toggleExpand(key, record)` → 生成新数组 + 触发回调。
4. **派生查询**：`isExpanded(key)`、`expandableKeySet`（Set，所有可展开 key）。

### 可展开性判定（不重复调用 expandedRowRender）

`computeExpandable` 不调用 `expandedRowRender` 来探测可展开性（避免重复渲染 + 副作用）——与 antd 一致：antd 只在展开时才 mount 调用 `expandedRowRender`。判定逻辑：

- 必须提供 `expandedRowRender`（否则整表无展开）。
- `rowExpandable` 若提供：返回 false 的行不可展开（图标禁用、不插展开 track）。

### 与 expandedRowRender 互斥（树形优先）

antd 行为：tree-data（record.children 嵌套）与 `expandable.expandedRowRender` 不可同时启用（antd 会 warning）。data-grid 中**树形模式优先**——树形检测命中时，expandState 不启用（由 `Table.tsx` 适配层控制：树形模式下不构造 engineExpandState）。

### 虚拟滚动 × 展开

`useRowExpand` **不感知虚拟滚动**。展开状态只决定"某行是否展开"，虚拟窗口（`useVirtualList`）仍只按"收起态"约定行高算 `[start, end)`；展开内容 track 在 `GridTable` 渲染层插入，溢出渲染。

### 受控源可能含不可展开 key

受控源可能含不可展开 key（保留语义，与 antd preserve 类似）；`isExpanded` 仍按该数组判定。

## 关联源码

- [`src/table/style/table.css`](../../src/table/style/table.css) — `.dg-expand-icon` + 三态类（`-collapsed`/`-expanded`/`-spaced`）+ 伪类 color、`.dg-row-expanded`。
- [`src/table/engine/ExpandIcon.tsx`](../../src/table/engine/ExpandIcon.tsx) — 展开图标组件（切类名 + 透传 disabled/expanded；+/- 由 CSS `::before`/`::after` 画）。
- [`src/table/engine/useRowExpand.ts`](../../src/table/engine/useRowExpand.ts) — 行展开状态机（`expandableKeySet`/`isExpanded`/`toggleExpand`/`computeExpandable`）。
- [`src/table/engine/GridTable.tsx`](../../src/table/engine/GridTable.tsx) — 展开行 track 注入（`0fr`/`1fr`）+ 展开图标类切换。
- [`src/table/Table.tsx`](../../src/table/Table.tsx) — `buildExpandColumnNode`（`__dg_expand__` key）。
