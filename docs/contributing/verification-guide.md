# 验证指南

文档里的“已对齐”结论应当来自真实对照，不来自静态猜测。

## 基本流程

1. 读功能文档和对应 demo 源码，先确认要比较的配置是否相同。
2. 打开 compare demo，左右同时观察 data-grid 和 antd。
3. 同时检查静态渲染、交互态和深浅色主题。
4. 发现差异时，先判断是产品决策、架构限制还是实现缺陷，再更新对应文档。

## 必查项

- 列宽、分页、scroll、size、fixed、selection、expand 这类 props 是否真的两侧一致
- 横滚到底、纵滚到底、中间滚动、翻页、排序、筛选、展开、拖拽中的表现
- light / dark 双主题下的边框、背景、滚动条、hover、selected、filter dropdown
- console 是否干净

## e2e 截图基线重拍

改动涉及**可见像素**（结构、样式、主题、虚拟滚动窗口、排序／筛选／选择的可视态）⇒ 同一轮必须重拍受影响的 e2e PNG 基线。
否则 e2e 视觉断言拿旧基线比新像素，会误报（把合法改动判成回归）或漏报（旧基线恰好没覆盖到）。

1. 备份旧基线到 `tmp/` 并逐文件留 sha1 记入报告（如 `tmp/e2e-baseline-bak/`）。
2. 用 `-g` 过滤器**只重拍受影响张**（`npx playwright test screenshots.spec.ts -g "<demo 名>" --update-snapshots`）——不要全量重拍，避免无关基线漂移。
3. 重拍后跑**全量** `pnpm test:e2e` 确认全绿（新基线自洽、无连带翻红）。

注意：`--update-snapshots` 只用于**预期内的合法像素改动**的重拍；未先定性就 `-u` 去掩盖真实回归，违反纪律。
先例：E-165 §四／E-166——把 9 红里的 4 张定性为「基线过期而非回归」后重拍（`sorting-and-filtering`／`semantic-dom-slots` × light/dark），e2e 门 136 全绿。

## 文档更新原则

- 确认是长期边界的，写入 [`../reference/known-limitations.md`](../reference/known-limitations.md) 或 ADR。
- 确认是功能差异的，更新对应 `features/**` 文档。
- 确认是兼容判定变化的，更新 [`../reference/compat-matrix.md`](../reference/compat-matrix.md)。

## 不要把这些内容写回主文档

- 临时截图路径
- 某次会话的实施/验证分工
- “本轮已完成 N/N” 之类过程状态
