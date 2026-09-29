# 整体布局（layout）

data-grid 的整体容器结构与 antd `<table>` 三层包裹（`table-wrapper > container > title/footer`）不同，本文说明 `.dg-wrapper` 的容器角色、几类布局修饰类（`dg-data-area` / `dg-sticky` / `dg-content-scrolled`）的语义，以及它们与 antd 的差异。

## `.dg-wrapper` 容器角色

`.dg-wrapper` 是 data-grid 表格根容器（`src/table/style/table.css`），承担：

- 文字色：显式声明 `color: var(--ant-color-text)`，对齐 antd `resetComponent(token)` 给 `.ant-table` 根节点设的 `color: colorText`（默认 rgba(0,0,0,0.88)）。data-grid 原本未声明 color，body 文字会继承浏览器默认纯黑（rgb(0,0,0)），与 antd 不符。表头格 `.dg-cell-header` 另用 `--ant-table-header-color`（colorTextHeading）覆盖，不受影响。
- 底色：`background: var(--ant-color-bg-container)`。
- 圆角：`border-radius: var(--ant-table-header-border-radius) var(--ant-table-header-border-radius) 0 0`（顶圆底直，对齐 antd `.ant-table` 默认顶圆）。
- `overflow-x: hidden; overflow-y: hidden`：原生横滚动条**永不出现**（横向滚动统一交给内部 `FloatingScrollBar` / `dg-scroll`），仅保留圆角裁剪语义。

## 行 hover 机制（grid-auto-flow:column 下"同行"DOM 不连续）

`.dg-grid` 用 `grid-auto-flow: column`，同一行的单元格在 DOM 中并不连续。纯 CSS 无法对任意动态 row index 关联整行（`:has()` 不适用），故 data-grid 用 JS 方案：`hoverController.ts` 持有 `hoveredRowIndex` state，命中行所有 body cell 加 `dg-row-hover` 类。详见 `src/table/engine/hoverController.ts` 注释。

## 布局修饰类

| 修饰类 | 启用条件 | 覆盖什么 |
|---|---|---|
| `dg-data-area` | `scroll.y === true`（数据区域模式） | `.dg-wrapper` 转 flex column + height:100%，内部 `.dg-scroll-wrap` flex:1 填满剩余空间，**不用 JS 算数字高度** |
| `dg-sticky` | 页面级 sticky 模式 | `.dg-wrapper` 的 `overflow: clip` + `overscroll-behavior-x/-inline: contain` + `width: auto`（`clip` 裁掉溢出但**不建滚动容器** ⇒ 表头 sticky 上下文仍穿透到 window，且不出滚动条） |
| `dg-content-scrolled` | 有 pagination/footer 且非数据区域、非 sticky | wrapper `overflow-x: hidden`，横向滚动交给内部 `.dg-scroll` |

## 与 antd 差异

| | data-grid | antd |
|---|---|---|
| 容器层级 | `.dg-wrapper` 单层 + grid item | `table-wrapper > div.ant-table > div.ant-table-container > table` 多层 |
| 表头表体 | 同一个 `.dg-grid`（grid item） | `<table>` 内 `<thead>`/`<tbody>` |
| 行 hover | JS 加 `dg-row-hover` 类（DOM 不连续） | CSS `:hover` 直接关联 `<tr>` 内所有 td |
| scroll.y 容器 | flex column + `flex:1; min-height:0` 的 `.dg-scroll-wrap` | `.ant-table-body` + JS 计算 `maxHeight` |

## 特殊情况

### loading（Spin 包裹）× 数据区域模式 flex 链

`Table.tsx` 在 `loading !== undefined`（含 `loading={false}`）时用 antd `<Spin>` 包裹 `tableContent`。antd v6 Spin（`hasChildren` 时无论 `spinning` true/false）渲染根 `<div class="ant-spin">` + 内部 `<div class="ant-spin-container">`，两层默认 `display: block`，会断 `.dg-data-area` 的 flex column 链——`.dg-scroll-wrap` 的 `flex:1` 退化为内容自然高，表体不裁剪（虚拟窗口 clientHeight 失真 / 非虚拟表体全渲染撑高）。

修复：data-area 模式下把 Spin 的根与内部容器都改为 `flex column + flex:1 + min-height:0 !important`，让 `.dg-wrapper` 的有界高度经 Spin 层透传到 `.dg-scroll-wrap`（等效把 Spin 层"透明化"为 flex 链）。选择器用直接子 `>` 精确命中 `.ant-spin` 根；`!important` 防御性对抗 antd cssinjs 可能注入的高优先级显示规则。

仅 `scroll.y === true` 的 demo（如 dynamic-settings/component-token/ajax）命中；`loading=undefined`（如 fixed-header/virtual-list）不渲染 Spin，零变化。

### dg-sticky 下的圆角与宽表裁剪

`.dg-wrapper.dg-sticky` 用 `overflow: clip`（非 `visible`）：`clip` 的裁剪能力与 `hidden` 同值，只是不附带滚动机制 ⇒ 顶部圆角照旧裁切子节点溢出，sticky **不牺牲圆角**。grid 的实际横向宿主是 ScrollContainer sticky 分支渲染的 `.dg-sticky-scroll-viewport`（同为 `overflow: clip`），宽表超出视口的部分在圆角框内被裁掉，横向位移靠 grid 上的 `--dg-sticky-scroll-left` transform（`.dg-sticky-scroll-translated`）将视口外内容送进视口。详见 `docs/features/layout/sticky.md`。

### dg-data-area × dg-sticky 互斥

sticky 是页面级（grid 外包的是 `overflow: clip` 视口——裁剪宽表但**不创建滚动容器**，故 sticky 上下文仍穿透到页面），data-area 是容器内（包 `overflow-y: auto` 的滚动容器 `.dg-scroll`）。同时存在时 dg-sticky 优先（sticky 不消费 scroll.y:true 的容器内固定语义）。Table.tsx 的 `contentScrolledEnabled` 判定已排除 `stickyClassEnabled`/`dataAreaClassEnabled`，三者不同时触发。

## 关联源码

- [`src/table/style/table.css`](../../../src/table/style/table.css) — `.dg-wrapper` / `.dg-wrapper.dg-sticky`（`overflow: clip`）/ `.dg-wrapper.dg-data-area` / `.dg-wrapper.dg-content-scrolled` / `.dg-sticky-scroll-viewport` / `.dg-sticky-scroll-translated` 规则。
- [`src/table/Table.tsx`](../../../src/table/Table.tsx) — 三类修饰类的启用判定（`dataAreaClassEnabled` / `stickyClassEnabled` / `contentScrolledEnabled`）。
- [`src/table/engine/hoverController.ts`](../../../src/table/engine/hoverController.ts) — `hoveredRowIndex` state + 行 hover 类分发。
- [`src/table/engine/ScrollContainer.tsx`](../../../src/table/engine/ScrollContainer.tsx) — `.dg-scroll-wrap` 渲染（sticky / FloatingScrollBar 三分支路由）。
