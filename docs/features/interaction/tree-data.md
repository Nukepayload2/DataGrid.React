# 树形数据（tree data）

`<Table expandable>` + `dataSource` 中 record 含 `childrenColumnName`（默认 `'children'`）非空数组 → 树形模式。data-grid 自研扁平化 + 展开状态机（`useTreeData`），参考 rc-table 的 `useFlattenRecords` + `useExpand` 语义。本文说明树形检测、扁平化、展开状态机、与 expandedRowRender 的互斥、以及与 antd 的差异。

## 树形检测（detectTreeData）

判定：dataSource 中任一 record 的 `record[childrenColumnName]` 是非空数组 → 树形模式。

与 rc-table `useExpand.expandableType === 'nest'` 判定同语义（`mergedData.some(record => record[mergedChildrenColumnName])`）。**仅看顶层**（与 antd `useExpand` 一致）：若顶层无 children 但深层有 → 视为非树形。避免遍历整棵树开销。注：antd `useSelection` 用 `flattenData`（全树扁平），tree-data demo 顶层 John Brown sr. 含 children 即命中。

## 扁平化（DFS）

把嵌套 children 按展开状态扁平化为普通 record 数组（与 rc-table `useFlattenRecords.fillRecords` 同语义）：

- 仅当某 record 的 key 在 `expandedKeySet` 中时，才递归扁平化其 children；否则只 push 自身（子孙行不渲染）。
- 每行附带 `{ level, parentKey, hasChildren }`（level 从 0 起算顶层）。
- 先 push 自身（无论是否展开）；若该 record 含非空 children 且 key 在 `expandedKeySet` 中 → 递归扁平化每个 child（level+1）。

非树形模式 → 扁平化退化为原 dataSource（rowInfoMap 空）。

## 全树结构（不受展开状态影响）

`collectAllKeys` 递归收集（用于 `checkStrictly=false` 父子联动，需要全树结构）：

- `parentChildrenMap`：key → 该父行的直接子行 keys（含所有层级，**不论是否展开**）。与 antd `convertDataToEntities`（rc-tree）同语义。
- `expandableKeySet`：所有"含 children"的 key 集合（不论是否展开），用于展开状态机判定可展开性。

非树形模式 → 空 Map/Set。

## 展开状态机（useTreeExpand）

受控 `expandedRowKeys` / 非受控 `defaultExpandAllRows` / `defaultExpandedRowKeys`；点展开图标 toggle。

- 树形模式（`treeEnabled`）下展开状态机始终生效，**不依赖 expandable prop 存在**。expandable 仅作可选受控源（`expandedRowKeys`）+ 默认配置；其缺失不应禁用展开（非受控展开：初始全收起，点击 toggle 展开，对齐 antd tree-data demo 语义）。
- 非受控初始：`defaultExpandAllRows` → 全部可展开 key（含根 + 所有后代，对齐 antd `findAllChildrenKeys`）；`defaultExpandedRowKeys` → 过滤掉不可展开 key（避免指向叶子）。
- toggle 仅含 children 的 key 可切换（叶子无展开图标，不会触发）。
- 回调顺序对齐 antd：先 `onExpandedRowsChange`，再 `onExpand(expanded, record)`。

### onExpand 回填 record

`toggleExpand` 在引擎层只传 key（无 record 引用），通过 `findRecordByKey` 从 dataSource 递归查找 record 回填 `onExpand(expanded, record)`（对齐 antd `onExpand(expanded, record)` 签名）。实测 antd tree-data demo 不消费 onExpand（仅 onChange/onSelect），故 record 缺失不影响 demo，这里仍尽力回填。

## 与 expandedRowRender 互斥（树形优先）

antd 行为：tree-data（record.children 嵌套）与 `expandable.expandedRowRender` 不可同时启用（antd 会 warning）。data-grid 中**树形模式优先**——树形检测命中时，expandState 不启用（由 `Table.tsx` 适配层控制：树形模式下不构造 engineExpandState）。

## 行高口径

树形展开行视为普通表格行——扁平化后的每行都是引擎的一个数据行。非虚拟路径走约定 `rowHeight`（track），虚拟路径同样被 RO 实测（measured-first + 约定 `rowHeight` 兜底），不再"只走约定"。

## 与 antd 差异

| | data-grid | antd |
|---|---|---|
| 扁平化 | 自研 DFS（`flattenTree`） | rc-table `useFlattenRecords` |
| 父子映射 | `parentChildrenMap`（全树，供联动用） | rc-tree `convertDataToEntities` |
| 树形 × expandedRowRender | 树形优先（互斥） | 同款（warning） |
| 树形 × `expandRowByClick` | **生效**：点行体切换被点节点的展开态（状态源走树的 `expandableKeySet`/`toggleExpand`；无子节点的行点行体不切换） | **生效**：`@rc-component/table 1.10.2 es/hooks/useRowInfo.js:22-24, 32-35` 对 `nest` 类型同样按 `expandRowByClick` 触发展开 |
| 树形 × 表体合并（`onCell` 的 `rowSpan`） | **`rowSpan` 按"行"计**：已展开的子行作为附加轨道并入合并区，不占配额（`resolveCoveredTrackEnd`） | 按扁平行计：子行吃掉 `rowSpan` 名额，分组合并格停在子行末尾、同组剩余行整列留空 |

⇒ 树形与非树形同形，不属有意差异；生效范围与判据见
[`expand.md`](expand.md) 的「点击行体展开」一节，边界登记见
[`known-limitations.md`](../../reference/known-limitations.md)。合并列语义见
[`header-and-span.md`](../layout/header-and-span.md) 的「树形数据上的合并」一节。`读码` + `探针实测`（demo `merged-expand-tree`）

## 关联源码

- [`src/table/engine/useTreeData.ts`](../../../src/table/engine/useTreeData.ts) — 树形检测/扁平化/展开状态机（`detectTreeData`/`flattenTree`/`collectAllKeys`/`useTreeExpand`）。
- [`src/table/engine/useRowSelection.ts`](../../../src/table/engine/useRowSelection.ts) — `parentChildrenMap` 消费方（`checkStrictly=false` 父子联动，详见 [selection.md](selection.md)）。
- [`src/table/engine/GridTable.tsx`](../../../src/table/engine/GridTable.tsx) — `rowInfoMap` 消费（树形缩进 level + 展开图标 + 合并格的 `rowLevels`）。
- [`src/table/Table.tsx`](../../../src/table/Table.tsx) — 树形优先判定（树形模式下不构造 engineExpandState）。
