# Demo 文案与 CodeMirror 6 代码框迁移计划

## 目标

重新设计 demo 站点的标题、菜单副标题和说明文本，使其接近 Microsoft Learn / MSDN 中文文档的风格：标题先说明用户任务或能力，副标题突出最关键、最能区分相近 demo 的 API 或配置点，说明文本保持一句话，直接告诉用户这个示例演示什么。

同时移除 demo 代码框对 `prism-react-renderer` 的依赖，改用 CodeMirror 6，解决 `prism-code language-tsx` 类代码高亮在浅色/深色主题下前景色与背景色反复不匹配的问题。

本计划只描述方案，不修改业务代码。

## 现状梳理

- demo 元数据集中在 `src/demos/index.ts`，类型定义在 `src/demos/registry.ts`。
- 当前 `DemoMeta` 只有 `title`、`description`，没有专门的菜单副标题或关键 API 字段。
- 侧栏菜单、全局搜索、首页卡片和面包屑分别在 `src/App.tsx`、`src/HomePage.tsx` 中消费 `title` / `description`。
- 只读源码视图 `src/CodeView.tsx` 使用 `prism-react-renderer`。
- 可编辑源码视图 `src/live/LiveEditor.tsx` 仍导入 `prism-react-renderer` 的主题，但实际编辑控件是 `textarea`，没有真正的 TSX 语法编辑体验。
- `package.json` 中当前 devDependency 包含 `prism-react-renderer`，未包含 CodeMirror 相关依赖。

## 文案设计原则

1. 标题用中文能力名，不直接照搬英文示例名，例如 `Row Selection Native` 改为 `行选择模式`。
2. 高度近似 demo 通过副标题区分，副标题优先写 API、配置项或专有能力，例如 `gridOptions.selection`、`rowSelection.selections`、`rowSelection.renderCell`。
3. 说明文本用 Learn 风格的一句话，避免“验收基线”“双栏对照”“issue 编号”作为主文案；这些信息可保留在 demo 内容内或开发备注中。
4. 菜单项使用两行结构：第一行标题，第二行灰色小字副标题。折叠菜单仍只显示图标或 title tooltip。
5. 搜索应覆盖 `title`、`subtitle`、`description`、`name`、`category`，让用户搜 API 名也能定位 demo。

## 建议数据结构

在 `DemoMeta` 中新增路由字段，并把“内部文件标识”和“用户可见英文路由”拆开：

```ts
interface DemoMeta {
  /** 内部标识，沿用当前英文文件基名，用于源码加载和 import 映射。 */
  name: string
  /** 用户可见 URL 片段，使用英文，但语义必须对应中文标题，例如 #/demos/row-selection-mode。 */
  slug: string
  /** 旧英文路由或历史路由，用于兼容跳转。 */
  aliases?: string[]
  title: string
  subtitle?: string
  description?: string
  element: () => Promise<{ default: ComponentType }>
  compare?: boolean
  category: string
}
```

字段语义：

- `name`：内部 id，不再直接暴露为主路由；保持英文可以避免同步重命名 demo 文件、raw source glob 和 split demo 文件。
- `slug`：主路由片段，使用英文短语，但含义跟中文标题一一对应。导航生成 `#/demos/${slug}`，解析 hash 时先按 `slug` 匹配，再按 `aliases` 兼容旧路径。
- `aliases`：旧路由数组，例如 `row-selection-native`，访问后可直接渲染，也可以替换 hash 到新路由。
- `title`：中文示例标题，用于菜单首行、首页卡片标题、面包屑。
- `subtitle`：关键 API / 配置项，用于菜单灰色小字、首页卡片辅助信息、搜索结果第二行前半段。
- `description`：一句话说明，用于首页卡片和搜索结果详情；不承担区分高度相似 demo 的主要职责。

路由命名规则：

1. 主路由使用英文 kebab-case，例如“行选择模式”对应 `#/demos/row-selection-mode`。
2. 英文路由必须能从中文标题直接反推含义；避免 `head`、`ajax`、`native` 这类脱离中文标题后不明确的词。
3. API 缩写在 URL 中小写化，例如 `DOM` -> `dom`、`JSX` -> `jsx`。
4. 标题过长时允许缩短，但保留区分点，例如“固定列和表头”用 `fixed-columns-and-header`，不是 `fixed-header`。
5. 旧英文路由放入 `aliases`，避免现有链接、测试和书签立即失效；如果旧路由本身已经清晰，可直接沿用为 `slug`。

