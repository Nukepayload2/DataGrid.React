/**
 * 复刻 antd multiple-sorter demo：`G:\Projects\ant-design\components\table\demo\multiple-sorter.tsx`。
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致（Chinese multiple:3 / Math multiple:2 /
 *   English multiple:1 / onChange console.log）。
 * - **右栏（antd Table）**：忠实复刻 antd multiple-sorter demo（antd 原生 sorter.multiple 优先级 +
 *   表头优先级序号 + onChange 数组）。
 * - **共享控制条**：`Bordered` 开关 + `Reset` 按钮（antd multiple-sorter demo 原本无控制条，此处加最小
 *   开关便于对照；Reset 用 React key remount 两侧 Table 一次清空所有排序激活态——保持非受控本质）。
 * - **共享数据**：`RecordType` + `data` 见 `_compare/multiple-sorter.shared.ts`。
 *
 * === antd demo 要素（S2 多列排序）===
 *
 * - 各分数列带 `sorter: { compare, multiple }`：
 *     * Chinese Score：multiple=3
 *     * Math Score：multiple=2
 *     * English Score：multiple=1（最小=最高优先级）
 *   Name 列不可排序。
 * - 点击多列表头叠加排序——点击一列只改该列自身 order，不清空其它列（多列语义）。
 * - 数据按 multiple 优先级叠加：先按 multiple 大的粗排、再按 multiple 小的细排，
 *   最终 multiple 最小的列是"最终决定序"（最高优先级）。
 * - 表头 caret 旁显示优先级数字（1/2/3…，按 multiple 升序；1 = 最高优先级）。
 * - onChange 返回 `SorterResult[]`（多列激活时）；console.log 各参数。
 *
 * === 验证点（S2）===
 *
 * 1. 点击 English（multiple=1）descend → 排序结果以 English 为主序（最高优先级）。
 * 2. 再点击 Math（multiple=2）descend → English 仍激活，叠加：English 相等时按 Math 排。
 * 3. 再点击 Chinese（multiple=3）descend → 三列叠加；表头分别显示 1（English）/ 2（Math）/ 3（Chinese）。
 * 4. 点击已激活列继续循环（descend → null → ascend → descend）；某列 null 时从优先级链中移除。
 * 5. onChange sorter 为数组（多列激活时）/ 单对象（仅一列激活时）/ `{}`（无激活）。
 *
 * === data-grid 实现说明 ===
 *
 * 多列状态机见 `src/table/engine/useSorter.ts`（S2 扩展）；表头优先级序号由 SortIndicator 的
 * `priority` prop 渲染（`src/table/engine/SortIndicator.tsx`）。本 demo 仅配置 columns + onChange，
 * 与 antd demo 等价（无任何 data-grid 扩展 API）。
 */

