# Semantic DOM 兼容性分析（data-grid vs antd v6）

对应 demo：`src/demos/semantic-dom-slots.tsx`。

data-grid 用 **div + CSS Grid** 渲染（非真 `<table>`）。Semantic DOM 兼容分两层：
**逻辑槽位（classNames/styles）** 与 **DOM 结构语义（role / aria-* / a11y）**。

---

## 1. 13 槽位 classNames/styles 兼容矩阵

antd v6 `TableProps.classNames` / `styles` 共 13 个槽位。data-grid 的兼容度：

| # | 槽位 | antd 渲染目标 | data-grid 渲染目标 | 兼容度 |
|---|------|---------------|-------------------|--------|
| 1 | `root` | `.ant-table-wrapper` | `.dg-wrapper` | ✅ 完全兼容 |
| 2 | `section` | `.ant-table` | `.dg-scroll` | ✅ 完全兼容 |
| 3 | `content` | `.ant-table-container` | `.dg-grid` | ✅ 完全兼容 |
| 4 | `title` | `.ant-table-title` | `.dg-title` | ✅ 完全兼容 |
| 5 | `footer` | `.ant-table-footer` | `.dg-footer` | ✅ 完全兼容 |
| 6 | `header.cell` | `<th>` | `.dg-cell-header` | ✅ 完全兼容 |
| 7 | `header.row` | `<tr>`（thead 内） | 透传到表头行所有 `.dg-cell-header` | ✅ 已支持（多路径 HeaderCell + flat 路径，详见 `src/table/engine/HeaderCell.tsx` 与 `FlatColumnCells.tsx`） |
| 8 | `header.wrapper` | `.ant-table-thead` | **❌ 架构不兼容**（dg 无 thead 容器） | 🚫 **已从公共类型面删除**：`classNames.header.wrapper` / `styles.header.wrapper` 现在传了会**编译报错**（曾有接口无宿主＝静默不生效，改成显式报错）。整区样式改挂 `root` / `section` / `content`，整行改挂 `header.row` |
| 9 | `body.cell` | `<td>` | `.dg-cell-body` | ✅ 完全兼容 |
| 10 | `body.row` | `<tr>`（tbody 内） | 透传到表体行所有 `.dg-cell-body` | ✅ 完全兼容 |
| 11 | `body.wrapper` | `.ant-table-tbody` | **❌ 架构不兼容**（dg 无 tbody 容器） | 🚫 **已从公共类型面删除**，同上；表体整区改挂 `content` / `section`，整行改挂 `body.row` |
| 12 | `pagination.root` | `.ant-pagination`（分页器 `<ul>` 自身） | **`.dg-pagination`（我们多包的一层布局 div）** | ⚠️ **部分兼容（结构级差异）**：语义落点比参照多一层 div；且我们的 `<ul>` 上没有 `ant-table-pagination` 与 `ant-table-pagination-<placement>` 这两组布局类。按 `.ant-table-pagination` 写选择器需改挂 `.dg-pagination` 或自己的容器 |
| 13 | `pagination.item` | `.ant-pagination-item` | 透传给分页组件的**逐项**槽（每个页码/前后翻页项都收到） | ✅ 完全兼容（逐项分发，与参照同形） |

**兼容度判定**：13 槽中 **9 完全兼容** ＋ **1（`header.row`）本轮补齐** ＋ **2（`header.wrapper` / `body.wrapper`）已从公共
类型面删除**（无渲染宿主，保留字段只会静默不生效，改成编译期报错）＋ **1（`pagination.root`）结构级部分兼容**
（落点比参照多一层布局 div）。

### `header.row` 的处理方式

- **缺口位置**：表头 cell 渲染处（`src/table/engine/HeaderCell.tsx` 多路径 + `src/table/engine/FlatColumnCells.tsx` flat 路径）过去只消费
  `semanticHeader.className.cell` / `semanticHeader.style.cell`，**未消费 `.row`**；
  而 body 侧（`src/table/engine/BodyGrid.tsx` 内 `renderBodyCells`）已消费 `semanticBody.className.row` /
  `semanticBody.style.row`（透传到行内所有 cell）。两侧不对称。
