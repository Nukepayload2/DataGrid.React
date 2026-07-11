import type { EngineLeafColumn } from './types'

type ResizeLeafColumn = Pick<EngineLeafColumn, 'key' | 'hidden'>

export type ColumnResizeMode = 'Disabled' | 'ResizeLeft' | 'ResizeSibling'

export interface ComputeColumnResizeOptions {
  mode: ColumnResizeMode
  delta: number
  startWidth: number
  minWidth: number
  maxWidth: number
  siblingStartWidth?: number
  siblingMinWidth?: number
  siblingMaxWidth?: number
}

export interface ComputedColumnResize {
  width: number
  siblingWidth?: number
}

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

export function clampWidth(width: number, minWidth: number, maxWidth: number): number {
  return Math.min(Math.max(width, minWidth), maxWidth)
}

export function computeColumnResize(
  options: ComputeColumnResizeOptions,
): ComputedColumnResize {
  const {
    mode,
    delta,
    startWidth,
    minWidth,
    maxWidth,
    siblingStartWidth,
    siblingMinWidth,
    siblingMaxWidth,
  } = options

  if (
    mode === 'ResizeSibling' &&
    siblingStartWidth !== undefined &&
    siblingMinWidth !== undefined &&
    siblingMaxWidth !== undefined
  ) {
    const minDelta = Math.max(
      minWidth - startWidth,
      siblingStartWidth - siblingMaxWidth,
    )
    const maxDelta = Math.min(
      maxWidth - startWidth,
      siblingStartWidth - siblingMinWidth,
    )
    const boundedDelta = Math.min(Math.max(delta, minDelta), maxDelta)
    return {
      width: startWidth + boundedDelta,
      siblingWidth: siblingStartWidth - boundedDelta,
    }
  }

  return {
    width: clampWidth(startWidth + delta, minWidth, maxWidth),
  }
}
