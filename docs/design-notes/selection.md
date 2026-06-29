# 行选择（selection）

`<Table rowSelection>` 启用行选择。data-grid 的勾选框（Checkbox/Radio）改用 antd 原生组件（非核心用 antd），由 antd 主题接管所有视觉。本文说明勾选框 wrapper margin、选中行背景色、选择列 padding、selections 下拉触发器，以及与 antd 的差异。

## 勾选框（改用 antd Checkbox/Radio）

`.dg-selection-input`：data-grid 的 `SelectionInput` 组件内部渲染 antd `<Checkbox>`/`<Radio>`，由 antd 主题接管所有视觉（16×16 方框/圆 + 0.8px border + 主色填充 + indeterminate 8×8 蓝方块 + radio 中心白点 + disabled 灰底）。勾选框对齐基准 = antd 6.4.4 原生。

data-grid 只需调整 antd wrapper 的 margin + 让 wrapper 居中适配列布局，所有边框/颜色/对勾/横线规则移除（antd 自带，重复声明会与 antd CSS-in-JS 冲突）。

```css
.dg-selection-input.ant-checkbox-wrapper,
.dg-selection-input.ant-radio-wrapper {
  margin-inline-end: 0;
  margin: 0;
}
```

去掉 antd Checkbox/Radio wrapper 默认的 `margin-inline-end`（antd 默认 8px，用于 label 与文字间距；选择列无文字，margin 会使控件偏左）。对齐 antd `.ant-table-selection-column .ant-checkbox-wrapper { margin-inline-end: 0 }`。

### onChange 签名桥接（`as unknown as` 双重断言）

`SelectionInput` 对外暴露 `onChange(checked: boolean, event: ChangeEvent<HTMLInputElement>)`（调用方依赖 `checked`），但内部渲染的 antd `<Checkbox>`/`<Radio>` 的 onChange 签名是 `(e: CheckboxChangeEvent | RadioChangeEvent) => void`。桥接方式：从 `e.target.checked` 取勾选态、`e.nativeEvent ?? e` 作为 event 传出去。

类型坑：antd 6 的 `CheckboxChangeEvent.nativeEvent` 类型是 `MouseEvent`（rc-checkbox 内部把 click 当 change 派发），与对外声明的 `ChangeEvent<HTMLInputElement>` 不直接兼容。调用方实际不消费 event 字段（只用 `checked`），故用 `as unknown as ChangeEvent<HTMLInputElement>` 双重断言安全通过——运行时 event 对象本身不影响调用方逻辑。

## 选中行背景色

antd `selection.ts:97-108`：

| 规则 | 背景 |
|---|---|
| `.ant-table-row-selected > .ant-table-cell`（行选中态 normal） | `tableSelectedRowBg`（= `--ant-table-row-selected-bg`，默认 #e6f4ff） |
| `.ant-table-row-selected > .ant-table-cell-row-hover`（行选中 + hover） | `tableSelectedRowHoverBg`（= `--ant-table-row-selected-hover-bg`，默认 #bae0ff） |

data-grid 等效：`GridTable` 在选中行的所有 body cell 上加 `dg-row-selected` 类（由 `isSelected` 驱动）。CSS 消费：

- normal：`.dg-cell-body.dg-row-selected { background: var(--ant-table-row-selected-bg) }`
- 选中 + hover：`.dg-cell-body.dg-row-selected.dg-row-hover` → `--ant-table-row-selected-hover-bg`

固定列也要应用选中态背景（覆盖透明，避免固定列透出底色不一致），与 dg-row-hover 同款。

### CSS 顺序优先级

`.dg-cell-body.dg-row-selected` 规则在 `.dg-cell-body.dg-row-hover` 之后（单类选择器同优先级，后者覆盖前者），故选中+hover 态覆盖普通 hover 态，与 antd `.ant-table-cell-row-hover`（在 row-selected 下用 selected-hover-bg）一致。排序列的 sort-bg（`.dg-column-sort`）在更后面声明，仍优先（排序列维持 sort 底色）。

## 选择列 padding 对齐 antd

antd `selection.ts:49-61` 给选择列单元格单独设 padding：

```
paddingInlineEnd: token.paddingXS;   // 默认 4px
paddingInlineStart: token.paddingXS;  // 默认 4px
textAlign: 'center'
```

**不随 size 变化**——`paddingXS` 是 alias token（非 Table component token），large/middle/small 三档 size 不改它。

data-grid 之前选择列沿用普通 cell padding（large 16/16、middle 8/8、small 8/8）——列宽 32px 下左右各 16px padding 把 16px 勾选框挤到只剩 0px 内容区。修复：

```css
.dg-cell[data-column-key='__dg_selection__'] {
  padding-inline-start: var(--ant-padding-xs, 4px);
  padding-inline-end: var(--ant-padding-xs, 4px);
}
```

`__dg_selection__` 是 `Table.tsx buildSelectionColumnNode` 设的选择列稳定 key，不会与真实列 dataIndex 冲突。