- **修复**：在表头格的 className 数组 + style 合并里补 `semanticHeader?.className?.row` /
  `semanticHeader?.style?.row`（与 body.row 对称——grid 无 tr，行 class/style 分发到该行所有表头格）。
- **改动位置**：
  - 多路径 HeaderCell（`src/table/engine/HeaderCell.tsx`）：className + style 各补一行。
  - flat 路径 HeaderCell（`src/table/engine/FlatColumnCells.tsx`）：className + style 各补一行。
- **零回归**：未传 `semantic.header.row` 时 `?.row` 取 `undefined`，与改造前完全一致。

### header.wrapper / body.wrapper 架构天花板

data-grid 的渲染结构：

```
.dg-wrapper                ← root
  .dg-title                ← title
  .dg-scroll               ← section（滚动容器）
    .dg-grid               ← content（CSS Grid 容器，表头 + 表体 cell 都直接铺在此）
      .dg-cell-header ×N   ← header.cell（直接是 grid 子元素，无 thead/tr 包装）
      .dg-cell-body   ×N   ← body.cell  （直接是 grid 子元素，无 tbody/tr 包装）
  .dg-footer               ← footer
  .dg-pagination           ← pagination.root
```

**无 `.ant-table-thead` / `.ant-table-tbody` 对应的中间容器**——表头 cell 与表体 cell 共享
同一个 `.dg-grid`，靠 `grid-row` 显式定位区分表头行与表体行。强行加 thead/tbody 中间容器
会破坏 CSS Grid 的显式定位模型（grid item 的直接父级必须是 grid 容器）。

**当前处置**：`classNames.header.wrapper` / `classNames.body.wrapper`（及对应 `styles` 槽）
**已从公共类型面删除**——保留一个没有宿主的字段只会让调用方以为样式已生效。删除后传这两个字段
是**编译报错**而不是静默不生效。替代写法：整区样式挂 `root` / `section` / `content`，
整行样式挂 `header.row` / `body.row`（它们分发到该行每个格子）。
这条选择的是"删除字段"而不是"保留字段 + 运行时告警"，属**可推翻**的取舍，不是技术定论；
补容器需重构 grid 布局（未来架构工作）。

---

## 2. 行容器调查结论

**调查结论：dg 行＝多 cell 直接铺在 grid 上，无行容器。**

证据：
- `src/table/engine/GridTable.tsx` 渲染的 `.dg-grid` 是单一 CSS Grid 容器。
- 多路径 `headerCells.map(...)` 把每个 HeaderCell 直接作为 grid 子元素放置
  （`grid-column` / `grid-row` 由 `cell.gridColumnStart/gridColumnEnd/gridRowStart/gridRowEnd`
  显式指定，见 `src/table/engine/HeaderCell.tsx` 内 HeaderCell `<div>` 的 inline style）。
- `renderBodyCells(...)`（`src/table/engine/BodyGrid.tsx`）同样把每个 BodyCell 直接作为 grid 子元素放置
  （`grid-column` / `grid-row` 由 colIdx + rowLine + colSpan/rowSpanTracks 计算，见 BodyCell
  `<div>` 的 inline style）。
- **没有**任何 `<div role="row">` 或类似行级容器把"一行的所有 cell"包起来。`components.body.row`
  仅用于 EditableRow 等场景的 Context.Provider 包裹（Provider 不渲染真实 DOM，cell 仍是 grid
  直接子元素，见 `src/table/engine/BodyGrid.tsx` 注释）。

**采取方案：不加零散 role（避免无效 ARIA）**。

理由：ARIA `role="table"` / `role="row"` / `role="rowgroup"` / `role="columnheader"` /
`role="gridcell"` / `role="rowheader"` 需要严格的父子层级才有效（WAI-ARIA 表格模型要求
`role="row"` 是 `role="rowgroup"` / `role="table"` / `role="grid"` 的直接子级，且 cell 是 row
的直接子级）。dg 的 cell 直接是 `.dg-grid` 的子元素、无 row 中间层，单独给 `.dg-grid` 加
`role="table"` 或给 cell 加 `role="gridcell"` 都无法构成有效结构（screen reader 找不到
`role="row"` 父级会忽略这些声明）。强行加会产生**无效 ARIA**（比缺失更糟——误导辅助技术）。

