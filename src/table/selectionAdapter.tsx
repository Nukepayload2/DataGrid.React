import type { ReactNode } from 'react'
import { Dropdown } from 'antd'
import { getRowKey } from './engine/GridTable'
import { SelectionInput } from './engine/SelectionInput'
import {
  type SelectionItem,
  SELECTION_ALL,
  SELECTION_INVERT,
  SELECTION_NONE,
  type UseRowSelectionResult,
} from './engine/useRowSelection'
import type { EngineColumnNode } from './engine/types'
import { normalizeFixed } from './columnAdapter'
import type {
  GridSelectionValue,
  RowSelectMethod,
  SelectionRenderCellResult,
  TableLocale,
  TableRowSelection,
} from './types'

export type SelectionChangeTrigger<RecordType> =
  | {
      record?: RecordType
      nativeEvent?: Event
    }
  | undefined

export function toSelectionValues(
  values: ReadonlyArray<GridSelectionValue> | undefined,
): Array<GridSelectionValue> {
  return values ? Array.from(values) : []
}

export function getRangeKeys(
  keys: Array<React.Key>,
  anchorKey: React.Key,
  currentKey: React.Key,
): Array<React.Key> {
  const start = keys.indexOf(anchorKey)
  const end = keys.indexOf(currentKey)
  if (start < 0 || end < 0) return [currentKey]
  const from = Math.min(start, end)
  const to = Math.max(start, end)
  return keys.slice(from, to + 1)
}

export function shouldSkipRowSelectionClick(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return !!target.closest(
    [
      'a',
      'button',
      'input',
      'label',
      'select',
      'textarea',
      '[role="button"]',
      '[role="checkbox"]',
      '[role="radio"]',
      '.dg-selection-input',
      '.dg-selection-dropdown-trigger',
      '.dg-expand-icon',
      '.dg-drag-handle',
      '[aria-label="drag handle"]',
    ].join(','),
  )
}

/** 选择列稳定 key（用作引擎列 key 与 React key）。 */
export const SELECTION_COLUMN_KEY = '__dg_selection__'

/**
 * 表头 selections 下拉（用 antd `<Dropdown>` + `<Menu>`，对齐 antd `DownOutlined`）。
 *
 * - 触发器：自绘 caret-down SVG（与既有自绘图标约定一致，避免直接 import @ant-design/icons）。
 *   视觉对齐 antd `DownOutlined`（antd 选择列表头的下拉箭头）。
 * - 菜单项：列 selections 的 `text`；点击 → `onSelect(item)`（由 `buildSelectionColumnNode`
 *   转发到 `selection.applySelection`）。
 * - `onSelect` 签名 void（对齐 antd `SelectionItemSelectFn`）。
 *
 * 详见 `docs/design-notes/selection.md`。
 */
function SelectionsDropdown({
  selections,
  onSelect,
}: {
  selections: Array<SelectionItem>
  onSelect: (item: SelectionItem) => void
}) {
  const menuItems = selections.map((item, index) => ({
    key: item.key ?? index,
    label: item.text ?? item.key,
    onClick: () => onSelect(item),
  }))
  return (
    <Dropdown menu={{ items: menuItems }} trigger={['click']}>
      <span
        className="dg-selection-dropdown-trigger"
        role="button"
        aria-label="selections"
      >
        {/* caret-down SVG（自绘，视觉对齐 antd DownOutlined）。尺寸 12×12 对齐 antd
            selection.ts:88 `fontSize: fontSizeIcon`（=12px）。详见 design-notes/selection.md。 */}
        <svg
          width="12"
          height="12"
          viewBox="0 0 1024 1024"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M884 256h-75c-5.1 0-9.9 2.5-12.9 6.6L512 654.2 227.9 262.6c-3-4.1-7.8-6.6-12.9-6.6h-75c-6.5 0-10.3 7.4-6.5 12.6l352.6 486.1c12.8 17.6 39 17.6 51.7 0l352.6-486.1c3.9-5.2.1-12.6-6.4-12.6z" />
        </svg>
      </span>
    </Dropdown>
  )
}

