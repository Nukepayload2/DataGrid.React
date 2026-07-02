# Demo 站点

demo 站点不是任务过程产物，而是 data-grid 的长期验证面。

## 站点职责

- 首页、分类和 hash 路由都由 demo 注册表驱动。
- 对比型 demo 统一使用左右双栏: 左侧 data-grid，右侧 antd 官方同名或等价示例。
- 说明区只保留“这个功能在比较什么”，不再把迁移批次或会话日志放回源码。

## 对照框架

- `SplitDemo` 负责布局、标题、说明区和深浅色外壳样式。
- 横竖排切换使用 `flex-wrap + minPaneWidth`，让不同宽度的表格拥有各自阈值。
- `stickyMode` 和 `virtualizable` 作为对照框架级能力，而不是每个 demo 各自发明布局规则。

## 共享运行时

- `VirtualizationContext` 只管理 demo 层的“全局虚拟化开关”，不属于表格引擎 API。
- 主题编辑入口在站点顶栏；`theme-editor` 面板负责同时驱动 data-grid 和 antd 预览。
- `ajax` 相关对照使用本地 mock 数据和共享查询逻辑，避免把外部网络依赖引入验证链路。

## 重要 demo 族

- 主题与门户: `basic`, `dynamic-settings`, `component-token`, `theme-editor`
- 对照框架与共享配置: `_compare/*`, `index.ts`, `registry.ts`
- 虚拟化与滚动: `virtual-list`, `sticky`, `fixed-*`

## 相关文档

- 对照框架决策: [`../decisions/0007-demo-comparison-framework.md`](../decisions/0007-demo-comparison-framework.md)
- 主题与站点入口: [`../features/styling/theme-tokens.md`](../features/styling/theme-tokens.md)
- 分页和 mock 数据: [`../features/interaction/pagination-and-data.md`](../features/interaction/pagination-and-data.md)
