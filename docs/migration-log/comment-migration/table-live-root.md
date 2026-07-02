# Table / Live / Root Comment Migration

本文件承接从源码迁出的长篇设计说明、兼容性说明和实现背景。源码中仅保留简短用途注释、必要的局部算法提示和对外类型提示。

## src/live/stripComments.ts

- 用途：为 live 编辑相关的展示层生成“去注释”的代码视图，不修改原始源码内容。
- 规则：
  - 移除 `//` 行注释和 `/* ... */` 块注释。
  - 保留字符串字面量中的注释样式文本。
  - 处理单引号、双引号、反引号和反斜杠转义。
- 已知限制：
  - 当前不处理正则字面量。
  - JSX 注释按普通块注释处理。

## src/live/scope.ts

- live 编辑链路里，demo 子文件先经 sucrase 编译，`import` 会转成 `require(...)`。
- `scope.ts` 提供 require 注入表，`evalModule` 执行时以此解析模块。
- 一个关键约束是“key 与 demo 子文件 import specifier 保持字面一致”，这样 demo 源码可以直接展示和编译，不需要额外路径改写。
- `import.meta.glob('../demos/_compare/*.shared.ts', { eager: true })` 自动收集 shared 模块，并把它们映射成子文件里使用的 `./_compare/<name>.shared` key。
- 额外注入项包括：
  - `react-highlight-words`，供自定义筛选面板 demo 使用。
  - `@dnd-kit/core`、`@dnd-kit/sortable`、`@dnd-kit/modifiers`、`@dnd-kit/utilities`，供拖拽排序 demo 使用。

## src/live/LiveErrorBoundary.tsx

- `compile` / `evalModule` 只能覆盖“应用”阶段的编译和模块执行错误。
- 组件真正 render 时抛出的异常需要 React error boundary 捕获。
- 这里的策略是：
  - `getDerivedStateFromError` 切到 fallback。
  - `componentDidCatch` 把错误转发给外层统一展示。
  - fallback 直接返回 `null`，避免预览区错误扩散。

## src/live/LiveEditor.tsx

- 编辑器采用双层叠放：
  - 底层 `<pre>` 负责 prism 高亮展示。
  - 上层 `<textarea>` 负责真实输入和 caret。
- 两层通过 grid 同格叠放，并共享排版字段，保证字符位置对齐。
- 默认渲染路径不预加载 sucrase；只有点击“应用”时才动态导入 `compile.ts` 和 `evalModule.ts`。
- “重置”通过 `(null, null)` 回调告诉外层回退到默认 demo 渲染，而不是继续使用 live 产物。
- 切换 demo 时要显式同步 `initialCode` 到本地 state，否则可能沿用上一个 demo 的编辑内容。

## src/live/compile.ts

- 使用 sucrase 把 TSX 字符串编译成 CJS。
- 关键配置：
  - `transforms: ['typescript', 'jsx', 'imports']`
  - `jsxRuntime: 'classic'`
  - `disableESTransforms: true`
- 返回值采用 `{ ok: true | false, ... }` 结果对象，而不是向上抛异常，便于编辑器统一展示错误。

## src/live/evalModule.ts

- 运行模型是 `new Function('module', 'exports', 'require', 'React', js)`。
- `scope` 既是 `require` 解析表，也是 classic JSX 产物里的 `React` 闭包来源。
- 这里不预渲染组件，只返回 default 导出的组件引用；真正渲染仍由外层 Provider 树负责。
- 校验要求是 default 导出必须为函数组件。

## src/theme/ThemeContext.tsx

- 背景问题：旧方案把一整套 light token 常量直接塞进 `ConfigProvider`，导致 dark algorithm 无法继续派生出正确的暗色值。
- 当前约束：
  - “已编辑”定义为 key 存在于 overrides 对象中。
  - 未编辑的 token 不得传入 `theme.token` 或 `theme.components.Table`。
- 因而 `ThemeProvider` 的职责是：
  - 维护 `themeMode`。
  - 维护 `globalOverrides` 与 `tableOverrides`。
  - 只把显式编辑过的键传给 `ConfigProvider`。
- 这样 antd 的 algorithm 和组件 token 派生逻辑仍能处理其余键，暗色模式不会被浅色常量覆盖。

## src/table/types.ts

- 本文件保留对外 API 的短 JSDoc，但把大段兼容性说明迁出。
- 迁出的重点包括：
  - `FixedInput` 对 antd `fixed` 输入的归一化背景。
  - 自定义筛选面板相关接口与 antd 的兼容差异。
  - `ColumnFilterItem.children` 在当前实现中的消费边界。
  - `rowSelection` 下 `checkStrictly`、`selections`、`preserveSelectedRowKeys`、`renderCell` 的完整语义。
- 相关详细设计文档仍以现有专题文档为准：
  - `docs/design-notes/fixed-column.md`
  - `docs/design-notes/filter-sorter.md`
  - `docs/design-notes/selection.md`

## src/table/engine/useVirtualList.ts