**未来补全路径（架构工作，非本次范围）**：
- 方案 A：在 `.dg-grid` 内引入"逻辑行容器"——每行的所有 cell 包进一个 `<div role="row"
  style="display: contents">`（`display: contents` 让容器不参与布局，cell 仍是 grid 子元素，
  但 DOM 上有 row 父级）。需验证 `display: contents` 在 CSS Grid 下的布局等价性 + 浏览器
  兼容性（Safari 历史有 bug）。
- 方案 B：改用 `<table>` 语义结构 + 子类化渲染（重大重构，放弃 CSS Grid 布局优势）。

---

## 3. a11y 属性矩阵

| 属性 / role | antd（真 table） | data-grid 现状 | data-grid 补齐后 |
|-------------|------------------|----------------|------------------|
| `role="table"`（根） | 天然（`<table>`） | 缺失 | **不加**（无行容器，单独 role=table 无效） |
| `role="rowgroup"`（thead/tbody） | 天然（`<thead>`/`<tbody>`） | 缺失 | **不加**（dg 无 thead/tbody 容器） |
| `role="row"`（tr） | 天然（`<tr>`） | 缺失 | **不加**（dg 行＝多 cell 无容器，role=row 需子级 cell 才有效） |
| `role="columnheader"`（th） | 天然（`<th>`） | 缺失 | **不加**（需父级 role=row） |
| `role="gridcell"`（td） | 天然（`<td>`） | 缺失 | **不加**（需父级 role=row） |
| `role="rowheader"`（rowScope 列） | 天然（`<th scope="row">`） | 缺失 | **不加**（需父级 role=row） |
| `aria-sort`（可排序列表头） | 显式（参照 `useSorter` 里 `if (sortOrder)` 才设；`antd 6.4.4 es/table/hooks/useSorter.js`） | ✅ 已补 | ✅ 已补 |
| `aria-expanded`（展开行） | 显式（`antd 6.4.4 es/table/ExpandIcon.js`） | ✅ 已有（`src/table/engine/ExpandIcon.tsx` 里 `ExpandIcon` 渲染按钮时写 `aria-expanded`，**按符号引用，不写行号**） | ✅ 已有 |
| `aria-description`（可排序列表头「可排序」描述） | 显式，值取自 locale 的**全局段**（`antd 6.4.4 es/locale/en_US.js:15` `sortable: 'sortable'`，经 `es/table/hooks/useSorter.js` 的 `a11yLocale` 透传） | ✅ 已补（两条表头路径都接，值走全局 locale、**不硬编码英文字面量**） | ✅ 已补（计算值覆盖用户 `onHeaderCell` 传的同名值，与参照的落点顺序同形） |
| `aria-label`（表头/控件） | 部分（select-all 等；参照把它落在 `<th>` / 具名控件上） | 部分（选择列控件、展开按钮、列宽拖拽手柄） | 部分。**排序表头不补 `aria-label`**：参照落在 `<th>` 上合法，我们的格子是**无 role 的 div**，该属性在无 role 元素上会被无障碍检查判成「不得使用」；要合法化需先补整条表格 ARIA 链（受本页「行容器调查结论」那条架构边界约束）。列宽拖拽手柄的 `role="separator"` ＋ 英文 `aria-label` 是**超出参照的自有增强**（参照侧没有该宿主），因此**不走 locale** |
| `aria-colspan`（合并数据格） | 天然（`<td colspan>`） | ✅ 已补 | ✅ 已补 |
| `aria-rowspan`（合并数据格） | 天然（`<td rowspan>`） | ✅ 已补 | ✅ 已补 |

---

## 4. 已补齐项

### `aria-sort`

**对齐 antd 行为**（`{{AntDesign}}/components/table/hooks/useSorter.tsx:246-248`）：
仅当列表头格可排序且 `sortOrder` 非 null 时设 `aria-sort`（`ascending` / `descending`）；
未排序时**不设**（与 antd 一致——antd 也是 `if (sortOrder)` 才设）。

