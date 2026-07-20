# antd Table 用户反馈汇编 — data-grid 蛇打七寸

> 真理源：62 条来自 ant-design/ant-design 的 Table 相关 issue/discussion（2026-07-20 采集）。
> 目的：提炼 antd Table 的架构病灶，指导 data-grid（CSS Grid 重做）避坑与差异化。
> 范围：issues 37 条 + discussions 25 条 = 62 条；图片资源 37 份。

---

## 一、蛇打七寸：antd Table 的根本病灶 vs data-grid 的解药

按"对 data-grid 的启示重要性"排序，每条 = **病灶** → antd 证据 → **data-grid 解药**。

### 1. 列宽真理源散落 → 双表格 + colgroup + 占位 th 多病灶并发

- **病灶**：antd 用"两个 table（表头/表体）+ colgroup + 末尾占位 `<th class="ant-table-cell-scrollbar">`"拼装，表头与表体横向滚动各维护一份 scrollLeft；`dataSource` 为空时 colgroup 丢失；占位 th 被浏览器按比例平分宽度；rc-table 的 MeasureRow 对未指定 width 的列回退 `table-layout: auto`。这些机制叠加导致表头/表体错位、空数据列宽跳动、跨浏览器/跨 DPI 滚动条占位不一致。
- **证据**：
  - 表头错位 race：[#45524](issues/issue-45524.md)(34评)、[#54243](discussions/disc-54243.md)
  - 空数据列宽缩减/跳动：[#56151](issues/issue-56151.md)(20评)、[#56713](issues/issue-56713.md)(12评)、[#56477](discussions/disc-56477.md)
  - 跨平台滚动条精度：[#50957](issues/issue-50957.md)、[#56357](issues/issue-56357.md)、[#51650](discussions/disc-51650.md)
  - 列最小宽度限制：[#56602](discussions/disc-56602.md)
  - 虚拟/非虚拟滚动条不统一：[#56956](issues/issue-56956.md)
- **data-grid 解药**：列宽唯一真理源 = `grid-template-columns`（一条轨道一列，含滚动条占位轨道 `minmax(0, 15px)`），表头/表体共享同一 grid；`grid-template-columns: 10px 1200px` 严格按 px 生效（突破原生 `<table>` 的最小可用宽度限制）；`auto` 列改用 `minmax(min-content, 1fr)`，永远不回退 `table-layout: auto`。

### 2. 自绘虚拟滚动条 + 自实现 wheel 监听 → 手感/可点/形态三分裂

- **病灶**：rc-virtual-list 自己监听 wheel 事件累加 scrollTop，未对照浏览器默认 `deltaY * line-height * 系数`；自定义滚动条只能拖 thumb，点击轨道空白处不跳转；虚拟/非虚拟两套机制并存，外观/位置/显隐策略互不一致；滚动条常显/隐藏只能靠 CSS `!important` 撞内部 class。
- **证据**：
  - 滚轮步长过大/手感不一致：[#44972](issues/issue-44972.md)(19评)、[#45637](issues/issue-45637.md)(27评)
  - 滚动条不可点：[#53813](issues/issue-53813.md)
  - 滚动条显隐/统一：[#56956](issues/issue-56956.md)、[#50583](discussions/disc-50583.md)、[#54739](discussions/disc-54739.md)
- **data-grid 解药**：优先浏览器原生滚动容器（真滚动条 + 内部 Filler 占位）让滚轮→位移换算交给浏览器；如必须自实现横向 `FloatingScrollBar`，wheel 系数须对照 Chrome 默认行为校准（Windows ~100px/刻度，macOS 视动量滚动平滑），并支持轨道点击（按页跳转）与键盘箭头；虚拟/非虚拟、空/非空、横/纵向滚动条统一走同一渲染路径；显隐策略 (`scrollbar.visibility: visible | hidden | hover`) 做成 first-class prop。

### 3. 动态行高 + 数据前插未锚定 → 滚动位置跳跃

- **病灶**：rc-virtual-list 仅渲染可视行，行高变化（图片加载/异步内容/展开）或头部 unshift 新行后，重新测量 + 重排可见行时未把"高度增量/插入高度"累加回 scrollTop，导致视觉位置漂移。
- **证据**：
  - 动态行高跳跃：[#54769](issues/issue-54769.md)
  - 头部插入偏移：[#53932](issues/issue-53932.md)
  - Modal 动画期间测量错位：[#48938](issues/issue-48938.md)
  - 虚拟+树形（10w 行）不兼容：[#36153](discussions/disc-36153.md)
- **data-grid 解药**：对齐 react-virtuoso 的 **AATree/offsetTree 增量高度索引** + ResizeObserver；行高变化时以"当前可视首行 + 该行在 viewport 内的偏移"为锚点反向修正 scrollTop；头部 unshift 同步等量像素累加 scrollTop（参考 virtuoso `followOutput`/`firstItemIndex`）；`gridOptions(min/max 有界 + rowSpan 豁免)` + isScrolling 期间暂停测量是必要的工程约束。

### 4. summary / 分组行塞进虚拟容器 → 失效

- **病灶**：antd 把 summary 渲染在虚拟列表的 scroll 容器内部，与 rc-virtual-list 渲染管线不兼容（维护者亲口："虚拟下 summary 只能 fixed"）；行分组 6 年未内置，用户被迫插"伪数据行"污染 dataSource；嵌套子表格的表头无吸顶能力。
- **证据**：
  - 虚拟+summary 互斥：[#47184](issues/issue-47184.md)(11评，维护者确认设计限制)
  - 行分组功能长期空缺：[#15630](issues/issue-15630.md)(22评，6 年未解)
  - 嵌套表头无法吸顶：[#36066](issues/issue-36066.md)
- **data-grid 解药**：summary / 分组头 / 分组小计必须独立于虚拟窗口（作为独立 `<tfoot>` 或 sticky bottom/top 区，绝不进入虚拟行容器）；原生提供 `rowGrouping` API（`groupField` / `renderGroupHeader` / `defaultExpandedGroups` / `groupSummary`），分组头/小计作为"虚拟结构行"而非真实数据行；CSS Grid 可用命名行 `grid-template-rows: [group-1-start] auto 1fr [group-1-end]` 让分组边框/间距通过 Grid gap 直接表达。

### 5. scrollTo 用 scrollIntoView → 连外层一起滚

- **病灶**：rc-table 在非虚拟分支用原生 `Element.scrollIntoView()` 实现跳转，浏览器规范会沿 DOM 树逐层滚动所有可滚动祖先，无法限定到表体；虚拟/非虚拟两条路径行为分裂。
- **证据**：
  - 团队确认 bug：[#46467](issues/issue-46467.md)
  - 非虚拟同源问题：[#51651](discussions/disc-51651.md)
- **data-grid 解药**：`scrollTo({ index?, key?, left?, top?, behavior? })` 直接赋 scrollTop（基于 offsetTree 计算 targetTop → `container.scrollTop = targetTop`），**禁用 scrollIntoView**；虚拟化和非虚拟化分支共用同一实现；测试矩阵覆盖 overflow:auto 父容器、页面有滚动条、嵌套多个滚动容器三种场景，断言只有表体变化。

### 6. fixed 列 box-shadow + sticky "双表格" → 横滑掉帧 + 宽度不对称 + 截断

- **病灶**：fixed 列两侧 `box-shadow` 每帧 paint/rendering 重绘，大表横滑肉眼掉帧；sticky 表头拆成"两个表格"实现，外层 `overflow: auto` 与内部 `scroll.x` 同步机制互斥，导致列头被截断、宽度伸缩不对称（窗口变宽跟着变宽、变窄不缩）、子表无法吸顶。
- **证据**：
  - box-shadow 性能瓶颈：[#35241](issues/issue-35241.md)(18评)
  - sticky 双表格不对称缩放：[#55265](discussions/disc-55265.md)(作者直接吐槽"两个表格"实现)
  - sticky + overflow:auto 列头截断：[#54414](discussions/disc-54414.md)
  - 子表吸顶无方案：[#36066](issues/issue-36066.md)
- **data-grid 解药**：fixed 列边界提示**不用 box-shadow**，改用 1px 边框 + 渐变 mask image（纵向 stretch）或 `linear-gradient` 作背景；表头粘性用 grid item 的 `position: sticky; top: var(--row-sticky-offset)`，单一 grid 共享 track，sticky/非 sticky 同一套 DOM；`sticky` prop 只控制粘性，绝不隐式影响列宽伸缩。

### 7. 可伸缩列长期空缺 → 差异化机会

- **病灶**：react-resizable 多年不维护（mouseup/pointerup 丢失导致拖拽状态卡死、每帧 setColumns 触发整表重渲染卡顿）；rc-table colgroup 对 width 有"假宽度"问题（设 100px 实际渲染 400px，按比例放大），保存 localStorage 还原失真；官方已下掉 resizable demo。
- **证据**：
  - 拖拽不跟手+状态卡死：[#56356](issues/issue-56356.md)(14评)
  - RFC 两年未落地：[#48152](discussions/disc-48152.md)（[RFC] Table 支持可伸缩列）
  - 列最小宽度限制（极窄图标列场景）：[#56602](discussions/disc-56602.md)
- **data-grid 解药**：CSS Grid 的 `grid-template-columns` 是真实 px，不存在假宽度；拖拽过程用 ref + RAF，结束时 commit 到 state（单点改 `grid-template-columns` 字符串，浏览器原生处理列宽，无需 React 重渲染）；mouseup/pointerup/touchend/unmount 全路径解绑 + cursor 强制 reset；采纳 RFC 的 API 命名（`columnResizable` / `onColumnResize` / `onColumnResizeComplete` 返回 `columnKeyWidths[]`）；缩放规则：缩小时总宽互补（A-100→B+100），放大时总宽跟着变大；提供 AG Grid 级手感作为差异化卖点（crazyair 自己都说"这可是收费功能"）。

### 8. 合并单元格坐标系错位 + fixed 列偏移污染

- **病灶**：rowSpan 是声明式（合并 N 个原始数据行），但展开行/树形子节点是命令式插入的额外 `<tr>`，二者坐标系不一致；fixed 列 left 偏移基于"所有前置列宽度累加"，未感知 `onCell` 返回的 colSpan 实际渲染结构，colSpan:0（隐藏）单元格仍污染偏移；summary 使用 colSpan 前后样式分支不一致。
- **证据**：
  - expandable + rowSpan 错位：[#53862](issues/issue-53862.md)
  - fixed + colSpan 偏移错误：[#54860](issues/issue-54860.md)
  - summary colSpan 样式不一致：[#34129](issues/issue-34129.md)
- **data-grid 解药**：用"实际渲染行"坐标系，rowSpan 用 `grid-row: span N` 表达，展开行也用 `grid-row` 占一行，二者统一；计算 fixed 偏移时跳过 `colSpan: 0` 的隐藏单元格，按真实渲染结构累加；合并单元格不应突破 sticky 列边界（合并后的格子要么整体进入固定区，要么整体留在表体）；明确 `rowSpanIncludesExpandedRow: boolean` API 语义，别让用户自己 +1。

### 9. 空数据/动态列 → MeasureRow 震荡 + max-content 发散

- **病灶**：rc-table 的 MeasureRow + FixedHolder/useColumnWidth 是"全或无"策略——任何一列 width 是 undefined，整个列宽缓存作废，回退到 `table-layout: auto`，引发动态增列时高度抖动；裸 `scroll.x: 'max-content'` 在嵌套布局中会让内部组件/子表格的可测量宽度发散到天文数字（实测 1e06px）；v6 内部滚动架构变化导致外层 `overflow:auto` 冒幽灵滚动条。
- **证据**：
  - 动态增列抖动（MeasureRow）：[#55717](discussions/disc-55717.md)
  - max-content 发散 1e6px：[#48715](issues/issue-48715.md)
  - v5→v6 幽灵滚动条：[#56115](discussions/disc-56115.md)、[#56357](issues/issue-56357.md)
  - 动态 scroll.y 死循环：[#56465](discussions/disc-56465.md)
- **data-grid 解药**：grid-template-columns 声明式无中间态；列宽规约（`column-width-scrollbar-policy.md`）已明确 `auto` 用 `minmax(min-content, 1fr)` 而非裸 max-content；scrollbar-gutter 用独立 grid track 而非插入额外 th；数值越界保护（计算列宽出现 1e6px 量级结果触发断言/截断）；单一 scroll container + `scrollbar-gutter: stable` 协调外层与表体。

### 10. 命名/语义/token 历史债 → 采纳 v6 RFC

- **病灶**：`position` / `placement` 全库混用；`size` 取值不统一（`middle`/`default`）；`dataSource` / `title` / `footer` / `summary` / `onChange` / `expandIcon` / `expandRowByClick` / `column.filterSearch` 命名风格各异；`*Position`、`itemRender`、`allowClear`、`showSearch`、`onShowSizeChange` 等 prop 命名混乱；bg token 只有 3 级（layout/container/elevated），无梯度，做不出 macOS / raycast / shadcn 风格的强辨识度主题。
- **证据**：
  - placement 统一 RFC：[#54068](discussions/disc-54068.md)
  - 命名标准 RFC（26 评）：[#54633](discussions/disc-54633.md)
  - 多级 bg token RFC：[#53112](discussions/disc-53112.md)
- **data-grid 解药**：v1 直接立稳 RFC——`pagination.placement`、`size: medium | small | large`、`data`、`renderHeader`/`renderFooter`/`renderSummary`/`renderExpandedRow`/`renderExpandIcon`、`expandRowOnClick`、`onQueryChange`、bool 用 `able` 后缀（`clearable`/`searchable`/`sortable`/`filterable`/`resizable`/`draggable`/`confirmable`）、render prop 用 `renderXxx`；位置用 `start | end`（RTL 友好）；多级 bg token（`--dg-color-bg-container` / `-secondary` / `-tertiary`，表头/表体/悬停/选中/斑马纹各占一级）；不背 antd `@deprecated` 双跑包袱。

### 11. 编辑/ellipsis/分页/树形 API 语义混乱 → 一等公民重设计

- **病灶**：
  - `shouldCellUpdate` 返回 true 仍不重渲染（rc-table Cell 仍走 React props 比较）；缓存的 columns + 只改字段值不换引用 = UI 不变。
  - ProTable `column.ellipsis: true` 开启后，`render` 返回元素（`<a>`）的 inline style 全部被清除。
  - 行内编辑联动（省市/select 异步 options）只能用户手搓 `Form.useWatch` + `form.setFieldsValue`，跨行污染是社区常见坑。
  - 删除整页/最后一页后，Pagination 静默 clamp current 不触发 onChange，UI 显示选中但用户点不动。
  - 列隐藏（hide column）时受控 `filteredValue` 丢失，filter 结果被清空。
  - 树形模式下 `rowExpandable` 压根不生效，`childrenColumnName` 是空数组 `[]` 仍渲染展开按钮。
  - 行分组/平铺树形多选（权限矩阵）只能业务自己手搓合并单元格。
- **证据**：
  - shouldCellUpdate 语义陷阱：[#37995](issues/issue-37995.md)
  - ellipsis 清空 style：[#50965](issues/issue-50965.md)
  - 行内编辑联动：[#55876](discussions/disc-55876.md)
  - 分页 clamp 静默：[#37823](issues/issue-37823.md)、[#55304](discussions/disc-55304.md)
  - 列隐藏丢 filter 状态：[#32154](issues/issue-32154.md)
  - 树形 rowExpandable 失效 + 空数组（**作者本人提**）：[#54459](discussions/disc-54459.md)
  - 平铺树形多选：[#53476](discussions/disc-53476.md)
- **data-grid 解药**：API 语义清晰——`shouldCellUpdate` 文档明示"只是允许更新，最终仍由 React 调和决定"；ellipsis 用 CSS（`text-overflow: ellipsis; overflow: hidden`）作用于单元格层，**不重新包装 render 返回元素**；行内编辑一等公民 `column.editor`（`options: (record) => Promise<Option[]>` + `dependsOn: ['province']`），行级 state 隔离（`rowState` 容器）；分页 clamp 同步触发 onChange（或 `onCurrentClamped` 回调）+ `pagination.autoFixCurrent` 显式开关；列状态机单一真理源（visibility/filter/sorter/width 各自独立字段）；`expandable.rowExpandable(record, index) => boolean` **对树形模式生效**，空数组等同无子节点（`Boolean(record[childrenColumnName]?.length)`）。

### 12. 固定表体高度/动画/iPad/嵌套边框等长尾病灶 → 组件级 API 补齐

- **病灶**：
  - antd 没有任何 API 让表体固定高度（`scroll.y` 仅 `max-height` 语义），数据少时分页条跟着跳动。
  - Popover leave 动画无法组件级关闭（只能全局 `ConfigProvider.theme.token.motion: false`，一关关全部）。
  - iPad Safari 上 fixed right 列遮住竖滚动条、滚动条卡顿；iOS momentum scroll 与虚拟化 RAF 耦合漂移。
  - 嵌套表格 + 内层 `bordered` 时上边框被错误抹掉（`:first-child` 选择器太宽泛）。
  - 表头分组中"父列只有 1 个子列"时 `::before` 伪元素分隔线错位。
  - `expand` 图标无法排在 `selection` 之前（硬编码最左）。
- **证据**：
  - 固定表体高度缺失（34 评）：[#49445](issues/issue-49445.md)、自适应 scroll.y：[#53395](discussions/disc-53395.md)
  - 动画组件级关闭缺失：[#56334](issues/issue-56334.md)
  - iPad fixed 遮挡：[#46640](issues/issue-46640.md)
  - 嵌套 bordered 缺上边框：[#58744](issues/issue-58744.md)
  - 表头分组 ::before 错位：[#48385](issues/issue-48385.md)
  - expand/selection 顺序锁死：[#53918](issues/issue-53918.md)
  - 拖拽 + Tooltip + ellipsis 触发首行拖拽：[#53451](issues/issue-53451.md)
  - v4 虚拟文档失效：[#51615](discussions/disc-51615.md)
- **data-grid 解药**：`bodyHeight`（数字/百分比/字符串）一等公民 API（与 `scroll.y` 的 max-height 分工清晰）；`scrollbar.visibility` 组件级控制；motion 开关下沉到单元格级（`column.motion`、`cell.popoverMotion`）；iPad 真机独立测试矩阵（含 overlay vs classic 滚动条 A/B、触控滑动手感、JS RAF easing 回退为原生）；嵌套边框去重用兄弟选择器（`.title ~ .container`）或 Grid 命名行（`grid-template-rows: auto 1fr`），不靠 `:first-child`；表头分组"父列单子"归一化（合并为叶子或保留 2 行表头）；前置特殊列（expand / selection / drag / 序号）顺序完全可配置（`leadingColumns: [...]`），不硬编码 selection 必须最左；dnd 监听判断 `event.target` 在 drag handle 内才触发，浮层用 portal + stopPropagation。

---

## 二、主题聚类统计

每条仅归入最主要的一个主题。

| 主题 | 条数 | 代表 issue / discussion |
|------|------|-----------|
| 虚拟滚动 virtualization | 11 | #45524 #45637 #47184 #48938 #53921 #53932 #54769 #56956 #44972 #36153 #54243 |
| 滚动条 scrollbar | 9 | #46640 #50957 #53813 #50583 #51650 #54739 #56115 #56357 #56713 |
| 列宽 / 可伸缩列 column-width / resizable | 7 | #49445 #55717 #56151 #56356 #56477 #56602 #48152 |
| 嵌套子表 / 树形 nested / tree | 8 | #15630 #36066 #48715 #50677 #53476 #53918 #54459 #58744 |
| 合并单元格 / colspan / summary | 4 | #34129 #53862 #54860 #56465 |
| 分页 pagination | 4 | #37823 #49437 #29888 #55304 |
| API / 命名 / token RFC | 3 | #54068 #54633 #53112 |
| 过滤 filter | 2 | #32154 #41306 |
| 拖拽 drag | 2 | #47012 #53451 |
| scrollTo API | 2 | #46467 #51651 |
| sticky / 固定列 | 2 | #55265 #54414 |
| 重渲染 / 编辑联动 re-render / edit | 2 | #37995 #55876 |
| 性能 performance | 1 | #35241 |
| ellipsis | 1 | #50965 |
| 动画 motion | 1 | #56334 |
| 表头分组 / 边框 header-grouping / border | 1 | #48385 |
| 文档 / 版本 docs | 1 | #51615 |
| scroll.y / 自适应高度 auto-height | 1 | #53395 |
| 合计 | 62 | — |

---

## 三、全部条目索引

按编号升序排列。文件路径相对本 README 所在目录。

| 编号 | 类型 | 状态 | 标题 | 主题 | 文件 |
|------|------|------|------|------|------|
| 15630 | feature | open | 请为表格 (Table) 组件添加一个数据行 (tr) 分组的功能 | 嵌套/树形 | [issue-15630](issues/issue-15630.md) |
| 29888 | qa | open | table 分页之后如何能够获取全表数据？ | 分页/API | [disc-29888](discussions/disc-29888.md) |
| 32154 | bug | open | filteredValue 控制 filters 时 hide column 出错 | 过滤 | [issue-32154](issues/issue-32154.md) |
| 34129 | bug | open | Table 总结栏使用ColSpan前后风格不一致 | colspan/summary | [issue-34129](issues/issue-34129.md) |
| 35241 | performance | open | antd-table 性能问题（box-shadow 横向滚动掉帧） | 性能/fixed | [issue-35241](issues/issue-35241.md) |
| 36066 | feature | open | table 的子表格实现吸顶功能 | sticky/嵌套 | [issue-36066](issues/issue-36066.md) |
| 36153 | qa | open | 虚拟列表 Virtual List 和 Table 渲染问题（10w 行树形） | 虚拟滚动/树形 | [disc-36153](discussions/disc-36153.md) |
| 37823 | bug | open | 删除当前页所有数据后页码变化未触发 onChange | 分页 | [issue-37823](issues/issue-37823.md) |
| 37995 | feature | open | Table shouldCellUpdate | 重渲染 | [issue-37995](issues/issue-37995.md) |
| 41306 | feature | open | 表格首行支持过滤 | 过滤 | [issue-41306](issues/issue-41306.md) |
| 44972 | feature | closed | 虚拟列表滚动条滚动效果和原生不一致 | 虚拟滚动/滚动条 | [issue-44972](issues/issue-44972.md) |
| 45524 | bug | open | 开启 table 的虚拟滚动，表头会出现频发性位置错乱 | 虚拟滚动 | [issue-45524](issues/issue-45524.md) |
| 45637 | improvement | open | Table 开启虚拟滚动后 Y 轴方向滚动步长 deltaY 太大 | 虚拟滚动/滚轮 | [issue-45637](issues/issue-45637.md) |
| 46467 | bug | open | ref.scrollTo 外层有滚动条时连外层一起滚 | scrollTo | [issue-46467](issues/issue-46467.md) |
| 46640 | bug | open | Scrollbar Issue on Table elements on iPad Devices | 滚动条/移动端 | [issue-46640](issues/issue-46640.md) |
| 47012 | bug | open | scroll + dnd-kit 拖拽到底部频繁闪动 | 拖拽/scroll | [issue-47012](issues/issue-47012.md) |
| 47184 | bug | closed | table 开启虚拟列表以后 summary 无效了 | 虚拟滚动/summary | [issue-47184](issues/issue-47184.md) |
| 48152 | rfc | open | [RFC] Table 支持可伸缩列 | resizable | [disc-48152](discussions/disc-48152.md) |
| 48385 | bug | open | Table 没有 border 时，columns 存在只有一列的子列下的样式问题 | 表头分组/边框 | [issue-48385](issues/issue-48385.md) |
| 48715 | bug | open | table 组件嵌套子表格，设置 scroll.y 之后展示问题 | 嵌套/scroll | [issue-48715](issues/issue-48715.md) |
| 48938 | bug | open | Table 使用 virtual 並包裝在 Modal 內造成跑版 | 虚拟滚动 | [issue-48938](issues/issue-48938.md) |
| 49437 | feature | open | [feat] 固定表格分页选择器 | 分页/sticky | [issue-49437](issues/issue-49437.md) |
| 49445 | feature | open | 希望恢复表格设置 body 固定高度的 API | 列宽/body 高度 | [issue-49445](issues/issue-49445.md) |
| 50583 | qa | closed | Persistent Scrollbar in Virtual Table | 滚动条/虚拟 | [disc-50583](discussions/disc-50583.md) |
| 50677 | qa | open | antd 4.17.4 table 嵌套子表格联动失效 | 嵌套/expandable | [disc-50677](discussions/disc-50677.md) |
| 50957 | bug | open | Table组件设置virtual模式后在2k分辨率屏幕下会显示滚动条 | 滚动条/DPI | [issue-50957](issues/issue-50957.md) |
| 50965 | bug | open | ProTable ellipsis 清空 render 返回的所有 style | ellipsis | [issue-50965](issues/issue-50965.md) |
| 51615 | qa | closed | VirtualTable 表格按照文档无法使用 参照版本 [4.24.12] | 文档/虚拟 | [disc-51615](discussions/disc-51615.md) |
| 51650 | bug | open | virtual Table 虚拟表格，在 flex 布局时并且父容器 overflow:hidden 时，会偶现横向足够显示还是会出现横向滚动条 | 滚动条/flex | [disc-51650](discussions/disc-51650.md) |
| 51651 | discussion | open | scrollTo virtual=false 非虚拟跳转指定行仍导致页面滚动 | scrollTo | [disc-51651](discussions/disc-51651.md) |
| 53112 | rfc | open | [RFC] more semantic token for antd v6 | token | [disc-53112](discussions/disc-53112.md) |
| 53395 | qa | closed | Table 组件的 scroll.y 属性可以自动适应当前屏幕的高度，提供合理的滚动区域，有什么样的实现方式？ | scroll.y/自适应 | [disc-53395](discussions/disc-53395.md) |
| 53451 | improvement | open | 拖拽排序 + ellipsis + 自定义 Tooltip 触发首行拖拽 | 拖拽/Tooltip | [issue-53451](issues/issue-53451.md) |
| 53476 | discussion | open | table 组件平铺展示树形多选结构 | 树形/多选 | [disc-53476](discussions/disc-53476.md) |
| 53813 | feature | open | ant-design Table 使用虚拟表格后滚动条不能点击 | 虚拟滚动条 | [issue-53813](issues/issue-53813.md) |
| 53862 | bug | open | Table 展开使用合并单元格使用有问题 | expandable+rowSpan | [issue-53862](issues/issue-53862.md) |
| 53918 | design | open | antd 如何实现 expand 图标在 select 图标前面，并且用数据里面的 children 自带渲染 | 列顺序/嵌套 | [issue-53918](issues/issue-53918.md) |
| 53921 | improvement | open | Table virtual 和 scroll.y 一起使用时，行内元素不居中 | 虚拟/对齐 | [issue-53921](issues/issue-53921.md) |
| 53932 | bug | open | 虚拟表格在表格的头部动态插入数据时，Y轴会偏移 | 虚拟/动态数据 | [issue-53932](issues/issue-53932.md) |
| 54068 | rfc | open | [RFC] Semantic Placement Naming Standardization | 命名 | [disc-54068](discussions/disc-54068.md) |
| 54243 | discussion | open | Table 开启 virtual 属性，快速横向拖动滚动条后列表错位 | 虚拟滚动/滚动条 | [disc-54243](discussions/disc-54243.md) |
| 54414 | bug | closed | 设置 overflow:'auto' + sticky + 显式列宽，滚动时列头被截断 | sticky/scroll | [disc-54414](discussions/disc-54414.md) |
| 54459 | qa | open | 树形表格，子节点是空数组的时候，如何隐藏展开按钮？ | 树形/expandable | [disc-54459](discussions/disc-54459.md) |
| 54633 | rfc | open | [RFC] 统一且标准化组件 Props 命名 | 命名 | [disc-54633](discussions/disc-54633.md) |
| 54739 | qa | open | v5.21.5 表格隐藏滚动条失败，可以帮忙看下是什么原因吗 | 滚动条 | [disc-54739](discussions/disc-54739.md) |
| 54769 | improvement | open | Virtual table scroll position jumps when fetching items with dynamic/variable heights | 虚拟/动态行高 | [issue-54769](issues/issue-54769.md) |
| 54860 | bug | open | table组件使用colspan对固定列设置合并时单元格偏移错误 | fixed/colspan | [issue-54860](issues/issue-54860.md) |
| 55265 | bug | closed | 表格在窗口变宽的时候变宽，但窗口变窄时表格没变窄 | sticky/fixed/flex | [disc-55265](discussions/disc-55265.md) |
| 55304 | discussion | open | table 分页组件当前页码最大值取总页码不合理 | 分页 | [disc-55304](discussions/disc-55304.md) |
| 55717 | qa | open | 表格增加列时会上下抖动 | 列宽/MeasureRow | [disc-55717](discussions/disc-55717.md) |
| 55876 | discussion | open | Table 单元格编辑时候，select 如何联动 | 编辑/联动 | [disc-55876](discussions/disc-55876.md) |
| 56115 | bug | open | 5.29.1 升 6.0.1 之后表格在高度充足的情况下出现了滚动条 | 滚动条/v6 | [disc-56115](discussions/disc-56115.md) |
| 56151 | bug | open | table 组件在没有数据的时候，宽度会自动缩减 | 空数据/列宽 | [issue-56151](issues/issue-56151.md) |
| 56334 | feature | open | 提供组件级别的方式关闭 Popover 的动画 | 动画/Popover | [issue-56334](issues/issue-56334.md) |
| 56356 | bug | open | 表格可伸缩列不跟手，位置会偏移，而且有时无法退出拖拽状态 | resizable | [issue-56356](issues/issue-56356.md) |
| 56357 | bug | open | 表格外的 div overflow:"auto" 出现了竖滚动条（v5 升 v6 产生的新问题） | 滚动条/v6 | [issue-56357](issues/issue-56357.md) |
| 56465 | bug | closed | 表格设置 scroll.y 之后如果把竖滚动条改成自动，右侧固定列会错位 | scroll/fixed | [disc-56465](discussions/disc-56465.md) |
| 56477 | bug | closed | tableLayout 不是 fixed 时，TableRowSelection 里的 columnWidth 无法真正设置为 0 | 列宽/selection | [disc-56477](discussions/disc-56477.md) |
| 56602 | qa | closed | 表格列的最小宽度存在隐式的最小值限制 | 列宽 | [disc-56602](discussions/disc-56602.md) |
| 56713 | bug | open | Table 设置 scroll.y，在空数据下场景下，因 scrollbar 占位 th 导致列宽跳动 | 滚动条/空数据 | [issue-56713](issues/issue-56713.md) |
| 56956 | feature | open | align scrollbar of virtual/non-virtual table | 滚动条/虚拟 | [issue-56956](issues/issue-56956.md) |
| 58744 | bug | open | 【Table】表格嵌套表格，内部表格设置bordered，缺少上边框 | 嵌套/border | [issue-58744](issues/issue-58744.md) |

---

## 四、图片清单

`assets/` 下全部 37 份图片资源。文件名前缀即对应 issue/discussion 编号。

| 文件 | 对应条目 | 简述 |
|------|---------|------|
| `15630-1.jpg` | #15630 | OP 示意图：红框/蓝框区分两个行分组 |
| `15630-2.png` | #15630 | 社区贴的 jQuery UI 风格分组截图 |
| `34129-1.png` | #34129 | 不使用 colSpan 时右下角与右上角异常对比 |
| `34129-2.png` | #34129 | 使用 colSpan 前后风格差异 |
| `35241-1.png` | #35241 | 症状：横滑掉帧现象 + Tag 行截图 |
| `35241-2.png` | #35241 | Profile：删除 box-shadow 前后 rendering/paint 耗时对比 |
| `36153-1.jpg` | #36153 | 10w 行树形表格卡顿截图 |
| `36153-2.png` | #36153 | 虚拟列表与树形结合的渲染问题 |
| `37995-1.png` | #37995 | OP 截图，展示 shouldCellUpdate demo 与预期不符 |
| `37995-2.png` | #37995 | OP 截图，展示想要「render 重新执行」的效果 |
| `41306-1.png` | #41306 | Radzen DataGrid simple filter menu 参考截图 |
| `41306-2.png` | #41306 | ag-Grid 内置 filter row 参考截图 |
| `45524-1.gif` | #45524 | 表头错位 GIF（URL 留存，未下载：超时） |
| `47012-1.gif` | #47012 | 拖到底部频繁闪动实拍 |
| `47184-1.png` | #47184 | 未开启虚拟时 summary 正常显示的对比截图 |
| `48385-1.png` | #48385 | 单子列下父子表头之间的异常分隔线 |
| `48938-1.jpg` | #48938 | Modal 中 virtual Table 滚动条跑版截图 |
| `49445-1.png` | #49445 | OP 展示现状：数据少时分页条贴近表体，跳动明显 |
| `49445-2.png` | #49445 | `styles.section.minHeight` 超过 `scroll.y` 时下方空白条带 |
| `50957-1.png` | #50957 | 2K 屏 + Windows 125% 缩放下多余滚动条 |
| `51615-1.png` | #51615 | v4 虚拟文档失效 TS 报错截图 |
| `51650-1.png` | #51650 | flex + overflow:hidden 偶现多余横向滚动条 |
| `53476-1.png` | #53476 | OP 期望的「平铺树形多选」UI：父行 + 子项横向多 Chip 排列 |
| `53476-2.png` | #53476 | 另一张横向平铺 + 多选的视觉参考 |
| `53862-1.png` | #53862 | 展开 + 合并单元格的错位示意 |
| `54243-1.png` | #54243 | 快速拖动后表头与表体列错位截图 |
| `54414-1.png` | #54414 | sticky + overflow:auto + 显式列宽 → 列头截断 |
| `55265-1.png` | #55265 | sticky + flex 不对称缩放导致底部出现横滚动条 |
| `56115-1.png` | #56115 | v5→v6 升级后高度充足也冒出竖向滚动条（预期 v5） |
| `56115-2.png` | #56115 | v5→v6 升级后冒出多余竖向滚动条（实际 v6） |
| `56151-1.png` | #56151 | 空表 vs 有数据列宽不一致 |
| `56357-1.png` | #56357 | v5→v6 升级后表格外层多余竖滚动条 |
| `56465-1.png` | #56465 | 右侧固定列错位截图 |
| `56477-1.png` | #56477 | rowSelection.columnWidth: 0 后右侧 32px 空白 |
| `56602-1.png` | #56602 | table-layout 实际为 auto 的 DevTools 截图 |
| `56713-1.png` | #56713 | scroll.y + 空数据 scrollbar 占位 th 导致列宽跳动 |
| `disc-50677-1.png` | #50677 | OP 当时的渲染效果（点一行展开全部） |

---

## 五、采集元信息

- **采集时间**：2026-07-20
- **来源**：<https://github.com/ant-design/ant-design/>（issues + discussions，关键词 table 表格）
- **方法**：chrome-devtools MCP 串行采集（单浏览器，6 批 × ~10 条）；每个条目一份 md，含 frontmatter（number/title/type/state/labels/url/author/created/comments）+ 现象/复现/期望 vs 实际/根因/关联图片/对 data-grid 的启示六段式结构
- **覆盖**：37 issues + 25 discussions = 62 条；图片资源 37 份
- **已知缺图**：部分 issue 内嵌图走 GitHub private-user-images JWT 短链或 GIF/MP4，curl 超时，仅记 URL（见各 md "关联图片"段，如 #45524 GIF、#46640 iPad 视频、#54769 录屏 .mov、#54459 嵌链图、#56356 zip 复现视频、#56713 mp4 + alipay objects GIF、#58744 GitHub JWT 图等）
- **批次拆分**：
  - B1 虚拟滚动核心（10 条）
  - B2 虚拟滚动+滚动条（10 条）
  - B3 scroll.y / sticky / 列宽（10 条）
  - B4 合并单元格 / summary / 嵌套子表 / 边框（10 条）
  - B5 分页 / 过滤 / 拖拽 / scrollTo / 性能（10 条）
  - B6 杂项 + RFC（12 条）
