/**
 * M7 列宽拖拽调整 demo（增强能力，antd 无原生 resizable demo，自建演示）。
 *
 * 展示：
 *   1. 普通表格 + `resizable`：每个叶子表头格右边缘出现拖拽手柄，pointer 拖拽实时改列宽。
 *   2. 部分列给 `width`（受控 px），部分列不给（max-content）——拖拽后者时首次 move 即转为 px。
 *   3. 控制面板：实时显示当前各列宽度（读 ref 内部 resizedWidths 非易事，故改为"拖拽提示 +
 *      min/max 配置演示"）。这里演示 `resizableMinWidth`/`resizableMaxWidth` 约束生效。
 *
 * 验证点（M7）：
 *   1. 鼠标移到表头格右边缘 → 出现蓝色竖条手柄 + col-resize 光标。
 *   2. 按住拖拽 → 列宽实时变化（无抖动、不丢失 pointer）；松手后列宽保持。
 *   3. 拖到 min（默认 30px）后无法继续缩小；max（本 demo 演示设 400px）后无法继续放大。
 *   4. 多列可分别拖拽；拖拽一列不影响其它列宽度（grid-template-columns 逐 track 独立）。
 *   5. 控制面板开关 `resizable`：关闭后表头无手柄，列宽回到 column.width/max-content。
 *
 * 无组合复杂度（此 demo 为基础表格）；与固定列/多级表头/虚拟的组合见各自 demo
 * （固定列 demo 加 resizable 即可验证 M2 组合；此处聚焦拖拽本身）。
 */
import { useState } from 'react'
import { Table } from '../table'
import type { ColumnType } from '../table'

interface DataType {
  key: string
  name: string
  age: number
  address: string
  tags: string[]
  description: string
}

const data: DataType[] = [
  {
    key: '1',
    name: 'John Brown',
    age: 32,
    address: 'New York No. 1 Lake Park',
    tags: ['nice', 'developer'],
    description: 'A friendly developer from New York.',
  },
  {
    key: '2',
    name: 'Jim Green',
    age: 42,
    address: 'London No. 1 Lake Park',
    tags: ['kawaii'],
    description: 'Lives near the park in London.',
  },
  {
    key: '3',
    name: 'Joe Black',
    age: 32,
    address: 'Sydney No. 1 Lake Park',
    tags: ['cool', 'teacher'],
    description: 'A cool teacher based in Sydney.',
  },
]

/** 演示用 Tag（与 basic demo 同款最小实现）。 */
function Tag({ color, children }: { color: string; children: import('react').ReactNode }) {
  const bg = color
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0 7px',
        fontSize: 12,
        lineHeight: '20px',
        borderRadius: 4,
        color: bg,
        background: `${bg}1a`,
        border: `1px solid ${bg}33`,
        marginRight: 4,
      }}
    >
      {children}
    </span>
  )
}

const baseColumns: ColumnType<DataType>[] = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    width: 150,
    render: (text) => <a>{text}</a>,
  },
  // 无 width 列：拖拽时首次 move 从 max-content 转为受控 px。
  {
    title: 'Age',
    dataIndex: 'age',
    key: 'age',
    width: 80,
  },
  {
    title: 'Address',
    dataIndex: 'address',
    key: 'address',
    // 不给 width → max-content；拖拽后转 px。
  },
  {
    title: 'Tags',
    key: 'tags',
    dataIndex: 'tags',
    render: (_, { tags }) => (
      <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
        {tags.map((tag) => (
          <Tag color="#1677ff" key={tag}>
            {tag.toUpperCase()}
          </Tag>
        ))}
      </span>
    ),
  },
  {
    title: 'Description',
    dataIndex: 'description',
    key: 'description',
  },
]

export default function ResizableDemo() {
  const [resizable, setResizable] = useState(true)
  const [minWidth, setMinWidth] = useState(30)
  const [maxWidth, setMaxWidth] = useState(400)

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16, color: 'rgba(0,0,0,0.65)', fontSize: 13, lineHeight: 1.8 }}>
        <p style={{ margin: '0 0 8px' }}>
          鼠标移到任意表头格<strong>右边缘</strong>，会出现蓝色竖条手柄（col-resize 光标）。按住拖拽即可实时改变该列宽度。
        </p>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>Name / Age 列给了固定 width；Address / Tags / Description 为 max-content，首次拖拽即转为受控 px。</li>
          <li>拖拽流畅无抖动（pointer capture）；松手后列宽保持。</li>
          <li>受 min/max 约束（默认 min 30px，本 demo 可调）。</li>
          <li>关闭 resizable 后表头无手柄，列宽回到原 column.width / max-content。</li>
        </ul>
      </div>

      {/* 控制面板 */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px 24px',
          alignItems: 'center',
          padding: 12,
          border: '1px solid #f0f0f0',
          borderRadius: 8,
          marginBottom: 16,
          background: '#fafafa',
        }}
      >
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <input
            type="checkbox"
            checked={resizable}
            onChange={(e) => setResizable(e.target.checked)}
          />
          resizable
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          min width:
          <input
            type="number"
            value={minWidth}
            min={1}
            max={200}
            onChange={(e) => setMinWidth(Number(e.target.value) || 1)}
            style={{ width: 70 }}
          />
          px
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          max width:
          <input
            type="number"
            value={maxWidth}
            min={50}
            max={2000}
            onChange={(e) => setMaxWidth(Number(e.target.value) || 50)}
            style={{ width: 70 }}
          />
          px
        </label>
      </div>

      <Table<DataType>
        columns={baseColumns}
        dataSource={data}
        resizable={resizable}
        resizableMinWidth={minWidth}
        resizableMaxWidth={maxWidth}
      />
    </div>
  )
}
