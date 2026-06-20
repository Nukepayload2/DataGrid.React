/**
 * 复刻 antd drag-sorting-handler demo：
 *   `G:\Projects\ant-design\components\table\demo\drag-sorting-handler.tsx`
 *
 * === antd demo 要素（S18 拖拽手柄排序）===
 *
 * - **手柄列**：首列 `{ key:'sort', align:'center', width:80, render: () => <DragHandle/> }`，
 *   无 title（视觉上为空白表头列）。DragHandle = `Button(type=text, size=small)` + `HolderOutlined`
 *   图标，cursor:move；dnd-kit 下绑 `setActivatorNodeRef` + `listeners`（仅手柄触发拖拽）。
 * - Name / Age / Address 三数据列。
 * - 3 行数据（John Brown / Jim Green / Joe Black）。
 * - DndContext（restrictToVerticalAxis）+ SortableContext（verticalListSortingStrategy）+
 *   Row（useSortable）+ `onDragEnd` arrayMove 重排。
 *
 * === ★ data-grid 适配：复用 S17 useRowDragSort + handleSelector 限定手柄列 ===
 *
 * data-grid 用 CSS Grid 渲染，"行"非 DOM 元素，故不依赖 @dnd-kit/*（详见 `useRowDragSort.ts`
 * 文件头方案选择说明）。S18 复用 S17 自研的 `useRowDragSort` hook，仅**新增手柄列限定**：
 *
 * - **handleSelector option**：`useRowDragSort` 新增 `handleSelector?: string`（S17 不传 = 任意
 *   body 单元格触发；S18 传 `.dg-drag-handle` = 仅手柄列触发）。pointerdown 时若传 handleSelector，
 *   hook 先判 `target.closest(handleSelector)` 命中手柄元素才启动拖拽；点 Name/Age/Address 不命中
 *   手柄 → 不启动。其余拖拽逻辑（setPointerCapture + hit-test + 指示线 + arrayMove）完全复用 S17。
 *
 * - **DragHandle**：自绘 HolderOutlined SVG（**不 import @ant-design/icons**——与项目约定一致，
 *   `@ant-design/icons` 未在 package.json 直接声明，仅 antd 间接依赖；引擎 `FilterDropdown.tsx`
 *   自绘 caret-down、`custom-filter-panel.tsx` demo 自绘 SearchOutlined 同款约定），包裹 antd
 *   `<Button type="text" size="small">`（决策 6：非表格核心通用控件用 antd），加 `.dg-drag-handle`
 *   class（供 handleSelector 命中）+ cursor:move。
 *
 * - **手柄列**：`{ key:'sort', align:'center', width:80, render: () => <DragHandle/> }`，无 title。
 *
 * === 与 antd 的差异 ===
 *
 * - antd 拖拽中：被拖行 `<tr>` 跟随指针平移（transform）；data-grid 拖拽中：显示**指示线**（被拖行
 *   原位不动，指示线提示插入位置），松手后重排。功能等价（行重排），视觉略异。
 * - antd 用 `@dnd-kit/*`；data-grid 自研 pointer（方案 B，理由见 useRowDragSort.ts）。
 * - antd DragHandle 绑 dnd-kit `setActivatorNodeRef` + `listeners`；data-grid DragHandle 仅作
 *   命中标识（`.dg-drag-handle` class）——拖拽手势通过外层容器事件委托 + handleSelector 限定命中。
 *
 * === 验证点（S18）===
 *
 * 1. 首列为手柄列（HolderOutlined 图标 + cursor:move），表头格为空（无 title）。
 * 2. **仅手柄列触发拖拽**：按住手柄上下拖 → 蓝色指示线显示插入位置；松手后行重排。
 * 3. **其他列不触发**：按住 Name/Age/Address 上下拖 → 无指示线、无重排（与 S17 整行可拖不同）。
 * 4. 在首行之上 / 末行之下拖拽 → 指示线显示在表头下/末行下，松手后行移到最前/最后。
 * 5. 3 行数据重排正确（arrayMove 算法对齐 @dnd-kit/sortable）。
 * 6. 回归：S17 drag-sorting（无 handleSelector → 任意单元格触发）不变；非拖拽 demo 不破。
 */

import { useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Button } from 'antd'
import { Table } from '../table'
import { useRowDragSort } from '../table'
import type { ColumnType } from '../table'

interface DataType {
  key: string
  name: string
  age: number
  address: string
}

/**
 * 内联 HolderOutlined（拖拽手柄"六点"图标）——避免直接依赖 @ant-design/icons（仅 antd 间接依赖）。
 * 与 antd HolderOutlined 视觉一致；size 跟随父节点 font-size（1em）。
 * 路径取自 antd icons HolderOutlined（fill="currentColor"）。
 */
