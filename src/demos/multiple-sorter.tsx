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
 *     * Chinese Score：multiple=3（最高优先级）
 *     * Math Score：multiple=2
 *     * English Score：multiple=1（最低优先级）
 *   Name 列不可排序。
 * - 点击多列表头叠加排序——点击一列只改该列自身 order，不清空其它列（多列语义）。
 * - 数据按 multiple 优先级叠加：multiple **越大优先级越高**（主排序键），先按 multiple 大的列粗排，
 *   multiple 小的列在主键相等时作为次级排序细化。依据：antd `getSortData`
 *   （`components/table/hooks/useSorter.tsx:331-333`）——
 *   `innerSorterStates.sort((a,b) => b.multiplePriority - a.multiplePriority)`，即 multiple 大者先比较。
 *   data-grid 引擎逐字对齐（`src/table/engine/useSorter.ts` `getSortData` 第 358 行 `pb - pa`）。
 *   ★ 故 **Chinese(multiple=3) 是主排序键**（最高优先级），English(multiple=1) 是最末细化键。
 * - onChange 返回 `SorterResult[]`（多列激活时）；console.log 各参数。
 *
 * === 验证点（S2）===
 *
 * 1. 点击 Chinese（multiple=3）descend → 排序结果以 Chinese 为主序（最高优先级）。
 *    数据 4 行 chinese={98,98,98,88} → descend：三个 98 在前、88（Jim Red）在末。
 * 2. 再点击 Math（multiple=2）descend → Chinese 仍激活，叠加：chinese 相等时按 Math 排。
 *    三个 chinese=98 中 Math descend：Joe Black(90) > Jim Green(66) > John Brown(60)。
 * 3. 再点击 English（multiple=1）descend → 三列叠加；English 只在 Chinese+Math 都相等时才起作用。
 * 4. 点击已激活列继续循环（descend → null → ascend → descend）；某列 null 时从优先级链中移除。
 * 5. onChange sorter 为数组（多列激活时）/ 单对象（仅一列激活时）/ `{}`（无激活）。
 *
 * === data-grid 实现说明 ===
 *
 * 多列状态机见 `src/table/engine/useSorter.ts`（S2 扩展，对齐 antd `useSorter.tsx`）。
 * 排序优先级（谁先比较）与 antd 一致：multiple 大者先比较 = 主排序键（见上节源码依据）。
 *
 * ★ 与 antd 的两处可观察差异（详见底部对照说明「差异备注」，非 demo 可修，登记 §11）：
 *   (A) **优先级徽标**：data-grid SortIndicator 多列激活时会在 caret 旁渲染一个优先级数字徽标
 *       （`dg-column-sorter-priority`，1=最高优先级=multiple 最大）。**antd 6.4.4 官方 multiple-sorter
 *       demo 不渲染此徽标**（antd `sorter.ts` 样式 + demo 均无）。属 data-grid 增强，非对齐项。
 *   (B) **onChange sorter 数组顺序**：antd `generateSorterInfo`（`useSorter.tsx:296-324`）按**列定义
 *       插入顺序**输出激活列；data-grid `generateSorterInfo`（`useSorter.ts:292-314`）按 **multiple
 *       升序**输出（历史决策，见引擎文件 docstring）。两侧数组元素集合相同，顺序不同。
 */

import { useState } from 'react'
import { Button, Space, Switch, Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import { Table } from '../table'
import type { ColumnType, TableProps as DgTableProps } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { data, type RecordType } from './_compare/multiple-sorter.shared'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y（SplitDemo pane 自动限高，虚拟窗口才有滚动区）
import { useVirtualization } from './VirtualizationContext'

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
  // 全局虚拟化开关接入：开关 ON 时两栏叠加 virtual=true + scroll.y（原 multiple-sorter demo 无 scroll，
  // ON 用 dg {y:true}/antd {y:280}；OFF 回 undefined，行为与改造前一致）。
  const { virtual } = useVirtualization()

  const handleReset = () => setRemountKey((k) => k + 1)

  return (
    <div style={{ padding: 24 }}>
      {/* ★ 共享控制条：全宽，在 SplitDemo 上方。同一个状态同时驱动两侧表格。
          DemoToolbar 用 useToken（light/dark/自定义 token 自适应），替代硬编码 #fff/#f0f0f0。 */}
      <DemoToolbar>
        <Space>
          <Switch
            checked={bordered}
            onChange={setBordered}
            checkedChildren="Bordered"
            unCheckedChildren="Bordered"
          />
          <Button onClick={handleReset}>Reset (remount both)</Button>
        </Space>
      </DemoToolbar>

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
            pagination={{}}
            /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:true（CSS 自适应，填满 SplitDemo
               pane 限高，虚拟窗口才有滚动区）；OFF 时回 undefined，行为与改造前一致。 */
            virtual={virtual}
            scroll={virtual ? { y: true } : undefined}
          />
        }
        right={
          <AntdTable<RecordType>
            key={`antd-${remountKey}`}
            columns={antdColumns}
            dataSource={data}
            onChange={onChange as TableProps<RecordType>['onChange']}
            bordered={bordered}
            /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:280（antd 不认 true，且表头/默认
               分页画在 scroll.y 之外，需扣除表头~55 与分页条~64 → 约 280 才能塞进 pane 限高；
               OFF 时回 undefined，行为与改造前一致）。 */
            virtual={virtual}
            scroll={virtual ? { y: 280 } : undefined}
          />
        }
      >
        <div>
          <strong>对照说明（决策 9 B5）：</strong>
          左右并排呈现 data-grid 与 antd multiple-sorter demo（S2 多列排序）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>Chinese</strong> multiple=3（最高优先级）、<strong>Math</strong> multiple=2、
              <strong>English</strong> multiple=1（最低优先级）。Name 不可排序。
              <strong>multiple 越大 = 优先级越高</strong>（主排序键），依据：antd
              <code>getSortData</code> 中 <code>b.multiplePriority - a.multiplePriority</code>。
            </li>
            <li>
              <strong>多列叠加</strong>：点击一列不清空其它列；先按 multiple 大的列粗排，multiple 小的列
              在主键相等时作为次级细化。例：Chinese+Math 都 descend → 三个 chinese=98 按 Math 排，
              Joe Black(90) &gt; Jim Green(66) &gt; John Brown(60)。
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
            <li>
              <strong>★ 差异备注（§11）</strong>：
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li>
                  <strong>优先级徽标</strong>：左栏 data-grid 多列激活时在 caret 旁显示一个数字徽标
                  （1/2/3，<strong>1 = 最高优先级 = multiple 最大</strong>，即 Chinese 激活时显示 1）。
                  右栏 antd <strong>不渲染</strong>此徽标（antd 6.4.4 multiple-sorter demo + sorter 样式
                  均无此元素）。属 data-grid 增强，非 antd 对齐项。
                </li>
                <li>
                  <strong>onChange sorter 数组顺序</strong>：antd 按列定义顺序（Chinese, Math, English）
                  输出激活列；data-grid 按 multiple 升序（English, Math, Chinese）输出。数组元素集合相同，
                  顺序不同（引擎历史决策，非 demo 可修）。
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
