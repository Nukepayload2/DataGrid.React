/**
 * 复刻 antd `sticky` demo：
 *   `G:\Projects\ant-design\components\table\demo\sticky.tsx`
 *
 * antd 原版要素：
 *   - 100 行（Edward 0..99，age 32，address London Park no. i）。
 *   - 11 列：Full Name（fixed start, 100）/ Age（fixed start, 100）/ Column 1..8（address，150/150/.../auto）/
 *     Action（fixed end, 100，render `<a>action</a>`）。
 *   - `scroll={{ x: 1500 }}` 横向滚动。
 *   - `summary`：单行，Switch 切换 fixed top/bottom + "Scroll Context" + "Fix Right"。
 *   - `sticky={{ offsetHeader: 64 }}`：表头跟随**页面**滚动固定（offsetHeader:64 模拟站点 header 高度）。
 *
 * === data-grid 对应（S34 自研任务）===
 *
 * - **S34 页面级粘性表头**（区别 M8 容器内固定）：
 *   - `sticky={{ offsetHeader: 64 }}` → 表头 `position: sticky; top: 64px` 相对**页面 viewport** 固定。
 *   - 页面（document）纵向滚动时表头钉在视口顶部 64px 处（模拟站点 header 遮挡偏移）。
 *   - 与 M8（`scroll.y` 容器内固定）不同：M8 表体在容器内滚动、表头钉在容器顶部；S34 表格不在容器内滚动，
 *     页面本身滚动、表头钉在视口顶部。
 *   - 实现关键：sticky 启用时 `.dg-grid` 不包 overflow 容器（避免拦截 sticky 上下文），grid 直接渲染 +
 *     min-width: scrollX 撑宽页面；表头 grid item 相对 viewport 固定（无 overflow 祖先）。
 *
 * - **横向滚动**：`scroll={{ x: 1500 }}` → grid min-width: 1500px 撑宽页面，**页面横向滚动**（原生滚动条）。
 *   StickyScrollBar 额外提供底部固定的同步 thumb（视觉对齐 antd fake scrollbar）。
 *
 * - **fixed 列组合**：Full Name/Age fixed start + Action fixed end。表头固定列格同时有横向 sticky（left/right）
 *   与纵向 sticky（top: 64）—— corner cell 双 sticky（浏览器原生支持）。
 *
 * - **summary fixed 组合**：S22 summary 的 `fixed: 'top'|'bottom'` 在 sticky 模式下保持其 grid 内
 *   sticky bottom/top 语义（随 grid 渲染，页面滚动时 summary 在 grid 末尾/开头；antd demo 的 Switch
 *   切换 fixed top/bottom 演示此能力）。
 *
 * - **demo 外壳**：为验证"页面滚动时表头固定"，demo 需足够内容使页面可滚动。本 demo 渲染 100 行 +
 *   上下额外填充内容（antd sticky demo 本身就靠 100 行撑长页面；这里额外加顶部/底部说明区，确保
 *   即使表格在视口中间，滚动也能验证表头固定到 offsetHeader 位置）。
 */

import { useState } from 'react'
import { Switch } from 'antd'
import { Table } from '../table'
import type { ColumnType } from '../table'

interface DataType {
  key: React.Key
  name: string
  age: number
  address: string
}

const columns: ColumnType<DataType>[] = [
  {
    title: 'Full Name',
    width: 100,
    dataIndex: 'name',
    key: 'name',
    fixed: 'start',
  },
  {
    title: 'Age',
    width: 100,
    dataIndex: 'age',
    key: 'age',
    fixed: 'start',
  },
  {
    title: 'Column 1',
    dataIndex: 'address',
    key: '1',
    width: 150,
  },
  {
    title: 'Column 2',
    dataIndex: 'address',
    key: '2',
    width: 150,
  },
  {
    title: 'Column 3',
    dataIndex: 'address',
    key: '3',
    width: 150,
  },
  {
    title: 'Column 4',
    dataIndex: 'address',
    key: '4',
    width: 150,
  },
  {
    title: 'Column 5',
    dataIndex: 'address',
    key: '5',
    width: 150,
  },
  {
    title: 'Column 6',
    dataIndex: 'address',
    key: '6',
    width: 150,
  },
  {
    title: 'Column 7',
    dataIndex: 'address',
    key: '7',
    width: 150,
  },
  {
    title: 'Column 8',
    dataIndex: 'address',
    key: '8',
  },
  {
    title: 'Action',
    key: 'operation',
    fixed: 'end',
    width: 100,
    render: () => <a>action</a>,
  },
]

const dataSource = Array.from({ length: 100 }).map<DataType>((_, i) => ({
  key: i,
  name: `Edward ${i}`,
  age: 32,
  address: `London Park no. ${i}`,
}))

export default function StickyDemo() {
  // antd demo 用 fixed='top'|'bottom' 切换 summary 顶/底 sticky; data-grid S22 summary 的 fixed
  // 简化为 boolean (仅 sticky bottom, 不支持 'top')。这里 Switch 切换 fixed on/off 演示 summary
  // sticky 能力与 sticky 表头的组合 (功能等价: summary fixed 在 grid 内, 与页面级表头共存)。
  const [summaryFixed, setSummaryFixed] = useState(false)
  return (
    <div style={{ padding: '16px 0' }}>
      {/* 顶部说明区: 撑长页面, 使表格初始不在视口顶部, 滚动后验证表头固定到 offsetHeader 位置. */}
      <p style={{ padding: '0 16px', color: 'rgba(0,0,0,0.65)' }}>
        S34 页面级粘性表头 (区别 M8 容器内固定): 向下滚动页面, 表头会钉在视口顶部 64px 处
        (offsetHeader 模拟站点 header 偏移); 横向滚动页面 (或拖动底部 sticky 滚动条) 查看 fixed 列.
      </p>
      <Table<DataType>
        columns={columns}
        dataSource={dataSource}
        scroll={{ x: 1500 }}
        summary={() => (
          <Table.Summary fixed={summaryFixed}>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2}>
                <Switch
                  checkedChildren="Summary Fixed"
                  unCheckedChildren="Summary Fixed"
                  checked={summaryFixed}
                  onChange={() => {
                    setSummaryFixed(!summaryFixed)
                  }}
                />
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} colSpan={8}>
                Scroll Context
              </Table.Summary.Cell>
              <Table.Summary.Cell index={10}>Fix Right</Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
        sticky={{ offsetHeader: 64 }}
      />
      {/* 底部说明区: 撑长页面, 使表格下方仍有内容, 滚动到底部时表头仍固定. */}
      <p style={{ padding: '16px', color: 'rgba(0,0,0,0.65)' }}>
        表格下方填充内容 — 继续向下滚动, 表头保持在视口顶部 64px 处 (页面级 sticky, 非容器内固定).
      </p>
    </div>
  )
}
