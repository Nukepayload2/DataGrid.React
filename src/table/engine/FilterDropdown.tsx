/**
 * 筛选下拉面板——用 antd 组件组装（Dropdown / Checkbox.Group / Radio.Group / Tree / Button）。
 *
 * 面板形态：menu（Checkbox.Group 多选 / Radio.Group 单选）/ tree（antd `<Tree checkable>`）/
 * 自定义（`column.filterDropdown`）。
 *
 * 语义要点：
 * - **filterOnClose**：true（默认）关闭即应用草稿；false 仅"确定"按钮才应用（关闭丢弃）。
 * - **localSelected**：面板内勾选是本地草稿，与外部 filteredValue 解耦；打开时重置为 filteredValue。
 * - **重置**：清空草稿（不立即应用）；下次关闭/确定时应用为空。
 *
 * 详见 [docs/design-notes/filter-sorter.md](../../../docs/design-notes/filter-sorter.md)。
 */

import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ConfigProvider, Dropdown, Empty } from 'antd'
import type { DropdownProps } from 'antd'
// filter 图标用 `@ant-design/icons` 的 FilterFilled（与 antd Table 默认 filterIcon 一致）。
// 默认/激活态都用同一个 FilterFilled——激活视觉差异由 `.dg-filter-trigger-active`（color）驱动，不切换图标。
import { FilterFilled } from '@ant-design/icons'
import type { EngineFilterItem } from './types'
import type {
  ColumnFilterDropdownProps,
  FilterValue,
  FilterDropdownProps as DgFilterDropdownProps,
} from '../types'
import { TABLE_LOCALE_DEFAULT } from '../types'
// 纯函数簇抽到 filterDropdownUtils：flattenFilterItems / toReactKey / toTreeData /
// collectLeafValues / resolveCheckedKeys（antd Tree onCheck 两种形态归一）。
import {
  collectLeafValues,
  flattenFilterItems,
  resolveCheckedKeys,
  toReactKey,
  toTreeData,
} from './filterDropdownUtils'
// 内置面板（menu/tree + 搜索 + 占位 + 按钮）抽到 FilterBuiltinPanel 子组件（执行单元 #65）。
import { FilterBuiltinPanel } from './FilterBuiltinPanel'

const { ConfigContext } = ConfigProvider
// renderEmpty 签名：`(componentName) => ReactNode`。
type RenderEmptyHandler = (componentName: string) => React.ReactNode

