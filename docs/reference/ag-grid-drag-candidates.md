# ag-grid 拖拽能力借鉴参考（data-grid）

> **源码**：`G:\Projects\ag-grid`（v36）。
> - community = `packages\ag-grid-community`（MIT，可参考实现 + 抄码）。
> - enterprise = `packages\ag-grid-enterprise`（Commercial，仅研究行为，**不抄码**）。

---

## 借鉴边界

本文只讨论拖拽相关能力，边界如下：

1. **借鉴聚焦拖拽交互**。仅评估拖拽相关能力。
2. **不借鉴**：
   - tree-data / row-grouping（antd Table 已有等价能力，不重复造）；
   - pivot（data-grid 走 DIY 路线，不抄 ag-grid）；
   - toolpanel / status-bar / context-menu（这些由 data-grid 体系内的**其它 antd 组件**覆盖，不属于 Table 职责）。
3. **API 命名绝不照抄 ag-grid**。商业版有法律 / 品牌风险，且与 data-grid 的 antd 兼容命名风格不符。
   - 本文档只给**中性建议名**。
4. **enterprise 只研究行为不抄码**；**community 可抄码**（MIT）。
5. 每个候选**先标注 enterprise / community**，再评估。

> 结论先行：**值得做的拖拽能力全部在 community**。enterprise 的拖拽 drop zone（rowGroupDropZonePanel / pivotDropZonePanel / valueDropZonePanel，位于 `packages\ag-grid-enterprise\src\rowGrouping\columnDropZones\`）全部依赖已被排除的 tree/group/pivot，**不借鉴**。

---

## 候选表

| # | 能力 | 版本 | ag-grid 行为（file:line） | dg 现状 | 建议中性名 | 难度 |
|---|------|------|---------------------------|---------|------------|------|
| 7 | **拖到边缘自动滚动**（虚拟化硬伤） | community | `moveColumnFeature.ts:23-24`（`SCROLL_MOVE_WIDTH=100` / `SCROLL_GAP_NEEDED_BEFORE_MOVE`）+ `moveInterval`（`:582, :597-604`，按距离加速、上限 `SCROLL_MOVE_WIDTH`）；行拖同款：`rowDragFeature.ts:66-111`（`AutoScrollService` 实例 + `:178-190` `check(draggingEvent)`）。 | **未实现**。dg 现有 hit-test 仅遍历已渲染 cell，拖到视口边缘不会触发滚动，长表拖拽体验断。 | `gridOptions.autoScrollOnDrag` | 中 |
| 2 | **列拖到固定区切换固定态**（含停留即固定） | community | `moveColumnFeature.ts` 三实例 left/center/right（构造点见 `bodyDropTarget.ts:52-60`：`buildMoveFeature('left'/'right')` + `buildDropTarget('left'/'right')`）；判定 `bodyDropTarget.ts:147-152, 165-176`（`getPinnedSection`：用 `clientX` 相对 rect + 左右 sticky 区宽度判定 `'left'/'right'`）；停留即固定靠 `failedMoveAttempts`（移动失败计数 → 达阈值改 pinned）。 | **未实现**。dg 列重排有，但拖入固定区切换 `fixed` 没有。 | `gridOptions.dragToPinColumn` | 中 |
| 3 | **列拖出网格即隐藏 / 拖回恢复** | community | `columnMoveService.ts:213`（`hideColumnOnExit = !gos.get('suppressDragLeaveHidesColumns')`，默认 true）+ `:222` 默认图标 `'hide'` + `:231-244`（`onGridEnter` 恢复、`onGridExit` 隐藏）。 | **未实现**。 | `gridOptions.hideColumnOnDragAway` | 中 |
| 5 | **行拖到外部 drop zone**（跨网格 / 看板 / 回收站） | community | `dragApi.ts:9-10, 21`（`addRowDropZone(params)` / `getRowDropZoneParams(events)`）；底层注册：`rowDragFeature.ts:579-604`（`addRowDropZone` → 注册外部 `DropZone`，拖出网格触发外部 `onDragStop`）。 | **未实现**。dg 行重排仅在网格内。 | `gridOptions.rowDropTargets` + `onRowDrop` 回调 | 中 |
| 1 | **列重排开关**（全局禁 / 单列禁 / 锁位置） | community | `headerCellCtrl.ts:387`（`this.draggable = this.workOutDraggable()`）+ `:454-458`（`workOutDraggable`：`!suppressMovableColumns && !colDef.suppressMovable && !colDef.lockPosition`）；suppressMovableColumns 在网格选项清单 `:133`。 | **已有重排**（现有 `useColumnDragSort`），**缺开关**：无全局禁用、无单列禁用、无锁位置。 | 表级 `gridOptions.columnReorder` + 列级 `gridColumnOptions.dragColumnLock` | 低 |
| 4 | **行多选连拖** | community | `rowDragFeature.ts:141`（`if (this.gos.get('rowDragMultiRow'))`）+ `:148` 多行拖拽路径。 | **已有重排**（现有行拖拽能力），**缺多行**：当前一次拖一行。 | `gridOptions.multiRowReorder` | 低 |
| 8 | **拖拽预览 + 语义图标** | community | `dragAndDropImageComponent.ts`（拖拽预览组件）+ `dragModule.ts:55-77`（注册 + 图标语义：`hide`/`move`/`left`/`right`/…）。 | **仅指示线**（dg 重排目前靠插入位置指示线，无自定义预览、无语义图标）。 | `gridOptions.dragPreview` | 中 |
| 6 | **单元格 HTML5 dndSource**（拖到外部应用） | community | `rendering\dndSourceComp.ts:38-40`（`dataTransfer.setDragImage(eCell,0,0)`）+ `:51-54`（`JSON.stringify(rowNode.data)` → `dataTransfer.setData('application/json', …)` + `text/plain`）。 | **未实现**。 | 列级 `gridColumnOptions.cellDragSource` | 低 |

---

## 优先级建议

按「价值 / 依赖 / 难度」排序：

- **P0 — `#7 拖到边缘自动滚动`**：虚拟化场景的硬体验项，没它长表拖列/拖行都断。其它拖拽增强都依赖滚动正常。**先做**。
- **P1 — `#2 拖到固定区切换固定态` + `#3 拖出隐藏/拖回恢复`**：列管理高价值，两者共享「拖到网格边界判定」基础设施，宜同期做。
- **P2 — `#5 外部 drop zone` + `#1 列重排开关`**：跨网格拖拽（看板/回收站场景）+ 给现有重排加上开关/锁位置（小改动、收益直接）。
- **P3 — `#4 行多选连拖` + `#8 拖拽预览/语义图标`**：体验增强，非阻塞。
- **P4 — `#6 单元格 dndSource`**：长尾，HTML5 原生拖到外部应用，按需。

