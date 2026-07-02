# 0009 external grid borrowing policy

## Title

外部 grid 能力借鉴遵守许可边界、命名独立和范围收敛

## Status

Accepted

## Context

项目允许参考 ag-grid 等外部实现来补 data-grid 的专属增强，但这些系统的许可模型、命名体系和产品边界与 data-grid 不同，直接照搬会带来法律、维护和产品认知风险。

## Decision

- 借鉴先看“用户能感知到的行为”，不是先抄接口名。
- ag-grid community 可参考实现；enterprise 只研究行为，不抄代码。
- 借鉴范围按主题收敛，本阶段只聚焦拖拽相关能力。
- 最终 API 命名保持中性，并统一进入 `gridOptions` / `gridColumnOptions`。

## Consequences

- 借鉴工作需要同时记录来源、许可边界和 data-grid 自己的命名。
- 参考文档不仅是功能清单，也承担“为什么这样命名、为什么不直接照抄”的说明。
- 后续引入其它外部 grid 能力时，仍应套用同一套借鉴规则。

## Related docs

- [`../reference/ag-grid-drag-candidates.md`](../reference/ag-grid-drag-candidates.md)
- [`0008-api-namespace-separation.md`](0008-api-namespace-separation.md)