import { useState } from 'react'
import { Button, Space, Switch, Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import { Table } from '../table'
import type { ColumnType, TableProps as DgTableProps } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { data, type RecordType } from './_compare/multiple-sorter.shared'

// ---------------------------------------------------------------------------
// 左栏（data-grid）列定义 —— 行为与改造前一致
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<RecordType>[] = [
  {
    title: 'Name',
    dataIndex: 'name',
  },
  {
    title: 'Chinese Score',
    dataIndex: 'chinese',
    sorter: {
      compare: (a, b) => a.chinese - b.chinese,
      multiple: 3,
    },
  },
  {
    title: 'Math Score',
    dataIndex: 'math',
    sorter: {
      compare: (a, b) => a.math - b.math,
      multiple: 2,
    },
  },
  {
    title: 'English Score',
    dataIndex: 'english',
    sorter: {
      compare: (a, b) => a.english - b.english,
      multiple: 1,
    },
  },
]

// ---------------------------------------------------------------------------
// 右栏（antd）列定义 —— 忠实复刻 antd multiple-sorter demo（逐字一致）
// ---------------------------------------------------------------------------

const antdColumns: NonNullable<TableProps<RecordType>['columns']> = [
  {
    title: 'Name',
    dataIndex: 'name',
  },
  {
    title: 'Chinese Score',
    dataIndex: 'chinese',
    sorter: {
      compare: (a, b) => a.chinese - b.chinese,
      multiple: 3,
    },
  },
  {
    title: 'Math Score',
    dataIndex: 'math',
    sorter: {
      compare: (a, b) => a.math - b.math,
      multiple: 2,
    },
  },
  {
    title: 'English Score',
    dataIndex: 'english',
    sorter: {
      compare: (a, b) => a.english - b.english,
      multiple: 1,
    },
  },
]

// ---------------------------------------------------------------------------
// onChange（两侧共用同一个 console.log 形态）
// ---------------------------------------------------------------------------

const onChange: DgTableProps<RecordType>['onChange'] = (pagination, filters, sorter, extra) => {
  // eslint-disable-next-line no-console
  console.log('multiple-sorter demo onChange params:', { pagination, filters, sorter, extra })
}

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function MultipleSorterDemo() {
  // ★ 共享状态：同一个状态同时驱动两侧表格。
  const [bordered, setBordered] = useState(false)
  // Reset trick：递增 remountKey 强制两侧 Table 重新挂载，清空所有排序激活态
  // （不引入受控 sortOrder，保持 multiple-sorter demo 非受控本质）。
  const [remountKey, setRemountKey] = useState(0)

  const handleReset = () => setRemountKey((k) => k + 1)

  return (
    <div style={{ padding: 24 }}>
      {/* ★ 共享控制条：全宽，在 SplitDemo 上方。同一个状态同时驱动两侧表格。 */}
      <div
        style={{
          marginBottom: 16,
          padding: 12,
          border: '1px solid #f0f0f0',
          borderRadius: 8,
          background: '#fff',
        }}
      >
        <Space>
          <Switch
            checked={bordered}
            onChange={setBordered}
            checkedChildren="Bordered"
            unCheckedChildren="Bordered"
          />
          <Button onClick={handleReset}>Reset (remount both)</Button>
        </Space>
      </div>

      {/*
        minPaneWidth=480（窄表，4 列无 scroll.x）→ 横排阈值 ≈ 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={
          <Table<RecordType>
            key={`dg-${remountKey}`}
            columns={dgColumns}
            dataSource={data}
            onChange={onChange}
            bordered={bordered}
          />
        }
        right={
          <AntdTable<RecordType>
            key={`antd-${remountKey}`}
            columns={antdColumns}
            dataSource={data}
            onChange={onChange as TableProps<RecordType>['onChange']}
            bordered={bordered}
          />
        }
      >
        <div>
          <strong>对照说明（决策 9 B5）：</strong>
          左右并排呈现 data-grid 与 antd multiple-sorter demo（S2 多列排序）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>Chinese</strong> multiple=3、<strong>Math</strong> multiple=2、
              <strong>English</strong> multiple=1（最小=最高优先级）。Name 不可排序。
            </li>
            <li>
              <strong>多列叠加</strong>：点击一列不清空其它列；数据按 multiple 优先级叠加，最终 multiple
              最小的列是「最终决定序」（最高优先级）。表头 caret 旁显示优先级数字（1/2/3，按 multiple 升序）。
            </li>
            <li>
              <strong>循环</strong>：点击已激活列继续循环（descend → null → ascend → descend）；某列 null
              时从优先级链中移除。
            </li>
            <li>
              <strong>onChange sorter</strong>：多列激活时为 <code>SorterResult[]</code>；仅一列激活时为单
              对象；无激活时为 <code>{'{}'}</code>。打开 console 查看参数。
            </li>
            <li>
              <strong>Bordered 开关</strong>：同时切换两侧边框。<strong>Reset 按钮</strong>：递增 React key
              强制两侧 Table 重新挂载，清空所有排序激活态（不引入受控语义）。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