/**
 * 构造选择列叶子节点。
 *
 * 把选择列封装为一个普通 `EngineColumnNode`（无 children → 叶子），引擎无需感知"选择"语义，
 * 与多级表头 / 固定列 / 合并 / 虚拟滚动透明组合：
 *   - 列宽走 `rowSelection.columnWidth`（缺省 32px，对齐 antd 默认 `tableSelectionColumnWidth`）。
 *   - `fixed` 由 rowSelection.fixed 指定（与 sticky 完全一致；常用于 'start'）。
 *   - `align` 默认 'center'（与 antd 一致：勾选格居中）。
 *   - `title`：表头格内容。
 *       * checkbox：渲染全选 SelectionInput（indeterminate = selection.intermediate）。
 *         hideSelectAll=true 或 radio 模式 → 空。
 *       * radio：空（antd 行为：radio 表头无全选）。
 *   - `render(text, record, index)`：表体格内容——每行 SelectionInput。
 *       * checked = selection.isSelected(key)；disabled = getCheckboxProps().disabled。
 *       * onChange：调 selection.toggleRow(key) → fireSelectionChange(nextKeys, method)。
 *
 * 因为节点无 children 且 align/width/fixed 仅依赖 rowSel 配置，每次切换勾选时虽然 selection
 * 引用变化导致 useMemo 重建 columnTree，但列布局（宽/位置/固定）不变——引擎 resolveColumnTree
 * 重算 O(cols)，sticky/cellMerge 重算，对典型表格可接受（与 antd rc-table 重渲染量级一致）。
 *
 * 详见 `docs/design-notes/selection.md`。
 */