## selections 下拉触发器（caret-down）

`rowSelection.selections` 非空时，表头选择列渲染 `.dg-selection-dropdown-trigger`（caret-down 图标 + Dropdown 弹菜单）。对齐 antd `selection.ts:77-95` 的 `.ant-table-selection-extra` icon：

- 默认色 `headerIconColor`（= `colorIcon*opacityLoading`，默认 rgba(0,0,0,0.45)）。
- hover 色 `headerIconHoverColor`（= `colorIconHover*opacityLoading`，默认 rgba(0,0,0,0.88)）。
- 过渡 `transition: all motionDurationSlow`（≈0.3s）。

**布局差异（不强制修）**：antd 用 `position:absolute; marginInlineStart:100%` 把箭头放在 checkbox 之外（列宽随之 48px）；data-grid 用 `inline-flex gap:4` 把箭头放在 checkbox 旁（列宽恒 32px）。两种布局功能等价（箭头可见 + 点击弹菜单），data-grid 不改用 absolute（会牵连列宽策略 + 选择列 padding 规则），仅在颜色/对齐层对齐 antd。

## 与 antd 差异

| | data-grid | antd |
|---|---|---|
| 勾选框 | 内部渲染 antd `<Checkbox>`/`<Radio>`（非核心用 antd） | antd 原生 |
| 选中行标记 | JS 加 `dg-row-selected` 类 | `<tr class="ant-table-row-selected">` |
| selections 箭头位置 | inline-flex gap:4（列宽 32px） | absolute（列宽 48px） |

## 引擎状态机（自研核心）

`useRowSelection` 自研行选择状态机：受控 `selectedRowKeys`（React.Key[]）作为真理源，每次操作生成新数组并调用 `onChange`，引擎内部不直接调 React setState（保持纯函数性）。

### 多选（checkbox）状态判定

- 用 Set 维护"当前选中的 key 集合"。
- **全选态**（`allSelected`）：`selectableKeys ⊆ selected`（所有可勾选行都已选中）。
- **半选态**（`intermediate`）：`0 < |selected ∩ selectableKeys| < |selectableKeys|`（有选中但没全选）。
- 切换某 key：在 Set 中 add/delete（保留原顺序，新增追加末尾）。
- 全选/全不选：select all → 合并 selectableKeys；unselect all → 清空所有 selectableKeys（保留 selectableKeys 之外的 key，如 disabled 行之前被选中——antd `preserveSelectedRowKeys` 语义）。

### 单选（radio）

用单个值。选中即替换当前值；已选中再点不变（antd radio 行为：再次点击不取消）。

### getCheckboxProps（禁用）

antd `getCheckboxProps(record)` 返回 `{ disabled, ... }`。**禁用的行不参与"全选"**（antd 行为：disabled 行不会被全选/全不选影响；它的勾选态保持不变）。引擎计算 `selectableKeys` 时排除 disabled 行；半选/全选判定也基于 `selectableKeys` 而非全集。

### 受控语义

`selectedRowKeys` 是受控的：调用方负责在 `onChange` 后更新它。本 hook 不缓存"内部选中态"——每次渲染都从 `selectedRowKeys` 重新派生（与 React 受控组件语义一致）。`defaultSelectedRowKeys` 仅在 `selectedRowKeys` 未传时作为初始值（适配层处理）。

注：`selectedRowKeys` 可能含 selectableKeys 之外的 key（如 disabled 行之前被选中、或 record 已不存在）。antd `preserveSelectedRowKeys` 控制是否保留这些；本 hook 不删除它们（保留语义），但 allSelected/intermediate 判定只看 selectableKeys 子集。

## selections 自定义选择项（对齐 antd `rowSelection.selections`）

`SELECTION_ALL` / `SELECTION_INVERT` / `SELECTION_NONE` 是哨兵常量（对齐 antd `mergedSelections` 的最终 key：`'all'`/`'invert'`/`'none'`）。data-grid 用**哨兵对象**（含 key/text/onSelect）而非 antd 的字符串字面量——便于 Table 上挂为静态属性 + 直接渲染菜单项，避免像 antd 那样在 mergedSelections 里再二次映射出 SelectionItem。

- `selections: true` → 默认 `[SELECTION_ALL, SELECTION_INVERT, SELECTION_NONE]`。
- `selections: SelectionItem[]` → 自定义列表（可混用内置哨兵 + 自定义项）。
- 内置哨兵的 `onSelect` 是**占位**（仅保留签名对齐 antd SelectionItem）——真正的行为由 `useRowSelection.applySelection` 按 key 分支处理（antd 同样在 mergedSelections 中重写 onSelect）。
- 自定义项的 `onSelect(changeableRowKeys)`：与 antd 一致，demo 内自行 `setSelectedRowKeys`（外部受控 state）。`applySelection` 调用它，**返回值忽略**（antd 的 onSelect 签名返回 void）。

`changeableRowKeys` = 当前**所有可选（非 disabled）**行的 rowKeys（与 antd `recordKeys` 一致）。内置行为（对齐 antd mergedSelections）：