export interface FilterDropdownProps {
  /** 该列筛选项列表（来自列树 EngineHeaderCell.filters）。 */
  filters: Array<EngineFilterItem>
  /** 是否多选（默认 true）。true → Checkbox.Group；false → Radio.Group。 */
  filterMultiple?: boolean
  /** 当前应用的筛选值（来自列树 EngineHeaderCell.filteredValue；空数组/null = 无激活）。 */
  filteredValue?: Array<FilterValue> | null
  /** 关闭下拉即应用（默认 true）。 */
  filterOnClose?: boolean
  /**
   * 应用筛选回调（Dropdown 关闭/确定时调用）。
   * @param nextFilteredValue 新筛选值数组；空数组表示清除该列筛选。
   */
  onApply: (nextFilteredValue: Array<FilterValue>) => void
  /** 触发器渲染（漏斗图标）。可由外部覆盖；默认根据 activated 渲染 FilterOutlined/FilterFilled。 */
  triggerRender?: (activated: boolean) => React.ReactNode
  /**
   * 自定义筛选面板（透传 `column.filterDropdown`）。
   * 存在时取代内置 Checkbox/Radio 面板：引擎把它渲染进 antd Dropdown popupRender，
   * 并按 antd 兼容签名注入 props（selectedKeys/setSelectedKeys/confirm/clearFilters/visible/close）。
   */
  customDropdown?:
    | React.ReactNode
    | ((props: DgFilterDropdownProps) => React.ReactNode)
  /**
   * 自定义漏斗图标（透传 `column.filterIcon`）。
   * 覆盖默认 FilterFilled；triggerRender 仍可进一步覆盖。
   */
  customIcon?: React.ReactNode | ((filtered: boolean) => React.ReactNode)
  /**
   * 透传给 antd Dropdown 的 props（`column.filterDropdownProps`）。
   * open 受控 / onOpenChange 订阅 / triggerClassName / overlayClassName 等。
   */
  dropdownProps?: ColumnFilterDropdownProps
  /**
   * 筛选项搜索（透传 `column.filterSearch`）。
   * - `true`：默认 contains 匹配（item.text 转字符串 trim+toLowerCase 后包含输入即命中）。
   * - `(input, record) => boolean`：自定义匹配；`input` 为已 normalize 输入，`record` 为筛选项。
   * - `false`/undefined：不渲染搜索框。
   *
   * menu 模式（默认）与 tree 模式均消费：menu 过滤 flatItems；tree 用 antd Tree `filterTreeNode`
   * 过滤树节点（保留祖先链）。自定义面板（`customDropdown` 存在）不消费此字段。
   */
  filterSearch?: true | ((input: string, record: EngineFilterItem) => boolean)
  /**
   * 筛选下拉展示模式（透传 `column.filterMode`，默认 'menu'）。
   * - `'tree'`：内置下拉用 antd `<Tree checkable>` 渲染 filters（含 children）的树形结构。
   * - `'menu'` / undefined：Checkbox.Group（多选）/ Radio.Group（单选）扁平列表。
   *
   * 仅内置面板消费（customDropdown 存在时被取代，filterMode 无效）。
   */
  filterMode?: 'menu' | 'tree'
  /**
   * Table 级 `getPopupContainer`（来自 TableProps.getPopupContainer）。
   *
   * 作为筛选下拉 antd Dropdown 的默认 getPopupContainer：
   *   - 列级 `dropdownProps.getPopupContainer`（`column.filterDropdownProps.getPopupContainer`）优先。
   *   - 列级未指定时用本字段（Table 级默认）。
   *   - 两者都未指定时 antd Dropdown 走默认（document.body）。
   */
  getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement
  /**
   * Table 级 `locale`（来自 TableProps.locale）。FilterDropdown 消费其中
   * filterConfirm/filterReset/filterEmptyText/filterSearchPlaceholder/filterCheckAll
   * （+ @deprecated filterCheckall 别名）。未传时回退到 `TABLE_LOCALE_DEFAULT`（antd en_US 同款英文）。
   */
  locale?: {
    filterConfirm?: React.ReactNode
    filterReset?: React.ReactNode
    filterEmptyText?: React.ReactNode
    filterSearchPlaceholder?: string
    filterCheckall?: React.ReactNode
    filterCheckAll?: React.ReactNode
  }
}

