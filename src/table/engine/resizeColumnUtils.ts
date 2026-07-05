import type { EngineLeafColumn } from './types'

type ResizeLeafColumn = Pick<EngineLeafColumn, 'key' | 'hidden'>

export function buildVisibleLeafKeys(
  leafColumns: ReadonlyArray<ResizeLeafColumn>,
): Array<string> {
  return leafColumns.filter((col) => !col.hidden).map((col) => col.key)
}

export function buildResizeSiblingByKey(
  leafColumns: ReadonlyArray<ResizeLeafColumn>,
): Map<string, string> {
  const visibleLeafKeys = buildVisibleLeafKeys(leafColumns)
  const map = new Map<string, string>()

  visibleLeafKeys.forEach((key, index) => {
    const nextKey = visibleLeafKeys[index + 1]
    if (nextKey !== undefined) map.set(key, nextKey)
  })

  return map
}
