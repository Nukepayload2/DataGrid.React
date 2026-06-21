/**
 * 列树 → grid 布局信息计算（M1 多级表头）。
 *
 * 算法移植自 lun `TableColumn.tsx:144-197` + `collector.ts` 的 `getCollectedItemLeavesCount`
 * / `getCollectedItemTreeLevel` / `maxLevel` 思路，**用纯 TS 重写**（无 Vue / Web Component）。
 *
 * 核心概念：
 *   - `depth(node)`：以该节点为根的子树高度（叶子=1，分组=1+max(children depths)）。
 *   - `leavesCount(node)`：子树中叶子节点数（叶子=1，分组=sum(children leavesCount)）。
 *   - `maxDepth`：整棵树最大深度 = `depth(root)`；决定表头行数（grid-template-rows 表头部分）。
 *
 * 表头格布局规则（与 antd 多级表头一致，参考 lun `getHead` 的 gridColumn/gridRow 逻辑）：
 *   - 分组表头格（leavesCount > 1）：`grid-column: span leavesCount`，`grid-row: 1`（仅占一行）。
 *   - 叶子表头格（无 children）：
 *       若其所在根到叶子的层级 `level + 1 < maxDepth`（即上方还有分组未到底），
 *       则纵向占满到表头底部 `grid-row: span (maxDepth - level)`；
 *       否则（顶层就是叶子，maxDepth=1）单行。
 *
 * grid 放置：采用**显式 grid-column/grid-row 定位**（DFS 前序遍历分配列号），
 * 而非依赖 `grid-auto-flow:column`，避免多级表头下放置错乱。
 *
 * 注意：本模块只产出布局元数据，不触碰 DOM；DOM 渲染由 GridTable 完成。
 */

import type { EngineColumnNode, EngineHeaderCell, EngineLeafColumn } from './types'

/** 节点是否为叶子（无有效 children）。 */
export function isLeafColumn<RecordType>(
  node: EngineColumnNode<RecordType>,
): boolean {
  return !node.children || node.children.length === 0
}

/** 子树深度（叶子=1，分组=1+max(children depths)）。 */
export function getDepth<RecordType>(node: EngineColumnNode<RecordType>): number {
  if (isLeafColumn(node)) return 1
  return 1 + Math.max(...node.children!.map((c) => getDepth(c)))
}

/** 子树中叶子节点数（叶子=1，分组=sum(children leavesCount)）。 */
export function getLeavesCount<RecordType>(
  node: EngineColumnNode<RecordType>,
): number {
  if (isLeafColumn(node)) return 1
  return node.children!.reduce((s, c) => s + getLeavesCount(c), 0)
}

/** 树最大深度（决定表头行数）。空树=0。 */
export function getMaxDepth<RecordType>(
  tree: Array<EngineColumnNode<RecordType>>,
): number {
  if (tree.length === 0) return 0
  return Math.max(...tree.map(getDepth))
}

/**
 * 前序遍历得到叶子列数组（按 antd 列顺序），同时转为 `EngineLeafColumn[]`。
 * 叶子列的 dataIndex/render/width/align/fixed/ellipsis 取自叶子节点本身。
 */
