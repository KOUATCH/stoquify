import { Link } from "@/i18n/navigation"
import { ArrowLeft, ArrowLeftRight, ArrowRight, Clock3, Info, LockKeyhole, MapPin, Package, Pencil, Truck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ItemOverview as ItemOverviewData } from "@/services/item/item-overview.service"
import type { Locale } from "@/types/bilingual"

export function ItemOverview({ item, locale, canEdit, canViewSuppliers, canViewMovements }: {
  item: ItemOverviewData
  locale: Locale
  canEdit: boolean
  canViewSuppliers: boolean
  canViewMovements: boolean
}) {
  const fr = locale === "fr"
  const date = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value)) + " UTC"
  const quantity = (value: string | null) => value === null ? (fr ? "Inconnu" : "Unknown") : new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(Number(value))
  const stateLabels = fr
    ? { active: "Actif", inactive: "Inactif", discontinued: "Arrêté", archived: "Archivé" }
    : { active: "Active", inactive: "Inactive", discontinued: "Discontinued", archived: "Archived" }
  const stateMessages = fr ? {
    restricted: "Vous pouvez consulter l’article, mais pas ses quantités en stock.",
    not_tracked: "Le stock n’est pas suivi pour cet article.",
    no_locations: "Aucun emplacement autorisé n’est disponible. Cela ne signifie pas que le stock est nul.",
  } : {
    restricted: "You can inspect this item, but do not have access to its stock quantities.",
    not_tracked: "Inventory is not tracked for this item.",
    no_locations: "No authorized location is available. This does not mean stock is zero.",
  }
  const itemPath = `/dashboard/inventory/items/${encodeURIComponent(item.id)}`
  const locationCount = item.stock.locations.length
  const locationCountLabel = fr
    ? `${locationCount} emplacement${locationCount > 1 ? "s" : ""} affiché${locationCount > 1 ? "s" : ""}`
    : `${locationCount} location${locationCount === 1 ? "" : "s"} shown`
  const statusClass = {
    active: "border-[var(--dash-spruce)] bg-[var(--dash-spruce-soft)] text-[var(--dash-spruce)]",
    inactive: "border-[var(--dash-border)] bg-[var(--dash-surface)] text-[var(--dash-text-soft)]",
    discontinued: "border-[var(--dash-warning)] bg-[var(--dash-warning-soft)] text-[var(--dash-warning)]",
    archived: "border-[var(--dash-border)] bg-[var(--dash-surface)] text-[var(--dash-text-soft)]",
  }
  const StockStateIcon = item.stock.state === "restricted" ? LockKeyhole : Info
  return (
    <section className="dashboard-landing-theme dark min-h-full text-[var(--dash-text)]" aria-labelledby="item-overview-title">
      <div className="dashboard-landing-content mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <Link href="/dashboard/inventory/items" className="inline-flex min-h-10 items-center gap-2 rounded-md text-sm font-medium text-[var(--dash-brand-strong)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dash-focus)]">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {fr ? "Retour aux articles" : "Back to items"}
      </Link>
      <header className="dashboard-glass-panel overflow-hidden rounded-lg">
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)]">
              <Package className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--dash-text-soft)]">{fr ? "Fiche article" : "Item overview"}</p>
                <Badge variant="outline" className={`gap-1.5 ${statusClass[item.status]}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                  {stateLabels[item.status]}
                </Badge>
              </div>
              <h1 id="item-overview-title" className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">{fr ? item.nameFr || item.nameEn : item.nameEn}</h1>
              <p className="max-w-2xl text-sm leading-6 text-[var(--dash-text-soft)]">{fr ? "Consultez les informations de l’article et son stock dans vos emplacements autorisés." : "Review item information and stock across your authorized locations."}</p>
            </div>
          </div>
          {((canEdit && item.status !== "archived") || canViewSuppliers || canViewMovements) && <nav aria-label={fr ? "Actions de l’article" : "Item actions"} className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap lg:max-w-xs lg:justify-end">
            {canEdit && item.status !== "archived" && <Button asChild className="dashboard-button-primary min-h-10 rounded-lg"><Link href={`${itemPath}/edit`}><Pencil aria-hidden="true" />{fr ? "Modifier l’article" : "Edit item"}</Link></Button>}
            {canViewMovements && <Button asChild variant="outline" className="dashboard-button-secondary min-h-10 rounded-lg"><Link href={`/dashboard/inventory/movements?itemId=${encodeURIComponent(item.id)}`}><ArrowLeftRight aria-hidden="true" />{fr ? "Mouvements de stock" : "Stock movements"}</Link></Button>}
            {canViewSuppliers && <Button asChild variant="outline" className="dashboard-button-secondary min-h-10 rounded-lg"><Link href={`${itemPath}/suppliers`}><Truck aria-hidden="true" />{fr ? "Fournisseurs" : "Suppliers"}</Link></Button>}
          </nav>}
        </div>
        <dl className="grid gap-4 border-t border-[var(--dash-border-subtle)] bg-[var(--dash-surface)]/50 px-5 py-4 text-sm sm:grid-cols-3 sm:px-6">
          <div className="min-w-0 space-y-1"><dt className="text-xs text-[var(--dash-text-soft)]">SKU</dt><dd className="break-all font-mono font-medium">{item.sku}</dd></div>
          <div className="min-w-0 space-y-1"><dt className="text-xs text-[var(--dash-text-soft)]">{fr ? "Unité" : "Unit"}</dt><dd className="break-words font-medium">{item.unit ?? "—"}</dd></div>
          <div className="min-w-0 space-y-1"><dt className="text-xs text-[var(--dash-text-soft)]">{fr ? "Article mis à jour" : "Item updated"}</dt><dd className="flex items-start gap-2"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--dash-text-faint)]" aria-hidden="true" /><time dateTime={item.updatedAt}>{date(item.updatedAt)}</time></dd></div>
        </dl>
      </header>
      <section aria-labelledby="item-stock-title" className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h2 id="item-stock-title" className="text-lg font-semibold">{fr ? "Stock par emplacement autorisé" : "Stock by authorized location"}</h2>
            {item.stock.state === "available" && <p className="text-sm leading-6 text-[var(--dash-text-soft)]">{fr ? "Une quantité inconnue indique l’absence de relevé, et non un stock nul." : "An unknown quantity means no stock record is available, not zero stock."}</p>}
          </div>
          {item.stock.state === "available" && <Badge variant="outline" className="dashboard-filter-chip shrink-0 gap-1.5 py-1.5"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{locationCountLabel}</Badge>}
        </div>
        {item.stock.state !== "available" ? <div className="dashboard-glass-panel flex items-start gap-3 rounded-lg p-5 sm:p-6">
          <StockStateIcon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--dash-info)]" aria-hidden="true" />
          <p className="text-sm leading-6 text-[var(--dash-text-soft)]">{item.stock.after ? (fr ? "Fin des emplacements autorisés. Revenez au début pour actualiser la liste." : "End of authorized locations. Return to the beginning to refresh the list.") : stateMessages[item.stock.state]}</p>
        </div> : <>
          <ul className="grid gap-4 xl:grid-cols-2">
            {item.stock.locations.map(location => <li key={location.id} className="dashboard-glass-panel min-w-0 overflow-hidden rounded-lg">
              <div className="flex items-start gap-3 border-b border-[var(--dash-border-subtle)] px-5 py-4">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[var(--dash-info)]" aria-hidden="true" />
                <h3 className="min-w-0 break-words font-semibold">{location.name}</h3>
              </div>
              <dl className="grid grid-cols-1 gap-4 p-5 min-[400px]:grid-cols-3">
                {[
                  { label: fr ? "En stock" : "On hand", value: location.onHand, tone: "text-[var(--dash-text)]" },
                  { label: fr ? "Disponible" : "Available", value: location.available, tone: "text-[var(--dash-info)]" },
                  { label: fr ? "Réservé" : "Reserved", value: location.reserved, tone: "text-[var(--dash-gold)]" },
                ].map(metric => <div key={metric.label} className="min-w-0 space-y-2">
                  <dt className="text-xs font-medium text-[var(--dash-text-soft)]">{metric.label}</dt>
                  <dd className={`break-words font-semibold tabular-nums ${metric.value === null ? "text-base text-[var(--dash-text-soft)]" : `text-2xl ${Number(metric.value) < 0 ? "text-[var(--dash-danger)]" : metric.tone}`}`}>{quantity(metric.value)}</dd>
                  {metric.value !== null && item.unit && <dd className="break-words text-xs text-[var(--dash-text-faint)]">{item.unit}</dd>}
                </div>)}
              </dl>
              {location.updatedAt && <p className="border-t border-[var(--dash-border-subtle)] px-5 py-3 text-xs leading-5 text-[var(--dash-text-soft)]">{fr ? "Stock mis à jour : " : "Stock updated: "}<time dateTime={location.updatedAt}>{date(location.updatedAt)}</time></p>}
            </li>)}
          </ul>
          {item.stock.hasMore && <p role="status" className="text-sm text-[var(--dash-text-soft)]">{fr ? "100 emplacements affichés. D’autres emplacements sont disponibles à la page suivante." : "Showing 100 locations. More locations are available on the next page."}</p>}
        </>}
        {(item.stock.after || item.stock.nextCursor) && <nav aria-label={fr ? "Pages des emplacements" : "Location pages"} className="flex flex-col gap-3 border-t border-[var(--dash-border-subtle)] pt-4 sm:flex-row sm:justify-between">
          {item.stock.after && <Button asChild variant="outline" className="dashboard-button-secondary min-h-10 rounded-lg"><Link href={itemPath}><ArrowLeft aria-hidden="true" />{fr ? "Premiers emplacements" : "First locations"}</Link></Button>}
          {item.stock.nextCursor && <Button asChild variant="outline" className="dashboard-button-secondary min-h-10 rounded-lg sm:ms-auto"><Link href={`${itemPath}?after=${encodeURIComponent(item.stock.nextCursor)}`}>{fr ? "Emplacements suivants" : "Next locations"}<ArrowRight aria-hidden="true" /></Link></Button>}
        </nav>}
      </section>
      </div>
    </section>
  )
}
