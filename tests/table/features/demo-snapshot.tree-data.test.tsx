// demo 遍历层（快照基线）——类目「树形数据」，3 个 demo。
//
// 本文件由 registry 的 category 抽片（见 tests/shared/demoGroups.ts 的 DEMO_CATEGORY_SLUGS）。
// 抽片粒度 = 类目：一个改动影响哪几个类目的 demo，就恰好哪几个文件对比不过，
// 失败文件清单本身就是定位信息（同类目内 demo 相互之间最像，回归通常成组出现）。
//
// 覆盖：tree-data / preserved-tree-selection / tree-table-ellipsis
//
// 快照文本经 normalizeSnapshotHtml 归一（删同渲染内重复的 CSS 变量声明 + 剥离 rc-motion 过渡态类），
// 归一化理由与判据见 tests/shared/demoHarness.tsx；快照首跑生成，不手写。
// compare demo 只快照左栏 data-grid 子树（右栏 antd 对照表不属本层断言面）。
import { describe } from 'vitest'

import { demosForCategory } from '../../shared/demoGroups'
import { snapshotDemos } from '../../shared/demoHarness'

describe('demo snapshot · 树形数据', () => {
  snapshotDemos(demosForCategory('树形数据'))
})