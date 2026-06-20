/**
 * 复刻 antd drag-column-sorting demo：
 *   `G:\Projects\ant-design\components\table\demo\drag-column-sorting.tsx`
 *
 * === antd demo 要素 ===
 *
 * - 5 列：Name / Gender / Age / Email / Address（单层表头）。
 * - 4 行数据（John Brown male 32 / Jim Green female 42 / Joe Black female 32 / George Hcc male 20）。
 * - `DndContext`（PointerSensor distance:1 + restrictToHorizontalAxis）+ `SortableContext`
 *   （items = 列 key 数组，horizontalListSortingStrategy）+ `components.header.cell = TableHeaderCell`
 *   （useSortable）+ `components.body.cell = TableBodyCell`（DragIndexContext borderInline 虚线指示）。
 * - HeaderCell：useSortable，setNodeRef 挂 `<th>` + listeners + cursor:move + isDragging zIndex 9999。
 * - `onDragEnd`：arrayMove(prev, activeIndex, overIndex) → setColumns（重排列顺序）。
 * - `onDragOver`：setDragIndex（active/over/direction）→ body cell borderInlineStart/End 虚线指示。
 * - DragOverlay：拖拽预览（表头内容灰底）。
 *
 * === ★ data-grid 适配：方案 B 自研 pointer 列拖拽（不依赖 @dnd-kit/*）===
 *
 * data-grid 用 CSS Grid 渲染，"列"不是 DOM 元素（单元格直接是 grid item）。antd 方案（dnd-kit
 * 挂 `<th>` + transform 平移整列）在 data-grid 下无"列 DOM"可挂，且 transform 平移会破坏 grid 布局
 * （与 grid-column 定位冲突）。详见 `useColumnDragSort.ts` 文件头方案选择说明。
 *
 * 故本 demo 用 data-grid 自研的 `useColumnDragSort` hook（S19 列方向，与 S17/S18 行方向同族）：
 *
 * - **拖拽手势（事件委托）**：Table 外层包一个 `position:relative` 容器，挂 hook 返回的
 *   `containerProps.onPointerDown`。hook 内部判定 pointerdown 的 target 是否命中**叶子表头格**
 *   （`closest('[data-leaf-index]')`——data-grid 引擎给每个叶子表头格打 `data-leaf-index` 属性，
 *   flat/multi 两路径都有；分组表头格 `data-leaf='0'` 无该属性，故天然不触发列拖拽），命中则启动。
 *   **无需修改引擎**、**无需 components 机制**、**无需 onHeaderCell 透传**。
 *
 * - **垂直指示线**：`useColumnDragSort.indicator` 驱动一条绝对定位蓝色竖线（left = 目标列间隙 X，
 *   top/height 跨表头+表体），作为外层容器子元素渲染。指示线**不是 grid item**（是 container 子元素），
 *   不影响 grid-template-columns 计算（零回归）。
 *
 * - **列重排**：松手且 over≠from 时 hook 调 `onSort(arrayMove(...))` → setColumns → Table 重渲染，
 *   列瞬间到新位置。
 *
 * === 与 antd 的差异 ===
 *
 * - antd 拖拽中：被拖列表头 `<th>` 跟随指针平移（transform）+ body cell borderInline 虚线指示；
 *   data-grid 拖拽中：显示**垂直指示线**（被拖列原位不动，指示线提示列插入位置），松手后重排。
 *   功能等价（列重排），视觉略异。
 * - antd 用 `@dnd-kit/*` + DragOverlay 预览；data-grid 自研 pointer（方案 B，理由见 useColumnDragSort.ts）。
 * - antd HeaderCell 挂 listeners 在 `<th>`；data-grid 通过事件委托命中任意叶子表头格。
 *
 * === 验证点（S19）===
 *
 * 1. 叶子表头格（任意列）cursor 默认；按住表头格左右拖拽即可启动（事件委托命中 data-leaf-index）。
 * 2. 按住表头格左右拖拽 → 蓝色垂直指示线跟随指针，显示"松手后该列插入位置"（仅水平方向有效，
 *    restrictToHorizontalAxis 等效——纵向上指针位置不影响 over 计算）。
 * 3. 松手 → 列重排（columns 按指示线位置 arrayMove，表头与表体列同步重排）。
 * 4. 在首列之左 / 末列之右拖拽 → 指示线显示在最左/最右，松手后列移到最前/最后。
 * 5. 回归：S17/S18 行拖拽（命中 data-row-index，不与 data-leaf-index 冲突）不变；非拖拽 demo 不破。
 */

import { useRef, useState } from 'react'
import { Table } from '../table'
import { useColumnDragSort } from '../table'
import type { ColumnType } from '../table'

interface DataType {
  key: string
  name: string
  gender: string
  age: number
  email: string
  address: string
}

