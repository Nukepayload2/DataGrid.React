import { useState, type CSSProperties } from 'react'
import { Button, Tag, Tooltip, theme } from 'antd'
import { InfoCircleOutlined } from '@ant-design/icons'
import { navigate } from './registry'
import SemanticDomDg from './semantic-dom-slots.dg'
import SemanticDomAntd from './semantic-dom-slots.antd'

type SemanticSlotStatus = 'supported' | 'mapped' | 'limited'

interface SemanticSlot {
  key: string
  title: string
  status: SemanticSlotStatus
  dgTarget: string
  dgDescription: string
  antdTarget: string
  antdDescription: string
}

const semanticSlots: SemanticSlot[] = [
  {
    key: 'root',
    title: 'root',
    status: 'supported',
    dgTarget: '.dg-wrapper',
    dgDescription: '根元素，承载表格容器的基础样式、尺寸和主题变量。',
    antdTarget: '.ant-table-wrapper',
    antdDescription: '根元素，包含字体大小、背景色、圆角、滚动条颜色等表格容器的基础样式。',
  },
  {
    key: 'title',
    title: 'title',
    status: 'supported',
    dgTarget: '.dg-title',
    dgDescription: '标题元素，包含表格标题的样式和布局。',
    antdTarget: '.ant-table-title',
    antdDescription: '标题元素，包含表格标题的样式和布局。',
  },
  {
    key: 'content',
    title: 'content',
    status: 'supported',
    dgTarget: '.dg-grid',
    dgDescription: '内容元素，包含表头和表体所在的 CSS Grid 区域。',
    antdTarget: '.ant-table-content',
    antdDescription: '内容元素，包含表格内容区域的样式和布局。',
  },
  {
    key: 'header.wrapper',
    title: 'header.wrapper',
    status: 'limited',
    dgTarget: '无独立 thead 容器',
    dgDescription: 'data-grid 没有独立表头容器 DOM；该槽位保留 API 形状，但不会形成 antd 的 thead 层级。',
    antdTarget: '.ant-table-thead',
    antdDescription: '头部容器元素，包含表头的布局和容器样式。',
  },
  {
    key: 'header.row',
    title: 'header.row',
    status: 'mapped',
    dgTarget: '表头行内所有 header cell',
    dgDescription: '表头行样式透传到同一逻辑行的所有表头单元格。',
    antdTarget: 'thead > tr',
    antdDescription: '头部行元素，包含表头行的布局和样式。',
  },
  {
    key: 'header.cell',
    title: 'header.cell',
    status: 'supported',
    dgTarget: '.dg-cell-header',
    dgDescription: '表头单元格元素，包含背景、文字、排序状态和边框等样式。',
    antdTarget: 'th.ant-table-cell',
    antdDescription: '头部单元格元素，包含定位、内边距、背景色、文字颜色和字体权重等样式。',
  },
  {
    key: 'section',
    title: 'section',
    status: 'supported',
    dgTarget: '.dg-scroll-wrap',
    dgDescription: '表格包装容器，承载滚动区域、边框和浮动滚动条上下文。',
    antdTarget: '.ant-table-container',
    antdDescription: '容器元素，包含清除浮动、最大宽度、滚动条背景等表格包装容器样式。',
  },
  {
    key: 'body.wrapper',
    title: 'body.wrapper',
    status: 'limited',
    dgTarget: '无独立 tbody 容器',
    dgDescription: 'data-grid 没有独立表体容器 DOM；表体直接由 grid cell 组成。',
    antdTarget: '.ant-table-tbody',
    antdDescription: '主体容器元素，包含表格主体的布局和容器样式。',
  },
  {
    key: 'body.row',
    title: 'body.row',
    status: 'mapped',
    dgTarget: '表体行内所有 body cell',
    dgDescription: '数据行样式透传到同一逻辑行的所有数据单元格。',
    antdTarget: 'tbody > tr',
    antdDescription: '主体行元素，包含数据行的悬浮效果、选中状态、展开状态等交互样式。',
  },
  {
    key: 'body.cell',
    title: 'body.cell',
    status: 'supported',
    dgTarget: '.dg-cell-body',
    dgDescription: '主体单元格元素，包含内边距、换行、合并格和行标题视觉样式。',
    antdTarget: 'td.ant-table-cell',
    antdDescription: '主体单元格元素，包含相对定位、内边距、文字换行等数据单元格的基础样式。',
  },
  {
    key: 'footer',
    title: 'footer',
    status: 'supported',
    dgTarget: '.dg-footer',
    dgDescription: '底部元素，包含表格底部内容的背景、文字和布局样式。',
    antdTarget: '.ant-table-footer',
    antdDescription: '底部元素，包含表格底部的背景色、文字颜色等样式。',
  },
  {
    key: 'pagination.root',
    title: 'pagination.root',
    status: 'supported',
    dgTarget: '.dg-pagination',
    dgDescription: '分页根元素，承载分页器的布局和外层语义样式。',
    antdTarget: '.ant-pagination',
    antdDescription: '分页根元素，包含分页组件的基础样式和布局。',
  },
  {
    key: 'pagination.item',
    title: 'pagination.item',
    status: 'mapped',
    dgTarget: 'antd Pagination item',
    dgDescription: '分页单项样式透传到内部 antd Pagination 的 item 层。',
    antdTarget: '.ant-pagination-item / prev / next',
    antdDescription: '分页单项元素，包含分页项的样式和交互效果。',
  },
]