export function FilterDropdown({
  filters,
  filterMultiple = true,
  filteredValue,
  filterOnClose = true,
  onApply,
  triggerRender,
  customDropdown,
  customIcon,
  dropdownProps,
  filterSearch,
  filterMode = 'menu',
  getPopupContainer,
  locale,
}: FilterDropdownProps) {
  // 自定义面板模式（column.filterDropdown 存在且非 null）。
  const isCustom = customDropdown !== undefined && customDropdown !== null
  // 树形内置面板模式（仅非自定义面板时生效）。
  const isTree = !isCustom && filterMode === 'tree'
  // 解析 locale 文案（未传字段回退到 antd en_US 同款默认值）。
  //   filterCheckall（小写 l）是 antd @deprecated 别名——消费处用 filterCheckall ?? filterCheckAll
  //   （对齐 antd FilterDropdown.tsx:434）。
  const localeFilterConfirm = locale?.filterConfirm ?? TABLE_LOCALE_DEFAULT.filterConfirm
  const localeFilterReset = locale?.filterReset ?? TABLE_LOCALE_DEFAULT.filterReset
  const localeFilterEmptyText =
    locale?.filterEmptyText ?? TABLE_LOCALE_DEFAULT.filterEmptyText
  const localeFilterSearchPlaceholder =
    locale?.filterSearchPlaceholder ?? TABLE_LOCALE_DEFAULT.filterSearchPlaceholder
  const localeFilterCheckAll =
    locale?.filterCheckall ?? locale?.filterCheckAll ?? TABLE_LOCALE_DEFAULT.filterCheckAll
  const [open, setOpen] = useState(false)
  // 本地草稿（面板内勾选），与外部 filteredValue 解耦。
  // 每次打开下拉时同步为当前 filteredValue（草稿初始化）。
  const [localSelected, setLocalSelected] = useState<Array<FilterValue>>(
    () => (filteredValue ?? []).slice(),
  )

  // 每次打开下拉时，把草稿重置为当前 filteredValue（确保打开看到的是已应用值）。
  useEffect(() => {
    if (open) {
      setLocalSelected((filteredValue ?? []).slice())
    }
  }, [open, filteredValue])

  // 扁平化筛选项（渲染 Checkbox/Radio 项用）。
  const flatItems = useMemo(() => flattenFilterItems(filters), [filters])

  // === 筛选项搜索 ===
  // 仅 menu 模式内置面板渲染搜索框（自定义面板 customDropdown 存在时不消费 filterSearch）。
  const hasSearch = !isCustom && (filterSearch === true || typeof filterSearch === 'function')
  const [searchValue, setSearchValue] = useState('')
  // 与 antd FilterSearch 一致：trim + toLowerCase 作为规范化输入。
  const normalizedSearchValue = useMemo(
    () => searchValue.trim().toLowerCase(),
    [searchValue],
  )
  // 关闭下拉时清空搜索值（对齐 antd `useEffect[visible]` 清空；下次打开为空）。
  useEffect(() => {
    if (!open) {
      setSearchValue('')
    }
  }, [open])

  // 过滤 flatItems 得到 visibleItems（仅当搜索框存在且有输入时过滤；否则显示全部）。
  const visibleItems = useMemo(() => {
    if (!hasSearch || !normalizedSearchValue) return flatItems
    if (typeof filterSearch === 'function') {
      // 自定义匹配：antd menu 模式传 normalizedSearchValue（trim+toLowerCase）。
      return flatItems.filter((item) => filterSearch(normalizedSearchValue, item))
    }
    // 默认匹配：item.text 转字符串 trim+toLowerCase 后包含 normalizedSearchValue（对齐 antd searchValueMatched）。
    return flatItems.filter((item) => {
      const text = item.text
      if (typeof text === 'string' || typeof text === 'number') {
        return text.toString().toLowerCase().includes(normalizedSearchValue)
      }
      return false
    })
  }, [hasSearch, normalizedSearchValue, flatItems, filterSearch])

  // === 树形筛选（filterMode='tree'）辅助 ===
  // 把 filters（含 children）转为 antd Tree 的 treeData：{ key: value, title: text, children }。
  // key 用 value（与 onFilter/onCompare 的 value 同源）；title 用 text。
  const treeData = useMemo(() => toTreeData(filters), [filters])
  // 收集所有叶子 value（用于"全选"Checkbox 的 checked/indeterminate 判定）。对齐 antd flattenKeys。
  const allLeafValues = useMemo(() => collectLeafValues(filters), [filters])
  // Tree onCheck（对齐 antd FilterDropdown.onCheck）：
  //   - filterMultiple=false（单选，checkStrictly=true）：只勾选中节点 → [node.key]。
  //   - filterMultiple=true（多选，checkStrictly=false）：返回所有勾选 key（含联动勾选的子/父）。
  // antd Tree onCheck 在 checkStrictly=false 时返回 { checked, halfChecked } 对象，
  // checkStrictly=true 时返回数组；这里统一处理两种形态取 checked 数组。
  const handleTreeCheck = useCallback(
    (keys: unknown, info: { node?: { key?: React.Key }; checked?: boolean }) => {
      const checkedArr = resolveCheckedKeys(keys)
      if (!filterMultiple) {
        // 单选：勾选该节点 → [node.key]；取消勾选 → []。
        // nodeKey 为 React.Key（含 bigint），归一化为 string|number（treeData 的 key 源自 value，本就是 string|number）。
        const nodeKey = info?.node?.key
        const checked = info?.checked
        const normalizedKey =
          nodeKey != null && nodeKey !== ''
            ? typeof nodeKey === 'number'
              ? nodeKey
              : String(nodeKey)
            : null
        setLocalSelected(checked && normalizedKey != null ? [normalizedKey] : [])
      } else {
        setLocalSelected(checkedArr)
      }
    },
    [filterMultiple],
  )
  // "全选" Checkbox（filterMultiple=true 时渲染）：勾上=全部叶子值；取消=空。
  const allChecked =
    filterMultiple &&
    allLeafValues.length > 0 &&
    allLeafValues.every((v) => localSelected.includes(v))
  const allIndeterminate =
    filterMultiple &&
    !allChecked &&
    allLeafValues.some((v) => localSelected.includes(v))
  const onCheckAll = useCallback(
    (e: { target: { checked: boolean } }) => {
      if (e.target.checked) {
        setLocalSelected(allLeafValues.slice())
      } else {
        setLocalSelected([])
      }
    },
    [allLeafValues],
  )
  // Tree filterTreeNode（hasSearch + 有输入时过滤树节点；对齐 antd Tree.filterTreeNode）：
  //   - 自定义函数：filterSearch(normalizedSearchValue, { text, value, children })。
  //   - 默认 contains：node.title（text）转字符串 toLowerCase 包含 normalizedSearchValue。
  const filterTreeNode = useMemo(() => {
    if (!hasSearch || !normalizedSearchValue) return undefined
    return (node: { title?: React.ReactNode; key?: React.Key }) => {
      // node 是 treeData 项（含 text→title, value→key）；转回 EngineFilterItem 形态给自定义函数。
      const record: EngineFilterItem = {
        text: node.title,
        value: node.key as string | number,
      }
      if (typeof filterSearch === 'function') {
        return filterSearch(normalizedSearchValue, record)
      }
      // 默认 contains（对齐 antd searchValueMatched）。
      const title = node.title
      if (typeof title === 'string' || typeof title === 'number') {
        return title.toString().toLowerCase().includes(normalizedSearchValue)
      }
      return false
    }
  }, [hasSearch, normalizedSearchValue, filterSearch])

  // === filter 下拉内 filters 为空时的占位（对齐 antd FilterDropdown.tsx:395,410）===
  // antd 语义：当 `column.filters` 为空数组（`(column.filters||[]).length===0`）时，filter 下拉
  // 的菜单区渲染 `renderEmpty('Table.filter')` 占位（默认 antd Empty SIMPLE + locale.filterEmptyText）。
  //   注意：`'Table.filter'` 是 filter 下拉内 filters 空时的占位，不是表体筛选无结果。
  //   表体 empty（含筛选无结果）由 Table.tsx 的 mergedEmptyNode 统一处理（用 'Table'，不区分）。
  // data-grid 仅内置面板（menu/tree）消费此占位；自定义面板（customDropdown 存在）不消费。
  // 默认文案 "No filters"（antd en_US 默认 filterEmptyText；data-grid 暂未透传 Table locale 到此）。
  const { renderEmpty } = useContext(ConfigContext)
  const filterEmptyNode = useMemo<React.ReactNode>(() => {
    const custom = (renderEmpty as RenderEmptyHandler | undefined)?.('Table.filter')
    if (custom !== undefined && custom !== null && custom !== false) return custom
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={localeFilterEmptyText}
        styles={{ image: { height: 24 } }}
        style={{ margin: 0, padding: '16px 0' }}
      />
    )
  }, [renderEmpty, localeFilterEmptyText])
  // 内置面板 filters 为空（无筛选项可勾选）→ 显示占位。对齐 antd `(column.filters||[]).length===0`。
  const filtersEmpty = !isCustom && filters.length === 0

  // 漏斗激活态：当前应用的 filteredValue 非空 → 高亮；否则灰。
  const activated = !!filteredValue && filteredValue.length > 0

  // 应用草稿：调 onApply + 关闭下拉。
  //
  // 关闭动作延迟到下一个宏任务（setTimeout 0）——不在原生 click 分发期间卸载弹出层。
  //   原因：antd v6 rc-dropdown 的弹出层 portaled 到 body，与表头格不在同一 DOM 子树，
  //   但 React 17+ 根委托（root delegation）+ 同步卸载弹出层会出现"事件分发途中目标节点被
  //   移除"的边界——残余的 click 派发可能落到弹出层背后坐标处的元素（如表头格），从而误触
  //   发表头 onClick（onSorterClick）。延迟关闭让原生 click 分发完整结束后再卸载弹出层，
  //   彻底切断误派发路径。onApply 仍同步调用（保证 onChange 在用户交互当下立刻 fire）。
  const applyAndClose = useCallback(() => {
    onApply(localSelected.slice())
    setTimeout(() => setOpen(false), 0)
  }, [localSelected, onApply])

  // 重置草稿：清空 localSelected（仅草稿，不立即应用）。
  const resetDraft = useCallback(() => {
    setLocalSelected([])
  }, [])

  // Dropdown onOpenChange：关闭时处理 filterOnClose 语义。
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen)
      // 透传 onOpenChange 给调用方（column.filterDropdownProps.onOpenChange）。
      dropdownProps?.onOpenChange?.(nextOpen)
      if (!nextOpen) {
        // 关闭下拉。
        if (filterOnClose) {
          // 关闭即应用：把草稿应用为 filteredValue（空草稿 = 清除筛选）。
          onApply(localSelected.slice())
        } else {
          // 仅确定才应用：关闭丢弃草稿，恢复到当前 filteredValue（下次打开重新初始化）。
          // useEffect[open] 会在下次打开时重置草稿，这里无需额外处理；但为避免"关闭时草稿残留
          // 被误用"，显式重置一次。
          setLocalSelected((filteredValue ?? []).slice())
        }
      }
    },
    [filterOnClose, localSelected, onApply, filteredValue, dropdownProps],
  )

  // === 自定义面板 antd 兼容 props ===
  // confirm/clearFilters/close 由引擎提供给 filterDropdown 回调。
  //   - confirm({ closeDropdown })：把当前草稿应用为 filteredValue。
  //     closeDropdown 默认 true（对齐 antd doFilter 默认 { closeDropdown: true }）：
  //     confirm() 不带参数 → 应用并关闭；confirm({ closeDropdown: false }) → 应用但保持打开。
  //   - clearFilters({ closeDropdown, confirm })：清空草稿；confirm=true 时立即应用清空；closeDropdown=true 关闭。
  //   - close()：仅关闭下拉（不改变 filteredValue）。
  const confirmFn = useCallback(
    (param?: { closeDropdown?: boolean }) => {
      const shouldClose = param?.closeDropdown !== false
      onApply(localSelected.slice())
      if (shouldClose) {
        setTimeout(() => setOpen(false), 0)
      }
    },
    [localSelected, onApply],
  )
  const clearFiltersFn = useCallback(
    (param?: { closeDropdown?: boolean; confirm?: boolean }) => {
      // 清空草稿。
      setLocalSelected([])
      // confirm=true：立即应用清空（对齐 antd reset + confirm 语义）。
      if (param?.confirm) {
        onApply([])
      }
      if (param?.closeDropdown) {
        setTimeout(() => setOpen(false), 0)
      }
    },
    [onApply],
  )
  const closeFn = useCallback(() => {
    setTimeout(() => setOpen(false), 0)
  }, [])

  const controlledOpen = dropdownProps?.open
  const effectiveOpen = controlledOpen !== undefined ? controlledOpen : open

  // 下拉面板内容（Checkbox.Group / Radio.Group / Tree + 按钮）。
  // 不用 antd Menu 包装（Menu.Item 内嵌 Checkbox/Radio 视觉不佳），改用 popupRender 直接渲染自定义面板。
  // antd Dropdown v6：popupRender 返回 ReactNode 作为弹出层内容。
  // filterMode='tree' 时菜单区改用 antd `<Tree checkable>` 渲染树形结构。
  //
  // 内置面板 JSX 抽到 FilterBuiltinPanel 子组件（执行单元 #65），便于独立单测 + 隔离 antd Tree/Checkbox
  //   渲染复杂度。所有 state/派生值/回调透传 props（FilterBuiltinPanel 为纯展示组件）。
  const builtinPanel = (
    <FilterBuiltinPanel
      filterMultiple={filterMultiple}
      isTree={isTree}
      filtersEmpty={filtersEmpty}
      filterEmptyNode={filterEmptyNode}
      hasSearch={hasSearch}
      localeFilterSearchPlaceholder={localeFilterSearchPlaceholder}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      treeData={treeData}
      allChecked={allChecked}
      allIndeterminate={allIndeterminate}
      onCheckAll={onCheckAll}
      onTreeCheck={handleTreeCheck}
      filterTreeNode={filterTreeNode}
      localeFilterCheckAll={localeFilterCheckAll}
      visibleItems={visibleItems}
      localSelected={localSelected}
      onLocalSelectedChange={setLocalSelected}
      localeFilterReset={localeFilterReset}
      localeFilterConfirm={localeFilterConfirm}
      onReset={resetDraft}
      onApply={applyAndClose}
    />
  )

  // === 自定义面板 ===
  // 把 column.filterDropdown（函数或节点）渲染进弹出层。
  // 函数模式注入 antd 兼容 FilterDropdownProps（selectedKeys/setSelectedKeys/confirm/clearFilters/
  // visible/close/prefixCls/filters）。
  // 节点模式：直接渲染（不注入 props，与 antd 一致）。
  const customPanel = useMemo(() => {
    if (!isCustom) return null
    const antdCompatProps: DgFilterDropdownProps = {
      prefixCls: 'dg-filter',
      selectedKeys: localSelected.map(toReactKey),
      setSelectedKeys: (keys: Array<React.Key>) =>
        setLocalSelected(keys as Array<string | number>),
      confirm: confirmFn,
      clearFilters: clearFiltersFn,
      // 自定义面板不消费内置筛选项；保留为空数组兼容 antd demo 原样拷贝。
      filters: [],
      close: closeFn,
      visible: effectiveOpen,
    }
    if (typeof customDropdown === 'function') {
      return customDropdown(antdCompatProps)
    }
    return customDropdown as React.ReactNode
  }, [
    isCustom,
    customDropdown,
    localSelected,
    confirmFn,
    clearFiltersFn,
    closeFn,
    effectiveOpen,
  ])

  const panel = isCustom ? (
    <div
      className="dg-filter-dropdown dg-filter-dropdown-custom"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {customPanel}
    </div>
  ) : (
    builtinPanel
  )

  // 触发器图标优先级：triggerRender（内置 API）> customIcon（column.filterIcon）> 默认 FilterFilled。
  // 注：GridTable 不会同时传 triggerRender 与 customIcon；这里 triggerRender 优先仅为兼容。
  // 默认图标对齐 antd：始终渲染 `<FilterFilled />`（antd FilterDropdown.tsx:549），
  //   不随 activated 切换 Outlined/Filled；激活高亮由外层 .dg-filter-trigger-active 的 color 驱动。
  const triggerIcon = triggerRender
    ? triggerRender(activated)
    : customIcon !== undefined && customIcon !== null
      ? typeof customIcon === 'function'
        ? customIcon(activated)
        : customIcon
      : <FilterFilled />

  // 触发器：默认漏斗图标（激活高亮）；可由 triggerRender 覆盖。
  const trigger = (
    <span
      className={[
        'dg-filter-trigger',
        activated ? 'dg-filter-trigger-active' : undefined,
        dropdownProps?.triggerClassName,
      ]
        .filter(Boolean)
        .join(' ')}
      style={dropdownProps?.triggerStyle}
      // 阻止点击冒泡到表头格（避免触发排序等表头点击行为）。
      onClick={(e) => e.stopPropagation()}
    >
      {triggerIcon}
    </span>
  )

  // === dropdownProps 合并 ===
  // - open 受控优先（filterDropdownProps.open 覆盖内部 state）。
  // - onOpenChange：handleOpenChange 内部已调用 dropdownProps.onOpenChange，这里只传 handleOpenChange。
  // - overlayClassName 合并到 classNames.root（v6 推荐方式）。
  // - getPopupContainer / align 透传。
  const dropdownOverlayClass = [
    'dg-filter-dropdown-overlay',
    dropdownProps?.overlayClassName,
  ]
    .filter(Boolean)
    .join(' ')

  // antd Dropdown props 子集（只挑支持的；避免类型不兼容）。
  const dropdownRestProps: Partial<DropdownProps> = {}
  if (dropdownProps?.align) dropdownRestProps.align = dropdownProps.align as DropdownProps['align']
  // getPopupContainer 优先级——列级 dropdownProps.getPopupContainer
  //   > Table 级 getPopupContainer（本组件 prop）> antd Dropdown 默认（document.body）。
  //   与 antd InternalTable.tsx:492 `getPopupContainer || getContextPopupContainer` 同款语义。
  const effectiveGetPopupContainer =
    dropdownProps?.getPopupContainer ?? getPopupContainer
  if (effectiveGetPopupContainer) {
    dropdownRestProps.getPopupContainer = effectiveGetPopupContainer
  }

  // Dropdown 弹出层：antd v6 Dropdown 用 `popupRender` 渲染自定义面板（非 menu 模式）。
  //   - popupRender：`(originNode) => ReactNode`；无 menu 时 originNode 为 null，直接返回 panel。
  //   - classNames.root：v6 推荐方式（替代 deprecated overlayClassName）。
  //   - open 受控 + onOpenChange 驱动 filterOnClose 语义。
  return (
    <Dropdown
      trigger={['click']}
      open={effectiveOpen}
      onOpenChange={handleOpenChange}
      popupRender={() => panel}
      classNames={{ root: dropdownOverlayClass }}
      {...dropdownRestProps}
    >
      {trigger}
    </Dropdown>
  )
}
