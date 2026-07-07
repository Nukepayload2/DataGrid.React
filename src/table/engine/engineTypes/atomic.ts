/**
 * 引擎层原子类型（Align/FixedSide）。
 *
 * 从 engineTypes.ts 拆出（档二·纯类型）。对齐 antd column.align / 固定列方向（已归一化）。
 */

/** 对齐方式（antd column.align 子集）。 */
export type Align = 'start' | 'center' | 'end'

/** 固定列方向。antd 同时接受 'left'/'right'，这里在适配层做归一化为 'start'/'end'。 */
export type FixedSide = 'start' | 'end'
