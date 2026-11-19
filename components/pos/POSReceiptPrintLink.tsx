import { useId } from "react"
import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function POSReceiptPrintLink({ locale, salesOrderId, locationId }: {
  locale: string
  salesOrderId: string
  locationId: string
}) {
  const language = locale === "fr" ? "fr" : "en"
  const query = new URLSearchParams({ saleId: salesOrderId, locationId })

  return (
    <Button variant="outline" asChild className="dashboard-button-secondary h-auto min-h-11 whitespace-normal">
      <a href={`/${language}/pos-receipt?${query}`} target="_blank" rel="noopener noreferrer">
        <Printer aria-hidden="true" className="size-4" />
        {language === "fr" ? "Ouvrir le reçu à imprimer" : "Open printable receipt"}
      </a>
    </Button>
  )
}

export function POSReceiptReprintForm({ locale, locationId }: { locale: string; locationId: string }) {
  const language = locale === "fr" ? "fr" : "en"
  const referenceId = useId()
  const fr = language === "fr"

  return (
    <form action={`/${language}/pos-receipt`} method="get" target="_blank" rel="noopener noreferrer" className="space-y-2">
      <input type="hidden" name="locationId" value={locationId} />
      <label htmlFor={referenceId} className="text-xs font-medium text-[var(--dash-text)]">
        {fr ? "Numéro de vente exact" : "Exact sale number"}
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <Input id={referenceId} name="orderNumber" className="dashboard-control min-h-11 min-w-36 flex-1" maxLength={120} required />
        <Button type="submit" variant="outline" className="dashboard-button-secondary min-h-11">
          {fr ? "Rechercher le reçu" : "Find receipt"}
        </Button>
      </div>
      <p className="text-xs text-[var(--dash-text-soft)]">
        {fr ? "Le reçu d’une vente terminée de ce site s’ouvre dans un nouvel onglet." : "A completed sale receipt from this location opens in a new tab."}
      </p>
    </form>
  )
}