## Demo 文案矩阵

| 内部 id / 旧路由 | 建议英文主路由 | 建议标题 | 建议副标题 | 建议说明 |
| --- | --- | --- | --- | --- |
| `basic` | `#/demos/basic-table` | 基础表格 | `columns` / `dataSource` | 使用最少配置渲染表格，展示列、数据源和基础行列布局。 |
| `grouping-columns` | `#/demos/grouped-header` | 分组表头 | `columns[].children` | 使用嵌套列定义创建多级表头，并与固定列和横向滚动一起工作。 |
| `fixed-columns` | `#/demos/fixed-columns` | 固定列 | `column.fixed` | 将左侧和右侧列固定在滚动容器边缘，保持关键字段可见。 |
| `fixed-gapped-columns` | `#/demos/non-contiguous-fixed-columns` | 非连续固定列 | `column.fixed` | 演示不相邻固定列在横向滚动时的堆叠和边界表现。 |
| `fixed-columns-header` | `#/demos/fixed-columns-and-header` | 固定列和表头 | `column.fixed` + `scroll.y` | 同时固定横向列和纵向表头，验证角落单元格的联动定位。 |
| `fixed-header` | `#/demos/fixed-header` | 固定表头 | `scroll.y` | 限制表体高度并固定表头，适合长列表的纵向浏览。 |
| `colspan-rowspan` | `#/demos/merged-cells` | 合并单元格 | `colSpan` / `rowSpan` | 在表头和表体中合并行列，创建分组或跨行展示效果。 |
| `virtual-list` | `#/demos/virtual-list` | 虚拟列表 | `virtual` / `scroll` | 在大数据量下只渲染可视区域，同时保持滚动和固定列能力。 |
| `virtual-list-recycling` | `#/demos/dom-recycled-virtual-list` | DOM 复用虚拟列表 | `gridOptions.recycling` | 使用 data-grid 专属 DOM 复用策略降低超大表格的渲染成本。 |
| `row-selection` | `#/demos/basic-row-selection` | 基础行选择 | `rowSelection.type` | 在 checkbox 和 radio 模式间切换，并处理禁用项和选择回调。 |
| `row-selection-and-operation` | `#/demos/controlled-row-selection` | 受控行选择 | `selectedRowKeys` | 通过受控选中键管理选择状态，并执行批量操作。 |
| `row-selection-custom` | `#/demos/custom-selection-menu` | 自定义选择菜单 | `rowSelection.selections` | 在选择列菜单中提供自定义选择动作。 |
| `row-selection-advanced` | `#/demos/advanced-selection-column` | 高级行选择列 | `columnTitle` / `onSelectMultiple` | 自定义选择列表头、单元格属性和 Shift 连续选择行为。 |
| `row-selection-native` | `#/demos/row-selection-mode` | 行选择模式 | `gridOptions.selection` | 使用 data-grid 原生选择模型支持普通点击、Ctrl 多选和 Shift 连续选择。 |
| `hidden-columns` | `#/demos/hidden-columns` | 隐藏列 | `column.hidden` | 按列配置隐藏状态，并保持布局变化的过渡效果。 |
| `resizable` | `#/demos/resizable-columns` | 调整列宽 | `gridColumnOptions.resizable` | 通过拖拽改变列宽，并限制最小和最大宽度。 |
| `expand` | `#/demos/expandable-rows` | 展开行 | `expandable` | 为行提供展开内容，并控制哪些行允许展开。 |
| `expand-sticky` | `#/demos/expand-column-position` | 展开列位置 | `Table.EXPAND_COLUMN` | 调整展开图标列的位置，并与合并行一起使用。 |
| `order-column` | `#/demos/special-column-order` | 控制特殊列顺序 | `Table.EXPAND_COLUMN` / `Table.SELECTION_COLUMN` | 使用哨兵列控制展开列和选择列在表格中的顺序。 |
| `row-selection-fixed` | `#/demos/fixed-selection-column` | 固定选择列 | `rowSelection.fixed` | 在横向滚动表格中固定选择列，并处理相邻固定列继承规则。 |
| `head` | `#/demos/sorting-and-filtering` | 排序和筛选 | `sorter` / `filters` | 为列启用基础排序和筛选，并在变更事件中读取结果。 |
| `multiple-sorter` | `#/demos/multiple-column-sorting` | 多列排序 | `sorter.multiple` | 为多个排序列设置优先级，并返回组合排序状态。 |
| `reset-filter` | `#/demos/reset-sorting-and-filtering` | 重置筛选和排序 | `filteredValue` / `sortOrder` | 使用受控字段从外部按钮清空筛选和排序状态。 |
| `custom-filter-panel` | `#/demos/custom-filter-panel` | 自定义筛选面板 | `filterDropdown` | 使用自定义下拉面板实现输入搜索、确认和清除操作。 |
| `filter-search` | `#/demos/filter-search` | 筛选项搜索 | `filterSearch` | 在内置筛选菜单中搜索筛选项，支持默认匹配或自定义函数。 |
| `filter-in-tree` | `#/demos/tree-filter` | 树形筛选 | `filterMode="tree"` | 用树形结构组织筛选项，并结合筛选搜索定位节点。 |
| `pagination` | `#/demos/pagination` | 分页 | `pagination` | 启用表格分页，并调整分页器显示位置。 |
| `scroll-to-first-row` | `#/demos/scroll-to-first-row` | 翻页后回到首行 | `scroll.scrollToFirstRowOnChange` | 在分页、排序或筛选变化后控制表体是否滚回顶部。 |
| `ajax` | `#/demos/remote-data` | 远程数据 | `onChange` + `loading` | 模拟服务端分页、排序和筛选，并在加载期间显示状态。 |
| `tree-data` | `#/demos/tree-data` | 树形数据 | `childrenColumnName` | 使用层级数据渲染可展开树表，并控制父子选择关系。 |
| `tree-table-preserveSelectedRowKeys` | `#/demos/preserved-tree-selection` | 树表保留选择 | `preserveSelectedRowKeys` | 在树形数据和分页切换时保留已选择行。 |
| `edit-cell` | `#/demos/cell-editing` | 单元格编辑 | `components.body.cell` / `onCell` | 自定义单元格渲染，使用户可以逐格编辑数据。 |
| `edit-row` | `#/demos/row-editing` | 行编辑 | `editingKey` | 以行为单位进入编辑状态，并保存或取消整行修改。 |
| `drag-sorting` | `#/demos/drag-row-sorting` | 拖拽行排序 | `components.body.row` | 拖拽整行改变数据顺序，并显示插入位置。 |
| `drag-sorting-handler` | `#/demos/drag-handle-row-sorting` | 拖拽手柄排序 | `handleSelector` | 只允许从指定手柄拖拽行，避免误触普通单元格。 |
| `drag-column-sorting` | `#/demos/drag-column-sorting` | 拖拽列排序 | `components.header.cell` | 通过拖拽表头改变列顺序。 |
| `drag-virtual-list` | `#/demos/virtual-list-drag-sorting` | 虚拟列表拖拽排序 | `autoScrollOnDrag` | 在虚拟滚动表格中拖拽行，并在靠近边缘时自动滚动。 |
| `drag-multi-row-reorder` | `#/demos/multi-row-drag-reorder` | 多行拖拽重排 | `gridOptions.multiRowReorder` | 选择多行后拖拽其中一行，将选中行作为整体移动。 |
| `ellipsis` | `#/demos/text-ellipsis` | 文本省略 | `column.ellipsis` | 对过长单元格内容显示省略号，并保留默认悬浮提示。 |
| `ellipsis-custom-tooltip` | `#/demos/custom-ellipsis-tooltip` | 自定义省略提示 | `ellipsis.showTitle` | 关闭默认 title 提示，并使用 Tooltip 接管悬浮内容。 |
| `summary` | `#/demos/summary-row` | 总结栏 | `Table.Summary` | 在表格底部渲染汇总行，并支持固定显示。 |
| `custom-empty` | `#/demos/custom-empty-state` | 自定义空状态 | `locale.emptyText` | 在无数据时显示自定义空状态内容和操作。 |
| `nested-table` | `#/demos/nested-table` | 嵌套表格 | `expandedRowRender` | 在展开行中渲染子表格，展示主从数据结构。 |
| `tree-table-ellipsis` | `#/demos/tree-table-ellipsis` | 树表文本省略 | `treeData` + `ellipsis` | 在树形首列同时使用固定列和文本省略。 |
| `bordered` | `#/demos/bordered-table` | 带边框表格 | `bordered` | 为表格、标题、页脚和固定列组合显示边框。 |
| `size` | `#/demos/table-size` | 表格尺寸 | `size` | 对比不同尺寸下的行高、内边距和密度。 |
| `narrow` | `#/demos/narrow-container-table` | 窄容器表格 | `scroll` / `pagination` | 在窄宽度容器中验证列宽、滚动和分页表现。 |
| `responsive` | `#/demos/responsive-columns` | 响应式列 | `column.responsive` | 按断点显示或隐藏列，使表格适配不同视口。 |
| `style-class` | `#/demos/semantic-styling` | 语义化样式 | `classNames` / `styles` | 按表格语义部位注入类名和内联样式。 |
| `component-token` | `#/demos/component-theme-tokens` | 组件主题令牌 | `theme.components.Table` | 使用 Ant Design 组件 token 调整表格视觉变量。 |
| `jsx` | `#/demos/jsx-columns` | JSX 列声明 | `Table.Column` / `ColumnGroup` | 使用 JSX 子组件声明列和分组列。 |
| `column-defaults` | `#/demos/table-column-defaults` | 表格级列默认值 | `columnDefaults` | 在表格级别设置重复列属性，并允许单列覆盖。 |
| `dynamic-settings` | `#/demos/dynamic-table-settings` | 动态表格设置 | 多项 Table props | 通过控制面板切换常用表格配置，观察组合效果。 |
| `sticky` | `#/demos/page-sticky-header` | 页面级粘性表头 | `sticky` / `scrollBarFoldMode` | 在页面滚动中保持表头可见，并调整滚动条折叠模式。 |
| `nest-table-border-debug` | `#/demos/nested-table-border-isolation` | 嵌套表格边框隔离 | `bordered` + `expandedRowRender` | 分别控制主表和子表边框，验证嵌套表格的边界样式。 |
| `row-selection-custom-debug` | `#/demos/custom-selection-cell` | 自定义选择单元格 | `rowSelection.renderCell` | 自定义选择格渲染，并与合并行一起工作。 |
| `semantic-dom` | `#/demos/semantic-dom-slots` | 语义化 DOM 插槽 | `classNames` / `styles` | 标记表格语义槽位，验证样式挂载点和可访问性属性。 |

