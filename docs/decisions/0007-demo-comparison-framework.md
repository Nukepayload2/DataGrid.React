# 0007 demo comparison framework

## Title

demo 站点以 data-grid vs antd 双栏对照作为主验证框架

## Status

Accepted

## Context

项目的很多问题只有在“同数据、同配置、同主题、同交互”的并排对照里才容易暴露。单独看 data-grid 页面，很难及时发现行为和视觉上的漂移。

## Decision

- compare demo 默认采用左右双栏: 左 data-grid，右 antd。
- 版式切换使用纯 CSS `flex-wrap + minPaneWidth`，由每个 demo 按表格宽度自行设阈值。
- 共享运行时包括主题切换、可选虚拟化、mock ajax 数据和说明区。

## Consequences

- 新功能落地后有稳定的对照壳层可复用。
- demo 站点本身成为架构和验证文档的一部分。
- 某些 demo 需要为了对照而保留局部受控状态或共享工具栏，这些属于站点策略，不应混进核心 API 文档。

## Related docs

- [`../architecture/demo-site.md`](../architecture/demo-site.md)
- [`../contributing/verification-guide.md`](../contributing/verification-guide.md)