> **不借鉴（明确排除）**：enterprise 的三个 drop zone 面板（`packages\ag-grid-enterprise\src\rowGrouping\columnDropZones\` 下的 rowGroupDropZonePanel / pivotDropZonePanel / valueDropZonePanel），全部依赖 tree-data / row-grouping / pivot，命中约束 2，**整体排除**。

---

## 当前采用的命名

下列字段已经作为 data-grid 的拖拽命名约定写入参考文档：

| # | 能力 | 最终 API | 归属 |
|---|------|----------|------|
| 7 | 拖到边缘自动滚动 | `gridOptions.autoScrollOnDrag` | 表级 |
| 1 | 列重排总开关 | `gridOptions.columnReorder` | 表级 |
| 1 | 单列拖拽锁定 | `gridColumnOptions.dragColumnLock` | 列级 |
| 4 | 行多选连拖 | `gridOptions.multiRowReorder` | 表级 |

## 保留的扩展项

下列能力仍作为候选扩展保留，名称可继续沿用当前中性命名：

| # | 能力 | 暂定名 | 优先级 |
|---|------|--------|--------|
| 2 | 拖到固定区切换固定态 | `gridOptions.dragToPinColumn` | P1 |
| 3 | 拖出网格隐藏/拖回恢复 | `gridOptions.hideColumnOnDragAway` | P1 |
| 5 | 外部 drop zone | `gridOptions.rowDropTargets` + `onRowDrop` | P2 |
| 8 | 拖拽预览 + 语义图标 | `gridOptions.dragPreview` | P3 |
| 6 | 单元格 dndSource | `gridColumnOptions.cellDragSource` | P4 |

> 命名风格说明：本文中的名字均采用「**中性动词短语**」风格，不与 ag-grid 任何商标/字段名重合（ag-grid 用 `suppressMovableColumns`/`rowDragMultiRow`/`colDef.suppressMovable`/`colDef.lockPosition`，data-grid 用 `columnReorder`/`multiRowReorder`/`dragColumnLock`，且收入 `gridOptions`/`gridColumnOptions` 命名空间，与 antd 兼容 API 物理隔离）。
