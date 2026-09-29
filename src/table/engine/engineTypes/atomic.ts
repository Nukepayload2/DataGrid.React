/**
 * 引擎层原子类型（EngineAlign/FixedSide）。
 *
 * 从 engineTypes.ts 拆出（档二·纯类型）。对齐 antd column.align / 固定列方向（已归一化）。
 *
 * BAT-25 25-B：本文件的 `Align` 曾与 `nativeOptions.ts` 的公共宽面 `Align` **同名不同取值**
 * （引擎窄＝`start|center|end`，公共宽＝再多 `left|right`），是"两份真相"式误导命名。
 * 引擎侧改名 `EngineAlign`（沿用 `columnAdapter` 原本的局部别名 `Align as EngineAlign` 与仓里
 * `Engine*` 前缀惯例）。**两侧的取值面都未改动**——分叉本身是对的：引擎只吃归一值，
 * 归一发生在 `columnAdapter.normalizeAlign`。命名先例＝同文件 `FixedSide` vs 公共 `FixedInput`。
 */

/** 对齐方式（antd column.align 子集，已归一化为逻辑值）。 */
export type EngineAlign = 'start' | 'center' | 'end'

/** 固定列方向。antd 同时接受 'left'/'right'，这里在适配层做归一化为 'start'/'end'。 */
export type FixedSide = 'start' | 'end'
