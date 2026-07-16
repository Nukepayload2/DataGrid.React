// react-doctor configuration — Stage 6 advisory mode.
//
// Goal (docs/engineering-refactor-plan.md §Stage 6): introduce react-doctor
// as a NON-BLOCKING diagnostic tool. It supplements tsc / Vite build /
// oxlint / Vitest; it does NOT replace them and MUST NOT break the existing
// gate. All findings are collected for task#29 evaluation + user sign-off
// before any rule is bumped to warn/error.
//
// Notes:
// - `blocking: "none"` makes the scan advisory (always exits 0).
// - `supplyChain.enabled: false` avoids per-dependency network calls during
//   the first assessment; can be re-enabled later.
// - `share: false` and the `--no-telemetry` CLI flag (in the `doctor` npm
//   script) keep the run fully local for the first report.
// - `verbose: false` keeps stdout focused; the full dump is written to
//   docs/react-doctor-report-stage6.{txt,json} via --output-dir / --json-out.
//
// Do NOT fix any finding based on this config alone — bumping severity is a
// separate, signed-off decision (task#29).
//
// === Stage 6 task#31 — C-class noise suppress (signed off) ===
// 以下规则在首份 206-finding 报告里贡献了大量 demo/infra 噪音，且经 task#29
// 评估 + 用户签批后判定为：在本项目语境下属于已知 trade-off 或 demo-only
// 允许项，不进入修复队列。这里关掉它们的扫描输出，避免淹没真正可修的 finding
// （A 类已在 task#31 单独修；B/D/E 类另行评估）。
//
// 关闭理由（按 rule）：
// - anchor-is-valid / click-events-have-key-events / no-static-element-interactions /
//   interactive-supports-focus / prefer-tag-over-role：demo 体系大量用 `<a>` 当
//   交互入口 + 自定义 div 承载交互；a11y 一致性是 demo portal 重构（M9+）的
//   独立工作项，不在 Stage 6 修复范围。
// - no-array-index-as-key：行号 / token 索引在静态展示（prism 高亮、列表）里
//   稳定，重构后无稳定性收益。
// - no-barrel-import：live editor 的 scope 必须走 barrel（`import * as React`
//   + antd barrel），关掉以匹配运行时模块解析方式。
// - require-pnpm-hardening：本仓最小 release-age 是手动评估的（M3+），本轮
//   不在配置层强制。
// - control-has-associated-label / no-outline-none：live editor 的 textarea/
//   透明输入层 + 高亮层是单渲染管线，a11y 标签由外层 LiveEditor 容器负责。

import { defineConfig } from "react-doctor/api";

export default defineConfig({
  blocking: "none",
  warnings: true,
  verbose: false,
  share: false,
  noScore: false,
  deadCode: true,
  lint: true,
  supplyChain: {
    enabled: false,
  },
  rules: {
    // === C 类噪音 suppress（task#31）===
    "react-doctor/anchor-is-valid": "off",
    "react-doctor/click-events-have-key-events": "off",
    "react-doctor/no-static-element-interactions": "off",
    "react-doctor/interactive-supports-focus": "off",
    "react-doctor/prefer-tag-over-role": "off",
    "react-doctor/no-array-index-as-key": "off",
    "react-doctor/no-barrel-import": "off",
    "react-doctor/require-pnpm-hardening": "off",
    "react-doctor/control-has-associated-label": "off",
    "react-doctor/no-outline-none": "off",
  },
});
