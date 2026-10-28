import type { Metadata } from "next"

import { SupplierPoAcknowledgementPortal } from "./SupplierPoAcknowledgementPortal"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Secure supplier purchase order | Stoquify",
  description: "Review and acknowledge a secure purchase-order envelope.",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
}

export default async function SupplierPurchaseOrderPage({
  params,
}: {
  params: Promise<{ locale: string; envelopeId: string }>
}) {
  const { locale, envelopeId } = await params
  return (
    <SupplierPoAcknowledgementPortal
      envelopeId={envelopeId}
      locale={locale === "fr" ? "fr" : "en"}
    />
  )
}
