// axe-core 封装（黑盒层 a11y 断言）。
import axe from 'axe-core'
import { expect } from 'vitest'

/**
 * jsdom 环境不支持的规则，强制禁用（不是「假阳性豁免」，是 jsdom 无能力评估）：
 *
 * - `color-contrast`：需要把文本渲染到 canvas 后逐像素取色。jsdom 未装 canvas 包，
 *   `HTMLCanvasElement.getContext()` 抛 "Not implemented"，axe 退化为逐元素反复尝试
 *   （日志被 `Not implemented` 刷屏、CPU 持续增长），单个大表 demo 实测 >19 分钟未收敛
 *   （2026-09-21 首跑：axe fixed-header 1173991ms，同批其他 demo 仅数百 ms）。
 *   亮度/对比度属于视觉回归范畴，由 Phase 3 的 Playwright 截图回归承担，不在 jsdom 断言面。
 */
const JSDOM_UNSUPPORTED_RULES = ['color-contrast']

/**
 * 断言 container 无 axe 违规（失败信息带违规摘要）。
 *
 * 必须真 timers 运行——axe 内部依赖真实异步调度，fake timers 会卡死。
 * disabledRules：调用方追加的禁用规则，起始集对齐 antd 测试基线
 * （label / empty-table-header / nested-interactive / button-name）；
 * 与 JSDOM_UNSUPPORTED_RULES（jsdom 能力缺失，恒定禁用）合并生效。
 *
 * `resultTypes: ['violations']` 不是省事，是必须项：不传时 axe 会构建并返回全部
 * passes / incomplete / inapplicable 结果组。demo 遍历的扫描域可达 7000+ 节点
 * （对照 demo 含 data-grid 与 antd 两张 23 列宽表，实测 7438 节点），全结果组在此规模下
 * 不收敛（>10 分钟/单 demo 未返回）；只取 violations 后同一 demo 全规则 <20s。
 * 本层只断言「无违规」，其余结果组无人消费。
 */
export async function expectNoAxeViolations(
  container: HTMLElement,
  disabledRules: string[] = [],
): Promise<void> {
  const rules = [...disabledRules, ...JSDOM_UNSUPPORTED_RULES]
  const results = await axe.run(container, {
    rules: Object.fromEntries(rules.map((id) => [id, { enabled: false }])),
    resultTypes: ['violations'],
  })

  const summary = results.violations
    .map((violation) => `[${violation.id}] ${violation.help} (${violation.nodes.length} nodes)`)
    .join('; ')
  expect(results.violations, summary).toHaveLength(0)
}
