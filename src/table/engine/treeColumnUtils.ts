import type { EngineLeafColumn } from './types'

/**
 * 计算树形模式下"第一个数据列"的叶子索引（渲染缩进 + 展开图标的目标列）。
 *
 * 对齐 antd `expandIconColumnIndex`（nest 模式默认：有 rowSelection → 1，否则 → 0；
 * 但数据列在哨兵之后）。data-grid 用"第一个含 dataIndex 的叶子列"判定——哨兵列
 * （SELECTION / EXPAND）无 dataIndex，因此天然被跳过。
 *
 * 注意：判定用 `!== undefined`，**不是** truthy——`dataIndex: 0` 是合法值，必须保留。
 *
 * @returns 首个含 dataIndex 的叶子列索引；非树形模式恒为 -1；树形模式下若所有列
 *          都无 dataIndex（罕见），退化为 0。
 */
export function computeTreeFirstDataColumnIdx(
  treeEnabled: boolean,
  leafColumns: EngineLeafColumn[],
): number {
  if (!treeEnabled) return -1
  for (let i = 0; i < leafColumns.length; i += 1) {
    if (leafColumns[i].dataIndex !== undefined) return i
  }
  // 全部列无 dataIndex（罕见）→ 退化为 0。
  return 0
}