- **ALL**：`changeableRowKeys` 全选 + 保留"已选中的 disabled 行"（antd ALL：`!disabled || derivedSelectedKeySet.has(key)` → keys.push(key)）。
- **NONE**：清空所有 changeableRowKeys，仅保留"已选中的 disabled 行"（antd NONE：`derivedSelectedKeySet.filter(key => disabled)`）。
- **INVERT**：changeableRowKeys 中未选→选、已选→清；保留 selectableKeys 之外的 key（antd INVERT：遍历 pageData 非 disabled 行 toggle，disabled 行原样保留）。

自定义项：调 `item.onSelect(changeableRowKeys)`（返回 void）；引擎不改变 selectedRowKeys，返回 null（调用方据此不触发 onChange——demo 内自行 setState 后受控回填会刷新 UI）。

### 内置文案对齐 antd enUS

`SELECTION_ALL.text = 'Select all data'`、`SELECTION_INVERT.text = 'Invert current page'`、`SELECTION_NONE.text = 'Clear all data'`，对齐 antd 6.4.4 默认文案（`ant-design/components/locale/en_US.ts`）。**已知简化**：data-grid 暂未把 Table locale 透传到 selections（与 filter-in-tree `Select all items`/filter-search `Search in filters` 同款 enUS 硬编码处理）；后续若接入 locale 需同步替换三处 text。

注：antd `SELECTION_INVERT` 文案用 "current page" 字眼但实际作用于 changeableRowKeys（全数据范围），属 antd 历史文案，data-grid 对齐文案而不改语义。

## 树形父子联动（checkStrictly=false）

仅当同时提供 `parentChildrenMap`（树形 parent→children 映射，来自 `useTreeData`）且 `checkStrictly=false` 时启用；否则父子独立勾选（默认 true）。

### conductTreeCheck（对齐 antd rc-tree `conductCheck`）

输入"原始 selectedRowKeys"（可能含父但缺子孙，或含子但缺父），输出：

- `checkedKeys`：完整勾选集合（填充子孙 + 补全所有子已选中的父）。
- `halfCheckedKeys`：半选父集合（部分子选中、未全选）。

算法（自底向上填充）：

1. 初始 checked = input set 拷贝。
2. 对每个 input key：填充其全部子孙（select 时父→子孙连带，对齐 antd）。
3. 对每个父 key（parentChildrenMap 中所有父）：计算其直接子行在 checked 中的比例——全选 → 把父加入 checked（递归向上传播）；部分选 → 父不加入 checked（但在 halfChecked）；全不选 → 父保持未选。
4. 第 3 步需迭代直到稳定（因为补全父后，更高层父的"全选"判定会变）。

**与 antd conductCheck 略简化**：不处理 disabled 行的"强制不参与"复杂规则（antd `isCheckboxDisabled` 在 conduction 中过滤 disabled 子；data-grid 简化为 disabled 子行仍参与父全选判定——demo 无此边界组合，已知简化）。

### toggleTreeKey

选中 key：加入 key + 其全部子孙 keys；向上传播——对每个祖先，若其直接子行现在全部 checked → 加入该祖先（递归向上）。取消 key：移除 key + 其全部子孙 keys；向上传播——对每个祖先从 checked 中移除（不再是全选），半选态由 conductCheck 派生。返回**完整 conduced 数组**（含父+子孙），与 antd 测试用例一致。

ALL/INVERT 在树形联动模式下经 `conductTreeCheck` 补全父，使存回的数组完整。isSelected/isIndeterminate/toggleRow 全部基于派生集合；toggleRow 生成的新数组也已是完整 conduced 集合（存回受控源）。

## 关联源码

- [`src/table/style/table.css`](../../src/table/style/table.css) — `.dg-selection-input.ant-*-wrapper`、`.dg-cell-body.dg-row-selected`、`.dg-cell[data-column-key='__dg_selection__']`、`.dg-selection-dropdown-trigger`。
- [`src/table/engine/SelectionInput.tsx`](../../src/table/engine/SelectionInput.tsx) — 勾选框原子组件（内部渲染 antd Checkbox/Radio + onChange 签名桥接）。
- [`src/table/engine/useRowSelection.ts`](../../src/table/engine/useRowSelection.ts) — 行选择状态机（`selectableKeys`/`allSelected`/`intermediate`/`toggleRow`/`toggleAll`/`applySelection`/`conductTreeCheck`/`toggleTreeKey`）、内置哨兵 `SELECTION_ALL/INVERT/NONE`。
- [`src/table/Table.tsx`](../../src/table/Table.tsx) — `buildSelectionColumnNode`（选择列 `columnWidth` 默认 32px、`__dg_selection__` key）、`SelectionsDropdown`。
- [`src/table/engine/GridTable.tsx`](../../src/table/engine/GridTable.tsx) — BodyCell/ColumnCells 加 `dg-row-selected` 类（由 `isSelected` 驱动）。
