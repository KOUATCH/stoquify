import { checkPermission } from "@/config/useAuth";
import { ReactNode } from "react";

export default async function Layout({ children }: { children: ReactNode }) {
  await checkPermission("purchases.suppliers.read");
  return <div>{children}</div>;
}