export function buildSelectionColumnNode<RecordType>(
  rowSel: TableRowSelection<RecordType>,
  selection: UseRowSelectionResult<RecordType>,
  fireSelectionChange: (
    nextKeys: Array<React.Key>,
    method: RowSelectMethod,
    trigger?: SelectionChangeTrigger<RecordType>,
  ) => void,
  rowKeyResolved: string | ((record: RecordType) => string | number),
  locale: TableLocale,
  selectionAnchorKey: React.Key | null = null,
  setSelectionAnchorKey: (k: React.Key | null) => void = () => {},
): EngineColumnNode<RecordType> {
  const {
    columnWidth,
    fixed,
    hideSelectAll = false,
    align = 'center',
    renderCell,
    columnTitle,
    onCell: rowSelectionOnCell,
    getTitleCheckboxProps,
  } = rowSel
  const isRadio = selection.isRadio
  const type: 'checkbox' | 'radio' = isRadio ? 'radio' : 'checkbox'
  // 列宽默认：antd 选择列默认宽度 32px（token tableSelectionColumnWidth）。
  // 用户传 columnWidth 时覆盖；未传则用 32px（对齐 antd 默认视觉）。
  const width = columnWidth ?? 32

  // 表头下拉箭头（仅当 resolvedSelections 非空 + 非 radio + 非 hideSelectAll 时渲染）。
  // 对齐 antd `${prefixCls}-selection-extra`：表头全选 checkbox 旁的小下拉，点击弹出 selections 菜单。
  const resolvedSelections = selection.resolvedSelections?.map((item) => {
    if (item.key === SELECTION_ALL.key) {
      return { ...item, text: locale.selectionAll ?? item.text }
    }
    if (item.key === SELECTION_INVERT.key) {
      return { ...item, text: locale.selectInvert ?? item.text }
    }
    if (item.key === SELECTION_NONE.key) {
      return { ...item, text: locale.selectNone ?? item.text }
    }
    return item
  })
  const showSelectionDropdown =
    !isRadio && !hideSelectAll && resolvedSelections && resolvedSelections.length > 0

  // 表头格内容。
  const headerContent: ReactNode = (() => {
    const wrapColumnTitle = (checkboxNode: ReactNode) => {
      if (typeof columnTitle === 'function') return columnTitle(checkboxNode)
      if (columnTitle !== undefined) return columnTitle
      return checkboxNode
    }
    if (isRadio) return wrapColumnTitle(null) // radio 无全选
    if (hideSelectAll) return wrapColumnTitle(null)
    let titleCheckboxProps: ReturnType<NonNullable<typeof getTitleCheckboxProps>>
    try {
      titleCheckboxProps = getTitleCheckboxProps?.()
    } catch {
      titleCheckboxProps = undefined
    }
    const titleCheckboxAriaLabel =
      titleCheckboxProps?.['aria-label'] ??
      titleCheckboxProps?.ariaLabel ??
      (typeof locale.selectionAll === 'string' ? locale.selectionAll : 'Select all')
    const checkbox = (
      <SelectionInput
        type="checkbox"
        checked={selection.allSelected}
        indeterminate={titleCheckboxProps?.indeterminate ?? selection.intermediate}
        disabled={titleCheckboxProps?.disabled}
        name={titleCheckboxProps?.name}
        aria-label={titleCheckboxAriaLabel}
        style={titleCheckboxProps?.style}
        onChange={() => {
          if (titleCheckboxProps?.disabled) return
          const next = selection.toggleAll()
          const method: RowSelectMethod = selection.allSelected ? 'none' : 'all'
          fireSelectionChange(next, method)
        }}
      />
    )
    const checkboxWithDropdown = showSelectionDropdown ? (
      <div className="dg-selection-header" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {checkbox}
        <SelectionsDropdown
          selections={resolvedSelections}
          onSelect={(item) => {
            const result = selection.applySelection(item)
            if (result) {
              fireSelectionChange(result.nextKeys, result.method)
            }
            // 自定义项（result===null）：onSelect 内部已调用 item.onSelect(changeableRowKeys)，
            // demo 自行 setState（受控回填）——引擎无需动作（对齐 antd）。
          }}
        />
      </div>
    ) : checkbox
    return wrapColumnTitle(checkboxWithDropdown)
  })()

  return {
    key: SELECTION_COLUMN_KEY,
    title: headerContent,
    align,
    fixed: normalizeFixed(fixed),
    // 叶子列属性：width/render。dataIndex 不设（选择列不取数据字段）。
    width,
    // rowSelection.renderCell：自定义勾选格内容（替代默认 SelectionInput）。
    // 接入 cellMerge：onCell 调 renderCell 提取 props.rowSpan/colSpan，返回给 cellMerge
    //   计算合并（被覆盖格 hidden 不渲染）。render 与 onCell 各调一次 renderCell（demo 的
    //   renderCell 须为纯函数，与 antd rc-table 一致）。
    onCell: renderCell || rowSelectionOnCell
      ? (record: RecordType, index: number) => {
          let baseProps: Record<string, any> | undefined
          try {
            baseProps = rowSelectionOnCell?.(record, index)
          } catch {
            baseProps = undefined
          }
          if (!renderCell) return baseProps
          const key = getRowKey(record, rowKeyResolved)
          if (key === undefined) return baseProps
          const checked = selection.isSelected(key)
          const node = buildDefaultSelectionInput(
            type,
            record,
            key,
            checked,
            selection,
            rowSel,
            fireSelectionChange,
            rowKeyResolved,
            selectionAnchorKey,
            setSelectionAnchorKey,
          )
          let result: SelectionRenderCellResult
          try {
            result = renderCell(checked, record, index, node)
          } catch {
            return baseProps
          }
          // ReactNode 形态：无 props 合并。
          if (result === null || typeof result !== 'object' || Array.isArray(result) || !('props' in result)) {
            return baseProps
          }
          // 对象形态：透传 props（含 rowSpan/colSpan，由 cellMerge 消费）。
          return {
            ...(baseProps ?? null),
            ...((result as { props?: Record<string, any> }).props ?? null),
          }
        }
      : undefined,
    render: (_text: any, record: RecordType, index: number) => {
      const key = getRowKey(record, rowKeyResolved)
      const disabled = selection.isDisabled(record)
      const checked = key !== undefined && selection.isSelected(key)
      // 树形父子联动：父行半选态（checkStrictly=false + 部分子选中）。
      const indeterminate = key !== undefined && selection.isIndeterminate(key)
      const name = rowSel.getCheckboxProps?.(record)?.name
      // renderCell 存在时用其返回值的 children（或 ReactNode）替代默认 SelectionInput。
      if (renderCell) {
        const node = (
          <SelectionInput
            type={type}
            checked={checked}
            indeterminate={indeterminate}
            disabled={disabled}
            name={name}
            aria-label={typeof name === 'string' && name ? name : undefined}
            onChange={(_checked, event) => {
              if (disabled || key === undefined) return
              const nativeEvent = event.nativeEvent ?? event
              const shiftKey = 'shiftKey' in nativeEvent && nativeEvent.shiftKey === true
              const useRange = type === 'checkbox' && shiftKey && selectionAnchorKey !== null
              const next = useRange
                ? resolveSelectionRangeKeys(
                    selection,
                    selectionAnchorKey,
                    key,
                    _checked,
                  )
                : selection.toggleRow(key)
              setSelectionAnchorKey(key)
              fireSelectionChange(next, useRange ? 'multiple' : 'single', {
                record,
                nativeEvent,
              })
            }}
          />
        )
        let result: SelectionRenderCellResult
        try {
          result = renderCell(checked, record, index, node)
        } catch {
          return node
        }
        // ReactNode 形态：直接返回。
        if (
          result === null ||
          typeof result !== 'object' ||
          Array.isArray(result) ||
          !('props' in result)
        ) {
          return result as ReactNode
        }
        // 对象形态：返回 children（默认 node 若 children 未提供）。
        return (result as { children?: ReactNode }).children ?? node
      }
      return (
        <SelectionInput
          type={type}
          checked={checked}
          indeterminate={indeterminate}
          disabled={disabled || key === undefined}
          name={name}
          aria-label={typeof name === 'string' && name ? name : undefined}
          onChange={(_checked, event) => {
            if (disabled || key === undefined) return
            const nativeEvent = event.nativeEvent ?? event
            const shiftKey = 'shiftKey' in nativeEvent && nativeEvent.shiftKey === true
            const useRange = type === 'checkbox' && shiftKey && selectionAnchorKey !== null
            const next = useRange
              ? resolveSelectionRangeKeys(
                  selection,
                  selectionAnchorKey,
                  key,
                  _checked,
                )
              : selection.toggleRow(key)
            setSelectionAnchorKey(key)
            fireSelectionChange(next, useRange ? 'multiple' : 'single', {
              record,
              nativeEvent,
            })
          }}
        />
      )
    },
  }
}

