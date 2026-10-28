import { APHistoryWorkbench } from "@/components/purchasing/APHistoryWorkbench"
import { routeByKey, withPurchasesSurfaceAccess } from "../../purchases-route-access"

export const metadata = {
  title: "Supplier AP history | Stoquify",
  description: "Supplier invoice, payment, payable movement, and AP proof history.",
}

export default async function SupplierAPHistoryPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const surface = routeByKey("purchases-payables-history")

  if (!surface) {
    throw new Error("Missing purchases route surface definition: purchases-payables-history")
  }

  return withPurchasesSurfaceAccess({
    params: Promise.resolve({ locale: rawLocale }),
    surface,
    onAllowed: () => (
      <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
        <div className="dashboard-landing-content min-w-0">
          <APHistoryWorkbench />
        </div>
      </div>
    ),
  })
}
