import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"

import { SupplierPoAcknowledgementWorkbench } from "@/components/purchase-orders/SupplierPoAcknowledgementWorkbench"
import { getSupplierPoAcknowledgementWorkbench } from "@/services/purchase-order/supplier-po-acknowledgement.service"
import { DashboardRouteState, type DashboardRouteStateKind } from "@/components/dashboard/DashboardRouteState"
import { isApplicationError } from "@/services/_shared/action-errors"
import { localizePath, pickLocale } from "@/i18n/routing"

import { routeByKey, withPurchaseOrdersSurfaceAccess } from "../../purchase-orders-route-access"

export const dynamic = "force-dynamic"

export default async function SupplierPoAcknowledgementPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  if (!id) notFound()
  const resolvedLocale = pickLocale(locale)
  const t = await getTranslations({ locale: resolvedLocale, namespace: "supplierPoAcknowledgement.buyerWorkbench" })
  const unavailable = (kind: DashboardRouteStateKind) => <DashboardRouteState kind={kind} eyebrow={t("unavailableTitle")} title={t(kind === "permission_denied" ? "deniedTitle" : kind === "no_active_org" ? "organizationTitle" : kind === "locked_module" ? "moduleTitle" : kind === "not_found" ? "missingTitle" : "readFailed")} message={t(kind === "permission_denied" ? "deniedMessage" : kind === "no_active_org" ? "organizationMessage" : kind === "locked_module" ? "moduleMessage" : "unavailableMessage")} primaryHref={localizePath("/dashboard", resolvedLocale)} primaryLabel={t("backToDashboard")} />
  const surface = routeByKey("purchase-orders-supplier-acknowledgement")
  if (!surface) {
    throw new Error("Missing purchase orders supplier acknowledgement route surface")
  }

  return withPurchaseOrdersSurfaceAccess({
    params: Promise.resolve({ locale }),
    surface,
    permissionOptions: { resourceId: id },
    onBlocked: unavailable,
    onAllowed: async (ctx, resolvedLocale) => {
      try {
      const workbench = await getSupplierPoAcknowledgementWorkbench({
        organizationId: ctx.orgId,
        actorId: ctx.userId,
        purchaseOrderId: id,
      })
      return (
        <SupplierPoAcknowledgementWorkbench
          initialData={workbench}
          locale={resolvedLocale}
        />
      )
      } catch (error) {
        if (isApplicationError(error)) return unavailable(error.code === "FORBIDDEN" ? "permission_denied" : error.code === "NOT_FOUND" ? "not_found" : "error")
        throw error
      }
    },
  })
}
