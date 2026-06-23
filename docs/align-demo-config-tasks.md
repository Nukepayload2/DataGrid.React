# demo 左右配置等价修复清单（2026-06-23）

## 目标
每个 compare demo 的**左栏(data-grid)**与**右栏(antd 6.4.4，忠实复刻官方)**必须给用户看到等价的结果：同分页器、同 filter/sorter/selection/expand 行为、同可见尺寸、action 链接同色。右栏=ground truth（已忠实复刻 antd 官方），**修复方向=把左栏对齐到右栏**。

## 校准事实（浏览器实测，2026-06-23）
1. **antd 对任意数据都渲染 `.ant-pagination`**（即使行数 ≤ pageSize，渲染为 disabled 态分页条）。data-grid 不传 `pagination`=不渲染分页条。故「左栏不传 / 右栏不传(antd 默认)」= 不等价（右有分页条、左无）。
2. **data-grid 表内 `<a>` = `rgba(0,0,0,0.88)`（body 文字色）**，antd 表内 `<a>` = `rgb(22,119,255)`(#1677ff 链接蓝)。data-grid CSS 无 `.dg-wrapper a` 规则，未继承 antd 全局链接样式。

---

## 共享修复 A：action 超链接链接色（1 处，惠及所有含 `<a>` 的 demo）
在 `src\table\style\table.css` 新增（复刻 antd `components/style/index.tsx:79` `genLinkStyle`，消费已注入的 `--ant-*` alias token）：
```css
/* 对齐 antd 全局 genLinkStyle：.dg-wrapper 非 antd 组件根，不继承 antd 全局 a 链接样式，此处复刻。 */
.dg-wrapper a {
  color: var(--ant-color-link);
  text-decoration: var(--ant-link-decoration, none);
  background-color: transparent;
  outline: none;
  cursor: pointer;
  transition: color var(--ant-motion-duration-slow, 0.3s);
  -webkit-text-decoration-skip: objects;
}
.dg-wrapper a:hover { color: var(--ant-color-link-hover); }
.dg-wrapper a:active { color: var(--ant-color-link-active); }
.dg-wrapper a:hover,
.dg-wrapper a:active { text-decoration: var(--ant-link-hover-decoration, underline); outline: 0; }
.dg-wrapper a:focus { text-decoration: var(--ant-link-focus-decoration, none); outline: 0; }
.dg-wrapper a[disabled] { color: var(--ant-color-text-disabled); cursor: not-allowed; }
```
验证：basic demo 左栏 `<a>` 变 #1677ff，与右栏一致；dark 模式同切。

---

## 共享修复 B：pagination 对齐规则（机械，约 30 demo）
对每个 demo 的**左栏 data-grid `<Table>`** 读两侧 pagination prop 后判定：
- 右栏 `pagination={false}`（或显式关闭）且左栏 omit/false → **两侧都无分页条，不改**。
- 右栏为 antd 默认（omit）或显式 pagination 对象，且左栏当前无分页条（omit）→ **左栏补齐**：右栏 omit→左栏加 `pagination={{}}`；右栏显式对象→左栏加同款对象。
- 目标：两侧分页器存在性 + 配置一致。

**需补 `pagination={{}}` 的 demo**（右栏 antd 默认分页 / 左栏 omit）：
basic, grouping-columns, colspan-rowspan, row-selection, hidden-columns, expand, expand-sticky, order-column, head, multiple-sorter, reset-filter, custom-filter-panel, filter-search, filter-in-tree, edit-cell, drag-sorting, drag-sorting-handler, drag-column-sorting, ellipsis, ellipsis-custom-tooltip, custom-empty, nested-table, tree-table-ellipsis, bordered(示例1+示例2), size, responsive, jsx, sticky, nest-table-border-debug

**需补指定配置**：fixed-header → `pagination={{ pageSize: 50 }}`

**pagination 已等价（不改）**：fixed-columns, fixed-gapped-columns, fixed-columns-header(右 false), row-selection-and-operation(右 false), row-selection-custom(右 false), resizable(右 false), ajax(受控共享), pagination(本身就是分页 demo，两侧受控同配置), tree-data(左已 `{{}}`), tree-table-preserveSelectedRowKeys(两侧 `{{defaultPageSize:5}}`), edit-row(两侧 `{{onChange:cancel}}`), summary(两侧 false), narrow(两侧 `paginated?{...}:false`), style-class(两侧 `{{pageSize:3}}`), component-token(两侧 `{{placement}}`), column-defaults(两侧 false), dynamic-settings(两侧 `{{placement}}`), row-selection-custom-debug(右 false), virtual-list(待核，大概率已显式)

---

## 逐 demo 特定修复（pagination 之外）
| demo | 修复 |
|---|---|
| grouping-columns | 左栏 Name 列补 `filters`(Joe/John)+`onFilter`；Age 列补 `sorter:(a,b)=>a.age-b.age`（对齐右栏/官方）。large size 下 wrapper 高 423 漂移→复查 |
| fixed-columns | 左栏 Age 列补 `sorter:true` |
| head | 左栏 Address 列**删** `filterMultiple:false`（官方默认多选 Checkbox） |
| filter-search | 左栏 Name 列补 `filterMode:'tree'`（官方 filter-search.tsx:30），并确认 `filterSearch:true`/`onFilter` 在位 |
| custom-empty | 左栏 Age 列**删** `onFilter`（官方 custom-empty.tsx:39-49 只 filters 无 onFilter） |
| tree-table-ellipsis | pagination 补 `{{}}`；checkStrictly：memory 记 antd 6.4.4 默认=true，核对官方 demo 与右栏后对齐（若两侧默认都 true 则无改） |
| virtual-list | 左栏补 radio rowSelection（展开关闭时，对齐右栏）；FirstName/FistName title 对齐（优先两侧统一为正确拼写）；wrapper 高 400→对齐右栏 y:400 表体高(约 440)；action 用共享 CSS 后复查是否需 Typography.Link |
| summary | 示例2 左栏 wrapper height:300→对齐右栏 scroll.y:500（约 550） |
| fixed-header | height:300→对齐右栏 y:275 表体(约 330) |
| fixed-columns-header | height:300→对齐右栏 y:275 表体(约 330) |
| dynamic-settings | (可选)scroll.x 左 '100vw'/右 '120vw' 统一 |
| order-column | (可选)左受控/右非受控 rowSelection——功能等价无可见差异，默认不改 |

**不改（固有可接受差异）**：scroll.y 形式(true vs 数字)、basic inline Tag vs antd Tag、滚动条样式、resizable 右栏静态基线、drag 指示线 vs dnd-kit 平移、Space 'middle'/'medium' 别名(渲染等价)。

---

## 执行
- 实施者按 demo 簇并行（不同 demo 文件无冲突）；共享 CSS(A) 由单独实施者改 table.css。
- 高度类修复：实施者先按上表 best-effort，验证者浏览器实测 delta 后返工微调。
- 验证者用 chrome-devtools 串行（共享浏览器，避免争抢），dark+light 双模式逐 demo 对照。
