/**
 * 决策 9 / Semantic DOM demo：共享数据 + 类型。
 *
 * 用于 `src/demos/semantic-dom.tsx` 左右对比 demo（data-grid vs antd）。
 * 数据/列形状对齐 antd `_semantic.tsx` 官方 demo（Personal Info 分组表头 + 6 行），
 * 但额外：
 *   - 给 Age 列加 `sorter: true`（演示 aria-sort 专项：点击排序时两侧表头 aria-sort 同步）。
 *   - 给 Name 列加 `rowScope: 'row'`（演示 rowScope → 行表头语义；aria-rowheader 受 dg
 *     无行容器架构限制，详见 docs/semantic-dom-compat.md）。
 *
 * 两侧（data-grid / antd）共用同一份字面量数据；列定义因类型差异（ColumnType vs
 * TableProps['columns']）各自在 demo 文件内声明，但字段逐字一致。
 */

export interface SemanticRecord {
  key: string
  name: string
  age: number
  address: string
}

export const semanticData: SemanticRecord[] = [
  {
    key: '1',
    name: 'thinkasany',
    age: 24,
    address: 'New York No. 1 Lake Park',
  },
  {
    key: '2',
    name: 'Jim Green',
    age: 42,
    address: 'London No. 1 Lake Park',
  },
  {
    key: '3',
    name: 'Joe Black',
    age: 32,
    address: 'Sydney No. 1 Lake Park',
  },
  {
    key: '4',
    name: 'Lily White',
    age: 28,
    address: 'Paris No. 1 Lake Park',
  },
  {
    key: '5',
    name: 'Tom Brown',
    age: 36,
    address: 'Berlin No. 1 Lake Park',
  },
  {
    key: '6',
    name: 'Alice Blue',
    age: 45,
    address: 'Tokyo No. 1 Lake Park',
  },
]