/**
 * 构造默认 `<SelectionInput>`（作为 renderCell 的 `node` 参数透传给用户）。
 * 与 buildSelectionColumnNode 内 render 默认分支同款 props，抽函数避免 renderCell 路径重复。
 */
function buildDefaultSelectionInput<RecordType>(
  type: 'checkbox' | 'radio',
  record: RecordType,
  key: React.Key,
  checked: boolean,
  selection: UseRowSelectionResult<RecordType>,
  rowSel: TableRowSelection<RecordType>,
  fireSelectionChange: (
    nextKeys: Array<React.Key>,
    method: RowSelectMethod,
    trigger?: SelectionChangeTrigger<RecordType>,
  ) => void,
  _rowKeyResolved: string | ((record: RecordType) => string | number),
  selectionAnchorKey: React.Key | null,
  setSelectionAnchorKey: (k: React.Key | null) => void,
) {
  const disabled = selection.isDisabled(record)
  const indeterminate = selection.isIndeterminate(key)
  const name = rowSel.getCheckboxProps?.(record)?.name
  return (
    <SelectionInput
      type={type}
      checked={checked}
      indeterminate={indeterminate}
      disabled={disabled}
      name={name}
      aria-label={typeof name === 'string' && name ? name : undefined}
      onChange={(_checked, event) => {
        if (disabled) return
        const nativeEvent = event.nativeEvent ?? event
        const shiftKey = 'shiftKey' in nativeEvent && nativeEvent.shiftKey === true
        const useRange = type === 'checkbox' && shiftKey && selectionAnchorKey !== null
        const next = useRange
          ? resolveSelectionRangeKeys(
              selection,
              selectionAnchorKey,
              key,
              _checked,
            )
          : selection.toggleRow(key)
        setSelectionAnchorKey(key)
        fireSelectionChange(next, useRange ? 'multiple' : 'single', {
          record,
          nativeEvent,
        })
      }}
    />
  )
}

function resolveSelectionRangeKeys<RecordType>(
  selection: UseRowSelectionResult<RecordType>,
  anchorKey: React.Key,
  currentKey: React.Key,
  selected: boolean,
): Array<React.Key> {
  const rangeKeys = getRangeKeys(selection.selectableKeys, anchorKey, currentKey)
  const currentKeys = Array.from(selection.selectedKeySet)
  if (selected) {
    return Array.from(new Set<React.Key>([...currentKeys, ...rangeKeys]))
  }
  const rangeKeySet = new Set<React.Key>(rangeKeys)
  return currentKeys.filter((key) => !rangeKeySet.has(key))
}
