/**
 * M7 列宽拖拽调整 demo（增强能力，antd 无原生 resizable demo，自建演示）。
 *
 * === 决策 9 双栏对照（特例：右栏无 antd 原生对应）===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致——`resizable` + `resizableMinWidth`/
 *   `resizableMaxWidth` 演示 pointer 拖拽改列宽 + min/max 约束 + 部分列给 width / 部分不给
 *   （max-content → 首次拖拽转 px）。
 * - **右栏（antd 无原生 resizable）**：antd 6.4.4 Table **无原生列宽拖拽（resizable）能力**
 *   → 右栏**不渲染 antd 同名 demo**，而是一个说明区 + 一张静态 antd `<Table>` 作基线参照
 *   （同数据/同列，无拖拽手柄）。SplitDemo 的 `right` 传该说明区 + 静态基线 Table。
 * - **共享状态 + 控制条**：`resizable` / `minWidth` / `maxWidth` 三个控件只驱动左栏
 *   data-grid（右栏无此能力，控制条不作用于右栏——说明区已标注）。
 * - **共享数据**：`RecordType` + `data` 见 `_compare/resizable.shared.ts`。
 *
 * === 为什么右栏这样处理 ===
 *
 * antd Table 列宽策略是声明式（`column.width` / table layout 自动），**无交互式列宽拖拽**。
 * 若强行用 react-resizable 等第三方 wrapper 复刻 antd「社区方案」会让右栏变成非 antd 原生
 * 的三方拼装（偏离「右栏忠实 antd 原生」原则）。故按 task #38 规约，**resizable 右栏仅
 * 显示说明 + 静态基线 Table 作视觉对照**，列宽拖拽仅 data-grid 演示。
 *
 * === 两侧保留的差异 ===
 *
 * 1. **拖拽能力**：左栏有；右栏无（antd 原生不支持）。
 * 2. **Tag 实现**：左栏内联最小 Tag（引擎不依赖 antd Tag）；右栏 antd `<Tag>`（预设色 blue）。
 * 3. **Action 布局**：左栏内联 `<span>` + flex；右栏 antd `<Space>`。
 *
 * === 验证点（M7 + 决策 9）===
 *
 * 1. 鼠标移到左栏表头格右边缘 → 出现蓝色竖条手柄 + col-resize 光标。
 * 2. 按住拖拽 → 列宽实时变化（无抖动）；松手后列宽保持。
 * 3. 拖到 min/max 约束后无法继续缩/放。
 * 4. 关闭 resizable → 左栏表头无手柄。
 * 5. 右栏说明区文字清晰、静态基线 Table 渲染正确（同数据，无拖拽）。
 */
import { useState } from 'react'
import { Space, Switch, Table as AntdTable, Tag, InputNumber, Flex } from 'antd'
import type { TableProps } from 'antd'
import { Table } from '../table'
import type { ColumnType } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { data, type RecordType } from './_compare/resizable.shared'

/**
 * 左栏内联最小 Tag（data-grid 不依赖 antd Tag；视觉等价 antd 预设色 blue）。
 * 改造前行为保留。
 */
function InlineTag({
  color,
  children,
}: {
  color: string
  children: import('react').ReactNode
}) {
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
        background: `${bg}1a`, // ~10% alpha
        border: `1px solid ${bg}33`,
        marginRight: 4,
      }}
    >
      {children}
    </span>
  )
}

