import { checkPermission } from "@/config/useAuth"
import type { ReactNode } from "react"

export default async function CustomersLayout({ children }: { children: ReactNode }) {
  await checkPermission("customers.read")
  return <>{children}</>
}
