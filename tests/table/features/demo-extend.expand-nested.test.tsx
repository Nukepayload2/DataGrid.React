// demo 遍历层（弹窗展开）——类目「展开与嵌套」，3 个 demo。
//
// 抽片与命名同 demo-snapshot.expand-nested.test.tsx（见 tests/shared/demoGroups.ts）。
// 覆盖：expandable-rows / expand-column-position / nested-table
//
// 行为：点击 demo 内全部 .dg-filter-trigger / .dg-selection-dropdown-trigger，
// 快照 portal 到 document.body 的弹窗层 + console warn/error 收集；无 trigger 的 demo 为 no-op（快照 []）。
// 弹窗快照的确定性处理（过渡态类归一 + 轮询等收敛）见 tests/shared/demoHarness.tsx。
import { describe } from 'vitest'

import { demosForCategory } from '../../shared/demoGroups'
import { extendDemos } from '../../shared/demoHarness'

describe('demo extend · 展开与嵌套', () => {
  extendDemos(demosForCategory('展开与嵌套'))
})