function HolderOutlined({ style }: { style?: CSSProperties }): ReactNode {
  return (
    <svg
      viewBox="0 0 1024 1024"
      width="1em"
      height="1em"
      fill="currentColor"
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: '-0.125em', ...style }}
    >
      <path d="M300 276.5a56 56 0 1 0 56-96.99 56 56 0 0 0-56 96.99Zm0 404.31a56 56 0 1 0 56 96.99 56 56 0 0 0-56-96.99ZM404 512a56 56 0 1 0 112 0 56 56 0 0 0-112 0ZM300 109.5a56 56 0 1 0 56-96.99 56 56 0 0 0-56 96.99ZM652.5 56a56 56 0 1 0-56 96.99 56 56 0 0 0 56-96.99Zm0 768a56 56 0 1 0-56 96.99 56 56 0 0 0 56-96.99ZM640 416a56 56 0 1 0 112 0 56 56 0 0 0-112 0ZM724 180.5a56 56 0 1 0 56 96.99 56 56 0 0 0-56-96.99ZM724 680.81a56 56 0 1 0 56-96.99 56 56 0 0 0-56 96.99Z" />
    </svg>
  )
}

/** DragHandle：手柄列单元格内容。cursor:move + .dg-drag-handle class（供 handleSelector 命中）。 */
function DragHandle() {
  return (
    <Button
      type="text"
      size="small"
      className="dg-drag-handle"
      icon={<HolderOutlined />}
      style={{ cursor: 'move' }}
    />
  )
}

export default function DragSortingHandlerDemo() {
  const [dataSource, setDataSource] = useState<DataType[]>([
    { key: '1', name: 'John Brown', age: 32, address: 'Long text Long' },
    { key: '2', name: 'Jim Green', age: 42, address: 'London No. 1 Lake Park' },
    { key: '3', name: 'Joe Black', age: 32, address: 'Sidney No. 1 Lake Park' },
  ])

  // 外层容器 ref（指示线相对此容器绝对定位；hit-test 遍历容器内 [data-row-index] 单元格）。
  const containerRef = useRef<HTMLDivElement>(null)

  const { dragState, indicator, containerProps } = useRowDragSort<DataType>({
    dataSource,
    rowKey: 'key',
    onSort: setDataSource,
    containerRef,
    // S18 手柄列限定：仅 .dg-drag-handle 命中才启动拖拽（Name/Age/Address 不触发）。
    handleSelector: '.dg-drag-handle',
  })

  // 列：首列手柄（DragHandle + align center width 80，无 title）+ Name/Age/Address（对齐 antd demo）。
  const columns: ColumnType<DataType>[] = [
    {
      key: 'sort',
      align: 'center',
      width: 80,
      render: () => <DragHandle />,
    },
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
      {/* 外层相对定位容器：挂 containerProps.onPointerDown（事件委托 + handleSelector 限定命中
          手柄列启动拖拽）；指示线（绝对定位）相对此容器；Table 正常渲染。 */}
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
          <b>S18 拖拽手柄排序</b>（对齐 antd drag-sorting-handler demo）：
        </p>
        <p style={{ margin: 0 }}>
          - 首列为手柄列（HolderOutlined 图标 + cursor:move）。<strong>仅按住手柄上下拖拽</strong>
          才启动排序 → 蓝色指示线显示插入位置；松手后行重排。点 Name/Age/Address 不触发。
        </p>
        <p style={{ margin: 0 }}>
          - ★ <strong>复用 S17 useRowDragSort</strong>：新增 <code>handleSelector: '.dg-drag-handle'</code>
          option 限定手柄列触发（S17 不传 = 任意单元格触发，零回归）。DragHandle 加
          <code>.dg-drag-handle</code> class 供命中。
        </p>
        <p style={{ margin: 0 }}>
          - ★ <strong>自绘 HolderOutlined SVG</strong>（非 <code>@ant-design/icons</code>——与项目约定
          一致，<code>@ant-design/icons</code> 仅 antd 间接依赖；引擎 FilterDropdown caret-down /
          custom-filter-panel SearchOutlined 同款自绘约定）。Button 用 antd（决策 6）。
        </p>
        <p style={{ margin: 0 }}>
          - 与 antd 差异：拖拽中显示指示线（antd 是 transform 平移整行），松手后重排（功能等价）。
          手柄触发通过事件委托 + handleSelector 命中（antd 用 dnd-kit setActivatorNodeRef+listeners）。
        </p>
        <p style={{ margin: 0 }}>
          - 当前拖拽：{dragState ? `from #${dragState.fromIndex + 1} → 目标 #${dragState.overIndex + 1}` : '无'}
        </p>
      </div>
    </div>
  )
}
