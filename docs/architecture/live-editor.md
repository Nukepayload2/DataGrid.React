# Live 编辑器

live 编辑器为 demo 站点提供按需源码预览和运行，不改变表格引擎本身的 API 设计。

## 处理链路

1. `useDemoSource` / `useSplitDemoSource` 懒加载源码字符串并做模块级缓存。
2. `stripComments.ts` 生成展示用的“去注释代码视图”。
3. `LiveEditor.tsx` 用高亮层 `<pre>` 和输入层 `<textarea>` 叠放编辑。
4. 点击“应用”后才动态加载 `compile.ts` 和 `evalModule.ts`。
5. `scope.ts` 提供 `require(...)` 注入表，解析 demo 子文件用到的 shared 模块和第三方依赖。
6. `SplitDemoPreview.tsx` 或真实 demo 组件负责最终渲染；`LiveErrorBoundary` 兜底运行时异常。

## 约束

- 默认路径不预加载 sucrase，避免普通浏览时把 live 运行时成本带进来。
- scope key 要与 demo 子文件里的 import specifier 字面一致，减少源码展示和编译之间的分歧。
- 编辑模式只给子组件传最小必需的超集 props，不把每个 demo 的控制状态都塞进 live 运行时。

## 相关文档

- demo 站点总览: [`demo-site.md`](demo-site.md)
- JSX API: [`../features/api/jsx-api.md`](../features/api/jsx-api.md)
- components 与行级钩子: [`../features/api/components-and-row-hooks.md`](../features/api/components-and-row-hooks.md)