## UI 调整计划

1. 扩展 `DemoMeta` 类型，新增 `slug: string`、`aliases?: string[]`、`subtitle?: string`。
2. 更新路由解析：`#/demos/:slug` 先匹配 `slug`，再匹配 `aliases`，最后才进入 404。
3. 更新 `navigate` 和菜单 key：生成语义明确的英文主路由；旧英文路由作为别名保留。
4. 更新 `src/demos/index.ts` 的所有 demo 文案和英文主路由，采用上表建议。
5. 内部源码加载继续使用 `name`，不要把 demo 文件名、`.dg.tsx`、`.antd.tsx` 一起改成中文。
6. 抽出轻量的 `DemoMenuLabel` 或内联结构：菜单项第一行显示 `title`，第二行显示灰色 `subtitle`。
7. 更新全局搜索：匹配字段加入 `slug`、`aliases`、`subtitle`；搜索结果第二行优先显示 `subtitle`，再显示 `category` 和 `description`。
8. 更新首页卡片：标题保留中文标题，副标题以小号灰色文字或轻量标签展示，说明文本继续作为两行摘要。
9. 面包屑保持只显示标题，避免面包屑过长；demo 详情页如需要可在预览区上方补充 subtitle，但不是第一阶段必须项。
10. 折叠侧栏时避免副标题撑开菜单；使用 Ant Design Menu 的 tooltip 或仅保留标题。

