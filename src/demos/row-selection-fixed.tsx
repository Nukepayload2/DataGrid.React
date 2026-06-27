/**
 * 复刻 antd 测试 `Table.rowSelection.test.tsx:807-829`（selection 列邻列 fixed 继承）
 * + useSelection.tsx:694-717 的继承逻辑，用双栏 demo 可视化对照。
 *
 * === 验证目标（写在此处便于无 console 环境核对）===
 *
 * 1. **首列 fixed=on + rowSelection.fixed=auto**：两侧 selection 列都跟随 fixed:'start'，
 *    固定到最左（与 Name 列同侧）—— 邻列继承生效（对齐 antd useSelection.tsx:703-707
 *    nextCol 优先）。
 * 2. **首列 fixed=off + rowSelection.fixed=auto**：两侧 selection 列都不固定（随横向滚动）。
 * 3. **rowSelection.fixed='end'**：显式覆盖邻列继承，两侧 selection 列固定到最右
 *    （优先级：显式 > 继承）。
 * 4. **rowSelection.fixed='start'**：显式固定到最左（与首列 fixed 无关）。
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行选择列 fixed 继承邻列（A1 修复后行为）。
 * - **右栏（antd Table）**：antd useSelection 原生继承逻辑（对照基准）。
 * - **共享控制条**：Selection type（checkbox/radio）、First column fixed 开关、
 *   rowSelection.fixed 选择（auto / 'start' / 'end'）—— 同一组 state 同时驱动两侧。
 * - **同构列**：首列 Name（width 200，fixed 由开关控）→ 中间 6 个占位列（width 100）→
 *   末列 Action（width 100，fixed 'end'，render `<a>action</a>`）。两侧列定义结构等价。
 * - **scroll={{ x: 1200 }}**：强制横向滚动，让 fixed 效果可见。
 *
 * === antd 测试要素（Table.rowSelection.test.tsx:807-829）===
 *
 * - 首列 fixed:'left'，rowSelection 不设 fixed → selection 列应继承 fixed:'left'（antd 行为）。
 * - data-grid 对齐为 fixed:'start'（normalizeFixed 把 'left' 映射 'start'）。
 */

import { useMemo, useState } from 'react'
import { Radio, Switch, Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import { Table } from '../table'
import type { ColumnType, TableRowSelection } from '../table'
import { SplitDemo } from './_compare/SplitDemo'

// ---------------------------------------------------------------------------
// 共享数据（两侧同构）
// ---------------------------------------------------------------------------

interface RecordType {
  key: string
  name: string
}

const data: RecordType[] = [
  { key: '1', name: 'Edward King 0' },
  { key: '2', name: 'Edward King 1' },
  { key: '3', name: 'Edward King 2' },
  { key: '4', name: 'Edward King 3' },
]

// ---------------------------------------------------------------------------
// 列定义（两侧同构；首列 fixed 由 firstColFixed 开关控，末列固定 'end'）
// ---------------------------------------------------------------------------

function buildColumns(firstColFixed: boolean): ColumnType<RecordType>[] {
  const middle: ColumnType<RecordType>[] = Array.from({ length: 6 }, (_, i) => ({
    title: `Col ${i + 1}`,
    dataIndex: `col${i + 1}`,
    width: 100,
    render: () => '—',
  }))
  return [
    {
      title: 'Name',
      dataIndex: 'name',
      width: 200,
      fixed: firstColFixed ? 'start' : undefined,
    },
    ...middle,
    {
      title: 'Action',
      key: 'action',
      width: 100,
      fixed: 'end',
      render: () => <a>action</a>,
    },
  ]
}

function buildAntdColumns(
  firstColFixed: boolean,
): NonNullable<TableProps<RecordType>['columns']> {
  const middle: NonNullable<TableProps<RecordType>['columns']>[number][] =
    Array.from({ length: 6 }, (_, i) => ({
      title: `Col ${i + 1}`,
      dataIndex: `col${i + 1}`,
      width: 100,
      render: () => '—',
    }))
  return [
    {
      title: 'Name',
      dataIndex: 'name',
      width: 200,
      fixed: firstColFixed ? 'left' : undefined,
    },
    ...middle,
    {
      title: 'Action',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: () => <a>action</a>,
    },
  ]
}

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

type SelectionType = 'checkbox' | 'radio'
type SelFixed = 'auto' | 'start' | 'end'

const rowSelectionFixedOptions: Array<{ value: SelFixed; label: string }> = [
  { value: 'auto', label: 'auto (邻列继承)' },
  { value: 'start', label: "start ('left')" },
  { value: 'end', label: "end ('right')" },
]

const selectionTypeOptions: Array<{ value: SelectionType; label: string }> = [
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'radio', label: 'Radio' },
]