const baseColumns: ColumnType<DataType>[] = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Gender', dataIndex: 'gender', key: 'gender' },
  { title: 'Age', dataIndex: 'age', key: 'age' },
  { title: 'Email', dataIndex: 'email', key: 'email' },
  { title: 'Address', dataIndex: 'address', key: 'address' },
]

export default function DragColumnSortingDemo() {
  const [columns, setColumns] = useState<ColumnType<DataType>[]>(() =>
    baseColumns.map((column, i) => ({
      ...column,
      // 稳定 key（列重排时 React diff 用），与 antd demo `${i}` 索引作 key 同款（重排后仍按现位置匹配）。
      key: `${i}`,
    })),
  )

  const [dataSource] = useState<DataType[]>([
    {
      key: '1',
      name: 'John Brown',
      gender: 'male',
      age: 32,
      email: 'John Brown@example.com',
      address: 'London No. 1 Lake Park',
    },
    {
      key: '2',
      name: 'Jim Green',
      gender: 'female',
      age: 42,
      email: 'jimGreen@example.com',
      address: 'London No. 1 Lake Park',
    },
    {
      key: '3',
      name: 'Joe Black',
      gender: 'female',
      age: 32,
      email: 'JoeBlack@example.com',
      address: 'Sidney No. 1 Lake Park',
    },
    {
      key: '4',
      name: 'George Hcc',
      gender: 'male',
      age: 20,
      email: 'george@example.com',
      address: 'Sidney No. 1 Lake Park',
    },
  ])

  // 外层容器 ref（指示线相对此容器绝对定位；hit-test 遍历容器内 [data-leaf-index] 表头格）。
  const containerRef = useRef<HTMLDivElement>(null)

  const { dragState, indicator, containerProps } = useColumnDragSort<ColumnType<DataType>>({
    columns,
    onSort: setColumns,
    containerRef,
  })

  return (
    <div style={{ padding: 24 }}>
      {/* 外层相对定位容器：挂 containerProps.onPointerDown（事件委托命中叶子表头格启动列拖拽）；
          指示线（绝对定位）相对此容器；Table 正常渲染。 */}
      <div ref={containerRef} style={{ position: 'relative' }} {...containerProps}>
        <Table<DataType> rowKey="key" columns={columns} dataSource={dataSource} />
        {/* 垂直拖拽指示线：绝对定位蓝色竖线，跨表头+表体高度（top/height 相对 container）。
            非 grid item（是 container 子元素，Table 内部 dg-grid 的直接子元素仍是单元格），
            不影响 grid-template-columns 计算。 */}
        {indicator.visible ? (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: indicator.left,
              top: indicator.top,
              height: indicator.height,
              width: 2,
              background: '#1677ff',
              zIndex: 9999,
              pointerEvents: 'none',
              borderRadius: 1,
            }}
          />
        ) : null}
      </div>
      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: '#fafafa',
          borderRadius: 8,
          color: 'rgba(0,0,0,0.65)',
          fontSize: 12,
          lineHeight: 1.8,
        }}
      >
        <p style={{ margin: '0 0 4px' }}>
          <b>S19 列拖拽排序</b>（对齐 antd drag-column-sorting demo）：
        </p>
        <p style={{ margin: 0 }}>
          - 按住表头格左右拖拽 → 蓝色垂直指示线显示列插入位置；松手后列重排（表头与表体列同步）。
        </p>
        <p style={{ margin: 0 }}>
          - ★ <strong>方案 B（自研 pointer 列方向）</strong>：data-grid 用 CSS Grid 渲染，"列"非 DOM 元素，
          antd 的 dnd-kit（挂 <code>&lt;th&gt;</code> + transform 平移）方案在 data-grid 下破坏 grid 布局，
          且与 S17/S18 行拖拽同族理由不引入 @dnd-kit/*。故自研 pointer 列拖拽（参考 S17 useRowDragSort 列方向），
          <strong>restrictToHorizontalAxis 等效</strong>（仅水平 hit-test，纵向不影响 over）。
        </p>
        <p style={{ margin: 0 }}>
          - 与 antd 差异：antd 拖拽中表头跟随指针平移（transform）+ body cell borderInline 虚线指示 +
          DragOverlay 预览；data-grid 拖拽中显示垂直指示线（被拖列原位不动），松手后重排（功能等价）。
          拖拽手势通过外层容器<strong>事件委托</strong>命中叶子表头格（引擎给叶子表头格打
          <code>data-leaf-index</code>，hook 据此定位列，无需改引擎）。
        </p>
        <p style={{ margin: 0 }}>
          - 当前拖拽：{dragState ? `from #${dragState.fromIndex + 1} → 目标 #${dragState.overIndex + 1}` : '无'}
        </p>
        <p style={{ margin: 0 }}>
          - 当前列顺序：{columns.map((c) => c.title).join(' / ')}
        </p>
      </div>
    </div>
  )
}
