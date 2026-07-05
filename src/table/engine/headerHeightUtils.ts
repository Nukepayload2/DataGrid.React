/**
 * 表头占高数值化（虚拟滚动 contentOffset 用）。
 *
 * `showHeader` 时把 `headerHeight`（gridOptions.headerHeight，可能 number / 'NNpx' string / 'auto' 等）
 * 解析为纯数值，按 `maxDepth`（表头行数）相乘；非 px 字符串或缺省走 fallback 40（与默认行高一致）。
 *
 * 仅用于 useVirtualList 的 contentOffset 校正——表头实际高度由 grid-template-rows 的 headerTracks
 * 决定，此处只是给虚拟滚动一个数值化的 viewport 偏移近似，对最终视觉无影响。
 */
export function resolveHeaderContentOffset(
  showHeader: boolean,
  maxDepth: number,
  headerHeight: number | string | undefined,
): number {
  return showHeader
    ? maxDepth * (typeof headerHeight === 'number'
      ? headerHeight
      : typeof headerHeight === 'string' && /^[\d.]+px$/.test(headerHeight.trim())
        ? Number.parseFloat(headerHeight)
        : 40)
    : 0
}
