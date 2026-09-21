// 黑盒 demo 遍历层（a11y），对齐 antd tests/shared/accessibilityTest.tsx 机制：
//   G:\Projects\ant-design\tests\shared\accessibilityTest.tsx
//   - antd accessibilityDemoTest：glob 组件 demo/*.tsx 逐个 axe.run + toHaveNoViolations，
//     支持 disabledRules（convertRulesToAxeFormat 转 axe rules 配置）；
//   - data-grid 版由 tests/shared/demoHarness.tsx 的 axeAll() 承担：逐 demo 渲染后
//     调 tests/shared/axe.ts 的 expectNoAxeViolations(container, disabledRules)。
//
// 起始禁用规则（jsdom 计算样式受限假阳性，对齐 antd 测试基线）：
//   label / empty-table-header / nested-interactive / button-name
//   ——已内置于 harness axeAll()（demoHarness.tsx disabledRules 常量），本文件无需传参。
// 另有恒定禁用规则 color-contrast（jsdom 无 canvas，axe 无法评估且会退化为超长挂起），
//   见 tests/shared/axe.ts 的 JSDOM_UNSUPPORTED_RULES 说明；视觉对比度交给 Phase 3 截图回归。
//
// 覆盖：axeAll() 遍历全部 demo；7 条按根因 skip，其余全部直测：
//   - dom-recycled-virtual-list-antd：纯 antd 对照 demo，无 .dg-* DOM，不属本层断言面（harness 默认 skip）。
//   - merged-cells / merged-expand-tree / expand-column-position / virtual-list / custom-selection-cell
//     / sorting-and-filtering：无 role 格子 div 上的 aria-colspan/aria-rowspan/aria-sort 违规，
//     根因与裁定见 demoHarness.tsx 的 A11Y_ROOT_CAUSE_SKIP 注释（结构级 ARIA 链缺失，非本次修复面）。
//
// triage 结果（2026-09-21 首跑，逐条取证后收敛）：
//   - 起始 4 条禁用规则（label/empty-table-header/nested-interactive/button-name）内置于 harness。
//   - 另恒定禁用 color-contrast：jsdom 无 canvas，见 tests/shared/axe.ts。
//   - 曾报的 aria-command-name（custom-filter-panel）已修：FilterDropdown 给自定义图标补
//     role="img" + aria-label 包裹（与 antd 图标同形），实测 clean。
//   - 曾报的 heading-order（semantic-dom-slots）已修：demo 内容 h5 → h4（跳级），配套 index.css 选择器。
//   - 剩余 6 条为上述架构边界，按裁定保留 skip + 依据。
// 未预判性整文件 skip 的依据：整文件 skip 会掩盖上述两条已修项的真实回归空间。
import { describe } from 'vitest'

import { axeAll } from '../../shared/demoHarness'

describe('demo a11y', () => {
  axeAll()
})
