import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ZodError } from "zod"
import { NotFoundError } from "@/services/_shared/action-errors"
import { getPublicSalesReceipt, type SalesReceiptPayload } from "@/services/pos/receipt.service"
import { SalesReceiptDocument } from "@/components/pos/SalesReceiptDocument"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Receipt · Reçu | Stoquify",
  description: "Private purchase receipt · Reçu d’achat privé",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
}

export default async function DigitalReceiptPage({ params, searchParams }: {
  params: Promise<{ receiptId: string }>
  searchParams: Promise<{ token?: string | string[] }>
}) {
  const [{ receiptId }, query] = await Promise.all([params, searchParams])
  const token = typeof query.token === "string" ? query.token.trim() : ""
  if (!token) notFound()

  let payload: SalesReceiptPayload
  try {
    payload = await getPublicSalesReceipt({ salesOrderId: receiptId, receiptAccessToken: token })
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ZodError) notFound()
    // Do not expose token, provider, database, or internal validation details.
    return (
      <main className="mx-auto max-w-xl space-y-6 px-6 py-16">
        <section lang="en" className="space-y-2"><h1 className="text-2xl font-semibold">Receipt temporarily unavailable</h1><p>Try again later or contact the store. Your purchase is not changed by checking this receipt.</p></section>
        <section lang="fr" className="space-y-2"><h2 className="text-2xl font-semibold">Reçu temporairement indisponible</h2><p>Réessayez plus tard ou contactez le magasin. Consulter ce reçu ne modifie pas votre achat.</p></section>
      </main>
    )
  }

  return <SalesReceiptDocument payload={payload} />
}
