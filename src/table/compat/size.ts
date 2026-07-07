/**
 * 表格尺寸类型（按业务域从 compatTypes.ts 拆出）。
 *
 * 对齐 antd v6 `TableProps.size`。
 */

/**
 * 表格尺寸（对齐 antd v6 `TableProps.size`）。
 *
 * antd **v6** 尺寸语义：
 *   - `'large'`（默认）：标准行高 padding（cell padding block 16 / inline 16）。
 *   - `'medium'`：中等行高 padding（block 12 / inline 8；v5 对应 `'middle'`，data-grid 保留 `'middle'` 作别名）。
 *   - `'small'`：紧凑行高 padding（block 8 / inline 8；antd 文档标注用于 Modal 内）。
 *
 * ★ 关于 `'compact'`（实测结论）：
 *   antd v6 **Table 组件本身不存在 compact size**——`SizeType = 'small' | 'medium' | 'middle' | 'large'`
 *   （`components/config-provider/SizeContext.tsx:6`），Table style 只输出 large/MD/SM 三档 token
 *   （`components/table/style/index.ts:516-528`）。`compact` 是 Button/Space/Input 等其它组件的尺寸概念，
 *   不属于 Table。data-grid 的 SizeType 保留 `'compact'`（用于 `<ConfigProvider componentSize>` 全局消费的
 *   兜底，传入时 sizeToClass 把它视觉等价为 `'small'`——即 antd 6.4.4 实测最紧凑 Table 尺寸）。
 *
 * data-grid 兼容性：
 *   - 同时接受 v5 的 `'middle'`（旧 demo / 调用方零回归）与 v6 的 `'medium'`。
 *   - `'middle'` / `'medium'` 视觉等价（共用 `dg-size-middle` 类，见 tokens.css）。
 *   - `'compact'` 视觉等价 `'small'`（共用 `dg-size-small` 类；不造 antd 不存在的 token）。
 */
export type SizeType = 'large' | 'middle' | 'medium' | 'small' | 'compact'
