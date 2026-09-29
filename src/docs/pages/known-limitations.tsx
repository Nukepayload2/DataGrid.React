import {
  DocSection,
  DocsDataGrid,
} from '../components'

interface GapRow {
  key: string
  topic: string
  boundary: string
  action: string
}

const limitationRows: GapRow[] = [
  { key: 'semantic-dom', topic: 'semantic DOM', boundary: '不能完整复刻 thead / tbody / tr 层级。', action: '改用 data-grid 支持的组件替换位置和样式入口（详见 #/docs/semantic-dom）。' },
  { key: 'scroll-y', topic: 'scroll.y', boundary: '不支持 antd number/string 滚动区域高度语义。', action: '改成 `scroll={{ y: true }}`，表格占满父容器可用空间（详见 #/docs/scrolling）。' },
  { key: 'rtl', topic: 'RTL', boundary: '尚未系统处理方向、fixed、sticky 和拖拽方向。', action: '需要独立设计和回归范围。' },
  { key: 'ref-version', topic: '对照的 antd 版本', boundary: '本页所有"与 antd 一致 / 不一致"的判断，对照的是测试时实际安装的 antd 6.4.4；而依赖声明允许 ^6.1.0，npm 最新已到 6.6.5。已确认一例版本条件性差异：列同时写 defaultSortOrder 与 responsive 时，antd 6.5.x 起会按"响应式过滤之前"的列收集排序态，6.4.4 不会。', action: '装了 6.5+/6.6 时该项结果可能与本表相反。逐条版本条件差异见 #/docs/known-limitations（详细登记页）。' },
  { key: 'tree-expand-row-by-click', topic: 'expandable.expandRowByClick（树形）', boundary: '树形与单层同形：点行体切换**被点节点**的展开态，只有含非空 children 的行会被切换，叶子行点行体不展开（与 antd 6.4.4 同形）。', action: '迁移时别自己再接管行点击做展开，否则与这条叠加会双重切换；需要点任意行都有反应就自己写 onRow.onClick。' },
  { key: 'function-title', topic: '函数式 column.title', boundary: '未移植。传函数时标题**渲染为空**（不抛错），且开 ellipsis 时连原生 title 悬浮提示也一起丢；开发态会收到一条 [data-grid] 告警，按 key / dataIndex / 列序号点名是哪一列（同一列只发一次）。', action: '改传 ReactNode。TypeScript 会被类型面拦住，JS 用户由上面那条告警发现。' },
  { key: 'selection-trigger', topic: 'rowSelection.selections 下拉触发', boundary: '我们只在点击时打开，antd 默认悬停即开。', action: '触屏与窄容器下点击更稳，属有意取舍；不要指望悬停展开菜单。' },
  { key: 'title-indeterminate', topic: 'rowSelection.getTitleCheckboxProps().indeterminate', boundary: '该值会被内部计算结果覆盖（与 antd 的落点顺序同形），不能用来手工设半选。', action: '要表达半选请改 selectedRowKeys 或用树形联动。' },
  { key: 'pagination-root-slot', topic: 'classNames / styles 的 pagination.root', boundary: '落在 data-grid 多包的一层布局 div 上，不是分页 ul 自身；分页 ul 上也没有 ant-table-pagination 与 ant-table-pagination-位置 这两组类名。', action: '按 antd 类名写的选择器改挂 .dg-pagination 或自己的容器。' },
  { key: 'wrapper-slots', topic: 'classNames / styles 的 header.wrapper 与 body.wrapper', boundary: '已从公共类型面删除（没有可落点的宿主）。', action: '整区样式改挂 content / section，整行改挂 header.row / body.row。传这两个字段现在是编译错误而不是静默无效。' },
  { key: 'resize-handle-label', topic: '列宽拖拽手柄的无障碍标签', boundary: 'role="separator" 与英文标签是 data-grid 超出 antd 的自有增强（antd 侧根本没有这个宿主），因此不走 locale。', action: '需要本地化文案请自己关掉 gridOptions.resizable 并自绘手柄。' },
  { key: 'warn-channel', topic: '开发期告警通道', boundary: '5 条提示走同一个出口，带生产环境门：生产构建（NODE_ENV=production）里一条都不发；开发构建里同一条文案至多发一次（函数式 column.title 那条按列各发一次，同一列不重复）。与 antd 6.4.4 仍不同的是：我们发 console.warn、前缀是 [data-grid]，antd 发 console.error、前缀是 [antd: Table]。', action: '生产日志不用自己屏蔽。按 antd 文案写的日志过滤规则抓不到这些提示，请改用 [data-grid] 前缀。不经打包器直接引入 dist 时，触发某条提示会抛 ReferenceError: process is not defined（参照发布产物同款行为），请走打包器。' },
]

export function renderKnownLimitations() {
  return (
    <DocSection id="boundaries" title="架构边界和兼容缺口">
      <DocsDataGrid<GapRow>
        columns={[
          { title: '主题', dataIndex: 'topic', key: 'topic', width: '22%' },
          { title: '边界', dataIndex: 'boundary', key: 'boundary', width: '42%' },
          { title: '处理方式', dataIndex: 'action', key: 'action', width: '36%' },
        ]}
        dataSource={limitationRows}
        rowKey="key"
      />
    </DocSection>
  )
}
