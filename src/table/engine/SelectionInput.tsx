/**
 * 行选择 UI 原子组件（M5）：checkbox / radio。
 *
 * 纯原生 HTML `<input type="checkbox|radio">`，**不依赖 antd**（data-grid 不引入 antd 本体）。
 * 视觉对齐 antd 6.4.4 默认主题（圆角方块/圆点 + 主色 #1677ff）。
 *
 * - `indeterminate`（半选）：HTML input 原生支持（DOM 属性，需 ref 设置；React 不直接支持 prop）。
 *   用 ref 在挂载/更新时同步 `el.indeterminate = props.indeterminate`。
 *
 * 组件无内部状态——完全受控（checked + onChange）；状态由 useRowSelection 状态机驱动。
 */

import { useEffect, useRef } from 'react'
import type { CSSProperties, ChangeEvent } from 'react'
import type { SelectionType } from './useRowSelection'

export interface SelectionInputProps {
  type: SelectionType
  checked: boolean
  indeterminate?: boolean
  disabled?: boolean
  name?: string
  /** aria-label（表头全选框为"全选"，表体框用 record name 等）。 */
  'aria-label'?: string
  onChange: (checked: boolean, event: ChangeEvent<HTMLInputElement>) => void
  style?: CSSProperties
}

/**
 * 选择框原子组件。
 * - type='checkbox'：方块，支持 indeterminate（半选）。
 * - type='radio'：圆点，无 indeterminate（HTML radio 无此概念）。
 */
export function SelectionInput(props: SelectionInputProps) {
  const {
    type,
    checked,
    indeterminate = false,
    disabled = false,
    name,
    'aria-label': ariaLabel,
    onChange,
    style,
  } = props

  // indeterminate 是 DOM 属性（非 React prop），用 ref 同步。
  const inputRef = useRef<HTMLInputElement | null>(null)
  useEffect(() => {
    if (inputRef.current && type === 'checkbox') {
      inputRef.current.indeterminate = indeterminate
    }
  }, [indeterminate, type])

  return (
    <input
      ref={inputRef}
      type={type === 'radio' ? 'radio' : 'checkbox'}
      className="dg-selection-input"
      checked={checked}
      disabled={disabled}
      name={name}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.checked, e)}
      // indeterminate 初始值（仅在挂载时生效一次；后续靠上面的 effect 同步）。
      // React 对 indeterminate 无原生支持；这里设 ref 后再由 effect 覆盖更稳。
      // 注：defaultValue/checked 只对受控 checked 生效；indeterminate 必须用 ref。
      style={style}
    />
  )
}
