import { Typography } from 'antd'
import {
  DocSection,
  DocsActionList,
  DocsDataGrid,
} from '../components'
import type { DocsPageContext } from '../types'

const { Text } = Typography

interface SemanticSlotRow {
  key: string
  slot: string
  antd: string
  dataGrid: string
  note: string
}

interface A11yRow {
  key: string
  attr: string
  antd: string
  dataGrid: string
  conclusion: string
}

const semanticSlotRows: SemanticSlotRow[] = [
  { key: 'root', slot: 'root', antd: '.ant-table-wrapper', dataGrid: '根容器', note: '承载表格容器与主题变量。' },
  { key: 'title', slot: 'title', antd: '.ant-table-title', dataGrid: '标题容器', note: '标题元素，两侧均直接对应 DOM。' },
  { key: 'content', slot: 'content', antd: '.ant-table-content', dataGrid: '表格主体', note: 'data-grid 的表格主体是 CSS Grid 容器。' },
  { key: 'section', slot: 'section', antd: '.ant-table-container', dataGrid: '滚动包装容器', note: 'sticky 模式使用 sticky viewport。' },
  { key: 'header-wrapper', slot: 'header.wrapper', antd: '.ant-table-thead', dataGrid: '已从类型面删除', note: '无 thead 宿主；保留字段只会静默不生效，故删除后传它会是编译错误。整区样式改挂 content / section，整行改挂 header.row。' },
  { key: 'header-row', slot: 'header.row', antd: 'thead > tr', dataGrid: '表头行的全部单元格', note: '行级样式会传递到同一行的全部表头单元格。' },
  { key: 'header-cell', slot: 'header.cell', antd: 'th.ant-table-cell', dataGrid: '表头单元格', note: '直接对应 DOM，包含排序状态。' },
  { key: 'body-wrapper', slot: 'body.wrapper', antd: '.ant-table-tbody', dataGrid: '已从类型面删除', note: '无 tbody 宿主；同上。表体整区改挂 content / section，整行改挂 body.row。' },
  { key: 'body-row', slot: 'body.row', antd: 'tbody > tr', dataGrid: '表体行的全部单元格', note: '行级样式会传递到同一行的全部数据单元格。' },
  { key: 'body-cell', slot: 'body.cell', antd: 'td.ant-table-cell', dataGrid: '表体单元格', note: '主体单元格直接对应 DOM。' },
  { key: 'footer', slot: 'footer', antd: '.ant-table-footer', dataGrid: '底部容器', note: '底部元素，两侧均直接对应 DOM。' },
  { key: 'pagination-root', slot: 'pagination.root', antd: '.ant-pagination（分页 ul 自身）', dataGrid: '.dg-pagination（多包的一层布局 div）', note: '结构级差异：语义落点比 antd 多一层 div，且分页 ul 上没有 ant-table-pagination 与 ant-table-pagination-位置 这两组布局类；按这些类名写选择器需改挂 .dg-pagination 或自己的容器。' },
  { key: 'pagination-item', slot: 'pagination.item', antd: '.ant-pagination-item / prev / next', dataGrid: '逐项透传给 antd Pagination', note: '透传给分页组件的逐项槽位，每个页码与前后翻页项都会收到（与 antd 同形）。' },
]

