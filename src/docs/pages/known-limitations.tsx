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
  {
    key: 'semantic-dom',
    topic: '没有原生表格标签',
    boundary: '表头和数据行都渲染成 div，没有 <thead> / <tbody> / <tr> 这层结构。按这些标签写选择器、或指望表格结构本身就是标准 HTML 表格的场景，不能直接沿用 antd 的做法。',
    action: '改用 data-grid 的语义槽位（classNames / styles）和 .ant-table-* 类名，见 Semantic DOM 页。',
  },
  {
    key: 'scroll-y',
    topic: 'scroll.y 只接受 true',
    boundary: '不支持 antd 的 number / string 高度写法。写 true 表示表格占满父容器的高度。',
    action: '给表格的父容器设定高度，再写 scroll={{ y: true }}，见「滚动和虚拟化」页。',
  },
  {
    key: 'rtl',
    topic: 'RTL（从右到左）',
    boundary: '还没有适配：固定列、表头吸顶、滚动条、拖拽方向和阴影方向都按从左到右排列。',
    action: '需要 RTL 的界面先别依赖这些能力，或自行覆盖样式。',
  },
  {
    key: 'function-title',
    topic: 'column.title 不接受函数',
    boundary: 'antd 允许把 title 写成函数，这里只接受 ReactNode。传函数时标题渲染为空、不会报错；开了 ellipsis 时连原生 title 悬浮提示也一起丢失。',
    action: '改传 ReactNode。TypeScript 会报类型错；JS 用法在开发构建下会在控制台收到一条以 [data-grid] 开头的提示，点名是哪一列。',
  },
  {
    key: 'selection-trigger',
    topic: '选择项下拉要点开',
    boundary: 'rowSelection.selections 的下拉菜单要点击选择列上的箭头才展开；antd 默认鼠标悬停就展开。',
    action: '触屏和窄容器里点击更可靠，这是有意保留的差异，不是缺陷；也不要再写悬停展开的逻辑。',
  },
  {
    key: 'responsive-sort',
    topic: '排序：被响应式断点隐藏的列',
    boundary: '列上同时写 defaultSortOrder 和 responsive 时，antd 6.5 起会按隐藏之前的列收集排序状态、照常排序；这里和 antd 6.4.4 一样不排序，行序保持原样。',
    action: '从 antd 6.5 及以后版本迁移过来可能出现行序不同。把 defaultSortOrder 写到会显示的列上，或按断点切换列定义。',
  },
  {
    key: 'pagination-root-slot',
    topic: 'classNames.pagination.root 挂在哪',
    boundary: '分页器外面多包了一层容器，这两个槽作用在那一层上，不在分页的 <ul> 上；<ul> 上也没有 ant-table-pagination 和 ant-table-pagination-位置 这两组类名。',
    action: '按 antd 类名写的选择器改挂 .dg-pagination 或自己的容器。',
  },
  {
    key: 'wrapper-slots',
    topic: 'header.wrapper / body.wrapper 已删除',
    boundary: '表头和数据行共用同一个网格容器，这两组样式没有可落的地方，已从公共类型里删掉。',
    action: '整区样式挂 content / section，整行样式挂 header.row / body.row。再传这两个字段现在是编译错误，不会静默失效。',
  },
  {
    key: 'warn-channel',
    topic: '开发期提示的格式与 antd 不同',
    boundary: '开发构建下，可疑用法会在控制台收到提示（重复的选择列 / 展开列、分页配置可疑、column.title 传函数等），生产构建一条都不发。我们用 console.warn、前缀 [data-grid]；antd 用 console.error、前缀 [antd: Table]。',
    action: '生产日志不用自己屏蔽。按 antd 文案或前缀写的日志过滤规则抓不到这些提示，请改用 [data-grid] 前缀。直接用 <script> 加载 dist 产物（不经打包器）时，触发提示会报 process is not defined，请走打包器。',
  },
]

export function renderKnownLimitations() {
  return (
    <DocSection
      id="boundaries"
      title="架构边界和兼容缺口"
      description="下文说的“antd”指本项目测试时实际安装的 antd 6.4.4；依赖声明允许 ^6.1.0，而 npm 上的最新版已经比它新，所以 6.5 及以后的行为可能不同。涉及版本的差异在行内单独注明。"
    >
      <DocsDataGrid<GapRow>
        columns={[
          { title: '主题', dataIndex: 'topic', key: 'topic', width: '18%' },
          { title: '现状', dataIndex: 'boundary', key: 'boundary', width: '46%' },
          { title: '建议', dataIndex: 'action', key: 'action', width: '36%' },
        ]}
        dataSource={limitationRows}
        rowKey="key"
      />
    </DocSection>
  )
}