export function collectLeaves<RecordType>(
  tree: Array<EngineColumnNode<RecordType>>,
): Array<EngineLeafColumn<RecordType>> {
  const out: Array<EngineLeafColumn<RecordType>> = []
  const walk = (node: EngineColumnNode<RecordType>) => {
    if (isLeafColumn(node)) {
      out.push({
        key: node.key,
        dataIndex: node.dataIndex,
        title: node.title,
        width: node.width,
        align: node.align,
        fixed: node.fixed,
        // ★ 接口全兼容（决策 3 第二步）：column.className / column.style 透传（叶子列单元格消费）。
        className: node.className,
        style: node.style,
        ellipsis: node.ellipsis,
        // S21：showTitle（native title 门）随 ellipsis 透传。与 ellipsis 同走双路径（collectLeaves +
        //   flattenHeaderCells）——见双透传坑注释（S6 曾漏 collectLeaves）。showTitle:false 时
        //   渲染层不加 native title，让 render 内 antd Tooltip 接管。
        showTitle: node.showTitle,
        // M6：隐藏列透传（渲染层据此把 track 置 0fr，单元格 visibility:hidden）。
        hidden: node.hidden,
        render: node.render,
        onCell: node.onCell,
        colSpan: node.colSpan,
        rowScope: node.rowScope,
        // ★ 接口全兼容（决策 3 第二步）：onHeaderCell 透传到叶子列（flat 路径 ColumnCells 消费）。
        onHeaderCell: node.onHeaderCell,
        // S1：排序相关字段透传（sorter/sortOrder/sortDirections/showSorterTooltip）。
        // S2：sortPriority（多列优先级序号）一并透传。
        sorter: node.sorter,
        sortOrder: node.sortOrder,
        sortPriority: node.sortPriority,
        sortDirections: node.sortDirections,
        showSorterTooltip: node.showSorterTooltip,
        // S3：筛选相关字段透传（filters/onFilter/filterMultiple/filteredValue/filterOnClose）。
        //   filteredValue 由适配层 useFilter 回填（受控/非受控统一在此）。
        // S5：自定义面板三字段（filterDropdown/filterIcon/filterDropdownProps）一并透传。
        //   FilterDropdown 渲染层据此切换内置 Checkbox/Radio 与自定义面板。
        // S6：filterSearch（项搜索）一并透传——单层表头走 leafColumns 路径，ColumnCells 用
        //   leafColumn，须在此透传才能让 FilterDropdown 收到 filterSearch 渲染搜索框。
        // S7：filterMode（树形 vs menu 切换）一并透传——同上路径，FilterDropdown 据此切换面板。
        //   ★ 双透传坑：collectLeaves（→leafColumn）与 flattenHeaderCells（→headerCell）两路径
        //     都要加（S6 曾漏在 collectLeaves 导致搜索框不渲染）。
        filters: node.filters,
        onFilter: node.onFilter,
        filterMultiple: node.filterMultiple,
        filteredValue: node.filteredValue,
        filterOnClose: node.filterOnClose,
        filterDropdown: node.filterDropdown,
        filterIcon: node.filterIcon,
        filterDropdownProps: node.filterDropdownProps,
        filterSearch: node.filterSearch,
        filterMode: node.filterMode,
        raw: node.raw,
      })
      return
    }
    node.children!.forEach(walk)
  }
  tree.forEach(walk)
  return out
}

/**
 * 把列树展开为表头格平面表（DFS 前序），每项含显式 grid-column / grid-row 范围。
 *
 * 列号分配（关键：保证表头线号与表体叶子轨道共享同一套 1-based grid 线）：
 *   维护一个"下一个可用列号"游标 `state.nextCol`（1-based，初始=1）。
 *   - **叶子节点**：`colStart = state.nextCol`；`state.nextCol += 1`（消耗 1 条叶子轨道）；
 *     `colEnd = state.nextCol`。即 `grid-column: colStart / colStart+1`。
 *   - **分组节点**：`colStart = state.nextCol`（记录起始线，**不立即推进游标**）→
 *     先递归所有 children（每个 child 从当前游标起依次消耗并推进 `state.nextCol`）→
 *     递归返回后 `colEnd = state.nextCol`（此时游标已到达父范围末尾）。
 *     即 `grid-column: colStart / colEnd`，精确覆盖其全部叶子区间。
 *
 *   该"先递归再收尾"的顺序保证：所有线号连续、无空洞、最高线号 = 叶子列数 + 1，
 *   表头与表体共享同一套叶子轨道，父分组范围精确覆盖其子叶子区间。
 *   （旧实现的 bug：进入分组节点时先把游标推进到 colEnd 再递归 children，
 *    导致子节点起始线落在父范围之后，表头线号虚高、与表体错位。）
 *
 * 行号分配：参数 `level`（根=1），每节点占 1 行；叶子节点纵向占满到 `maxDepth`。
 *   - 分组节点：占 `level` 这一行（gridRowStart=level, gridRowEnd=level+1）。
 *   - 叶子节点：占 `level .. maxDepth`（gridRowStart=level, gridRowEnd=maxDepth+1），
 *     即纵向占满到表头底部。
 */
