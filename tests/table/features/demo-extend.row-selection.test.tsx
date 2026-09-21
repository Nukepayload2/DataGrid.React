// demo 遍历层（弹窗展开）——类目「行选择」，7 个 demo。
//
// 抽片与命名同 demo-snapshot.row-selection.test.tsx（见 tests/shared/demoGroups.ts）。
// 覆盖：basic-row-selection / controlled-row-selection / custom-selection-menu / advanced-selection-column / basic-row-selection-mode / special-column-order / fixed-selection-column
//
// 行为：点击 demo 内全部 .dg-filter-trigger / .dg-selection-dropdown-trigger，
// 快照 portal 到 document.body 的弹窗层 + console warn/error 收集；无 trigger 的 demo 为 no-op（快照 []）。
// 弹窗快照的确定性处理（过渡态类归一 + 轮询等收敛）见 tests/shared/demoHarness.tsx。
import { describe } from 'vitest'

import { demosForCategory } from '../../shared/demoGroups'
import { extendDemos } from '../../shared/demoHarness'

describe('demo extend · 行选择', () => {
  extendDemos(demosForCategory('行选择'))
})