const semanticA11yRows: A11yRow[] = [
  { key: 'table', attr: 'role="table"（根）', antd: '天然（<table>）', dataGrid: '不输出', conclusion: '不支持。' },
  { key: 'rowgroup', attr: 'role="rowgroup"（thead/tbody）', antd: '天然（<thead>/<tbody>）', dataGrid: '不输出', conclusion: '不支持。' },
  { key: 'row', attr: 'role="row"（tr）', antd: '天然（<tr>）', dataGrid: '不输出', conclusion: '不支持。' },
  { key: 'columnheader', attr: 'role="columnheader"（th）', antd: '天然（<th>）', dataGrid: '不输出', conclusion: '不支持。' },
  { key: 'gridcell', attr: 'role="gridcell"（td）', antd: '天然（<td>）', dataGrid: '不输出', conclusion: '不支持。' },
  { key: 'rowheader', attr: 'role="rowheader"（rowScope 列）', antd: '天然（<th scope="row">）', dataGrid: '不输出', conclusion: '不支持。' },
  { key: 'aria-sort', attr: 'aria-sort（可排序列表头）', antd: '显式', dataGrid: '已支持', conclusion: '支持。可排序列表头按排序状态输出 ascending / descending。' },
  { key: 'aria-expanded', attr: 'aria-expanded（展开行）', antd: '显式', dataGrid: '已支持', conclusion: '支持。展开按钮语义与 antd 对齐。' },
  { key: 'aria-label', attr: 'aria-label（表头/控件）', antd: '部分支持', dataGrid: '部分支持', conclusion: '部分支持。选择列控件、展开按钮、列宽拖拽手柄输出明确标签。可排序列表头**不补** aria-label：antd 把它落在 th 上合法，我们的表头格是无 role 的 div，该属性会被无障碍检查判成不得使用；要合法化需先补整条表格 ARIA 链。列宽拖拽手柄的 role=separator 与英文标签是超出 antd 的自有增强（antd 侧没有这个宿主），因此不走 locale，目前也没有覆盖入口（标签写死英文，components.header.cell 还不能替换表头格）。' },
  { key: 'aria-description', attr: 'aria-description（可排序列表头）', antd: '显式（值取自 locale 的全局段）', dataGrid: '已支持', conclusion: '支持。两条表头路径都接，值走 locale 全局段的 sortable（不硬编码英文）；该值由内部计算写入，会覆盖用户 onHeaderCell 传的同名值，与 antd 的落点顺序同形。' },
  { key: 'aria-colspan', attr: 'aria-colspan（合并数据格）', antd: '天然（<td colspan>）', dataGrid: '已支持', conclusion: '支持。colSpan >= 2 的合并数据格输出。' },
  { key: 'aria-rowspan', attr: 'aria-rowspan（合并数据格）', antd: '天然（<td rowspan>）', dataGrid: '已支持', conclusion: '支持。rowSpan >= 2 的合并数据格输出。' },
]

export function renderSemanticDom({ onOpen }: DocsPageContext) {
  return (
    <>
      <DocSection
        id="slots"
        title="Semantic DOM 槽位矩阵"
        description="data-grid 提供 Semantic DOM 槽位命名，与 antd Table 对齐；未占用的槽位会明确标出，避免给业务代码承诺不存在的 DOM 位置。"
      >
        <DocsDataGrid<SemanticSlotRow>
          columns={[
            { title: '槽位', dataIndex: 'slot', key: 'slot', width: 180, render: (value) => <Text code>{value}</Text> },
            { title: 'antd DOM', dataIndex: 'antd', key: 'antd', width: 240 },
            { title: 'data-grid DOM', dataIndex: 'dataGrid', key: 'dataGrid', width: 260 },
            { title: '说明', dataIndex: 'note', key: 'note', width: 420 },
          ]}
          dataSource={semanticSlotRows}
          rowKey="key"
          scrollX={1100}
        />
      </DocSection>

      <DocSection
        id="a11y"
        title="a11y 属性兼容矩阵"
        description="能补的 ARIA 属性直接输出；需要 table / row 层级角色的，不再补。"
      >
        <DocsDataGrid<A11yRow>
          columns={[
            { title: '属性 / role', dataIndex: 'attr', key: 'attr', width: 260, render: (value) => <Text code>{value}</Text> },
            { title: 'antd', dataIndex: 'antd', key: 'antd', width: 220 },
            { title: 'data-grid', dataIndex: 'dataGrid', key: 'dataGrid', width: 160 },
            { title: '结论', dataIndex: 'conclusion', key: 'conclusion', width: 480 },
          ]}
          dataSource={semanticA11yRows}
          rowKey="key"
          scrollX={1120}
        />
      </DocSection>

      <DocSection id="demo" title="交互验证">
        <DocsActionList
          actions={[
            { label: '打开 Semantic DOM demo', kind: 'path', value: '/demos/semantic-dom-slots' },
          ]}
          onOpen={onOpen}
        />
      </DocSection>
    </>
  )
}
