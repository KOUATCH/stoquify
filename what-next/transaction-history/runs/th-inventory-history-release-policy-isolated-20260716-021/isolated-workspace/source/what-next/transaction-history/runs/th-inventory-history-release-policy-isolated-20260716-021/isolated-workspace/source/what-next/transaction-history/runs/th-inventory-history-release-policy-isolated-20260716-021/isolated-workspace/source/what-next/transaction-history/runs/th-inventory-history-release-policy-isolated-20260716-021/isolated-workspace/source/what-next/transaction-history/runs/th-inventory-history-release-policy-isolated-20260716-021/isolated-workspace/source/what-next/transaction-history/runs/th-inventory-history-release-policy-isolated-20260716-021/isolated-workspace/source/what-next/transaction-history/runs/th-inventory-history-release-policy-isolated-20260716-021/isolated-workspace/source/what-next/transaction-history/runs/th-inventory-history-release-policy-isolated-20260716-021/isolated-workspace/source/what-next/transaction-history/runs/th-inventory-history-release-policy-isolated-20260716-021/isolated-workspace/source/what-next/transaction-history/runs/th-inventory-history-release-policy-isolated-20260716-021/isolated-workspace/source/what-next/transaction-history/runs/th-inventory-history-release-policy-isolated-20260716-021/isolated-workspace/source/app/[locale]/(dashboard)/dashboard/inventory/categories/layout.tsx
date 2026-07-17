import { ReactNode } from "react"

// Permission gating ("categories.read") is handled at the route level via
// middleware / session checks. This layout is a passthrough.
export default function Layout({ children }: { children: ReactNode }) {
  return <div>{children}</div>
}
