# 0004 antd v6 token strategy

## Title

主题兼容以 antd v6 真实 token 和 CSS variables 为准

## Status

Accepted

## Context

项目要让 data-grid 在 ConfigProvider、暗色算法和 `components.Table` 覆盖下尽量复刻 antd v6 外观。仅靠手写样式常量很快会与 antd 实际变量名和派生逻辑脱节。

## Decision

- 主题桥接基于 antd v6 的真实 token 和 CSS variables。
- 不确定的变量名和字段以运行中的 antd 6.4.4 实测结果为准，不凭印象命名。
- `.dg-wrapper` 既保留 fallback 变量，也接受来自 ThemeProvider 的运行时覆盖。

## Consequences

- data-grid 能直接消费 antd 的 light/dark algorithm 和 Table component tokens。
- 需要单独维护 token 桥接文档与 theme editor 说明。
- 某些 antd 全局 reset 行为需要在 `table.css` 中显式补齐，例如链接色、字号和行高。

## Related docs

- [`../features/styling/theme-tokens.md`](../features/styling/theme-tokens.md)
- [`../architecture/demo-site.md`](../architecture/demo-site.md)
