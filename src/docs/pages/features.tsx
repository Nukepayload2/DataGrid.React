import { Typography } from 'antd'
import {
  DocSection,
  DocsActionList,
  DocsDataGrid,
} from '../components'
import type { DocsPageContext } from '../types'
import type { OverviewRow } from './shared'

const { Text } = Typography

const featureRows: OverviewRow[] = [
  {
    key: 'columns',
    area: '列',
    purpose:
      '列宽、固定列、隐藏列、响应式列与列默认值都收敛到 ColumnType 同一个列定义上配置，不需要切换 API 面；data-grid 专属列级能力（拖拽锁定、recycling 虚拟化逃逸舱回调）归 gridColumnOptions。',
    entry: 'Column API · gridOptions',
  },
  {
    key: 'layout',
    area: '布局',
    purpose:
      '多级表头、合并单元格、summary 与 sticky 共用 CSS Grid 布局模型，因此可以自由组合而不会互相拆台；需要局部结构差异时优先用 classNames / styles 的语义槽位。',
    entry: '渲染模型 · Semantic DOM',
  },
  {
    key: 'interaction',
    area: '交互',
    purpose:
      '行选择、展开、树形、筛选排序、分页、编辑保留 antd 风格的 props；行 / 列拖拽排序等原生增强进入 gridOptions，不污染兼容 API。',
    entry: '兼容矩阵 · gridOptions',
  },
  {
    key: 'api-extension',
    area: 'API 扩展点',
    purpose:
      '扩展 data-grid 的主要路径：JSX 列声明、components 按槽位替换、onRow / onCell 行级钩子与 classNames / styles 语义槽位；字段级细节去 Table / Column API 参考页。',
    entry: 'Table API · Column API · Semantic DOM',
  },
]

export function renderFeatures({ onOpen }: DocsPageContext) {
  return (
    <>
      <DocSection
        id="overview"
        eyebrow="能力总览"
        title="data-grid 能力清单"
        description="data-grid 的能力按 4 个域组织：列、布局、交互、API 扩展点。下表是每个域的一句话说明与主要入口；具体 demo 与参考页在下方按域分组列出。"
      >
        <DocsDataGrid<OverviewRow>
          columns={[
            { title: '能力域', dataIndex: 'area', key: 'area', width: '16%' },
            { title: '说明', dataIndex: 'purpose', key: 'purpose', width: '64%' },
            { title: '主要入口', dataIndex: 'entry', key: 'entry', width: '20%' },
          ]}
          dataSource={featureRows}
          rowKey="key"
        />
      </DocSection>

      <DocSection id="demos" eyebrow="demo" title="按能力域分类的 demo 入口">
        <p>
          <Text strong>列</Text>：列宽、固定列、隐藏列与列默认值等列级能力。
        </p>
        <DocsActionList
          actions={[
            { label: '全固定列宽 demo', kind: 'path', value: '/demos/all-columns-fixed-width' },
            { label: '固定列 demo', kind: 'path', value: '/demos/fixed-columns' },
            { label: '调整列宽 demo', kind: 'path', value: '/demos/resizable-columns' },
            { label: '隐藏列 demo', kind: 'path', value: '/demos/hidden-columns' },
          ]}
          onOpen={onOpen}
        />
        <p>
          <Text strong>布局</Text>：多级表头、合并单元格、summary 等共用 CSS Grid 布局模型的能力。
        </p>
        <DocsActionList
          actions={[
            { label: '分组表头 demo', kind: 'path', value: '/demos/grouped-header' },
            { label: '合并单元格 demo', kind: 'path', value: '/demos/merged-cells' },
            { label: '总结栏 demo', kind: 'path', value: '/demos/summary-row' },
          ]}
          onOpen={onOpen}
        />
        <p>
          <Text strong>交互</Text>：行选择、展开、拖拽排序等保留 antd 风格的交互能力。
        </p>
        <DocsActionList
          actions={[
            { label: '行选择 demo', kind: 'path', value: '/demos/basic-row-selection' },
            { label: '展开行 demo', kind: 'path', value: '/demos/expandable-rows' },
            { label: '拖拽行排序 demo', kind: 'path', value: '/demos/drag-row-sorting' },
          ]}
          onOpen={onOpen}
        />
        <p>
          <Text strong>API 扩展点</Text>：JSX 列声明、components 替换、行级钩子等扩展路径。
        </p>
        <DocsActionList
          actions={[
            { label: 'JSX 列声明 demo', kind: 'path', value: '/demos/jsx-columns' },
            { label: '单元格编辑 demo', kind: 'path', value: '/demos/cell-editing' },
            { label: '语义 DOM demo', kind: 'path', value: '/demos/semantic-dom-slots' },
          ]}
          onOpen={onOpen}
        />
      </DocSection>

      <DocSection id="references" eyebrow="交叉参考" title="相关文档">
        <DocsActionList
          actions={[
            { label: 'Table API', kind: 'doc', value: 'table-api' },
            { label: 'Column API', kind: 'doc', value: 'column-api' },
            { label: 'gridOptions', kind: 'doc', value: 'grid-options' },
            { label: '渲染模型', kind: 'doc', value: 'rendering-model' },
            { label: 'Semantic DOM', kind: 'doc', value: 'semantic-dom' },
            { label: '兼容矩阵', kind: 'doc', value: 'compat-matrix' },
          ]}
          onOpen={onOpen}
        />
      </DocSection>
    </>
  )
}
