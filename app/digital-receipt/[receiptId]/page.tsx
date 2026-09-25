import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ZodError } from "zod"
import { NotFoundError } from "@/services/_shared/action-errors"
import { getPublicSalesReceipt, type SalesReceiptPayload } from "@/services/pos/receipt.service"
import { PrintReceiptButton } from "./PrintReceiptButton"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Receipt · Reçu | Stoquify",
  description: "Private purchase receipt · Reçu d’achat privé",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
}

const copy = {
  EN: {
    title: "Your receipt", reference: "Receipt", date: "Date (UTC)", store: "Store", customer: "Customer",
    items: "Your purchase", quantity: "Quantity", each: "each", subtotal: "Subtotal", discount: "Discount",
    tax: "Tax", total: "Total", payments: "Payments", cashTendered: "Cash received", change: "Change given",
    print: "Print receipt", status: "Payment status", certification: "Fiscal document",
    certified: "A certified fiscal document is recorded for this sale.", legalNumber: "Fiscal number",
    pending: "Fiscal processing is pending. This purchase summary is not a certified fiscal document.",
    blocked: "The fiscal document is not available for delivery. Contact the store if you need it.",
    unverified: "This purchase summary does not establish fiscal certification. Contact the store for the fiscal document.",
    private: "This link grants access to your receipt. Share it only with people you trust.",
    thanks: "Thank you for your purchase.", unknown: "Status unavailable",
  },
  FR: {
    title: "Votre reçu", reference: "Reçu", date: "Date (UTC)", store: "Magasin", customer: "Client",
    items: "Votre achat", quantity: "Quantité", each: "l’unité", subtotal: "Sous-total", discount: "Remise",
    tax: "Taxe", total: "Total", payments: "Paiements", cashTendered: "Espèces reçues", change: "Monnaie rendue",
    print: "Imprimer le reçu", status: "Statut du paiement", certification: "Document fiscal",
    certified: "Un document fiscal certifié est enregistré pour cette vente.", legalNumber: "Numéro fiscal",
    pending: "Le traitement fiscal est en cours. Ce récapitulatif d’achat n’est pas un document fiscal certifié.",
    blocked: "Le document fiscal n’est pas disponible pour transmission. Contactez le magasin si vous en avez besoin.",
    unverified: "Ce récapitulatif d’achat ne prouve pas la certification fiscale. Contactez le magasin pour obtenir le document fiscal.",
    private: "Ce lien donne accès à votre reçu. Partagez-le uniquement avec des personnes de confiance.",
    thanks: "Merci pour votre achat.", unknown: "Statut indisponible",
  },
} as const

