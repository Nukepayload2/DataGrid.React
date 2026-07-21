import { useState, type ReactNode } from 'react'
import { Alert, Button, Space, Typography } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import {
  COLUMN_COUNT_DEFAULT,
  COLUMN_COUNT_MAX,
  COLUMN_COUNT_MIN,
} from './_compare/stable-empty-width.shared'
import StableEmptyWidthDg from './stable-empty-width.dg'
import StableEmptyWidthAntd from './stable-empty-width.antd'

const ISSUE_56151 = 'https://github.com/ant-design/ant-design/issues/56151'
const ISSUE_56713 = 'https://github.com/ant-design/ant-design/issues/56713'
const ISSUE_55717 = 'https://github.com/ant-design/ant-design/discussions/55717'

function Item({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <li>
      <strong>{title}</strong>
      <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>{children}</ul>
    </li>
  )
}

export default function StableEmptyWidthDemo() {
  const [hasData, setHasData] = useState(false)
  const [columnCount, setColumnCount] = useState(COLUMN_COUNT_DEFAULT)

  return (
    <div style={{ padding: 24 }}>
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        message={
          <>
            本 demo 直击 antd Table 三条列宽/测量抖动 issue：
            <Typography.Link href={ISSUE_56151} target="_blank" rel="noreferrer"> #56151</Typography.Link>
            （空数据列宽缩减）、
            <Typography.Link href={ISSUE_56713} target="_blank" rel="noreferrer"> #56713</Typography.Link>
            （scroll.y + 空数据占位 th 列宽跳动）、
            <Typography.Link href={ISSUE_55717} target="_blank" rel="noreferrer"> #55717</Typography.Link>
            （增列时 MeasureRow 高度抖动）。右栏 antd 如实呈现，未做任何美化掩盖。
          </>
        }
      />

      <DemoToolbar>
        <Space wrap>
          <Button type="primary" onClick={() => setHasData((v) => !v)}>
            {hasData ? '切换到空数据' : '切换到有数据'}
          </Button>
          <Button
            disabled={columnCount >= COLUMN_COUNT_MAX}
            onClick={() => setColumnCount((c) => Math.min(COLUMN_COUNT_MAX, c + 1))}
          >
            增加列（{columnCount}/{COLUMN_COUNT_MAX}）
          </Button>
          <Button
            disabled={columnCount <= COLUMN_COUNT_MIN}
            onClick={() => setColumnCount((c) => Math.max(COLUMN_COUNT_MIN, c - 1))}
          >
            删除列（{columnCount}/{COLUMN_COUNT_MIN}）
          </Button>
          <span style={{ color: 'var(--compare-text-secondary)', fontSize: 12 }}>
            当前：{hasData ? '5 行数据' : '空数据'} · {columnCount} 列
          </span>
        </Space>
      </DemoToolbar>

      <SplitDemo
        minPaneWidth={560}
        virtualizable={false}
        left={<StableEmptyWidthDg hasData={hasData} columnCount={columnCount} />}
        right={<StableEmptyWidthAntd hasData={hasData} columnCount={columnCount} />}
      >
        <div>
          <strong>对照说明：</strong>两侧使用<strong>完全相同</strong>的列定义（数字 px width）
          和 dataSource 切换时机；区别仅在渲染引擎。本 demo 顶栏按钮同时驱动两侧。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <Item title="① antd 病灶（三条 issue）">
              <li>
                <strong>差异行为（#56151 空数据列宽缩减）</strong>：点「切换到空数据」，
                右栏 antd 的 colgroup <code>&lt;col width&gt;</code> 在 dataSource 为空时
                不被严格执行——空表占位行（<code>&lt;td colspan=N&gt;</code>）让表格按
                <code> table-layout</code> 重新分配宽度，列宽偏离声明的 px。
              </li>
              <li>
                <strong>差异行为（#56713 scroll.y + 空数据占位 th 跳动）</strong>：两侧均开
                <code> scroll.y</code>。右栏 antd 为对齐表体纵向滚动条宽度，在表头插入了
                <strong>占位 <code>&lt;th&gt;</code></strong>。空/非空切换时表体滚动条出现/消失，
                该占位 th 宽度变化 → 整行表头列宽跳动（与左栏稳定对比鲜明）。
              </li>
              <li>
                <strong>差异行为（#55717 增列 MeasureRow 抖动）</strong>：点「增加列/删除列」，
                右栏 antd 内部 rc-table 的<strong>测量行（MeasureRow）</strong>重新计算所有列宽
                以同步表头/表体，此中间态可见高度/宽度抖动一帧。
              </li>
              <li>
                <strong>触发条件</strong>：点顶栏「切换数据」「增加列」「删除列」任意一个。
              </li>
              <li>
                <strong>差异原因</strong>：antd 的列宽依赖运行时 DOM 测量（rc-table MeasureRow
                + colgroup 双表头同步），存在「测量 → 应用」中间态；空数据、列数变化都让测量结果
                摆动。详见
                <Typography.Link href={ISSUE_56151} target="_blank" rel="noreferrer"> #56151</Typography.Link> /
                <Typography.Link href={ISSUE_56713} target="_blank" rel="noreferrer"> #56713</Typography.Link> /
                <Typography.Link href={ISSUE_55717} target="_blank" rel="noreferrer"> #55717</Typography.Link>。
              </li>
            </Item>

            <Item title="② data-grid 解药（grid-template-columns 单点真理源）">
              <li>
                <strong>差异行为</strong>：点同样的按钮，左栏 data-grid 列宽<strong>稳定不跳</strong>。
                切空/非空时列宽完全一致；增删列时新增/消失的 track 平滑过渡（0.3s ease），
                其余列宽纹丝不动。
              </li>
              <li>
                <strong>触发条件</strong>：同 ①（任意按钮）。
              </li>
              <li>
                <strong>差异原因</strong>：列宽由 <code>grid-template-columns</code> 声明式决定
                （源码 <code>src/table/engine/GridTable.tsx</code> 内
                <code> useGridLayout</code> 算出
                <code> gridTemplateColumns</code> 字符串，inline 注入到 <code>.dg-grid</code>），
                与 dataSource 是否为空<strong>正交</strong>——没有「测中间态再应用」环节。
                滚动条占位走<strong>独立 grid track</strong>（<code>.dg-grid</code> 末尾一条
                <code> auto</code> track），而非往表头插占位 <code>&lt;th&gt;</code>，
                故 #56713 无从发生。机制详见
                {' '}<code>docs/features/columns/column-width.md</code>。
              </li>
            </Item>

            <Item title="③ 如何观察">
              <li>
                <strong>切空/非空</strong>：点「切换到空数据/有数据」。左栏列宽不变；
                右栏空表列宽偏离声明值（#56151），且 scroll.y 下表头占位 th 让总宽
                跳一下（#56713）。
              </li>
              <li>
                <strong>增删列</strong>：点「增加列/删除列」。左栏新增/消失的 track
                0.3s 过渡，其余列宽稳；右栏 MeasureRow 重算有一帧抖动（#55717）。
              </li>
              <li>
                <strong>对照读数</strong>：用 DevTools 量两侧任意一列的
                <code> getBoundingClientRect().width</code>，
                在空/非空、增/删列前后对比——左栏数字恒定，右栏数字摆动。
              </li>
            </Item>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
