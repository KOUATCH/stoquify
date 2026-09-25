import { getAPWorkbenchAction } from "@/actions/purchasing/ap-control.actions"
import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import APControlWorkbench from "@/components/purchasing/APControlWorkbench"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { routeByKey, withPurchasesSurfaceAccess } from "../purchases-route-access"

export const metadata = {
  title: "AP Workbench | Stoquify",
  description: "Supplier AP ledger, payment, reconciliation, and country-pack control workbench.",
}

const routeCopy = {
  en: {
    errorTitle: "AP workbench data is unavailable",
    errorMessage: "The read-only AP source failed safely. Retry from purchases without exposing internal failure details.",
    back: "Back to purchases",
  },
  fr: {
    errorTitle: "Les données de l’atelier AP sont indisponibles",
    errorMessage: "La source AP en lecture seule a échoué de manière sûre. Réessayez sans exposer les détails internes.",
    back: "Retour aux achats",
  },
} as const

export default async function PurchasePayablesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const surface = routeByKey("purchases-payables")

  if (!surface) {
    throw new Error("Missing purchases route surface definition: purchases-payables")
  }

  return withPurchasesSurfaceAccess({
    params: Promise.resolve({ locale: rawLocale }),
    surface,
    onAllowed: async (_context, locale) => {
      const t = routeCopy[locale]
      const result = await getAPWorkbenchAction({ limit: 25 })

      if (!result.success) {
        return (
          <DashboardRouteState
            kind="error"
            title={t.errorTitle}
            message={t.errorMessage}
            primaryHref={`/${locale}/dashboard/purchases`}
            primaryLabel={t.back}
          />
        )
      }

      return (
        <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
          <div className="dashboard-landing-content mx-auto flex w-full max-w-[1920px] min-w-0 flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6">
            {hasRbacPermission(_context.permissions, "purchasing.ap.invoice.post") && <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline" className="h-auto min-h-10 whitespace-normal"><Link href={`/${locale}/dashboard/purchases/payables/correct`}>{locale === "fr" ? "Corriger une facture fournisseur" : "Correct a supplier invoice"}</Link></Button>
              <Button asChild><Link href={`/${locale}/dashboard/purchases/payables/prepare`}>{locale === "fr" ? "Préparer une facture fournisseur" : "Prepare a supplier invoice"}</Link></Button>
              <Button asChild variant="outline" className="h-auto min-h-10 whitespace-normal"><Link href={`/${locale}/dashboard/purchases/payables/approve`}>{locale === "fr" ? "Examiner les factures fournisseurs" : "Review supplier invoices"}</Link></Button>
              <Button asChild variant="outline" className="h-auto min-h-10 whitespace-normal"><Link href={`/${locale}/dashboard/purchases/payables/recovery`}>{locale === "fr" ? "Reprendre la comptabilisation des factures" : "Recover invoice posting"}</Link></Button>
              <Button asChild variant="outline" className="h-auto min-h-10 whitespace-normal"><Link href={`/${locale}/dashboard/purchases/payables/exceptions/request`}>{locale === "fr" ? "Demander une dérogation de facture" : "Request an invoice exception"}</Link></Button>
            </div>}
            {hasRbacPermission(_context.permissions, "purchasing.ap.match.review") && <div><Button asChild variant="outline" className="h-auto min-h-10 whitespace-normal"><Link href={`/${locale}/dashboard/purchases/payables/exceptions/review`}>{locale === "fr" ? "Examiner les dérogations de facture" : "Review invoice exceptions"}</Link></Button></div>}
            <div className="flex flex-wrap gap-3">
              {hasRbacPermission(_context.permissions, "purchasing.ap.payment.release") && <Button asChild variant="outline" className="h-auto min-h-10 whitespace-normal"><Link href={`/${locale}/dashboard/purchases/payables/payments/record`}>{locale === "fr" ? "Enregistrer un paiement fournisseur" : "Record a supplier payment"}</Link></Button>}
              {hasRbacPermission(_context.permissions, "purchasing.ap.payment.request") && <Button asChild variant="outline" className="h-auto min-h-10 whitespace-normal"><Link href={`/${locale}/dashboard/purchases/payables/payments/request`}>{locale === "fr" ? "Demander un paiement fournisseur" : "Request a supplier payment"}</Link></Button>}
              {hasRbacPermission(_context.permissions, "purchasing.ap.payment.approve") && <Button asChild variant="outline" className="h-auto min-h-10 whitespace-normal"><Link href={`/${locale}/dashboard/purchases/payables/payments/approve`}>{locale === "fr" ? "Examiner les paiements fournisseurs" : "Review supplier payments"}</Link></Button>}
            </div>
            <APControlWorkbench
              data={result.data}
              error={null}
              locale={locale}
            />
          </div>
        </div>
      )
    },
  })
}
