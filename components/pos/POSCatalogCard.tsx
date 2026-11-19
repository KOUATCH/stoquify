"use client"

import { Eye, Heart, ImageIcon, Plus } from "lucide-react"
import { useId, useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type POSCatalogCardItem = {
  id: string
  sku: string
  barcode: string | null
  nameEn: string
  nameFr: string | null
  thumbnail: string | null
  sellingPrice: number
  trackInventory: boolean
  category?: { id: string; titleEn: string; titleFr: string | null } | null
  brand?: { nameEn: string; nameFr: string | null } | null
  stock: {
    quantityOnHand: number
    quantityAvailable: number
    reorderPoint: number
    status: string
  }
}

type POSCatalogCardProps = {
  item: POSCatalogCardItem
  locale: string
  formattedPrice: string
  inCartQuantity: number
  isFavorite: boolean
  disabled: boolean
  view: "grid" | "list"
  touchMode: boolean
  onAdd: () => void
  onDetails: (trigger: HTMLButtonElement) => void
  onToggleFavorite: () => void
}

const iconButtonClass = "h-11 w-11 shrink-0 rounded-lg border-0 bg-transparent text-[var(--dash-text-muted)] hover:bg-[var(--dash-brand-soft)] hover:text-[var(--dash-text)] focus-visible:ring-2 focus-visible:ring-[var(--dash-brand)]"

export function POSCatalogCard({
  item, locale, formattedPrice, inCartQuantity, isFavorite, disabled,
  view, touchMode, onAdd, onDetails, onToggleFavorite,
}: POSCatalogCardProps) {
  const t = useTranslations("pos")
  const itemLabel = locale === "fr" ? item.nameFr || item.nameEn : item.nameEn
  const categoryLabel = item.category
    ? (locale === "fr" ? item.category.titleFr || item.category.titleEn : item.category.titleEn)
    : t("catalog.noCategory")
  const outOfStock = item.stock.status === "out"
  const favoriteLabel = isFavorite ? t("catalog.removeFavorite") : t("catalog.addFavorite")
  const cartQuantityId = useId()
  const [failedThumbnail, setFailedThumbnail] = useState<string | null>(null)
  const showThumbnail = Boolean(item.thumbnail && item.thumbnail !== failedThumbnail)

  return (
    <article
      aria-label={itemLabel}
      aria-describedby={inCartQuantity > 0 ? cartQuantityId : undefined}
      data-testid="pos-catalog-card"
      className={cn(
        "flex min-w-0 flex-col gap-2 rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] p-2 text-[var(--dash-text)] transition-colors hover:border-[var(--dash-border)]",
        inCartQuantity > 0 && "border-[var(--dash-brand-strong)] bg-[color-mix(in_srgb,var(--dash-brand)_14%,var(--dash-surface))] ring-1 ring-inset ring-[var(--dash-brand)] hover:border-[var(--dash-brand-strong)]",
        view === "list" && "sm:flex-row sm:items-center",
      )}
    >
      <div className={cn(
        "grid min-w-0 flex-1 items-start gap-x-2 gap-y-1",
        view === "grid" ? "grid-cols-[4rem_minmax(0,1fr)]" : "grid-cols-[3.5rem_minmax(0,1fr)]",
      )}>
        <div className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-[var(--dash-canvas)] text-[var(--dash-text-muted)]",
          view === "grid" ? "h-16 w-16" : "h-14 w-14",
        )}>
          {showThumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.thumbnail!} alt="" loading="lazy" onError={() => setFailedThumbnail(item.thumbnail)} className="h-full w-full object-contain" />
          ) : <ImageIcon data-testid="pos-product-image-fallback" className="h-6 w-6" aria-hidden="true" />}
        </div>

        <div className="min-w-0">
          <p className="line-clamp-2 break-words text-sm font-semibold leading-4" title={itemLabel}>{itemLabel}</p>
          <p className="mt-0.5 line-clamp-1 text-xs leading-4 text-[var(--dash-text-muted)]" title={categoryLabel}>{categoryLabel}</p>
          <p className="mt-0.5 flex min-w-0 flex-wrap items-baseline gap-x-1 text-xs leading-4 text-[var(--dash-text-muted)]">
            <span className="shrink-0 font-medium">{t("catalog.sku")}</span>
            <span className="min-w-0 break-all font-mono text-[var(--dash-text)]">{item.sku}</span>
          </p>
        </div>

        <div className="col-span-2 flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <p className="min-w-0 max-w-full text-base font-bold leading-5 tabular-nums [overflow-wrap:anywhere]">{formattedPrice}</p>
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-4">
            <span className={cn(
              "break-words font-medium",
              outOfStock ? "text-[var(--dash-danger)]" : item.stock.status === "low" ? "text-[var(--dash-warning)]" : "text-[var(--dash-text-muted)]",
            )}>
              {t(`stock.${item.stock.status}`, { count: item.stock.quantityAvailable })}
            </span>
            {inCartQuantity > 0 ? (
              <span id={cartQuantityId} className="max-w-full break-words rounded-md border border-[var(--dash-brand-strong)] bg-[var(--dash-brand-strong)] px-1.5 py-0.5 font-bold tabular-nums text-[var(--dash-canvas)]">
                {t("stock.inCartCount", { count: inCartQuantity })}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className={cn("mt-auto flex min-w-0 items-center gap-2", view === "list" && "sm:mt-0 sm:w-52 sm:shrink-0")}>
        <Button
          type="button" variant="ghost" size="icon" className={iconButtonClass}
          aria-label={`${t("catalog.details")} — ${itemLabel}`} title={t("catalog.details")} onClick={(event) => onDetails(event.currentTarget)}
        >
          <Eye className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          type="button" variant="ghost" size="icon"
          className={cn(iconButtonClass, isFavorite && "bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)]")}
          aria-label={`${favoriteLabel} — ${itemLabel}`} aria-pressed={isFavorite} title={favoriteLabel} onClick={onToggleFavorite}
        >
          <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} aria-hidden="true" />
        </Button>
        <Button
          type="button" variant="default"
          className={cn(
            "dashboard-button-primary h-auto min-h-11 min-w-0 flex-1 gap-1 rounded-lg px-2 py-2 font-semibold !shadow-none focus-visible:ring-2 focus-visible:ring-[var(--dash-brand)] disabled:cursor-not-allowed disabled:!border-[var(--dash-border-subtle)] disabled:!bg-none disabled:!bg-[var(--dash-canvas)] disabled:!text-[var(--dash-text-muted)] disabled:!opacity-100",
            touchMode && "min-h-12",
          )}
          aria-label={`${t("catalog.add")} ${itemLabel}`}
          title={outOfStock ? t("stock.out") : t("catalog.add")}
          disabled={disabled || outOfStock} onClick={onAdd}
        >
          {!outOfStock ? <Plus className="h-4 w-4" aria-hidden="true" /> : null}
          <span className="min-w-0 whitespace-normal break-words text-xs leading-4">{outOfStock ? t("stock.out") : t("catalog.add")}</span>
        </Button>
      </div>
    </article>
  )
}
