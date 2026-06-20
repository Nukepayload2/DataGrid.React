/**
 * 复刻 antd drag-sorting demo：
 *   `G:\Projects\ant-design\components\table\demo\drag-sorting.tsx`
 *
 * === antd demo 要素 ===
 *
 * - 3 行数据（John Brown / Jim Green / Joe Black；address 第 1 行为超长文本，测换行行高）。
 * - 列：Name / Age / Address。
 * - `DndContext`（PointerSensor distance:1 + restrictToVerticalAxis）+ `SortableContext`
 *   （items = rowKey 数组，verticalListSortingStrategy）+ `components.body.row = Row`（useSortable）。
 * - Row：`useSortable(id = data-row-key)`，setNodeRef 挂 `<tr>` + transform 跟随指针 + listeners +
 *   cursor:move + isDragging 时 zIndex 9999。
 * - `onDragEnd`：arrayMove(prev, activeIndex, overIndex) → setDataSource。
 *
 * === ★ data-grid 适配：方案 B 自研 pointer 行拖拽（不依赖 @dnd-kit/*）===
 *
 * data-grid 用 CSS Grid 渲染，"行"不是 DOM 元素（单元格直接是 grid item）。antd 方案（dnd-kit
 * 挂 `<tr>`）在 data-grid 下无"行 DOM"可挂，且引入"行容器 div"会破坏 M2/M3/M4/M9 布局
 * （详见 `useRowDragSort.ts` 文件头方案选择说明）。
 *
 * 故本 demo 用 data-grid 自研的 `useRowDragSort` hook：
 *
 * - **拖拽手势（事件委托）**：Table 外层包一个 `position:relative` 容器，挂 hook 返回的
 *   `containerProps.onPointerDown`。hook 内部判定 pointerdown 的 target 是否命中 body 单元格
 *   （`closest('[data-row-index]')`——data-grid 引擎给每个 body 单元格打 `data-row-index` 属性），
 *   命中则启动拖拽。**无需修改引擎**、**无需 components 机制**、**无需 onCell 透传**。
 *
 * - **拖拽指示线**：`useRowDragSort.indicator` 驱动一条绝对定位蓝色横线（top = 目标间隙 Y，
 *   left/right = 0 跨整行），作为外层容器子元素渲染。指示线**不是 grid item**（是 container 子元素，
 *   Table 内部 dg-grid 的直接子元素仍是单元格），不影响 grid-template-rows 计算（零回归）。
 *
 * - **行重排**：松手且 over≠from 时 hook 调 `onSort(arrayMove(...))` → setDataSource → Table 重渲染，
 *   行瞬间到新位置。
 *
 * === 与 antd 的差异 ===
 *
 * - antd 拖拽中：被拖行 `<tr>` 跟随指针平移（transform）；data-grid 拖拽中：显示**指示线**（被拖行
 *   原位不动，指示线提示插入位置），松手后重排。功能等价（行重排），视觉略异。
 * - antd 用 `@dnd-kit/*`；data-grid 自研 pointer（方案 B，理由见 useRowDragSort.ts）。
 * - antd Row 挂 listeners 在整 `<tr>`；data-grid 通过事件委托命中任意 body 单元格（整行均可拖）。
 *
 * === 验证点（S17）===
 *
 * 1. body 单元格（任意列）cursor 默认；按住任意 body 单元格上下拖拽即可启动（事件委托）。
 * 2. 按住单元格上下拖拽 → 蓝色指示线跟随指针，显示"松手后插入位置"。
 * 3. 松手 → 行重排（dataSource 按指示线位置 arrayMove）。
 * 4. 在首行之上 / 末行之下拖拽 → 指示线显示在表头下/末行下，松手后行移到最前/最后。
 * 5. 超长 address 行（第 1 行）行高自适应（auto），拖拽时 hit-test 按实际行边界算（不假设固定行高）。
 * 6. 回归：basic/head/virtual-list/树形/编辑等 demo 不受影响（本 demo 不改引擎渲染层）。
 */

import { useRef, useState } from 'react'
import { Table } from '../table'
import { useRowDragSort } from '../table'
import type { ColumnType } from '../table'

interface DataType {
  key: string
  name: string
  age: number
  address: string
}

export default function DragSortingDemo() {
  const [dataSource, setDataSource] = useState<DataType[]>([
    {
      key: '1',
      name: 'John Brown',
      age: 32,
      address:
        'Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text Long text',
    },
    {
      key: '2',
      name: 'Jim Green',
      age: 42,
      address: 'London No. 1 Lake Park',
    },
    {
      key: '3',
      name: 'Joe Black',
      age: 32,
      address: 'Sidney No. 1 Lake Park',
    },
  ])

  // 外层容器 ref（指示线相对此容器绝对定位；hit-test 遍历容器内 [data-row-index] 单元格）。
  const containerRef = useRef<HTMLDivElement>(null)

  const { dragState, indicator, containerProps } = useRowDragSort<DataType>({
    dataSource,
    rowKey: 'key',
    onSort: setDataSource,
    containerRef,
  })

  // 列：Name / Age / Address（对齐 antd demo）。无需 onCell/components——拖拽手势通过外层容器事件委托。
  const columns: ColumnType<DataType>[] = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Age',
      dataIndex: 'age',
      key: 'age',
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      {/* 外层相对定位容器：挂 containerProps.onPointerDown（事件委托命中 body 单元格启动拖拽）；
          指示线（绝对定位）相对此容器；Table 正常渲染。 */}
      <div ref={containerRef} style={{ position: 'relative' }} {...containerProps}>
        <Table<DataType> rowKey="key" columns={columns} dataSource={dataSource} />
        {/* 拖拽指示线：绝对定位蓝色横线，跨整行（left:0/right:0 相对 container）。
            非 grid item（是 container 子元素，Table 内部 dg-grid 的直接子元素仍是单元格），
            不影响 grid-template-rows 计算。 */}
        {indicator.visible ? (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: indicator.top,
              left: indicator.left,
              right: indicator.right,
              height: 2,
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
          <b>S17 行拖拽排序</b>（对齐 antd drag-sorting demo）：
        </p>
        <p style={{ margin: 0 }}>
          - 按住任意 body 单元格上下拖拽 → 蓝色指示线显示插入位置；松手后行重排。
        </p>
        <p style={{ margin: 0 }}>
          - ★ <strong>方案 B（自研 pointer）</strong>：data-grid 用 CSS Grid 渲染，"行"非 DOM 元素，
          antd 的 dnd-kit（挂 <code>&lt;tr&gt;</code>）方案在 data-grid 下无"行 DOM"可挂，
          且引入行容器 div 会破坏 M2/M3/M4/M9 布局。故自研 pointer 行拖拽（参考 M7 useColumnResize 风格），
          <strong>不依赖 @dnd-kit/*</strong>（决策 6 允许）。
        </p>
        <p style={{ margin: 0 }}>
          - 与 antd 差异：antd 拖拽中行跟随指针平移（transform）；data-grid 拖拽中显示指示线，
          松手后重排（功能等价）。拖拽手势通过外层容器<strong>事件委托</strong>命中 body 单元格
          （引擎给 body 单元格打 <code>data-row-index</code>，hook 据此定位行，无需改引擎）。
        </p>
        <p style={{ margin: 0 }}>
          - 当前拖拽：{dragState ? `from #${dragState.fromIndex + 1} → 目标 #${dragState.overIndex + 1}` : '无'}
        </p>
      </div>
    </div>
  )
}