export function flattenHeaderCells<RecordType>(
  tree: Array<EngineColumnNode<RecordType>>,
  maxDepth: number,
): Array<EngineHeaderCell<RecordType>> {
  const out: Array<EngineHeaderCell<RecordType>> = []
  let leafCounter = 0 // 叶子列顺序（0-based），用于关联数据单元格

  // nextCol 用一个对象包，便于在闭包里 mutate（避免反复传参）
  const state = { nextCol: 1 }

  const walk = (
    node: EngineColumnNode<RecordType>,
    level: number,
  ): void => {
    const leaf = isLeafColumn(node)
    // ★ M9 key 去重：表头格 key 直接用 node.key（由适配层 Table.tsx 在构建列树时已统一算好——
    //   叶子节点 key = 自身 key/dataIndex 或匿名 `col-N`；分组节点 key = 完整路径如 `Other.Age`）。
    //
    //   历史 bug：这里曾对分组格做 `${parentKeyPath}/${node.key}` 二次前缀拼接，但 node.key
    //   本身已是完整路径（适配层 hasChildren 分支存的 path），二次拼接导致路径重复
    //   （如 `Other` → `/col-0`，`Address` → `/col-0/col-0/col-0`），且分隔符 `/` 与其它 key
    //   冲突（grouping-columns demo 报 `h-/col-0` 重复 warning）。直接用 node.key 即正确、唯一。
    //
    //   parentKeyPath 参数已移除（不再需要）；递归改为直接 walk(child, level+1)。
    const key = node.key

    // 列号分配：见函数头注释。
    //   - 叶子：消耗 1 条轨道，立即推进游标。
    //   - 分组：只记录起始线，先递归 children（它们会推进游标），返回后取末尾线。
    const colStart = state.nextCol
    let colEnd: number
    if (leaf) {
      state.nextCol += 1
      colEnd = state.nextCol
    } else {
      node.children!.forEach((child) => walk(child, level + 1))
      colEnd = state.nextCol
    }

    const gridRowStart = level
    const gridRowEnd = leaf ? maxDepth + 1 : level + 1

    out.push({
      key,
      title: node.title,
      align: node.align,
      fixed: node.fixed,
      // ★ 接口全兼容（决策 3 第二步）：column.className / column.style 透传（叶子 + 分组表头格都消费；
      //   叶子作用于该列数据格 + 叶子表头格；分组作用于分组表头格）。
      className: node.className,
      style: node.style,
      // S20：ellipsis 透传（仅叶子表头格有值——分组节点 ellipsis 无意义，保持 undefined）。
      ellipsis: leaf ? node.ellipsis === true : undefined,
      // S21：showTitle（native title 门）随 ellipsis 透传，仅叶子表头格有值（与 ellipsis 同）。
      showTitle: leaf ? node.showTitle : undefined,
      gridColumnStart: colStart,
      gridColumnEnd: colEnd,
      gridRowStart,
      gridRowEnd,
      isLeaf: leaf,
      leafIndex: leaf ? leafCounter : undefined,
      // M3：表头跨列语义透传（覆盖标记在 walk 后单独处理）。
      headerColSpan: leaf ? (node.colSpan ?? 1) : 1,
      rowScope: leaf ? node.rowScope : undefined,
      // M6：叶子表头格透传 hidden（渲染层据此加 dg-cell-hidden 类；track 仍 0fr 占位）。
      hidden: leaf ? node.hidden === true : false,
      // S1：排序信息透传（仅叶子表头格有值；分组表头格无排序）。
      // S2：sortPriority（多列优先级序号）一并透传。
      sortable: leaf ? !!node.sorter : false,
      sortOrder: leaf ? node.sortOrder : undefined,
      sortPriority: leaf ? node.sortPriority : undefined,
      showSorterTooltip: leaf ? node.showSorterTooltip : undefined,
      // S3/S5/S12：筛选信息透传（仅叶子表头格有值；分组表头格无筛选）。
      //   filterable 与 useFilter.isFilterable 对齐（放宽为 antd `useFilter/index.tsx:38`）：
      //   filters 非空 || filterDropdown 存在 || onFilter 是函数——任一即 filterable（渲染漏斗）。
      //   S5 列无 filters，靠 filterDropdown 渲染放大镜 trigger；S12 服务端筛选列有 filters 但无 onFilter。
      filterable: leaf
        ? !!(
            (node.filterDropdown !== undefined && node.filterDropdown !== null) ||
            (node.filters && node.filters.length > 0) ||
            typeof node.onFilter === 'function'
          )
        : false,
      filters: leaf ? node.filters : undefined,
      filterMultiple: leaf ? node.filterMultiple : undefined,
      filteredValue: leaf ? node.filteredValue : undefined,
      filterOnClose: leaf ? node.filterOnClose : undefined,
      // S5 自定义面板三字段透传（FilterDropdown 据此渲染自定义面板 + 自定义图标 + Dropdown props）。
      filterDropdown: leaf ? node.filterDropdown : undefined,
      filterIcon: leaf ? node.filterIcon : undefined,
      filterDropdownProps: leaf ? node.filterDropdownProps : undefined,
      // S6 筛选项搜索透传（FilterDropdown 据此在内置 menu 面板顶部渲染搜索框 + 过滤 flatItems）。
      // S7 filterMode 透传（FilterDropdown 据此切换 Tree vs Checkbox/Radio 内置面板）。
      filterSearch: leaf ? node.filterSearch : undefined,
      filterMode: leaf ? node.filterMode : undefined,
      // ★ 接口全兼容（决策 3 第二步）：column.onHeaderCell 透传（仅叶子表头格消费；分组表头格恒
      //   undefined——antd 同款语义）。渲染层（GridTable HeaderCell）把返回值合并到表头格 div props。
      onHeaderCell: leaf ? node.onHeaderCell : undefined,
      raw: node.raw,
      node,
    })

    if (leaf) {
      leafCounter += 1
    }
  }

  tree.forEach((node) => walk(node, 1))

  // === M3 表头横向合并（colSpan）===
  // 仅处理叶子表头格之间的水平合并（单层表头里某列横向跨多列，与 children 多级表头是不同机制）。
  // 算法：前序扫描叶子表头格；遇到 headerColSpan>=2 的格，把其后 headerColSpan-1 个紧邻
  // 叶子表头格标记为 covered=true（被覆盖，不渲染 DOM）；并把当前格的 gridColumnEnd 扩到
  // 跨越这些被覆盖格。lun 的 updateMergeInfo 思路一致（左上角设 span，被覆盖格隐藏）。
  // 兜底：headerColSpan===0 的叶子表头格（用户主动声明被覆盖）也标 covered=true。
  //
  // 注意：叶子表头格在 out 中按 leafIndex 升序（前序遍历天然如此）；只处理 isLeaf 项。
  // 对 children 多级表头场景，colSpan 字段不应在分组节点出现（与 antd 一致），故不影响。
  applyHeaderColSpan(out)
  markLastLeaves(out)

  return out
}