export default function RowSelectionFixedDemo() {
  // ★ 共享状态：同一组 state 同时驱动两侧表格。
  const [selectionType, setSelectionType] = useState<SelectionType>('checkbox')
  const [firstColFixed, setFirstColFixed] = useState(true)
  const [selFixed, setSelFixed] = useState<SelFixed>('auto')
  const [selectedKeys, setSelectedKeys] = useState<Array<React.Key>>([])

  const dgColumns = useMemo(() => buildColumns(firstColFixed), [firstColFixed])
  const antdColumns = useMemo(() => buildAntdColumns(firstColFixed), [
    firstColFixed,
  ])

  // rowSelection.fixed：'auto' = 不传（走邻列继承），其余显式传 'start'/'end'。
  const fixedProp = selFixed === 'auto' ? undefined : selFixed

  // 左栏（data-grid）rowSelection。
  const dgRowSelection: TableRowSelection<RecordType> = {
    type: selectionType,
    fixed: fixedProp,
    selectedRowKeys: selectedKeys,
    onChange: (keys) => setSelectedKeys(keys),
  }

  // 右栏（antd）rowSelection：fixed 用 antd 原生 'left'/'right'（'start'→'left', 'end'→'right'）。
  const antdFixedProp =
    fixedProp === 'start' ? 'left' : fixedProp === 'end' ? 'right' : undefined
  const antdRowSelection: TableProps<RecordType>['rowSelection'] = {
    type: selectionType,
    fixed: antdFixedProp,
    selectedRowKeys: selectedKeys,
    onChange: (keys: React.Key[]) => setSelectedKeys(keys),
  }

  return (
    <div style={{ padding: 24 }}>
      {/*
        minPaneWidth=520（含 selection 列 + 8 列 + scroll.x=1200）→ 横排阈值 ≈ 1056。
        常规笔记本视口（≥1280）横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={520}
        left={
          <Table<RecordType>
            columns={dgColumns}
            rowSelection={dgRowSelection}
            dataSource={data}
            scroll={{ x: 1200 }}
            pagination={{}}
          />
        }
        right={
          <AntdTable<RecordType>
            columns={antdColumns}
            rowSelection={antdRowSelection}
            dataSource={data}
            scroll={{ x: 1200 }}
            pagination={false}
          />
        }
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 24,
            alignItems: 'center',
          }}
        >
          {/* Selection type */}
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontWeight: 500 }}>Selection type:</span>
            <Radio.Group
              value={selectionType}
              onChange={(e) => {
                setSelectionType(e.target.value)
                setSelectedKeys([])
              }}
              options={selectionTypeOptions}
              optionType="button"
              buttonStyle="solid"
            />
          </label>

          {/* First column fixed 开关 */}
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontWeight: 500 }}>First column fixed:</span>
            <Switch
              checked={firstColFixed}
              onChange={(v) => setFirstColFixed(v)}
            />
          </label>

          {/* rowSelection.fixed 选择 */}
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontWeight: 500 }}>rowSelection.fixed:</span>
            <Radio.Group
              value={selFixed}
              onChange={(e) => setSelFixed(e.target.value)}
              options={rowSelectionFixedOptions}
              optionType="button"
              buttonStyle="solid"
            />
          </label>
        </div>

        <div style={{ marginTop: 12, color: 'rgba(0,0,0,0.65)', fontSize: 13 }}>
          <strong>验证点：</strong>
          <ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>
            <li>
              <code>First column fixed=on + rowSelection.fixed=auto</code> →
              两侧 selection 列跟随 fixed 到最左（<strong>邻列继承</strong>，
              对齐 antd useSelection.tsx:703-707 nextCol 优先）。
            </li>
            <li>
              <code>First column fixed=off + rowSelection.fixed=auto</code> →
              两侧 selection 列不固定（随横向滚动）。
            </li>
            <li>
              <code>rowSelection.fixed='end'</code> → 显式覆盖继承，两侧
              selection 列固定到最右（优先级：显式 &gt; 继承）。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
