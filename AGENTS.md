# AGENTS.md

`@nukepayload2/data-grid`：antd v6 Table 的 CSS Grid 重写。antd 同名同义字段留在顶层 API，专属能力收进 `gridOptions` / `gridColumnOptions`。

代号 `{src}`=src `{table}`={src}/table `{engine}`={table}/engine `{compat}`={table}/compat `{style}`={table}/style `{live}`={src}/live `{demos}`={src}/demos `{tests}`=tests `{e2e}`=e2e `{scripts}`=scripts `{docs}`=docs
行式 `功能 - 路径 - 关键词`。`{代号}/` 是路径前缀；路径里 `*` 单层、`**` 递归，`{甲,乙}` 并列展开（如 `{engine}/use{RowExpand,TreeData}.ts`）。

## 入口与公开 API
- Table 组件 - {table}/Table.tsx - TableProps TableRef scrollTo
- 库导出面 - {table}/index.ts - Table Summary ColumnsType getRowKey
- 公开类型 - {table}/publicTypes.ts,{table}/types.ts - TableProps TableRef
- 原生枚举 - {table}/nativeOptions.ts - Align FixedInput GridSelectionMode
- 兼容与引擎类型边界 - {table}/compatTypes.ts,{compat}/*.ts - ColumnType
- antd prop 适配器 - {table}/*Adapter*.tsx,{table}/*Adapter.ts - buildSelectionColumnNode buildExpandColumnNode
- 主题变量桥 - {table}/useTableThemeVars.ts,{table}/tokenBridge.ts - aliasTokenVars tableTokenVars
- 开发态告警出口 - {table}/devWarn.ts - devWarnOnce CHANNEL_PREFIX NODE_ENV 门 去重表
- 上下文缺省回落单点 - {table}/contextDefaults.ts - rowKey scroll expandIcon props→上下文→缺省
- 列树与选择适配 hook - {table}/useColumnTreeBuilder.ts,{table}/useSelectionAdapter.ts - columnTree keyToValue
- 分页与展开绑定 hook - {table}/usePaginationAdapter.ts,{table}/useExpandRowBinding.ts - slicePage expandRowByClick
- 响应式与语义样式 hook - {table}/useResponsiveColumns.ts,{table}/useScrollbarTouch.ts,{table}/useSemanticClassNames.ts - responsive classNames scrollBarFoldMode
- 布局模式归一 - {table}/tableLayoutResolver.ts - resolveTableLayout mergedTableLayout
- ref 句柄 - {table}/buildTableRefHandle.ts - nativeElement scrollTo

## 引擎：网格与列树
- 引擎主编排 - {engine}/GridTable.tsx - virtualEnabled dg-grid grid-auto-flow
- 列树与列键 - {engine}/columnTree.ts,{engine}/columnKeys.ts - flattenHeaderCells markLastLeaves
- 网格轨道与高度 - {engine}/useGridLayout.ts,{engine}/gridTemplateColumnsUtils.ts,{engine}/headerHeightUtils.ts - grid-template-columns
- 引擎类型 - {engine}/types.ts,{engine}/engineTypes.ts,{engine}/engineTypes/*.ts - EngineColumnNode EngineHeaderCell

## 引擎：表头、表体、汇总、展开、树形
- 表头 - {engine}/HeaderGrid.tsx,{engine}/HeaderCell.tsx,{engine}/headerCellUtils.ts,{engine}/FlatColumnCells.tsx - ColumnResizer aria-sort data-leaf-index
- 表体 - {engine}/BodyGrid.tsx,{engine}/bodyCellUtils.ts,{engine}/cellRenderUtils.tsx,{engine}/cellMerge.ts - renderBodyCells computeCellMergePlan resolveCoveredTrackEnd rowLevels
- 汇总 - {engine}/Summary.tsx,{engine}/SummaryLayer.tsx - Summary.Row Summary.Cell
- 展开 - {engine}/useRowExpand.ts,{engine}/ExpandIcon.tsx,{engine}/expandLayoutUtils.ts,{engine}/expandLayerUtils.tsx - toggleExpand
- 树形 - {engine}/useTreeData.ts,{engine}/treeColumnUtils.ts,{engine}/treeIndentRenderer.tsx - flattenTree detectTreeData
- 行 hover - {engine}/hoverController.ts - hoveredRowIndex dg-row-hover
- 单元格取值 - {engine}/recordAccess.ts - getValueByDataIndex getRowKey

## 引擎：滚动与虚拟化
- 滚动容器路由 - {engine}/ScrollContainer.tsx,{engine}/gridScrollUtils.ts,{engine}/useScrollMode.ts,{engine}/useGridScrollSync.ts - scroll.x scroll.y sticky
- 滚动条 - {engine}/StickyScrollBar.tsx,{engine}/FloatingScrollBar.tsx,{engine}/floatingScrollBarUtils.ts - thumb
- 虚拟窗口 - {engine}/useVirtualList.ts,{engine}/virtualListUtils.ts - isScrolling scrollTo
- 行高实测与索引 - {engine}/useRowMeasurements.ts,{engine}/useRowHeightSystem.ts,{engine}/rowSizeSystem.ts,{engine}/AATree.ts,{engine}/binaryArraySearch.ts - data-known-size sizeTree offsetTree
- DOM 复用 - {engine}/RecyclingBodyGrid.tsx,{engine}/recyclingIdentity.ts,{engine}/recyclingCellTypes.ts - VirtualizationMode
- 表头行高偏移 - {engine}/useHeaderRowHeights.ts - sticky offset

## 引擎：交互状态机
- 排序 - {engine}/useSorter.ts,{engine}/sorterUtils.ts,{engine}/SortIndicator.tsx - collectSortStates nextSortDirection
- 筛选 - {engine}/useFilter.ts,{engine}/filterUtils.ts,{engine}/FilterDropdown.tsx,{engine}/FilterBuiltinPanel.tsx,{engine}/FilterSearchIcon.tsx,{engine}/filterDropdownUtils.ts - computeFilteredDataSource filterOnClose
- 选择 - {engine}/useRowSelection.ts,{engine}/SelectionInput.tsx,{engine}/selectionTreeConduction.ts - SELECTION_ALL conductTreeCheck
- 分页 - {engine}/usePagination.ts - slicePage normalizePlacement
- 拖拽排序 - {engine}/useRowDragSort.ts,{engine}/useColumnDragSort.ts,{engine}/dragSortUtils.ts,{engine}/columnDragSortUtils.ts,{engine}/useAutoScrollOnDrag.ts - hit-test data-row-index
- 列宽拖拽 - {engine}/useColumnResize.ts,{engine}/resizeColumnUtils.ts - resizedWidths
- 固定列偏移 - {engine}/useStickyColumns.ts - sticky offset

## 样式与主题
- 结构样式 - {style}/table.css - .dg-wrapper .dg-grid .dg-cell dg-sticky-shadow-*
- 令牌回退 - {style}/tokens.css - --ant-table-
- 样式注册 - {style}/registerStyles.ts - ensureDataGridStyles

## 文档站
- 文档页 - {src}/docs/pages/*.tsx - renderTableApi renderCompatMatrix 按 slug 惰性
- 文档注册与别名 - {src}/docs/docRegistry.tsx,{src}/docs/types.ts - docAliases lazyPage
- 页面共享件 - {src}/docs/components.tsx,{src}/docs/pages/shared.tsx,{src}/docs/glossary.ts - GLOSSARY shared
- API 数据 - {src}/docs/generated/api.json - api.json

## demo 与对照
- 对照框架 - {demos}/_compare/SplitDemo.tsx,{demos}/_compare/SplitDemoPreview.tsx,{demos}/_compare/DemoToolbar.tsx,{demos}/_compare/compare.css - minPaneWidth stickyMode
- 共享 demo 源码 - {demos}/_compare/*.shared.ts - dgSource antdSource
- demo 注册 - {demos}/registry.ts,{demos}/index.ts - category aliases navigate
- demo 文件 - {demos}/*.tsx - dg.tsx antd.tsx
- 全局虚拟化开关 - {demos}/VirtualizationContext.tsx - virtual

## live 编辑器
- 编辑器与兜底 - {live}/LiveEditor.tsx,{live}/LiveErrorBoundary.tsx - onApply
- 编译执行 - {live}/compile.ts,{live}/evalModule.ts - sucrase
- 作用域注入 - {live}/scope.ts - loadLiveScope resolveLiveScope scanLiveSpecifiers
- 注入白名单 - {live}/antdScope.ts,{live}/icons.ts - liveAntdScope liveIconScope
- 去注释 - {live}/stripComments.ts - stripComments

## 站点壳与页面
- 壳与 hash 路由 - {src}/App.tsx,{src}/main.tsx - useHashRoute
- 首页与源码视图 - {src}/HomePage.tsx,{src}/DemoHomePage.tsx,{src}/DocsPage.tsx,{src}/CodeView.tsx - HomePage DocsPage
- 主题 store 与编辑器 - {src}/theme/ThemeContext.tsx,{src}/ThemeEditorModal.tsx - themeMode
- 编辑器内核 - {src}/code/CodeMirrorEditor.tsx - EditorView oneDark
- 源码懒加载 - {src}/useDemoSource.ts,{src}/useSplitDemoSource.ts - useDemoSource useSplitDemoSource

## 测试
- 单元测试 - {tests}/table/** - vitest
- 契约测试 - {tests}/table/api/*.tsx,{tests}/table/style/*.ts - public-api styleSystemContract
- 站点与 live - {tests}/live-editable-docs.test.tsx,{tests}/api-json.test.ts,{tests}/live/stripComments.ts,{tests}/live/{scope-specifiers,antd-scope,icon-scope}.test.ts - api-json stripComments 白名单
- 主题 store 测试 - {tests}/theme/*.tsx - ThemeProvider themeMode
- 夹具 - {tests}/setup.ts - jest-dom cleanup
- e2e - {e2e}/*.spec.ts - playwright
- 测试配置 - vite.config.ts,playwright.config.ts - jsdom testDir webServer

## 构建与脚本
- 库构建与 TS 配置 - vite.lib.config.ts,tsconfig*.json - build:lib
- 站点构建 - index.html,{src}/index.css,vite.docs.{shared,config,single.config,cdn.config}.ts - dist-docs dist-docs-single dist-docs-cdn importmap
- 站点构建说明 - {docs}/architecture/docs-build.md - 三档构建 首屏体积
- API 抽取 - {scripts}/extract-api.mjs - api.json
- CSS 兼容门 - {scripts}/check-css-compat.mjs - doiuse
- 静态检查 - oxlintrc.json,.oxlintignore,doctor.config.ts - oxlint react-doctor
- 包元数据 - package.json,.npmrc,README.md - exports scripts peerDependencies

## 仓库文档
- 架构 - {docs}/architecture/*.md - overview rendering-model demo-site live-editor
- 决策 - {docs}/decisions/*.md - 0001-css-grid-table-architecture 0010-semantic-dom-limits
- 功能 - {docs}/features/*/*.md - columns layout scrolling interaction display styling api
- 参考 - {docs}/reference/*.md - compat-matrix public-api known-limitations deprecated-antd-members grid-options-namespace ag-grid-drag-candidates
- 贡献约定 - {docs}/contributing/*.md - documentation-style verification-guide
- 过程文档 - {docs}/tasks/*.md,{docs}/*.md,{docs}/*.txt,TASK_STATUS.md - TASK_STATUS goal refs
- 临时工作区 - tmp/{compat-diff.txt,docs-review-*.md} - compat-diff docs-review-*
- 反馈素材 - feedbacks/issues/*.md,feedbacks/discussions/*.md,feedbacks/assets/* - issue-15630 disc-29888