/**
 * 标记末列与分组最右叶子（表头分隔线排除用，对齐 antd）。
 *
 * antd 表头分隔线规则（`components/table/style/index.ts:322`）：
 *   `thead > tr > th:not(:last-child):not(selection):not(expand):not([colspan])::before`
 * —— `:last-child` 相对该 th 的父 `<tr>`，排除**该行最右一格**。
 *
 * data-grid 因 grid 容器扁平（表头格与表体格同为 `.dg-grid` 直接子节点），
 * `:last-child` 恒指最后一个表体格，对表头格永远为真，无法用 CSS 排除末列。
 * 故由引擎在叶子表头格上打两个标记，CSS 用 `:not([data-leaf-last])` /
 * `:not([data-group-last])` 排除（详见 table.css `[data-leaf-index]::before` 注释）：
 *
 * 1. **`isLastLeaf`（全局末列）**：`leafIndex === 叶子总数 - 1`。
 *    对应 antd 单层/多级表头叶子层 `<tr>` 的 `:last-child`（最右叶子）。
 *    例：jsx demo Action（最右叶子）；basic demo 最右列。
 *
 * 2. **`isGroupLastLeaf`（分组最右叶子）**：该叶子的 `gridColumnEnd` 命中
 *    某个**跨越 >=2 叶子的分组表头格**的 `gridColumnEnd`（即此叶子在分组最右，
 *    且分组不止 1 列）。对应多级表头的"分组右边界"——antd 该位置恰为上层分组行
 *    的某个 `<th>` 边界，视觉上不画分隔线。例：jsx demo Name 分组下的 Last Name。
 *    单层表头无分组表头格，所有叶子均为 false（零回归）。
 */
