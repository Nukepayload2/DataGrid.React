// demo 遍历层的按类目抽片（快照 / 弹窗展开用例的文件划分依据）。
//
// 为什么按类目抽片：遍历用例的断言对象是整表 DOM，一个改动常同时影响同类目的多个 demo。
// 抽片粒度决定定位成本——片 = 类目时，「哪些文件对比不过」直接等于「哪些类目的 demo 受影响」；
// 若把它们堆在一个文件里，定位时不得不读入大量无关 diff。
//
// 抽片键是 registry 的 `category`（与首页分组同一维度，单源）；slug 用于文件名（ASCII，便于 shell 操作）。
// 新增 demo 时必须同时在本表登记类目——`demosForCategory` 会拒绝未登记的类目并列出可用值，
// 避免新类目静默漏测。
import { demos } from '../../src/demos/index'
import type { DemoMeta } from '../../src/demos/registry'

/** registry 类目 → 文件名 slug（一类目一文件一 `.snap`）。 */
export const DEMO_CATEGORY_SLUGS: Record<string, string> = {
  基础: 'basic',
  列: 'columns',
  '多级表头与合并': 'grouped-header',
  '固定列与表头': 'fixed-header',
  '尺寸响应与样式': 'size-style',
  '排序与筛选': 'sort-filter',
  行选择: 'row-selection',
  拖拽排序: 'drag-sort',
  编辑: 'editing',
  '分页与远程': 'pagination-remote',
  树形数据: 'tree-data',
  '展开与嵌套': 'expand-nested',
  '虚拟与汇总': 'virtual-summary',
  细节兼容性: 'compat-details',
}

/** 取某类目的 demo 列表。类目未登记时抛错并列出可用值（防止新增类目静默漏测）。 */
export function demosForCategory(category: string): DemoMeta[] {
  if (!(category in DEMO_CATEGORY_SLUGS)) {
    throw new Error(
      `未登记的 demo 类目：${category}。请在 tests/shared/demoGroups.ts 的 DEMO_CATEGORY_SLUGS 中登记。` +
        `当前已登记：${Object.keys(DEMO_CATEGORY_SLUGS).join(' / ')}`,
    )
  }
  return demos.filter((demo) => demo.category === category)
}

/**
 * 抽片完整性自检：registry 里出现的每个类目都必须已登记，且每个片都非空。
 * 供用例调用（新 demo 引入新类目时直接失败，而不是悄悄不进任何片）。
 */
export function assertDemoCategoriesRegistered(): void {
  const unknown = [...new Set(demos.map((demo) => demo.category))].filter(
    (category) => !(category in DEMO_CATEGORY_SLUGS),
  )
  if (unknown.length > 0) {
    throw new Error(
      `registry 存在未登记的类目：${unknown.join(' / ')}。请在 DEMO_CATEGORY_SLUGS 中补齐。`,
    )
  }
  const empty = Object.keys(DEMO_CATEGORY_SLUGS).filter(
    (category) => demosForCategory(category).length === 0,
  )
  if (empty.length > 0) {
    throw new Error(`以下类目在 registry 中已无 demo，请从 DEMO_CATEGORY_SLUGS 移除：${empty.join(' / ')}`)
  }
}