const paymentLabels: Record<string, readonly [string, string]> = {
  CASH: ["Cash", "Espèces"], CARD: ["Card", "Carte"], MOBILE_MONEY: ["Mobile money", "Monnaie mobile"],
  BANK_TRANSFER: ["Bank transfer", "Virement bancaire"], ON_ACCOUNT: ["On account", "À crédit"],
  CREDIT: ["On account", "À crédit"], CHEQUE: ["Cheque", "Chèque"], CHECK: ["Cheque", "Chèque"],
  PAID: ["Paid", "Payé"], COMPLETED: ["Completed", "Terminé"], PARTIAL: ["Partially paid", "Partiellement payé"],
  PARTIALLY_PAID: ["Partially paid", "Partiellement payé"], UNPAID: ["Unpaid", "Non payé"],
  PENDING: ["Pending", "En attente"], FAILED: ["Failed", "Échec"], CANCELLED: ["Cancelled", "Annulé"],
  REFUNDED: ["Refunded", "Remboursé"], PARTIALLY_REFUNDED: ["Partially refunded", "Partiellement remboursé"],
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

  const { receipt, business, location, certification } = payload
  const locale = receipt.locale === "FR" ? "FR" : "EN"
  const labels = copy[locale]
  const language = locale === "FR" ? "fr" : "en"
  const money = (value: number) => new Intl.NumberFormat(language, { style: "currency", currency: business.currency }).format(value)
  const labelFor = (value: string) => paymentLabels[value]?.[locale === "FR" ? 1 : 0] ?? labels.unknown
  const date = new Intl.DateTimeFormat(language, { dateStyle: "long", timeStyle: "short", timeZone: "UTC" }).format(new Date(receipt.createdAt))
  const certificationMessage = certification.legalDeliveryBlocked ? labels.blocked
    : certification.fiscalDocumentStatus === "CERTIFIED" ? labels.certified
      : certification.legalDeliveryStatus === "PENDING_REGULATORY_PROCESSING" ? labels.pending : labels.unverified

  // Render an explicit field allowlist on the server. Never hand the complete
  // service payload (or bearer URL) to a client component or JSON script.
  return (
    <main lang={language} className="min-h-screen bg-muted/30 px-4 py-8 text-foreground sm:px-6 sm:py-12 print:min-h-0 print:bg-white print:p-0 print:text-black">
      <article aria-labelledby="receipt-title" className="mx-auto max-w-2xl rounded-2xl border bg-background p-5 shadow-sm sm:p-8 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="space-y-5 border-b pb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-2"><p className="break-words text-sm font-semibold text-muted-foreground">{business.name}</p><h1 id="receipt-title" className="text-3xl font-semibold tracking-tight">{labels.title}</h1></div>
            <PrintReceiptButton label={labels.print} />
          </div>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-muted-foreground">{labels.reference}</dt><dd className="break-words font-medium">{receipt.orderNumber}</dd></div>
            <div><dt className="text-muted-foreground">{labels.date}</dt><dd><time dateTime={receipt.createdAt}>{date}</time></dd></div>
            <div><dt className="text-muted-foreground">{labels.store}</dt><dd className="break-words">{location.name}</dd>{location.address && <dd className="break-words text-muted-foreground">{location.address}</dd>}</div>
            <div><dt className="text-muted-foreground">{labels.customer}</dt><dd className="break-words">{receipt.customerName}</dd></div>
          </dl>
        </header>
        <section aria-labelledby="receipt-items" className="py-6">
          <h2 id="receipt-items" className="mb-2 text-base font-semibold">{labels.items}</h2>
          <ul className="divide-y">{receipt.items.map(item => (
            <li key={item.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 py-4 [break-inside:avoid]">
              <div className="min-w-0 flex-1 basis-40"><p className="break-words font-medium">{item.name}</p><p className="mt-1 text-sm text-muted-foreground">{labels.quantity}: {new Intl.NumberFormat(language).format(item.quantity)} · {money(item.unitPrice)} {labels.each}</p></div>
              <p className="font-medium tabular-nums">{money(item.totalPrice)}</p>
            </li>
          ))}</ul>
          <dl className="space-y-2 border-t pt-4 text-sm">
            <div className="flex flex-wrap justify-between gap-2"><dt>{labels.subtotal}</dt><dd className="tabular-nums">{money(receipt.subtotal)}</dd></div>
            <div className="flex flex-wrap justify-between gap-2"><dt>{labels.discount}</dt><dd className="tabular-nums">{money(receipt.discount)}</dd></div>
            <div className="flex flex-wrap justify-between gap-2"><dt>{labels.tax}</dt><dd className="tabular-nums">{money(receipt.tax)}</dd></div>
            <div className="flex flex-wrap justify-between gap-2 pt-3 text-xl font-semibold"><dt>{labels.total}</dt><dd className="tabular-nums">{money(receipt.total)}</dd></div>
          </dl>
        </section>
        <section aria-labelledby="receipt-payments" className="space-y-3 border-t py-6">
          <h2 id="receipt-payments" className="font-semibold">{labels.payments}</h2>
          <p className="text-sm">{labels.status}: <span className="font-medium">{labelFor(receipt.paymentStatus)}</span></p>
          <ul className="space-y-3">{receipt.payments.map(payment => (
            <li key={payment.id} className="space-y-1 rounded-lg bg-muted/40 p-3 text-sm [break-inside:avoid] print:bg-white print:p-0">
              <p className="flex flex-wrap justify-between gap-2"><span>{labelFor(payment.method)} · {labelFor(payment.status)}</span><span className="font-medium tabular-nums">{money(payment.amount)}</span></p>
              {payment.cashTendered !== undefined && <p className="text-muted-foreground">{labels.cashTendered}: {money(payment.cashTendered)}</p>}
              {payment.changeGiven !== undefined && <p className="text-muted-foreground">{labels.change}: {money(payment.changeGiven)}</p>}
            </li>
          ))}</ul>
        </section>
        <section aria-labelledby="receipt-certification" className="space-y-2 rounded-lg border p-4 text-sm [break-inside:avoid]">
          <h2 id="receipt-certification" className="font-semibold">{labels.certification}</h2>
          <p>{certificationMessage}</p>
          {!certification.legalDeliveryBlocked && certification.fiscalDocumentStatus === "CERTIFIED" && certification.legalNumber && <p>{labels.legalNumber}: {certification.legalNumber}</p>}
        </section>
        <footer className="space-y-3 pt-6 text-center text-sm text-muted-foreground"><p>{labels.thanks}</p><p className="print:hidden">{labels.private}</p></footer>
      </article>
    </main>
  )
}