function markLastLeaves<RecordType>(
  cells: Array<EngineHeaderCell<RecordType>>,
): void {
  const leaves = cells.filter((c) => c.isLeaf)
  if (leaves.length === 0) return

  // 全局末列：leafIndex 最大者（leaves 已按 leafIndex 升序，末项即最大）。
  const lastLeafIndex = leaves[leaves.length - 1].leafIndex
  for (const leaf of leaves) {
    leaf.isLastLeaf = leaf.leafIndex === lastLeafIndex
  }

  // 分组 colEnd 集合：仅"跨越 >=2 叶子的分组表头格"（gridColumnEnd - gridColumnStart >= 2）
  // 才计入——单列分组（gridColumnEnd - gridColumnStart === 1）与单层表头无视觉边界差异，
  // 不应触发排除（避免误伤）。分组表头格 !isLeaf。
  const groupColEnds = new Set<number>()
  for (const c of cells) {
    if (!c.isLeaf && c.gridColumnEnd - c.gridColumnStart >= 2) {
      groupColEnds.add(c.gridColumnEnd)
    }
  }
  for (const leaf of leaves) {
    // 叶子的 gridColumnEnd 命中某分组 colEnd → 该叶子是那个分组的最右叶子。
    leaf.isGroupLastLeaf = groupColEnds.has(leaf.gridColumnEnd)
  }
}

/**
 * 处理表头横向合并（M3）：遍历叶子表头格，对 `headerColSpan >= 2` 的格扩展其列范围，
 * 并把后续紧邻格标记为 `covered: true`。`headerColSpan === 0` 的格直接标 covered。
 *
 * 不改变列号分配（每叶子列仍占 1 条 grid track），仅调整表头格的视觉跨列与可见性。
 */
function applyHeaderColSpan<RecordType>(
  cells: Array<EngineHeaderCell<RecordType>>,
): void {
  // 取出所有叶子表头格，按 leafIndex 升序（leafIndex 唯一且递增）。
  const leaves = cells.filter((c) => c.isLeaf)
  // 先把 headerColSpan===0 的格直接标 covered（用户主动声明被覆盖）。
  for (const cell of leaves) {
    if ((cell.headerColSpan ?? 1) === 0) {
      cell.covered = true
    }
  }
  // 再处理 headerColSpan>=2 的扩展覆盖。
  for (let i = 0; i < leaves.length; i++) {
    const cell = leaves[i]
    const span = cell.headerColSpan ?? 1
    if (span <= 1) continue
    // 扩展当前格的 gridColumnEnd 跨越后续 span-1 个叶子表头格。
    const newEnd = cell.gridColumnStart + span
    // 仅当后续确有 span-1 个叶子格可覆盖时才生效（否则降级为不合并，避免越界）。
    let canCover = true
    for (let j = 1; j < span; j++) {
      const next = leaves[i + j]
      if (!next) {
        canCover = false
        break
      }
    }
    if (!canCover) continue
    cell.gridColumnEnd = newEnd
    for (let j = 1; j < span; j++) {
      leaves[i + j].covered = true
    }
  }
}

/**
 * 一步到位：从列树计算所有布局信息。
 * 返回 { maxDepth, leafColumns, headerCells }。
 */
export function resolveColumnTree<RecordType>(
  tree: Array<EngineColumnNode<RecordType>>,
): {
  maxDepth: number
  leafColumns: Array<EngineLeafColumn<RecordType>>
  headerCells: Array<EngineHeaderCell<RecordType>>
} {
  const maxDepth = getMaxDepth(tree)
  const leafColumns = collectLeaves(tree)
  const headerCells = flattenHeaderCells(tree, maxDepth)
  return { maxDepth, leafColumns, headerCells }
}
