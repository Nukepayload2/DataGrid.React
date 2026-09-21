// demo 遍历层（弹窗展开）——类目「尺寸响应与样式」，7 个 demo。
//
// 抽片与命名同 demo-snapshot.size-style.test.tsx（见 tests/shared/demoGroups.ts）。
// 覆盖：bordered-table / table-size / narrow-container-table / responsive-columns / semantic-styling / component-theme-tokens / dynamic-table-settings
//
// 行为：点击 demo 内全部 .dg-filter-trigger / .dg-selection-dropdown-trigger，
// 快照 portal 到 document.body 的弹窗层 + console warn/error 收集；无 trigger 的 demo 为 no-op（快照 []）。
// 弹窗快照的确定性处理（过渡态类归一 + 轮询等收敛）见 tests/shared/demoHarness.tsx。
import { describe } from 'vitest'

import { demosForCategory } from '../../shared/demoGroups'
import { extendDemos } from '../../shared/demoHarness'

describe('demo extend · 尺寸响应与样式', () => {
  extendDemos(demosForCategory('尺寸响应与样式'))
})