## CodeMirror 6 迁移计划

推荐依赖：

```json
{
  "devDependencies": {
    "codemirror": "^6.x",
    "@codemirror/state": "^6.x",
    "@codemirror/view": "^6.x",
    "@codemirror/lang-javascript": "^6.x",
    "@codemirror/theme-one-dark": "^6.x"
  }
}
```

实施顺序：

1. 新增通用编辑器封装，例如 `src/code/CodeMirrorEditor.tsx`，负责创建、销毁和更新 `EditorView`。
2. 封装固定扩展：`basicSetup`、`javascript({ jsx: true, typescript: true })`、只读/可编辑状态、基础尺寸样式。
3. 用 `Compartment` 单独包住主题扩展，初始主题和后续主题切换都通过同一个 compartment 管理。
4. 第一阶段主题采用 CodeMirror 默认浅色主题 + `oneDark` 深色主题。浅色主题可以是空 `EditorView.theme({}, { dark: false })`，用于移除 `oneDark` 并声明 light mode。
5. 替换 `CodeView.tsx`：使用同一个封装的只读模式展示源码，保留行号、横向滚动和可复制文本。
6. 替换 `LiveEditor.tsx`：使用同一个封装的可编辑模式替代 `textarea`，保留现有 `code` state、应用、重置、编译和错误展示逻辑。
7. 处理 split demo 双编辑器布局：保持当前双列，但在窄屏下改为单列，避免编辑器宽度过窄导致视觉错位。
8. 移除所有 `prism-react-renderer` import；确认 `package.json` 和 lockfile 删除该依赖。

