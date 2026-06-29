/**
 * 行选择 UI 原子组件：checkbox / radio。
 *
 * 内部渲染 antd 原生 `<Checkbox>` / `<Radio>`（外观由 antd 主题接管）：
 *   - indeterminate（半选）：antd Checkbox 原生支持 prop。
 *   - radio 模式消费 antd `.ant-radio` DOM（外圈 + 中心白点）。
 *
 * 对外 API 保持不变：checked/indeterminate/disabled/name/aria-label/onChange(checked,event)/style 全部透传；
 * 内部把 antd onChange 的 `e.target.checked` 映射为 `onChange(checked, e)`。
 *
 * 完全受控（checked + onChange）；状态由 useRowSelection 状态机驱动。
 * 详见 [docs/design-notes/selection.md](../../../docs/design-notes/selection.md)。
 */

import type { CSSProperties, ChangeEvent } from 'react'
import { Checkbox, Radio } from 'antd'
import type { CheckboxChangeEvent } from 'antd/es/checkbox'
import type { RadioChangeEvent } from 'antd/es/radio'
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
 * - type='checkbox'：antd `<Checkbox>`（支持 indeterminate 半选 prop）。
 * - type='radio'：antd `<Radio>`（中心白点视觉）。
 *
 * antd Checkbox/Radio onChange 签名为 `(e: CheckboxChangeEvent) => void`，
 * 其中 `e.target.checked` 即勾选态、`e.nativeEvent` 指向原生 input ChangeEvent。
 * 这里桥接为 `onChange(checked, event)` 签名（保持调用方 API 不破）。
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

  // antd Checkbox 的 CheckboxChangeEvent / Radio 的 RadioChangeEvent 都有 `target.checked`
  // + `nativeEvent`。桥接为外部 `onChange(checked, event)` 签名（调用方依赖 checked）。
  // 注：antd 6 的 nativeEvent 类型是 MouseEvent（rc-checkbox 内部把 click 当 change 派发），
  // 与外部声明的 ChangeEvent<HTMLInputElement> 不直接兼容；调用方实际不消费 event 字段，
  // 用 `as unknown as` 双重断言安全通过（运行时 event 对象本身不影响调用方逻辑）。
  const handleCheckboxChange = (e: CheckboxChangeEvent) => {
    onChange(e.target.checked, (e.nativeEvent ?? e) as unknown as ChangeEvent<HTMLInputElement>)
  }
  const handleRadioChange = (e: RadioChangeEvent) => {
    onChange(e.target.checked, (e.nativeEvent ?? e) as unknown as ChangeEvent<HTMLInputElement>)
  }

  if (type === 'radio') {
    return (
      <Radio
        checked={checked}
        disabled={disabled}
        // antd Radio 无 indeterminate 概念；忽略该字段（radio 单选无半选）。
        name={name}
        aria-label={ariaLabel}
        onChange={handleRadioChange}
        style={style}
        // 选择列只需裸控件，去掉 antd wrapper 默认 margin（.dg-selection-input-radio 规则归零）。
        className="dg-selection-input dg-selection-input-radio"
      />
    )
  }

  return (
    <Checkbox
      checked={checked}
      // antd Checkbox 原生支持 indeterminate prop（不再需要 ref hack）。
      indeterminate={indeterminate}
      disabled={disabled}
      name={name}
      aria-label={ariaLabel}
      onChange={handleCheckboxChange}
      style={style}
      className="dg-selection-input dg-selection-input-checkbox"
    />
  )
}