**改动位置**（表头 cell 渲染）：
- 多路径 `HeaderCell`（`src/table/engine/HeaderCell.tsx`）：表头格 `<div>` 加 `aria-sort` 属性（在 className 数组后、style 前）。
  - 判定：`sortable && sortOrder === 'ascend' → 'ascending'`；
    `sortable && sortOrder === 'descend' → 'descending'`；否则 `undefined`。
- flat 路径 `renderHeaderCellFlat`（`src/table/engine/FlatColumnCells.tsx`）：同款 `aria-sort` 属性。

**未加 `aria-label`**：antd 给排序 th 加 `aria-label = displayTitle`，但 dg 的表头格已有
`title` 属性（native tooltip + ellipsis 完整文案）覆盖此语义；且 dg 表头格内 `.dg-column-title`
有可见文本，screen reader 可读。加 `aria-label` 反而会覆盖可见文本语义（WAI-ARIA 优先级），
故不抄。如未来发现 screen reader 体验不足，再单独评估。

### `header.row` 槽位注入

见上方 `header.row` 一节。改动位置：`src/table/engine/HeaderCell.tsx`（多路径 HeaderCell）+ `src/table/engine/FlatColumnCells.tsx`（flat 路径 HeaderCell）
HeaderCell 的 className 数组 + style 合并各补一行 `semanticHeader?.className?.row` /
`semanticHeader?.style?.row`。

### 表格结构 role

见上方「行容器调查结论」。结论：dg 无行容器 → 不加零散 role（避免无效 ARIA）。本文
明确记录兼容天花板。

### `aria-colspan` / `aria-rowspan`

**改动位置**（`src/table/engine/BodyGrid.tsx` 内 BodyCell）：合并的数据格（`colSpan >= 2`
或 `rowSpanTracks >= 2`）补 `aria-colspan` / `aria-rowspan`（数字）。仅 span >= 2 时设
（span = 1 是默认值，不设避免噪声）。`rowSpanTracks` 会计入展开产生的额外 track，与视觉跨行一致。

**flat 路径不加**：cellMerge 强制走 multi 路径（`src/table/engine/cellMerge.ts` 内的判定），flat 路径
架构上无合并，无需 aria。

---

## 5. 缺口优先级

| 优先级 | 缺口 | 状态 |
|--------|------|------|
| P0 | `aria-sort` 缺失 | ✅ 已补 |
| P0 | 表格结构 role 缺失 | 🚫 受架构限制（需补行容器，未来工作） |
| P1 | `header.row` 槽位未注入 | ✅ 已补 |
| P2 | `aria-colspan` / `aria-rowspan` 缺失 | ✅ 已补 |
| — | `header.wrapper` / `body.wrapper` 槽位 | 🚫 架构天花板（无 thead/tbody 容器）⇒ **已从公共类型面删除**（见上方「架构天花板」一节的替代写法，属可推翻的取舍） |
| — | `pagination.root` 落点 | ⚠️ 结构级部分兼容：语义落在我们多包的一层布局 div 上，`<ul>` 缺参照的两组布局类。**维持不改**（收益不完整），同属可推翻的取舍 |

---

## 6. 验证 demo

**demo 路径**：`src/demos/semantic-dom-slots.tsx`（注册于 `src/demos/index.ts`，category
「尺寸响应与样式」，name `semantic-dom`）。

**验证内容**：
1. **13 槽位染色对照**：dev server（`http://localhost:5173`）打开 semantic-dom demo，左右
   双栏。每槽位一种霓虹色 outline。预期：dg 的 header.wrapper / body.wrapper 无染色（架构
   限制）；header.row / body.row 染色分散到行内 cell；其余 9 槽位两侧视觉等价。
2. **aria-sort 专项**：devtools Elements 选中两侧 Age 列表头格，点击排序，观察
   `aria-sort` 属性 `ascending` ↔ `descending` ↔ （未设）循环，两侧语义一致。
3. **a11y 矩阵 + 染色表**：demo 下方说明区表格，逐项核对兼容度（与本 doc 同步）。