主题策略：

1. 不强制绑定 Ant Design token。CodeMirror 默认浅色主题本身可用，`oneDark` 也能提供稳定深色配色。
2. 使用 `Compartment.reconfigure(...)` 切换主题，不重建编辑器，避免切换主题时丢光标、滚动位置或撤销栈。
3. 只有出现视觉不统一或全局 CSS 污染时，再增加 token-based theme 作为第二阶段增强。
4. 如果后续增加 token-based theme，也应保持 `Compartment` 机制不变，只替换 light / dark extension 的实现。

## 验证计划

1. 静态验证：运行 `pnpm run tsc` 和 `pnpm run lint`。
2. 单元验证：运行现有 `pnpm test`，确保元数据字段变化没有影响表格逻辑测试。
3. 浏览器验证：使用 `mcp__chrome_devtools` 打开本地站点，检查首页、侧栏、搜索、典型 demo 页面和源码 Collapse。
4. 代码框验证：展开只读源码和 split demo live 编辑器，确认 TSX 高亮、行号、复制、编辑、应用、重置都正常。
5. 主题验证：在 Light / Dark 之间切换，确认已展开的只读代码框和 live 编辑器同步切换，且不重建导致输入内容丢失。
6. 路由验证：重点检查新主路由 `#/demos/row-selection-mode`，确认菜单标题为“行选择模式”，副标题为 `gridOptions.selection`。
7. 兼容验证：访问旧路由 `#/demos/row-selection-native` 仍能进入同一个 demo；如果采用自动替换 hash，则最终地址应变为 `#/demos/row-selection-mode`。

## 风险与待确认

- CodeMirror 6 体积通常明显小于 Monaco，但如果引入过多扩展，仍可能产生不必要的额外 chunk。
- `basicSetup` 方便但包含多项默认能力；如产物体积仍不理想，可第二阶段拆成精简扩展集合。
- CodeMirror 需要自己处理只读/可编辑两种模式的容器初始化和销毁时机，特别是 Collapse 首次展开时。
- TSX 高亮依赖 `@codemirror/lang-javascript` 的 JSX/TypeScript 组合，最终效果需要用实际 demo 源码验证，不要只看纯 TS 样例。
- 英文 hash 路由本身不会带来编码歧义；解析层只需要统一按 `slug` / `aliases` 匹配，并保留旧路由兼容。
- E2E 和文档里的旧英文 demo URL 需要分批更新；旧路由保留 aliases 后可以降低一次性迁移风险。
- 文案矩阵中的少数 data-grid 专属 API 名称需要在实现前再核对实际 public API 名称，避免副标题写成内部命名。

## 附录：CodeMirror 6 主题切换示例

下面示例是本项目第一阶段推荐的主题切换模型。浅色模式使用 CodeMirror 默认主题色，深色模式使用 `oneDark`，切换时通过 `Compartment.reconfigure(...)` 更新主题，不重建编辑器。

```ts
import { EditorView } from '@codemirror/view'
import { Compartment } from '@codemirror/state'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { basicSetup } from 'codemirror'

// 1. 用 Compartment 包住主题。
const themeCompartment = new Compartment()

// 空 light theme 没有问题：它表示使用 CodeMirror 默认浅色主题，
// 并在从 dark 切回 light 时移除 oneDark。
const lightTheme = EditorView.theme({}, { dark: false })

function createEditor(parent: HTMLElement, dark: boolean) {
  return new EditorView({
    parent,
    doc: 'const x: number = 1;',
    extensions: [
      basicSetup,
      javascript({ jsx: true, typescript: true }),
      // 2. 初始放进 compartment。
      themeCompartment.of(dark ? oneDark : lightTheme),
    ],
  })
}

// 3. 切换时用 reconfigure，不重建编辑器。
function switchTheme(view: EditorView, dark: boolean) {
  view.dispatch({
    effects: themeCompartment.reconfigure(dark ? oneDark : lightTheme),
  })
}
```
