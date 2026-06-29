/**
 * 多行成块重排（multi-row reorder）单栏 demo：拖动一个**已选中**的行时，
 * 连同其它选中行成块移动到目标位置（保持选中行间相对顺序）。
 *
 * - 默认开 multiRowReorder：勾选 3 行（含被拖行）→ 拖其中一行到别处 → 3 行成块移动到目标位置
 *   （保持 3 行之间的相对顺序，整块平移，不会拆散）。
 * - 关 multiRowReorder：只移被拖行（其它选中行原地不动）。
 * - 边界：被拖行未选中 → 只移它（即使 multiRowReorder 开）；目标落在选中块内部 → no-op。
 */

import { useRef, useState } from 'react'
import { Button, Space, Switch, theme } from 'antd'
import type { FC } from 'react'
import { Table } from '../table'
import { useRowDragSort } from '../table'
import type { ColumnType, TableRowSelection } from '../table'
// 本 demo 非 SplitDemo（无自动限高），ON 时用 div height:400 包裹 Table 提供虚拟窗口可滚动高度。
import { useVirtualization } from './VirtualizationContext'
import { DemoToolbar } from './_compare/DemoToolbar'

/** 本 demo 记录类型。 */
interface RecordType {
  key: string
  name: string
  age: number
  address: string
}

/** 初始数据（6 行，便于选中 3 行 + 留出目标空位）。 */
const initialData: RecordType[] = [
  { key: '1', name: 'John Brown', age: 32, address: 'New York No. 1 Lake Park' },
  { key: '2', name: 'Jim Green', age: 42, address: 'London No. 1 Lake Park' },
  { key: '3', name: 'Joe Black', age: 32, address: 'Sidney No. 1 Lake Park' },
  { key: '4', name: 'Jon Snow', age: 28, address: 'Winterfell' },
  { key: '5', name: 'Arya Stark', age: 24, address: 'Braavos' },
  { key: '6', name: 'Sansa Stark', age: 26, address: 'Winterfell' },
]

/** 行拖手柄（Button + 内联 HolderOutlined SVG + .dg-drag-handle class）。 */
const InlineHolderOutlined: FC = () => (
  <svg
    viewBox="0 0 1024 1024"
    width="1em"
    height="1em"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M384 128a64 64 0 1 0-128 0 64 64 0 0 0 128 0zm0 384a64 64 0 1 0-128 0 64 64 0 0 0 128 0zm0 384a64 64 0 1 0-128 0 64 64 0 0 0 128 0zm384-768a64 64 0 1 0-128 0 64 64 0 0 0 128 0zm0 384a64 64 0 1 0-128 0 64 64 0 0 0 128 0zm0 384a64 64 0 1 0-128 0 64 64 0 0 0 128 0z" />
  </svg>
)

/** 拖拽手柄按钮——pointerdown 命中 .dg-drag-handle 才启动拖（useRowDragSort handleSelector）。 */
const DragHandle: FC = () => (
  <Button
    type="text"
    size="small"
    className="dg-drag-handle"
    style={{ cursor: 'grab', padding: '0 4px' }}
    aria-label="drag handle"
  >
    <InlineHolderOutlined />
  </Button>
)

/** 列定义：首列手柄 + Name/Age/Address。 */
const columns: ColumnType<RecordType>[] = [
  { key: 'sort', align: 'center', width: 64, render: () => <DragHandle /> },
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Age', dataIndex: 'age', key: 'age', width: 80 },
  { title: 'Address', dataIndex: 'address', key: 'address' },
]

export default function DragMultiRowReorderDemo() {
  const { token } = theme.useToken()
  const [dataSource, setDataSource] = useState<RecordType[]>(initialData)
  // 受控 selection（透传给 useRowDragSort 做成块重排判定）。
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  // multiRowReorder 开关（默认 true）。
  const [multiRowReorder, setMultiRowReorder] = useState(true)
  // ON 时 Table 叠加 virtual=true + scroll.y，并用 div height:400 包裹。
  const { virtual } = useVirtualization()

  const containerRef = useRef<HTMLDivElement>(null)

  const rowSelection: TableRowSelection<RecordType> = {
    type: 'checkbox',
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
  }

  const { dragState, indicator, containerProps } = useRowDragSort<RecordType>({
    dataSource,
    rowKey: 'key',
    onSort: setDataSource,
    containerRef,
    handleSelector: '.dg-drag-handle',
    // 多行成块重排——透传 multiRowReorder + selectedRowKeys。
    multiRowReorder,
    selectedRowKeys,
  })

  return (
    <div style={{ padding: 24 }}>
      <DemoToolbar>
        <Space>
          <Switch
            checked={multiRowReorder}
            onChange={setMultiRowReorder}
            checkedChildren="MultiRowReorder"
            unCheckedChildren="MultiRowReorder"
          />
          <span style={{ fontSize: 12, color: token.colorTextTertiary }}>
            已选 {selectedRowKeys.length} 行
          </span>
        </Space>
        <div style={{ marginTop: 8, fontSize: 12, color: token.colorTextSecondary }}>
          操作：勾选多行（如 3 行）→ 拖其中任一选中行的手柄到别处 →
          {multiRowReorder
            ? '所有选中行成块移动到目标位置（保持相对顺序）。'
            : '只移被拖行（其它选中行不动）。'}
          <br />
          边界：被拖行未选中→只移它；目标落在选中块内部→no-op。
        </div>
      </DemoToolbar>

      <div ref={containerRef} style={{ position: 'relative' }} {...containerProps}>
        {/* 本 demo 非 SplitDemo（无自动限高），ON 时用固定 height:400 的 div 包裹 Table
            提供虚拟窗口可滚动高度。 */}
        <div style={virtual ? { height: 400 } : undefined}>
          <Table<RecordType>
            rowKey="key"
            columns={columns}
            dataSource={dataSource}
            rowSelection={rowSelection}
            pagination={{}}
            /* ON 时 virtual=true + scroll.y:true（CSS 自适应填满上方 400px 包裹层，
               虚拟窗口才有滚动区；多行成块拖拽命中区在虚拟窗口内，正常接入）。 */
            virtual={virtual}
            scroll={virtual ? { y: true } : undefined}
          />
        </div>
        {indicator.visible ? (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: indicator.top,
              left: indicator.left,
              right: indicator.right,
              height: 2,
              background: token.colorPrimary,
              zIndex: 9999,
              pointerEvents: 'none',
              borderRadius: 1,
            }}
          />
        ) : null}
        <div style={{ marginTop: 8, fontSize: 12, color: token.colorTextTertiary }}>
          当前拖拽：
          {dragState ? `from #${dragState.fromIndex + 1} → 目标 #${dragState.overIndex + 1}` : '无'}
          ；当前行顺序：{dataSource.map((r) => r.name).join(' / ')}
        </div>
      </div>
    </div>
  )
}
