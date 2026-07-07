/**
 * 放大镜图标（自绘 SVG，对齐 antd SearchOutlined 视觉）。
 *
 * 自绘而非引入 @ant-design/icons：仅 filter 搜索框前缀一处用，path 取自 @ant-design/icons-svg asn
 * （与 antd FilterDropdown 内部 `<SearchOutlined />` 渲染一致）。
 *
 * 无状态纯展示组件，从 FilterDropdown.tsx 抽出便于复用与单测。
 */
export function FilterSearchIcon() {
  return (
    <svg
      viewBox="64 64 896 896"
      width="1em"
      height="1em"
      fill="currentColor"
      aria-hidden="true"
      style={{ fontSize: 12, display: 'block' }}
    >
      {/* antd SearchOutlined 的 SVG path（取自 @ant-design/icons-svg asn）。放大镜：圆 + 把手。 */}
      <path d="M909.6 854.5L649.9 594.8C690.2 542.7 712 479 712 412c0-80.2-31.3-155.4-87.9-212.1-56.6-56.7-132-87.9-212.1-87.9s-155.5 31.3-212.1 87.9C143.2 256.5 112 331.8 112 412c0 80.1 31.3 155.5 87.9 212.1C256.5 680.8 331.8 712 412 712c67 0 130.6-21.8 182.7-62l259.7 259.6a8.2 8.2 0 0011.6 0l43.6-43.5a8.2 8.2 0 000-11.6zM570.4 570.4C528 612.7 471.8 636 412 636s-116-23.3-158.4-65.6C211.3 528 188 471.8 188 412s23.3-116.1 65.6-158.4C296 211.3 352.2 188 412 188s116.1 23.2 158.4 65.6S636 352.2 636 412s-23.3 116.1-65.6 158.4z" />
    </svg>
  )
}