- 本 hook 的目标是为动态行高表格提供虚拟滚动能力。
- 主要实现点：
  - 通过 `RowSizeState` 维护实测尺寸及偏移缓存。
  - 未测量行使用 `getRowHeight` 作为回退值。
  - 根据 `contentOffset` 修正真实数据区的滚动坐标。
  - `scrollTo` 同时支持绝对 scrollTop 和按行定位。
- smooth scroll 的实现选择：
  - 不依赖原生 `behavior: 'smooth'` 作为最终方案。
  - 使用 `requestAnimationFrame` 和 `easeOutExpo` 驱动，以降低虚拟化重渲染造成的落点漂移。
  - 保留 fallback timer，在 RAF 未正常结束时强制收尾。
- 更完整的算法细节见 `docs/design-notes/virtualization.md`。

## src/table/style/tokens.css

- `.dg-wrapper` 上这套 `--ant-*` 变量是“未接入 antd 主题时”的 fallback，目标是让 data-grid 单独渲染时也接近 antd 6.4.4 默认观感。
- 真正接入 `ThemeProvider` / `ConfigProvider` 后，`Table.tsx` 会把 alias token 和 `components.Table` token 按同名 key 注入成 inline style，覆盖这些 fallback。
- 该文件还承担 size 桥接：`large / middle / small` 直接映射到 antd Table 的三档 token；`compact` 不单独造第四档，而是视觉等价到 `small`，因为 antd Table 本身没有独立的 compact token 层级。

## src/table/style/table.css

- 这个样式层负责把 `tokens.css` 里的变量落到布局和交互表面，并显式补齐 `.dg-wrapper` 作为“非 antd 组件根”时拿不到的若干 reset 行为，例如链接色、`font-size`、`line-height`。
- `dg-data-area` / `dg-content-scrolled` / `dg-sticky` 这几组类分别对应数据区滚动、内容区滚动和页面级 sticky 三种布局模式；原生横向滚动条继续隐藏，横滚统一交给内部 `.dg-scroll` / FloatingScrollBar。
- `scroll.y === true` 时的 flex 链、loading 包裹链路、隐藏列 0fr 轨道和多级表头分割线规则都留在这里实现，具体推导仍以现有 `docs/design-notes` 专题文档为准。

## src/table/engine/useRowSelection.ts

- 受控 `selectedRowKeys` 仍是唯一真理源；hook 负责把 checkbox/radio、全选/反选/清空、自定义 `selections` 和树形联动整理成统一结果。
- 内置 `SELECTION_ALL / INVERT / NONE` 继续采用哨兵对象而不是字符串，便于同时作为静态导出和菜单项配置复用；真正行为由 `applySelection` 按 key 分支处理。
- `changeableRowKeys` 的范围仍对齐“当前所有可选行”，而内置英文文案暂时保持与 antd enUS 一致，尚未把 locale 透传到 selections 菜单文本。

## src/main.tsx

- 应用根节点由 `ThemeProvider` 包裹整个 demo 站点；`ConfigProvider` 已经内化在 `ThemeProvider` 内部。
- `VirtualizationProvider` 放在其内层，只负责顶栏全局虚拟化开关，不参与主题 token 派生。

## src/App.tsx

- `App` 是 hash 路由壳层，负责主页 / demo / docs 三种视图、侧栏分组导航，以及主题编辑器 Modal 和全局虚拟化开关。
- split demo 通过 `import.meta.glob('./demos/*.dg.tsx')` 自动发现；有 `*.dg.tsx` 的 demo 会接入左右对比预览和双 `LiveEditor`，否则走普通 `CodeView` 只读源码区。
- split demo 的源码编辑器仍是按需路径：只有在折叠区展开时才进入 live preview 链路，避免默认渲染预加载 sucrase 和相关运行时。

## src/useDemoSource.ts 与 src/useSplitDemoSource.ts

- 两个 hook 都使用 `import.meta.glob(..., { query: '?raw', eager: false })` 懒取源码字符串，并用模块级 `Map` 复用缓存。
- `useSplitDemoSource.ts` 额外同时维护 dg/antd 两段源码，并在 demo 名切换时丢弃过期结果，避免旧请求覆盖新视图。

## src/CodeView.tsx

- 只负责只读源码高亮展示；prism 主题跟随 `ThemeContext.themeMode`，背景色直接取 renderer theme 自带样式，不再额外硬编码。

## src/ThemeEditorModal.tsx

- 顶栏“主题编辑器”按钮打开的是一个壳层 Modal，内部继续复用 `ThemeEditorPanel`。
- body 高度限制为 `80vh` 并开启滚动，是为了容纳较长的控制面板和预览区，而不改原 panel 逻辑。

## src/HomePage.tsx

- 首页在 query 为空时按 category 分组展示 demo；有 query 时改成单节搜索结果，并对 `title` / `description` / `name` 做不区分大小写匹配。

## src/DocsPage.tsx

- docs 视图是左侧 Anchor、右侧正文的静态文档页；路由可选段 `#/docs/<section>` 会在挂载后滚到对应锚点。
- API 表继续使用轻量原生 `<table>`，避免在文档页里再嵌一层 antd Table 造成样式噪音。
