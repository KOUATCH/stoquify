import type { Metadata } from "next"
import { z } from "zod"
import { SalesReceiptDocument } from "@/components/pos/SalesReceiptDocument"
import { protect } from "@/services/_shared/protect"
import { getPOSReceiptPrintPreview, type SalesReceiptPayload } from "@/services/pos/receipt.service"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Purchase summary · Récapitulatif d’achat | Stoquify",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
}

const receiptReference = z.string().trim().min(1).max(120)
const lookupSchema = z.union([
  z.object({ locationId: receiptReference, saleId: receiptReference, orderNumber: z.undefined().optional() }),
  z.object({ locationId: receiptReference, orderNumber: receiptReference, saleId: z.undefined().optional() }),
])

type ReceiptLookup = z.infer<typeof lookupSchema> & { locale: "EN" | "FR" }

function protectedReceiptPreview(permission: "pos.receipts.print" | "pos.receipts.reprint") {
  return protect<ReceiptLookup, SalesReceiptPayload>({
    permission,
    auditResource: "POSReceipt",
    auditAllowed: false,
    module: {
      moduleSlug: "pos",
      surface: "/pos-receipt",
      surfaceType: "page",
      accessIntent: "read",
      mode: "enforce",
    },
  }, async (input: ReceiptLookup, ctx) => getPOSReceiptPrintPreview({
    organizationId: ctx.orgId,
    locationId: input.locationId,
    locale: input.locale,
    selection: typeof input.saleId === "string"
      ? { salesOrderId: input.saleId, actorId: ctx.userId }
      : { orderNumber: input.orderNumber },
  }))
}

const printReceipt = protectedReceiptPreview("pos.receipts.print")
const reprintReceipt = protectedReceiptPreview("pos.receipts.reprint")

const copy = {
  en: {
    unavailable: "Receipt unavailable",
    lookupHelp: "Check your access, location and exact sale number, then try again from the point of sale.",
    blocked: "Printing is blocked by fiscal controls",
    blockedHelp: "Ask a manager to review the fiscal document before printing the purchase summary.",
  },
  fr: {
    unavailable: "Reçu indisponible",
    lookupHelp: "Vérifiez vos droits, le site et le numéro de vente exact, puis réessayez depuis la caisse.",
    blocked: "Impression bloquée par les contrôles fiscaux",
    blockedHelp: "Demandez à un responsable de vérifier le document fiscal avant d’imprimer le récapitulatif d’achat.",
  },
} as const

export default async function POSReceiptPage({ params, searchParams }: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams])
  const language = locale === "fr" ? "fr" : "en"
  const labels = copy[language]
  const lookup = lookupSchema.safeParse(query)
  const result = lookup.success
    ? await (lookup.data.saleId ? printReceipt : reprintReceipt)({ ...lookup.data, locale: language === "fr" ? "FR" : "EN" })
    : null

  if (result?.success && !result.data.certification.legalDeliveryBlocked) {
    return <SalesReceiptDocument payload={result.data} purchaseSummary />
  }

  return (
    <main className="mx-auto max-w-xl space-y-3 px-6 py-16" lang={language}>
      <h1 className="text-2xl font-semibold">{result?.success ? labels.blocked : labels.unavailable}</h1>
      <p>{result?.success ? labels.blockedHelp : labels.lookupHelp}</p>
    </main>
  )
}
