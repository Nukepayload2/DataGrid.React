import { useState, type ReactNode } from 'react'
import { Alert, Button, Space } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import {
  COLUMN_COUNT_DEFAULT,
  COLUMN_COUNT_MAX,
  COLUMN_COUNT_MIN,
} from './_compare/stable-empty-width.shared'
import StableEmptyWidthDg from './stable-empty-width.dg'
import StableEmptyWidthAntd from './stable-empty-width.antd'

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
    <div className="demo-view">
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        message={
          <>
            本 demo 对比空数据、开启竖向滚动和增删列时的列宽表现：右栏会出现空表收缩、切换时表头跳动和增删列时的短暂抖动，左栏保持声明列宽稳定。
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
          和 dataSource 切换时机。顶栏按钮同时驱动两侧。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <Item title="① 右栏可见问题">
              <li>
                <strong>切换为空数据后</strong>：右栏部分列宽会收缩，和声明的 px 不一致。
              </li>
              <li>
                <strong>开启竖向滚动时</strong>：空 / 非空切换会让右栏表头宽度看起来跳一下。
              </li>
              <li>
                <strong>增列或删列时</strong>：右栏可能出现一帧可见的抖动。
              </li>
              <li>
                <strong>触发条件</strong>：点顶栏任意按钮。
              </li>
            </Item>

            <Item title="② 左栏稳定表现">
              <li>
                <strong>点同样的按钮</strong>：左栏列宽保持一致，空 / 非空切换时不会改变已声明宽度。
              </li>
              <li>
                <strong>增删列时</strong>：只更新受影响的列，已有列不跟着抖。
              </li>
            </Item>

            <Item title="③ 如何观察">
              <li>
                <strong>切空 / 非空</strong>：点「切换到空数据 / 有数据」。左栏列宽不变；右栏会更容易看出收缩和跳动。
              </li>
              <li>
                <strong>增删列</strong>：点「增加列 / 删除列」。左栏变化平顺，右栏短暂抖动更明显。
              </li>
            </Item>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
