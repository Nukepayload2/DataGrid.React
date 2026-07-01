# demos/_compare 注释迁移

本文件汇总从 `src/demos/_compare` 迁出的长篇说明注释。源码中只保留必要的短注释、类型说明和局部实现提示；这里记录设计背景、与 antd 对照关系以及已知差异。

## 框架与样式

### `src/demos/_compare/SplitDemo.tsx`

- `SplitDemo` 负责左右并排展示 data-grid 与 antd demo，本身只处理布局、标题、说明区和若干修饰类。
- 深浅色切换由顶层 `ThemeProvider` 驱动；组件只根据 `themeMode` 给外层补 `.dg-compare--dark`，用于覆盖 pane/title/note 这类不在 antd token 子树里的 chrome。
- 横竖排切换采用纯 CSS `flex-wrap + min-width`。`minPaneWidth` 会写入 `--pane-min`，横排阈值等于 `minPaneWidth * 2 + gap(16px)`。
- `stickyMode` 只给页面级 sticky demo 使用。开启后通过 `.dg-compare--sticky` 把 pane/body 改成 `overflow: visible`，避免祖先滚动容器截断 sticky 上下文。
- `virtualizable` 表示该 demo 是否响应全局虚拟化开关；开启时加 `.dg-compare--virtual`，让 pane body 有固定高度供虚拟滚动使用。

### `src/demos/_compare/SplitDemoPreview.tsx`

- 组件有两种模式：
  - 默认模式：`editedDg` 和 `editedAntd` 都为 `null`，直接返回真实 demo，避免 live editor 额外开销。
  - 编辑模式：用 `SplitDemo` 包裹左右两侧，分别渲染编辑产物或真实组件。
- 真实子组件通过 `import.meta.glob('../*.dg.tsx' | '../*.antd.tsx', { eager: true, import: 'default' })` 自动发现，文件名会解析成 demo 名作为 map key。
- 编辑模式统一给子组件传超集 props：`bordered: false`、`virtual`、`size: 'medium'`、`autoScroll: true`。
- 渲染期异常由 `LiveErrorBoundary` 捕获。编辑产物变化时会清空错误状态并递增 key，强制 boundary remount 后重试。

### `src/demos/_compare/compare.css`

- `.dg-compare` 采用 `display: flex; flex-wrap: wrap; gap: 16px`。
- `.dg-compare__pane` 的 `min-width: var(--pane-min, 480px)` 是横竖排自适应的核心。
- `.dg-compare__note` 位于对比容器外侧，是固定在底部的说明区。
- `.dg-compare--sticky` 让 pane/body 释放 sticky 上下文。
- `.dg-compare--virtual` 给 body 固定高度，配合虚拟滚动。
- `.dg-compare--dark` 和 `.dg-compare__note--dark` 只负责外壳 chrome 的深色覆盖，不处理表格内部主题。

### `src/demos/_compare/DemoToolbar.tsx`

- `DemoToolbar` 只是一个主题感知的控制条容器。
- 它依赖 `theme.useToken()` 读取 `colorBgContainer` 与 `colorBorderSecondary`，避免暗色主题下硬编码浅色背景。

## 数据与对照说明

### `src/demos/_compare/ajax.shared.ts`

- 左右两栏都改用本地 `MOCK_DATA` 和 `queryData()`，不再依赖 antd 官方 ajax demo 的外部 `mockapi.io`。
- 迁移动机：
  - 消除外部网络依赖和自动化不稳定性。
  - 保持 loading、服务端分页、排序、筛选、跨页勾选等交互语义不变。
  - 让 data-grid / antd 两侧共用同一份服务端模拟逻辑，便于对照。

## 共享配置文件

以下文件原先在源码头部记录“共享了什么”“为什么不直接复用列定义”“与 antd 官方 demo 或测试的关系”“已知功能差异”等说明。对应说明已迁移到本文，源码仅保留导出的数据、类型和必要短注释。

### 基础共享与列定义拆分

- `src/demos/_compare/basic.shared.ts`
- `src/demos/_compare/bordered.shared.ts`
- `src/demos/_compare/colspan-rowspan.shared.ts`
- `src/demos/_compare/column-defaults.shared.ts`
- `src/demos/_compare/component-token.shared.ts`
- `src/demos/_compare/custom-empty.shared.ts`
- `src/demos/_compare/custom-filter-panel.shared.ts`
- `src/demos/_compare/dynamic-settings.shared.ts`
- `src/demos/_compare/ellipsis.shared.ts`
- `src/demos/_compare/ellipsis-custom-tooltip.shared.ts`
- `src/demos/_compare/head.shared.ts`

这些文件的共同背景：

