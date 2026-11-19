import React from "react"

// The fixture has no Next router. Preserve the existing route-state anchor's
// semantics; route prefetch/navigation integration is explicitly outside scope.
const FrameworkLink = React.forwardRef<HTMLAnchorElement, React.AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean; replace?: boolean; scroll?: boolean }>(
  function FrameworkLink({ prefetch: _prefetch, replace: _replace, scroll: _scroll, ...props }, ref) { return <a ref={ref} {...props} /> },
)
export default FrameworkLink
