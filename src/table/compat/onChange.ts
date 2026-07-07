/**
 * onChange extra 参数类型（按业务域从 compatTypes.ts 拆出）。
 *
 * 对应 antd `TableCurrentDataSource`。
 */

/**
 * onChange extra 参数（对应 antd `TableCurrentDataSource`）。
 * - `currentDataSource`：当前（排序/筛选后）数据源。受控排序下为外部传入的 dataSource。
 * - `action`：触发动作（'sort' / 'filter' / 'paginate'）。
 */
export interface TableCurrentDataSource<RecordType = any> {
  currentDataSource: Array<RecordType>
  action: 'sort' | 'filter' | 'paginate'
}
