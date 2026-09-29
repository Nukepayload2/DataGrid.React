import type { ChangeEvent, ReactNode } from 'react'
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
import { normalizeAlign, normalizeFixed } from './columnAdapter'
import type {
  GridSelectionValue,
  RowCheckboxProps,
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

/**
 * 「这一次勾选点击是不是 **shift 区间（多选）** 操作」的**唯一真身判据**。
 *
 * 它一处决定三件事（三者由同一个布尔给出，不可能互相矛盾）：
 *   ① 键集走区间（`resolveSelectionRangeKeys`）还是走单行 `toggleRow`；
 *   ② `onChange` 的 `info.type` 是 `'multiple'` 还是 `'single'`；
 *   ③ `rowSelection.onSelectMultiple` 派发与否（`useSelectionAdapter.ts` 的 `fireSelectionChange`
 *      只按这里给出的 method 分支，见现树 `:412`/`:422`）。
 * ⇒ **禁止在别处再抄一遍**（本仓硬规矩：判据只许一份实现）。三条勾选边
 *   （renderCell 透传 node、默认 render、`buildDefaultSelectionInput`）都经
 *   `dispatchCheckboxSelect` 走这一处真身。
 *
 * 参照＝antd **6.4.4** `es/table/hooks/useSelection.js:428-429` 逐字：
 *   const isMultiple = derivedSelectedKeySet.size > 0
 *     && recordKeys.some(key => derivedSelectedKeySet.has(key));
 *   if (shiftKey && checkStrictly && isMultiple) { …multipleSelect… } else { …单行… }
 * ⇒ 参照的维度是「**已经存在落在可勾选行上的选中项**」，与「shift 锚点是否存在」**无关**；
 *   锚点在参照里只是区间的**起点**（`es/_util/hooks/useMultipleSelect.js:9`
 *   `prevSelectedIndex ?? currentSelectedIndex` ⇒ 锚点为空时区间退化成一个点＝只动被点的行）。
 *
 * 修前的缺陷（步骤 80 双臂探针 A1/A4 实测，裁判 antd 6.4.4）：旧门是
 * 「`type==='checkbox' && shiftKey && selectionAnchorKey !== null'`」＝**锚点存在维**，于是
 * 「单点 key1 → 表头全选（54 的 29-C 在此清锚）→ shift 点 key3」这一形状下
 *   dg `info.type='single'` / `onSelectMultiple` **0 次**，antd `'multiple'` / **1 次**
 *   ——键集 `[1,2,4]` 只是巧合相同，用户的 `onSelectMultiple` 参照会响、我方永不响。
 *   该门是**既有设计**（不是步骤 54 写坏的；54 的清锚只是把它变得可观测），
 *   故本条修复**保留** 54 的两句 `setSelectionAnchorKey(null)`（它们现在管的是区间**起点**）。
 * 同判据根的第二种形状（探针 A5：勾选 key1 → 取消 key1 → shift 点 key3）
 *   修前 dg `[1,2,3]`/multiple vs antd `[3]`/single ⇒ 本判据一并修好（＝步骤 54 遗交 #2 那一面）。
 *
 * `checkStrictly` 那一项（参照同一处门里的合取项）：父子联动模式下参照**根本不做区间**，
 * 走 `conductCheck` 的单行支。不带这一项就会让「联动 ＋ 批量后 shift」落进不传导父子态的区间支，
 * 等于用一个分叉去修另一个分叉 ⇒ 一并对齐。
 */
export function isCheckboxRangeSelect(opts: {
  type: 'checkbox' | 'radio'
  shiftKey: boolean
  checkStrictly: boolean
  selectedKeySet: ReadonlySet<React.Key>
  selectableKeys: ReadonlyArray<React.Key>
}): boolean {
  if (opts.type !== 'checkbox' || !opts.shiftKey || !opts.checkStrictly) return false
  if (opts.selectedKeySet.size === 0) return false
  for (const key of opts.selectableKeys) {
    if (opts.selectedKeySet.has(key)) return true
  }
  return false
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
 * 详见 `docs/features/interaction/selection.md` 的「selections 下拉触发器（caret-down）」一节。
 */
function SelectionsDropdown({
  selections,
  onSelect,
  getPopupContainer,
}: {
  selections: Array<SelectionItem>
  onSelect: (item: SelectionItem) => void
  /**
   * Table 级 `getPopupContainer`（缺口 #12c）。antd 在同一处选择菜单上传了它
   * （`es/table/hooks/useSelection.js:326-329`：`<Dropdown menu={{...,getPopupContainer}} getPopupContainer>`）。
   */
  getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement
}) {
  const menuItems = selections.map((item, index) => ({
    key: item.key ?? index,
    label: item.text ?? item.key,
    onClick: () => onSelect(item),
  }))
  return (
    <Dropdown
      menu={{ items: menuItems, getPopupContainer }}
      trigger={['click']}
      getPopupContainer={getPopupContainer}
    >
      <span
        className="dg-selection-dropdown-trigger"
        role="button"
        aria-label="selections"
      >
        {/* caret-down SVG（自绘，视觉对齐 antd DownOutlined）。尺寸 12×12 对齐 antd
            6.4.4 selection.ts:88 `fontSize: fontSizeIcon`（fontSizeIcon = fontSizeSM = 12px）。 */}
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
 * `getCheckboxProps(record)` / `getTitleCheckboxProps()` 返回值 → `<SelectionInput>` 已有槽位
 * （缺口 #9 的③「适配层把已有槽位接上」）。
 *
 * antd 侧是 `{...checkboxProps}` 全展开（`es/table/hooks/useSelection.js:411-419`）；我们此前
 * 只取 `disabled` / `name`，其余字段（`aria-label` / `title` / `id` / `className` / `indeterminate`
 * / `onClick` / `onChange`）在适配层就被丢掉——TS 会拦、JS 用户静默失效。
 *
 * ★ 这里**不**映射 `disabled` / `checked` / `indeterminate`：三者的优先级由各个落点自己决定
 *   （disabled：custom → 无可选行兜底；checked / indeterminate：计算值，表头段见 titleIndeterminate，
 *   表体段见 selection.treeLinkEnabled 的 nest 分支）。
 */
function pickFromCheckboxProps(props: RowCheckboxProps | undefined) {
  const name = props?.name
  return {
    name,
    id: props?.id,
    title: props?.title,
    className: props?.className,
    style: props?.style,
    // 用户 onClick 由 <SelectionInput> 排在 stopPropagation 之后调用（缺口 #12b 的交叉点）。
    onClick: props?.onClick,
    userOnChange: props?.onChange,
    // aria-label：用户显式值优先；缺省沿用本库既有口径（name 非空时作为标签）。
    'aria-label':
      props?.['aria-label'] ?? (typeof name === 'string' && name ? name : undefined),
  }
}

/**
 * 构造选择列叶子节点。
 *
 * 把选择列封装为一个普通 `EngineColumnNode`（无 children → 叶子），引擎无需感知"选择"语义，
 * 与多级表头 / 固定列 / 合并 / 虚拟滚动透明组合：
 *   - 列宽走 `rowSelection.columnWidth`：缺省值由 `useSelectionAdapter` 从主题 token 注入（同参照 6.4.4 `InternalTable.js:126-131`）；本函数 :263 的 `?? 32` 只是脱离 token 通道时的兜底。
 *   - `fixed` 由 rowSelection.fixed 指定（与 sticky 完全一致；常用于 'start'）。
 *   - `align` 默认 'center'（与 antd 一致：勾选格居中）；antd 物理值 'left'/'right' 经
 *     `normalizeAlign` 归一为逻辑值后再落引擎（缺口 #13）。
 *   - `tableGetPopupContainer`：Table 级 `getPopupContainer`，透传给表头 selections 下拉
 *     （缺口 #12c；antd 同位置传了它）。
 *   - `title`：表头格内容。
 *       * checkbox：渲染全选 SelectionInput。三态取「常规全选态 ∪ 全 disabled 推导态」
 *         （disabled 兜底 = 无可选行；见 headerContent 内 titleDisabled/titleChecked/
 *         titleIndeterminate），getTitleCheckboxProps() 的显式值优先。
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
 * 详见 `docs/features/interaction/selection.md` 的「表头与选择列 props」与「选择列 padding 对齐 antd」两节。
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
  tableGetPopupContainer?: (triggerNode: HTMLElement) => HTMLElement,
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
  // 列宽：`columnWidth` 的缺省值已由 `useSelectionAdapter` 注入主题 token（参照 6.4.4 `InternalTable.js:126-131`，
  // token 缺省＝组件 token `selectionColumnWidth`＝派生自 `controlHeight`）⇒ 这里的 `32` 只兜脱离通道时。
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
    const titleCheckboxProps: ReturnType<NonNullable<typeof getTitleCheckboxProps>> = (() => {
      try {
        return getTitleCheckboxProps?.()
      } catch {
        return undefined
      }
    })()
    const titleSlots = pickFromCheckboxProps(titleCheckboxProps)
    // 表头全选框的无障碍名——按参照实现，**不消费任何 locale 键**：
    //   参照是硬编码两分支 `node_modules/antd/es/table/hooks/useSelection.js:356`
    //   `"aria-label": customizeSelections ? 'Custom selection' : 'Select all'`，且写在
    //   `...customCheckboxProps`（`:355` 起）**之前** ⇒ 用户 `getTitleCheckboxProps()['aria-label']` 仍可覆盖。
    //   旧实现第三档取 `locale.selectionAll`：那个键在 antd 的契约里是**下拉菜单项文案**
    //   （`es/locale/en_US.js:30 selectionAll:'Select all data'`；参照只在 `useSelection.js:199` 当菜单文字用），
    //   拿它当无障碍名 ⇒ 默认名成 'Select all data'（实测 dg vs antd：'Select all'/'Custom selection'）。
    //   又因 `Table.tsx` 把 antd 整份 `en_US.Table` 段合成为默认 locale，旧式末尾的 `'Select all'` 字面兜底
    //   **恒不可达**（死码）。两条一并由本次改动消除。
    //   分支判据的对应物：参照 `customizeSelections` 在 `:305-306` 的 `if (mergedSelections)` 块内才被赋值，
    //   而 `mergedSelections`（`:189-192`）当 `!selections || hideSelectAll` 返回 `null`；我们没有
    //   `customizeSelections` 这个概念，等价布尔就是上面那个 `showSelectionDropdown`（:230-231，
    //   「存在选择下拉菜单」，也正是渲染该下拉的同一条件——隐藏全选时两侧都不渲染勾选框）。
    //   camelCase `ariaLabel` 那档是参照没有的宽松面（antd 忽略该写法，实测见步骤 34 探针 PR6），保留。
    const titleCheckboxAriaLabel =
      titleCheckboxProps?.['aria-label'] ??
      (titleCheckboxProps as { ariaLabel?: string } | undefined)?.ariaLabel ??
      (showSelectionDropdown ? 'Custom selection' : 'Select all')
    // 表头全选三态（对齐 antd useSelection 表头段 `useSelection.js:343-364`）：
    //   - disabled：getTitleCheckboxProps().disabled 显式值优先；否则「无可选行」即为
    //     disabled（含数据源为空、以及每行都 disabled 两种情况）。
    //     （antd 写法 `disabled: disabled ?? (flattedData.length === 0 || allDisabled)` —— custom 先。）
    //   - checked：常规取 allSelected；全部行都 disabled 时改取 allCheckedDisabled
    //     （antd allDisabledAndChecked）。
    //   - indeterminate：**计算值覆盖 custom**（antd 的 spread 顺序是 `{...customCheckboxProps}` 在前、
    //     `indeterminate: <计算>` 在后，`:352-359`）。
    //     ★ 行为变化说明：本库旧实现让 `getTitleCheckboxProps().indeterminate` 覆盖计算值，
    //       与 antd 相反。本项目对「antd 同名同义字段」的默认姿态是跟 antd，故改成计算值优先；
    //       调用方要表达半选请用 selectedRowKeys / 树形联动，而不是这个字段。
    const titleDisabled =
      titleCheckboxProps?.disabled ?? (selection.allDisabled || selection.selectableKeys.length === 0)
    const titleChecked = selection.allSelected || selection.allCheckedDisabled
    const titleIndeterminate = selection.intermediate || selection.someDisabledChecked
    const checkbox = (
      <SelectionInput
        type="checkbox"
        checked={titleChecked}
        indeterminate={titleIndeterminate}
        disabled={titleDisabled}
        name={titleSlots.name}
        id={titleSlots.id}
        title={titleSlots.title}
        className={titleSlots.className}
        style={titleSlots.style}
        onClick={titleSlots.onClick}
        userOnChange={titleSlots.userOnChange}
        aria-label={titleCheckboxAriaLabel}
        onChange={() => {
          if (titleDisabled) return
          const next = selection.toggleAll()
          const method: RowSelectMethod = selection.allSelected ? 'none' : 'all'
          fireSelectionChange(next, method)
          // 29-C：表头批量操作后清 shift 范围锚点。参照 antd **6.4.4**
          // `es/table/hooks/useSelection.js:297-298` 逐字是 `setSelectedKeys(keys, 'all')` 之后
          // `updatePrevSelectedIndex(null)`；锚点为 null 时 `es/_util/hooks/useMultipleSelect.js:9`
          // 的 `prevSelectedIndex ?? currentSelectedIndex` 会让下一次 Shift 点击只作用于被点行本身。
          // 实测不清锚点的实害（探针 PR-C / C2：单点 key1 → 表头全选 → Shift 点 key3）：
          // dg 得到 [4]（从陈旧锚点 key1 拉了 key1..key3 一段），antd 得到 [1,2,4]（只动 key3）
          // ＝用户可感知的数据结果分叉。顺序与参照一致：先派发 onChange，再清锚点。
          // ★ 步骤 80 之后这句**不能被误当成死码删掉**：区间判据已改成参照的「已有选中项」维
          //   （`isCheckboxRangeSelect`），锚点不再是「要不要走区间」的开关，但它仍是区间的**起点**——
          //   留着陈旧锚点就会从旧位置拉一整段（上面的实测数就是它）。
          setSelectionAnchorKey(null)
        }}
      />
    )
    const checkboxWithDropdown = showSelectionDropdown ? (
      <div className="dg-selection-header" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {checkbox}
        <SelectionsDropdown
          selections={resolvedSelections}
          getPopupContainer={tableGetPopupContainer}
          onSelect={(item) => {
            const result = selection.applySelection(item)
            if (result) {
              fireSelectionChange(result.nextKeys, result.method)
            }
            // 自定义项（result===null）：onSelect 内部已调用 item.onSelect(changeableRowKeys)，
            // demo 自行 setState（受控回填）——引擎无需动作（对齐 antd）。
            // 29-C：选择菜单的**每一项**（含自定义项）操作后都清 shift 范围锚点。
            // 参照 antd **6.4.4** `es/table/hooks/useSelection.js:251-257` 给 mergedSelections 统一包了
            //   `onSelect: currentRowKeys => { mergedSelection.onSelect?.(currentRowKeys); updatePrevSelectedIndex(null) }`
            // ——包装在 key 分支**之外**，故内置 all/invert/none 与用户自定义项都清。
            // 实测不清锚点的实害（探针 PR-C / C3：勾 key1、key2 → 菜单 NONE → Shift 点 key3）：
            // dg 得 [2,3]（method 'multiple'，从陈旧锚点 key1 拉了区间），antd 得 [3]（method 'single'）。
            // ★ 步骤 80 后同 S1：锚点管的是区间**起点**（判据已是「已有选中项」维），这句仍是活码。
            setSelectionAnchorKey(null)
          }}
        />
      </div>
    ) : checkbox
    return wrapColumnTitle(checkboxWithDropdown)
  })()

  return {
    key: SELECTION_COLUMN_KEY,
    title: headerContent,
    // align 归一（缺口 #13）：rowSelection.align 同样接受 antd 物理值 left/right。
    align: normalizeAlign(align),
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
      const checkboxProps = (() => {
        try {
          return rowSel.getCheckboxProps?.(record)
        } catch {
          return undefined
        }
      })()
      const checkboxSlots = pickFromCheckboxProps(checkboxProps)
      const disabled = checkboxProps?.disabled === true
      const checked = key !== undefined && selection.isSelected(key)
      // 树形父子联动：父行半选态（checkStrictly=false + 部分子选中）。
      const computedIndeterminate = key !== undefined && selection.isIndeterminate(key)
      // antd 的 indeterminate 优先级分支（`useSelection.js:404-410`）：
      //   - 树形（antd expandType==='nest'，即本库 selection.treeLinkEnabled）→ **计算值覆盖**
      //     getCheckboxProps().indeterminate（antd 同时在 dev 下 warning，我们不发该 warning）。
      //   - 非树形 → `checkboxProps?.indeterminate ?? indeterminate`（custom 覆盖计算值）。
      const indeterminate = selection.treeLinkEnabled
        ? computedIndeterminate
        : (checkboxProps?.indeterminate ?? computedIndeterminate)
      // renderCell 存在时用其返回值的 children（或 ReactNode）替代默认 SelectionInput。
      if (renderCell) {
        const node = (
          <SelectionInput
            type={type}
            checked={checked}
            indeterminate={indeterminate}
            disabled={disabled}
            name={checkboxSlots.name}
            id={checkboxSlots.id}
            title={checkboxSlots.title}
            className={checkboxSlots.className}
            style={checkboxSlots.style}
            aria-label={checkboxSlots['aria-label']}
            onClick={checkboxSlots.onClick}
            userOnChange={checkboxSlots.userOnChange}
            onChange={(_checked, event) => {
              if (disabled || key === undefined) return
              dispatchCheckboxSelect({
                type,
                record,
                key,
                nextChecked: _checked,
                event,
                selection,
                anchorKey: selectionAnchorKey,
                setAnchorKey: setSelectionAnchorKey,
                fireSelectionChange,
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
          name={checkboxSlots.name}
          id={checkboxSlots.id}
          title={checkboxSlots.title}
          className={checkboxSlots.className}
          style={checkboxSlots.style}
          aria-label={checkboxSlots['aria-label']}
          onClick={checkboxSlots.onClick}
          userOnChange={checkboxSlots.userOnChange}
          onChange={(_checked, event) => {
            if (disabled || key === undefined) return
            dispatchCheckboxSelect({
              type,
              record,
              key,
              nextChecked: _checked,
              event,
              selection,
              anchorKey: selectionAnchorKey,
              setAnchorKey: setSelectionAnchorKey,
              fireSelectionChange,
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
  const checkboxProps = rowSel.getCheckboxProps?.(record)
  const checkboxSlots = pickFromCheckboxProps(checkboxProps)
  const disabled = checkboxProps?.disabled === true
  const computedIndeterminate = selection.isIndeterminate(key)
  // 与 render 默认分支同一条 antd 优先级规则（树形 → 计算值覆盖；非树形 → custom 覆盖）。
  const indeterminate = selection.treeLinkEnabled
    ? computedIndeterminate
    : (checkboxProps?.indeterminate ?? computedIndeterminate)
  return (
    <SelectionInput
      type={type}
      checked={checked}
      indeterminate={indeterminate}
      disabled={disabled}
      name={checkboxSlots.name}
      id={checkboxSlots.id}
      title={checkboxSlots.title}
      className={checkboxSlots.className}
      style={checkboxSlots.style}
      aria-label={checkboxSlots['aria-label']}
      onClick={checkboxSlots.onClick}
      userOnChange={checkboxSlots.userOnChange}
      onChange={(_checked, event) => {
        if (disabled) return
        dispatchCheckboxSelect({
          type,
          record,
          key,
          nextChecked: _checked,
          event,
          selection,
          anchorKey: selectionAnchorKey,
          setAnchorKey: setSelectionAnchorKey,
          fireSelectionChange,
        })
      }}
    />
  )
}

function resolveSelectionRangeKeys<RecordType>(
  selection: UseRowSelectionResult<RecordType>,
  anchorKey: React.Key | null,
  currentKey: React.Key,
  selected: boolean,
): Array<React.Key> {
  // 锚点为空 ⇒ 区间**退化成一个点**（只动被点的行）。这不是兜底，是照抄参照：
  // antd **6.4.4** `es/_util/hooks/useMultipleSelect.js:9`
  //   `const configPrevSelectedIndex = prevSelectedIndex ?? currentSelectedIndex;`
  // ⇒ `prevSelectedIndex` 为 null 时 `startIndex === endIndex === currentSelectedIndex`
  //   ⇒ `rangeKeys` 只含被点行。我方锚点的对应物就是 `selectionAnchorKey`
  //   （批量操作后被 29-C 清成 null ⇒ 下一次 shift 只作用在被点行上）。
  const rangeKeys = getRangeKeys(selection.selectableKeys, anchorKey ?? currentKey, currentKey)
  const currentKeys = Array.from(selection.selectedKeySet)
  if (selected) {
    return Array.from(new Set<React.Key>([...currentKeys, ...rangeKeys]))
  }
  const rangeKeySet = new Set<React.Key>(rangeKeys)
  return currentKeys.filter((key) => !rangeKeySet.has(key))
}

/**
 * 三条勾选边（`renderCell` 透传的默认 node / 默认 `render` 分支 / `buildDefaultSelectionInput`）
 * 共用的**唯一** onChange 派发体。
 *
 * 抽这一层的目的是本仓硬规矩「判据只许一份实现」：旧树里同一条
 * `type === 'checkbox' && shiftKey && selectionAnchorKey !== null` 被逐字抄了三处
 * （改前树 `tmp/80-bak-selectionAdapter.tsx.ORIG` 的 `:434` / `:487` / `:554`），修一处留两处＝制造第二种语义。
 * 现在三处都只剩 `dispatchCheckboxSelect(...)`，判据（`isCheckboxRangeSelect`）、
 * 键集算法、锚点维护、`method` 标签**各只有一份**。
 */
function dispatchCheckboxSelect<RecordType>(opts: {
  type: 'checkbox' | 'radio'
  record: RecordType
  key: React.Key
  /** 点击后勾选框的目标态（`SelectionInput.onChange` 的第一参＝`e.target.checked`）。 */
  nextChecked: boolean
  event: ChangeEvent<HTMLInputElement>
  selection: UseRowSelectionResult<RecordType>
  anchorKey: React.Key | null
  setAnchorKey: (k: React.Key | null) => void
  fireSelectionChange: (
    nextKeys: Array<React.Key>,
    method: RowSelectMethod,
    trigger?: SelectionChangeTrigger<RecordType>,
  ) => void
}): void {
  const nativeEvent = opts.event.nativeEvent ?? opts.event
  const shiftKey = 'shiftKey' in nativeEvent && nativeEvent.shiftKey === true
  const useRange = isCheckboxRangeSelect({
    type: opts.type,
    shiftKey,
    checkStrictly: opts.selection.checkStrictly,
    selectedKeySet: opts.selection.selectedKeySet,
    selectableKeys: opts.selection.selectableKeys,
  })
  const next = useRange
    ? resolveSelectionRangeKeys(opts.selection, opts.anchorKey, opts.key, opts.nextChecked)
    : opts.selection.toggleRow(opts.key)
  opts.setAnchorKey(opts.key)
  opts.fireSelectionChange(next, useRange ? 'multiple' : 'single', {
    record: opts.record,
    nativeEvent,
  })
}