// ---------------------------------------------------------------------------
// 左栏（data-grid）列定义 —— 行为与改造前一致
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<RecordType>[] = [
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
      <span
        style={{
          display: 'inline-flex',
          flexWrap: 'wrap',
          gap: 4,
          alignItems: 'center',
        }}
      >
        {tags.map((tag) => (
          <InlineTag color="#1677ff" key={tag}>
            {tag.toUpperCase()}
          </InlineTag>
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

// ---------------------------------------------------------------------------
// 右栏（antd 静态基线）列定义 —— 无 resizable，仅视觉对照基准
// ---------------------------------------------------------------------------

const antdColumns: NonNullable<TableProps<RecordType>['columns']> = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    width: 150,
    render: (text) => <a>{text}</a>,
  },
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
  },
  {
    title: 'Tags',
    key: 'tags',
    dataIndex: 'tags',
    render: (_, { tags }) => (
      <Flex gap="small" align="center" wrap>
        {tags.map((tag) => (
          <Tag color="blue" key={tag}>
            {tag.toUpperCase()}
          </Tag>
        ))}
      </Flex>
    ),
  },
  {
    title: 'Description',
    dataIndex: 'description',
    key: 'description',
  },
]

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function ResizableDemo() {
  const [resizable, setResizable] = useState(true)
  const [minWidth, setMinWidth] = useState(30)
  const [maxWidth, setMaxWidth] = useState(400)

  return (
    <div style={{ padding: 24 }}>
      {/* ★ 控制条：仅驱动左栏 data-grid（右栏 antd 无 resizable 能力，故不作用于右栏）。 */}
      <div
        style={{
          marginBottom: 16,
          padding: 12,
          border: '1px solid #f0f0f0',
          borderRadius: 8,
          background: '#fff',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px 24px',
          alignItems: 'center',
        }}
      >
        <Space>
          <Switch
            checked={resizable}
            onChange={setResizable}
            checkedChildren="resizable"
            unCheckedChildren="resizable"
          />
        </Space>
        <Space>
          <span>min width:</span>
          <InputNumber
            value={minWidth}
            min={1}
            max={200}
            onChange={(v) => setMinWidth(Number(v) || 1)}
            style={{ width: 80 }}
            addonAfter="px"
          />
        </Space>
        <Space>
          <span>max width:</span>
          <InputNumber
            value={maxWidth}
            min={50}
            max={2000}
            onChange={(v) => setMaxWidth(Number(v) || 50)}
            style={{ width: 80 }}
            addonAfter="px"
          />
        </Space>
        <span style={{ color: 'rgba(0,0,0,0.45)', fontSize: 12 }}>
          控制条仅作用于左栏 data-grid（右栏 antd 无 resizable 原生能力）
        </span>
      </div>

      {/*
        minPaneWidth=480（窄表，5 列无 scroll.x）→ 横排阈值 ≈ 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={
          <Table<RecordType>
            columns={dgColumns}
            dataSource={data}
            resizable={resizable}
            resizableMinWidth={minWidth}
            resizableMaxWidth={maxWidth}
          />
        }
        right={
          <>
            <div
              style={{
                padding: 12,
                background: '#fff7e6',
                border: '1px solid #ffd591',
                borderRadius: 6,
                marginBottom: 12,
                fontSize: 12,
                color: 'rgba(0,0,0,0.85)',
                lineHeight: 1.7,
              }}
            >
              <strong>antd 6.4.4 Table 无原生列宽拖拽（resizable）能力。</strong>
              右栏仅 data-grid 演示；此处放一张静态 antd Table 作基线参照（同数据/同列，
              无拖拽手柄）。如需在 antd 下做列宽拖拽，社区常用 <code>react-resizable</code>
              等第三方 wrapper（非 antd 原生，本 demo 不复刻）。
            </div>
            <AntdTable<RecordType>
              columns={antdColumns}
              dataSource={data}
              pagination={false}
            />
          </>
        }
      >
        <div>
          <strong>对照说明（决策 9 B20 / M7 列宽拖拽）：</strong>
          左右并排呈现 data-grid resizable 与 antd 基线。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>右栏无 antd 原生对应</strong>：antd 6.4.4 Table 无原生
              <code> resizable</code> 能力，右栏仅显示说明 + 静态基线 Table（无拖拽手柄）。
              列宽拖拽为 data-grid 增强（M7），仅左栏演示。
            </li>
            <li>
              <strong>拖拽（左栏）</strong>：鼠标移到表头格<strong>右边缘</strong>出现蓝色竖条
              手柄（col-resize 光标），按住拖拽实时改列宽（pointer capture 无抖动），松手保持。
            </li>
            <li>
              <strong>min/max 约束</strong>：控制条
              <code> resizableMinWidth</code>/<code>resizableMaxWidth</code>
              约束拖拽范围（默认 min 30px，可调）。
            </li>
            <li>
              <strong>无 width 列</strong>：Address / Tags / Description 不给 width（max-content），
              首次拖拽即转为受控 px；Name / Age 给固定 width。
            </li>
            <li>
              <strong>Tag 实现</strong>：左栏内联最小 Tag（蓝 #1677ff）；右栏 antd
              <code>&lt;Tag color="blue"&gt;</code>。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