const statusLabel: Record<SemanticSlotStatus, string> = {
  supported: '已落点',
  mapped: '透传',
  limited: '受限',
}

const statusColor: Record<SemanticSlotStatus, string> = {
  supported: 'success',
  mapped: 'processing',
  limited: 'warning',
}

function SemanticSlotList({
  variant,
  activeSlot,
  onActiveSlotChange,
}: {
  variant: 'data-grid' | 'antd'
  activeSlot?: string
  onActiveSlotChange: (slot: string | undefined) => void
}) {
  const isDataGrid = variant === 'data-grid'
  const { token } = theme.useToken()

  // 槽位卡是「浮在 demo 页之上的一张卡」：表面色必须走 token，
  // 否则 dark 下写死的 #fff 会变成暗色界面里的白卡。见 index.css 的 --slot-item-* 消费处。
  const slotVars = {
    '--slot-item-bg': token.colorBgContainer,
    '--slot-item-border': token.colorBorderSecondary,
    '--slot-item-text': token.colorTextSecondary,
    '--slot-item-active-border': token.colorPrimary,
    '--slot-item-active-ring': `0 0 0 2px ${token.colorPrimaryBg}`,
  } as CSSProperties

  return (
    <ul className="semantic-slot-list" style={slotVars}>
      {semanticSlots.map((slot) => {
        const active = activeSlot === slot.key
        const target = isDataGrid ? slot.dgTarget : slot.antdTarget
        const description = isDataGrid ? slot.dgDescription : slot.antdDescription

        return (
          <li
            key={slot.key}
            className={active ? 'semantic-slot-item semantic-slot-item-active' : 'semantic-slot-item'}
            onMouseEnter={() => onActiveSlotChange(slot.key)}
            onMouseLeave={() => onActiveSlotChange(undefined)}
            onFocus={() => onActiveSlotChange(slot.key)}
            onBlur={() => onActiveSlotChange(undefined)}
          >
            <div className="semantic-slot-heading">
              <div className="semantic-slot-title">
                <h5>{slot.title}</h5>
              </div>
              <div className="semantic-slot-actions">
                {isDataGrid ? <Tag color={statusColor[slot.status]}>{statusLabel[slot.status]}</Tag> : null}
                <Tooltip title={target}>
                  <Button
                    aria-label={`${slot.title} 落点信息`}
                    type="text"
                    size="small"
                    icon={<InfoCircleOutlined />}
                  />
                </Tooltip>
              </div>
            </div>
            <p>{description}</p>
          </li>
        )
      })}
    </ul>
  )
}

export default function SemanticDomDemo() {
  const [hoveredSlot, setHoveredSlot] = useState<string | undefined>()
  const [hoveredAntdSlot, setHoveredAntdSlot] = useState<string | undefined>()
  const { token } = theme.useToken()

  return (
    <div className="semantic-dom-demo">
      <div
        style={{
          marginBottom: 16,
          padding: 12,
          border: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: 8,
          background: token.colorBgContainer,
          fontSize: 13,
          color: token.colorText,
        }}
      >
        <strong>Semantic DOM：</strong> 左侧 data-grid 使用与 antd Semantic DOM 示例同名的
        <code> semantic-mark-*</code> classNames 标记 13 个槽位；右侧列表说明每个槽位在
        data-grid DOM 中的落点。data-grid 已支持可排序表头的 <code>aria-sort</code>：
        点击 <strong>Age</strong> 表头时输出 <code>ascending</code> / <code>descending</code>，
        未排序时不输出该属性。
        <Button
          type="link"
          style={{ paddingInline: 6 }}
          onClick={() => navigate('/docs/semantic-dom')}
        >
          Learn more
        </Button>
      </div>

      <div className="semantic-demo-grid">
        <div className="semantic-demo-preview">
          <SemanticDomDg activeSlot={hoveredSlot} bordered />
        </div>

        <aside className="semantic-slot-panel" aria-label="Semantic DOM slots">
          <SemanticSlotList
            variant="data-grid"
            activeSlot={hoveredSlot}
            onActiveSlotChange={setHoveredSlot}
          />
        </aside>

        <div className="semantic-antd-compare">
          <h3>antd 对比</h3>
          <div className="semantic-antd-compare-grid">
            <div className="semantic-demo-preview">
              <SemanticDomAntd activeSlot={hoveredAntdSlot} bordered />
            </div>
            <aside className="semantic-slot-panel" aria-label="antd Semantic DOM slots">
              <SemanticSlotList
                variant="antd"
                activeSlot={hoveredAntdSlot}
                onActiveSlotChange={setHoveredAntdSlot}
              />
            </aside>
          </div>
        </div>
      </div>
    </div>
  )
}