- 共享的主要是记录类型、数据集，以及少量左右两侧都能直接复用的配置。
- 列定义通常不直接抽成一份，是因为 data-grid 与 antd 的列类型、`render` 签名、`fixed`/`align`/`filters` 等字段归属并不完全兼容。
- `dynamic-settings.shared.ts` 复用 `component-token.shared.ts` 的数据与标题/页脚，差异只在主题 token 覆盖层。
- `custom-filter-panel.shared.ts` 与 `head` / `reset-filter` 的数据顺序故意分开，保持与各自 antd 官方 demo 一致。
- `bordered.shared.ts` 额外包含一个仓库自增的 “bordered + fixed” 对照示例，用来观察固定列边框行为。

### 编辑与交互类 demo

- `src/demos/_compare/edit-cell.shared.ts`
- `src/demos/_compare/edit-row.shared.ts`
- `src/demos/_compare/row-selection-fixed.shared.ts`

迁出的重点说明：

- `edit-cell` 保留共享初始数据，但左右两侧的 `EditableCell` / `EditableRow` / Form 组织不同，因此没有把实现进一步抽平。
- `edit-row` 记录的是 antd 行级编辑的关键交互约束：单行编辑、`editingKey`、翻页取消编辑、外层 `Form component={false}` 等。
- `row-selection-fixed` 对照来源不是普通 demo，而是 antd 的测试用例和 `useSelection` 邻列 fixed 继承逻辑。

### 分页、列顺序与选择

- `src/demos/_compare/pagination.shared.ts`
- `src/demos/_compare/order-column.shared.ts`
- `src/demos/_compare/row-selection.shared.ts`

迁出的重点说明：

- `pagination.shared.ts` 除了共享 `RecordType` 和 `data`，还承接 `TablePaginationPlacement` 与 `placementOptions`。这组字面量需要同时给 dg 子文件、antd 子文件和父级控制条使用，但 live scope 不适合让子文件再去跨子文件取类型，因此保留在 shared 文件里统一复用。
- `order-column.shared.ts` 固定记录示例列顺序 `Name -> EXPAND_COLUMN -> Age -> SELECTION_COLUMN -> Address`。第 3 行文案虽然写着 `Not Expandable`，但官方 demo 没有提供 `rowExpandable`，所以两侧都保持“文案如此、行为仍可展开”的原样对照。
- `row-selection.shared.ts` 共享的是最小数据集和禁用行约束；最后一行 `Disabled User` 继续由两侧各自的 `getCheckboxProps` 使用同一个谓词禁用，保证禁用态对照一致。

### 固定列、表头与 sticky 相关

- `src/demos/_compare/fixed-columns.shared.ts`
- `src/demos/_compare/fixed-columns-header.shared.ts`
- `src/demos/_compare/fixed-gapped-columns.shared.ts`
- `src/demos/_compare/fixed-header.shared.ts`
- `src/demos/_compare/sticky.shared.ts`

迁出的重点说明：

- 这些文件都对齐 antd 官方 demo 的字段和数据字面量，但左右两侧仍保留各自列类型。
- `fixed-header.shared.ts` 明确记录了当前差异：data-grid 用 `scroll.y: true` 和外层高度约束；antd 侧保留官方数字 `scroll.y` 和分页行为。
- `sticky.shared.ts` 记录了当前对照差异：
  - antd 官方 summary 支持 `'top' | 'bottom'` 的 sticky 定位。
  - data-grid 的 summary `fixed` 目前是布尔值，只覆盖 sticky bottom。
  - 页面级 sticky 的实现路径两边不同，但目标都是表头跟随页面滚动并支持 `offsetHeader`。

### 树形、虚拟化与主题编辑

- `src/demos/_compare/tree-data.shared.ts`
- `src/demos/_compare/virtual-list.shared.ts`
- `src/demos/_compare/theme-editor.shared.ts`

迁出的重点说明：

- `tree-data.shared.ts` 直接复用 antd 官方 tree-data 示例的两棵顶层节点，其中 `John Brown sr.` 分支保留多层 children 嵌套；这类纯文本列可以让两侧直接共享数据与列骨架。
- `virtual-list.shared.ts` 只共享记录类型和数据生成规则。两侧 render 树不同，列定义继续留在各自 demo 文件，但 `id` / 十六进制姓名 / 年龄循环规则必须保持同源，避免虚拟滚动对照漂移。
- `theme-editor.shared.ts` 使用比 `component-token` 更丰富的数据分布，刻意覆盖排序、筛选、行选中等可视状态，方便在 theme editor 中同时观察 `headerSort*`、`filterDropdown*`、`rowSelected*` 这类 token 的变化。

## 迁移原则

- 这次迁移不改任何运行逻辑，只删除或缩短源码内的设计说明、兼容性说明、任务说明类注释。
- 保留的注释主要是导出类型说明、局部复杂行为提示和对阅读代码仍有直接帮助的短注释。
