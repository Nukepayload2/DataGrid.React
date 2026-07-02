# 分页（pagination）

data-grid 在 antd `<Pagination>` 外多一层 `.dg-pagination` div（grid 布局需要 flex 容器承载对齐），样式对齐 antd `components/table/style/pagination.ts` 的 `.ant-table-pagination`。本文说明分页外层容器、对齐变体、与 antd 的差异。

## 外层容器 `.dg-pagination`

对齐 antd `pagination.ts`：

| 属性 | antd 源 | data-grid |
|---|---|---|
| margin | `${unit(margin)} 0`（margin 默认 16） | `var(--ant-margin, 16px) 0` |
| display | flex | flex |
| flex-wrap | wrap | wrap |
| row-gap | paddingXS（默认 8） | `var(--ant-padding-xs, 8px)` |
| `> *` | flex:none | flex:none |

- `flex-wrap: wrap` + `row-gap: var(--ant-padding-xs)`（窄容器换行 + 行间距）。
- `> *` flex:none（分页器不收缩，靠外层 justify 对齐）。

**token 注意**：`tokens.css` 里 `--ant-padding-xs` fallback 为 4 是选择列的特殊复用；这里消费同名 alias token，主题注入后由 `Table.tsx aliasTokenVars` 覆盖为真值。

## 对齐变体

| 类 | justify-content | antd 对应 |
|---|---|---|
| `.dg-pagination-start` | flex-start | `&-start` |
| `.dg-pagination-center` | center | `&-center` |
| `.dg-pagination-end` | flex-end | `&-end` |

## wrapper 须含分页条高

启用 pagination 后，`.dg-wrapper` 须含分页条高度（pagination 在 wrapper 内部，参与整体高度）。详见 [../layout/layout.md](../layout/layout.md) 的布局修饰类。

## 与 antd 差异

| | data-grid | antd |
|---|---|---|
| 分页容器 | 多一层 `.dg-pagination` div | `.ant-table-pagination`（直接挂在 wrapper 下） |
| 分页组件 | antd `<Pagination>`（非核心用 antd） | antd 原生 |

## 引擎状态机（usePagination）

data-grid 自研分页状态机/切片（分页器 UI 用 antd `<Pagination>`）。受控 `current` / `pageSize` 作为真理源，每次操作生成新 state 并触发回调。

### 受控 / 非受控

- 受控：外部传 `current` / `pageSize`（任一传入即视为该字段受控，真理源在外部）。
- 非受控：内部 state（初始取 `defaultCurrent`（默认 1）/ `defaultPageSize`（默认 10））。
- 混合：允许 current 受控、pageSize 非受控（或反之），各字段独立判定。

### total 派生

`total` 默认 = 当前页数据源长度（适配层传入 `dataSourceLength`，即排序+筛选后的长度）。外部传 `pagination.total` 覆盖（ajax 场景：服务端 total，前端 dataSource 仅当前页）。

### 越界回退（对齐 antd usePagination）

若 `current > maxPage`（maxPage = `ceil(total / pageSize)`），回退到 `maxPage || 1`。此回退**仅影响派生的 effectiveCurrent**（渲染 + onChange 注入用），**不**回写内部 state（避免渲染期副作用；与 antd 直接 mutate `mergedPagination.current` 一致——antd 也是每次 render 重算而非 setState）。受控模式下同样只影响派生值（外部 current 不变，但切片用 effectiveCurrent）。

### 切片

`pagedDataSource = dataSource.slice((effectiveCurrent-1)*pageSize, effectiveCurrent*pageSize)`。pageSize <= 0 或 dataSource 为空 → 空切片（不崩）。

### 服务端模式检测（slicePage，对齐 antd `InternalTable.tsx`）

- `pageSize <= 0` 或 `dataSource` 为空 → 空切片。
- **`total !== undefined && dataSource.length < total`**（server/async 模式：dataSource 已是当前页、外部 total 表示服务端总量）→ 不切片（返回原 dataSource）；异常配置（`dataSource.length > pageSize`）仍切片 + 警告。
- 否则（客户端模式：`total` 未定义或 `dataSource.length >= total`）→ 正常切片。

用法：server 模式（ajax demo：dataSource=当前页 10 行、外部 total=100）走「不切片」分支；客户端模式（pagination demo：total=3=length）走「切片」分支，避免双重分页。

### onChange 分发

翻页/改 pageSize 时调 `onPaginationChange(nextCurrent, nextPageSize)`，适配层据此：非受控字段更新内部 state；触发 Table `onChange(paginationState, filters, sorter, { action: 'paginate', currentDataSource })`。

- `paginationState` = `{ current, pageSize, total }`（effective 值，含越界回退）。
- `currentDataSource` = 分页**前**的全量数据源（与 antd 一致：antd onChange 的 currentDataSource 是分页前的渲染数据）。

`onInternalChange` 先透传 antd Pagination 原生回调（`pagination.onChange`/`onShowSizeChange`，独立于 Table onChange），再调 `onPaginationChange`（驱动 state + Table onChange）。pageSize 变化时 antd 也会触发 `onShowSizeChange(current, size)`。

## placement 解析（对齐 antd renderPagination + normalizePlacement）

`normalizePlacement` 把"含方向词的位置串"归一化为对齐（`'start' | 'center' | 'end'`）：

- 含 'center' → 'center'。
- 含 'start' 或 'left' → 'start'。
- 否则 → 'end'。

`resolvePlacement` 解析 placement 数组，返回 `{ top, bottom }` 两侧各自的对齐或 null（该侧不显示）：

- 取数组中"含 'top' 的首个元素" → top 侧对齐；"含 'bottom' 的首个元素" → bottom 侧对齐。
- 'none' 不含 top/bottom → 该侧不命中。
- 数组全部为 'none' 或未命中任何 top/bottom → `{ top: null, bottom: null }`（由调用方决定是否回退默认；antd 行为是"全部 none → 不渲染"）。

## 关联源码

- [`src/table/style/table.css`](../../../src/table/style/table.css) — `.dg-pagination`、`.dg-pagination-start/center/end`。
- [`src/table/engine/usePagination.ts`](../../../src/table/engine/usePagination.ts) — 分页状态机/切片（受控合并/越界回退/`slicePage`/`normalizePlacement`/`resolvePlacement`）。
- [`src/table/Table.tsx`](../../../src/table/Table.tsx) — `topPaginationNode` / `bottomPaginationNode` 渲染（pagination 启用时挂载，否则为 null）、`onPaginationChange` 适配（组装 Table onChange）。
