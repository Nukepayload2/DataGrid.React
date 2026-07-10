import { useEffect, useMemo, useRef } from 'react'
import type { EngineLeafColumn } from './types'
import type {
  GridCellElementRenderParams,
  GridColumnOptions,
} from './recyclingCellTypes'

type ColumnIdentity = string | EngineLeafColumn<any>

interface PoolBucket<RecordType> {
  elements: Array<HTMLElement>
  options: GridColumnOptions<RecordType> | undefined
}

export interface CellElementPool<RecordType> {
  acquire: (column: EngineLeafColumn<RecordType>) => HTMLElement | undefined
  release: (
    column: EngineLeafColumn<RecordType>,
    element: HTMLElement,
    params: GridCellElementRenderParams<RecordType> | undefined,
  ) => void
}

function columnIdentity<RecordType>(
  column: EngineLeafColumn<RecordType>,
): ColumnIdentity {
  return column.key || column
}

function sameOptions<RecordType>(
  a: GridColumnOptions<RecordType> | undefined,
  b: GridColumnOptions<RecordType> | undefined,
): boolean {
  return (
    a?.renderCellElement === b?.renderCellElement &&
    a?.renderCellReact === b?.renderCellReact &&
    a?.disposeCellElement === b?.disposeCellElement
  )
}

export function useCellElementPool<RecordType>({
  columns,
  maxPoolSize,
}: {
  columns: Array<EngineLeafColumn<RecordType>>
  maxPoolSize: number
}): CellElementPool<RecordType> {
  const bucketsRef = useRef(new Map<ColumnIdentity, PoolBucket<RecordType>>())
  const maxPoolSizeRef = useRef(maxPoolSize)
  maxPoolSizeRef.current = maxPoolSize

  const clearBucket = (
    bucket: PoolBucket<RecordType>,
    reason: 'discard' | 'unmount',
  ) => {
    for (const element of bucket.elements.splice(0)) {
      bucket.options?.disposeCellElement?.(element, reason, undefined)
    }
  }

  const getBucket = (column: EngineLeafColumn<RecordType>) => {
    const identity = columnIdentity(column)
    const options = column.gridColumnOptions
    const existing = bucketsRef.current.get(identity)
    if (existing) {
      if (!sameOptions(existing.options, options)) {
        clearBucket(existing, 'unmount')
        existing.options = options
      }
      return existing
    }
    const bucket: PoolBucket<RecordType> = {
      elements: [],
      options,
    }
    bucketsRef.current.set(identity, bucket)
    return bucket
  }

  useEffect(() => {
    const live = new Map<ColumnIdentity, GridColumnOptions<RecordType> | undefined>()
    for (const column of columns) {
      live.set(columnIdentity(column), column.gridColumnOptions)
    }
    for (const [identity, bucket] of bucketsRef.current) {
      const options = live.get(identity)
      if (!live.has(identity) || !sameOptions(bucket.options, options)) {
        clearBucket(bucket, 'unmount')
        bucketsRef.current.delete(identity)
      }
    }
  }, [columns])

  useEffect(() => () => {
    for (const bucket of bucketsRef.current.values()) {
      clearBucket(bucket, 'unmount')
    }
    bucketsRef.current.clear()
  }, [])

  return useMemo(
    () => ({
      acquire: (column) => getBucket(column).elements.pop(),
      release: (column, element, params) => {
        const bucket = getBucket(column)
        bucket.options?.disposeCellElement?.(element, 'recycle', params)
        if (bucket.elements.length >= maxPoolSizeRef.current) {
          bucket.options?.disposeCellElement?.(element, 'discard', params)
          return
        }
        bucket.elements.push(element)
      },
    }),
    [],
  )
}

export function defaultRenderCellElement<RecordType>(
  params: GridCellElementRenderParams<RecordType>,
  oldElement: HTMLElement | undefined,
): HTMLElement {
  const element = oldElement ?? document.createElement('span')
  element.textContent =
    params.value === null || params.value === undefined
      ? ''
      : String(params.value)
  return element
}
