/**
 * 行选择 UI 原子组件：checkbox / radio。
 *
 * 内部渲染 antd 原生 `<Checkbox>` / `<Radio>`（外观由 antd 主题接管）：
 *   - indeterminate（半选）：antd Checkbox 原生支持 prop。
 *   - radio 模式消费 antd `.ant-radio` DOM（外圈 + 中心白点）。
 *
 * 对外 API：checked/indeterminate/disabled/name/aria-label/title/id/className/style/
 * onChange(checked,event)，另加 `getCheckboxProps` 自带的 onClick / userOnChange
 * （antd 用 `{...checkboxProps}` 全展开，见 `useSelection.js:411-419`）。
 * 两条分支都在控件上 `e.stopPropagation()`——勾选点击不冒泡到行（缺口 #12b）。
 * 内部把 antd onChange 的 `e.target.checked` 映射为 `onChange(checked, e)`。
 *
 * 完全受控（checked + onChange）；状态由 useRowSelection 状态机驱动。
 * 详见 [docs/features/interaction/selection.md](../../../docs/features/interaction/selection.md)。
 */

import type { CSSProperties, ChangeEvent, MouseEventHandler } from 'react'
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
  /** 原生 title（antd/rc-checkbox 把它落在 `.ant-checkbox` span 上，实测见 E 记录）。 */
  title?: string
  /** 原生 id（antd Checkbox/Radio 透传到底层 input）。 */
  id?: string
  /** 追加类名：与内部 `dg-selection-input*` **合并**（antd Checkbox 内部也是 clsx 合并）。 */
  className?: string
  onChange: (checked: boolean, event: ChangeEvent<HTMLInputElement>) => void
  style?: CSSProperties
  /**
   * `getCheckboxProps(record).onClick`（antd 的 `checkboxProps.onClick`）。
   *
   * ★ 内部已先 `e.stopPropagation()`（缺口 #12b，对齐 antd `useSelection.js:398-401/418-421`），
   *   本回调只在冒泡被拦下之后调用——用户的 onClick 不会再顺带触发 `onRow.onClick`。
   */
  onClick?: MouseEventHandler<HTMLElement>
  /**
   * `getCheckboxProps(record).onChange`（antd 的 `checkboxProps.onChange`）。
   * 收到 antd 原始事件对象；在内部 `onChange` 处理完之后调用。
   */
  userOnChange?: (event: CheckboxChangeEvent | RadioChangeEvent) => void
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
    title,
    id,
    className,
    onChange,
    style,
    onClick,
    userOnChange,
  } = props

  // 选择列只需裸控件，去掉 antd wrapper 默认 margin（`.dg-selection-input-*` 规则归零）。
  // 用户 className（getCheckboxProps().className）与内部类**合并**——antd Checkbox 内部也是
  // clsx 合并，直接覆盖会丢掉 antd/dg 两套结构类。
  const mergedClassName = [
    'dg-selection-input',
    type === 'radio' ? 'dg-selection-input-radio' : 'dg-selection-input-checkbox',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  // 缺口 #12b：勾选控件的点击**不冒泡**到行（antd `useSelection.js:398-401`（Radio）与
  //   `:418-421`（Checkbox）都是 `onClick: e => { e.stopPropagation(); checkboxProps?.onClick?.(e) }`）。
  //   不拦的话，用户 `onRow.onClick` 会被点勾选框连带触发（实测修复前 dg 1 次 / antd 0 次）。
  //   用户的 onClick 仍照常调用，只是排在 stopPropagation 之后。
  const handleClick: MouseEventHandler<HTMLElement> = (e) => {
    e.stopPropagation()
    onClick?.(e)
  }

  // antd Checkbox 的 CheckboxChangeEvent / Radio 的 RadioChangeEvent 都有 `target.checked`
  // + `nativeEvent`。桥接为外部 `onChange(checked, event)` 签名（调用方依赖 checked）。
  // 注：antd 6 的 nativeEvent 类型是 MouseEvent（rc-checkbox 内部把 click 当 change 派发），
  // 与外部声明的 ChangeEvent<HTMLInputElement> 不直接兼容；调用方实际不消费 event 字段，
  // 用 `as unknown as` 双重断言安全通过（运行时 event 对象本身不影响调用方逻辑）。
  const handleCheckboxChange = (e: CheckboxChangeEvent) => {
    onChange(e.target.checked, (e.nativeEvent ?? e) as unknown as ChangeEvent<HTMLInputElement>)
    // getCheckboxProps().onChange：antd 在内部处理之后调用，并原样给 antd 事件对象。
    userOnChange?.(e)
  }
  const handleRadioChange = (e: RadioChangeEvent) => {
    onChange(e.target.checked, (e.nativeEvent ?? e) as unknown as ChangeEvent<HTMLInputElement>)
    userOnChange?.(e)
  }

  if (type === 'radio') {
    return (
      <Radio
        checked={checked}
        disabled={disabled}
        // antd Radio 无 indeterminate 概念；忽略该字段（radio 单选无半选）。
        name={name}
        id={id}
        title={title}
        aria-label={ariaLabel}
        onClick={handleClick}
        onChange={handleRadioChange}
        style={style}
        className={mergedClassName}
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
      id={id}
      title={title}
      aria-label={ariaLabel}
      onClick={handleClick}
      onChange={handleCheckboxChange}
      style={style}
      className={mergedClassName}
    />
  )
}
