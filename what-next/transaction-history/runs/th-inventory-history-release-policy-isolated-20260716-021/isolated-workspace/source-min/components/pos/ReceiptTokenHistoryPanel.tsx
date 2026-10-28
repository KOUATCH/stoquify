"use client"

import { FormEvent } from "react"
import { History, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  ReceiptTokenControlStrip,
  type ReceiptTokenControlItem,
} from "./ReceiptTokenControlStrip"

type ReceiptTokenControlLabels = Parameters<typeof ReceiptTokenControlStrip>[0]["labels"]

export type ReceiptTokenSaleSearchItem = {
  salesOrderId: string
  orderNumber: string
  completedAt: string
  total: number
  tokenCount: number
  activeTokenCount: number
  revokedTokenCount: number
  expiredTokenCount: number
}

type ReceiptTokenHistoryLabels = {
  title: string
  saleLabel: string
  salePlaceholder: string
  lookup: string
  selectedSale: (salesOrderId: string) => string
  noSale: string
  denied: string
  capabilityLoading: string
  capabilityDenied: string
  capabilityUnavailable: string
  loadingSales: string
  emptySales: string
  selectSale: string
  completed: (date: string) => string
  total: (amount: string) => string
  tokenSummary: (count: number, active: number) => string
}

type ReceiptTokenHistoryPanelProps = {
  searchDraft: string
  hasSearched: boolean
  selectedSaleId: string
  saleResults: ReceiptTokenSaleSearchItem[]
  tokens: ReceiptTokenControlItem[]
  canManage?: boolean
  capabilityLoading?: boolean
  capabilityUnavailable?: boolean
  capabilityErrorMessage?: string | null
  salesLoading?: boolean
  isLoading?: boolean
  salesErrorMessage?: string | null
  errorMessage?: string | null
  revokePendingTokenId?: string | null
  controlLabels: ReceiptTokenControlLabels
  labels: ReceiptTokenHistoryLabels
  formatTotal: (amount: number) => string
  onSearchDraftChange: (value: string) => void
  onLookup: () => void
  onSelectSale: (salesOrderId: string) => void
  onRevoke: (tokenId: string, salesOrderId: string) => void
}

function safeDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

export function ReceiptTokenHistoryPanel({
  searchDraft,
  hasSearched,
  selectedSaleId,
  saleResults,
  tokens,
  canManage = true,
  capabilityLoading = false,
  capabilityUnavailable = false,
  capabilityErrorMessage,
  salesLoading = false,
  isLoading = false,
  salesErrorMessage,
  errorMessage,
  revokePendingTokenId,
  controlLabels,
  labels,
  formatTotal,
  onSearchDraftChange,
  onLookup,
  onSelectSale,
  onRevoke,
}: ReceiptTokenHistoryPanelProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onLookup()
  }

  const capabilityMessage = capabilityLoading
    ? labels.capabilityLoading
    : capabilityUnavailable
      ? labels.capabilityUnavailable
      : capabilityErrorMessage
        ? `${labels.capabilityDenied}: ${capabilityErrorMessage}`
        : labels.capabilityDenied

  if (capabilityLoading || capabilityUnavailable || !canManage) {
    return (
      <section
        className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(24,38,45,0.68)] p-3 text-[var(--dash-text)]"
        aria-label={labels.title}
      >
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <History className="h-4 w-4 text-[var(--dash-brand-strong)]" />
          {labels.title}
        </div>
        <div
          className={cn(
            "rounded-lg border px-3 py-2 text-xs",
            capabilityLoading
              ? "border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.42)] text-[var(--dash-text-soft)]"
              : "border-[var(--dash-warning)]/25 bg-[var(--dash-warning-soft)] text-[#ffe4a8]",
          )}
        >
          {capabilityMessage}
        </div>
      </section>
    )
  }

  return (
    <section
      className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(24,38,45,0.68)] p-3 text-[var(--dash-text)]"
      aria-label={labels.title}
    >
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <History className="h-4 w-4 text-[var(--dash-brand-strong)]" />
        {labels.title}
      </div>

      <form className="grid gap-2 sm:grid-cols-[1fr_auto]" onSubmit={handleSubmit}>
        <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--dash-text-soft)]">
          {labels.saleLabel}
          <Input
            value={searchDraft}
            onChange={(event) => onSearchDraftChange(event.target.value)}
            placeholder={labels.salePlaceholder}
            className="mt-1 dashboard-control rounded-lg placeholder:text-[var(--dash-text-faint)] focus-visible:ring-[var(--dash-brand)]/25"
          />
        </label>
        <Button
          type="submit"
          variant="outline"
          className="mt-5 h-10 rounded-lg border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.62)] text-[var(--dash-text)] hover:border-[var(--dash-brand)]/45 hover:bg-[var(--dash-brand-soft)] hover:text-white"
        >
          <Search className="h-4 w-4" />
          <span className="ml-2">{labels.lookup}</span>
        </Button>
      </form>

      {hasSearched ? (
        <div className="mt-3 grid gap-2">
          {salesErrorMessage ? (
            <div className="rounded-lg border border-[var(--dash-warning)]/25 bg-[var(--dash-warning-soft)] px-3 py-2 text-xs text-[#ffe4a8]">
              {labels.denied}: {salesErrorMessage}
            </div>
          ) : salesLoading ? (
            <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.42)] px-3 py-2 text-xs text-[var(--dash-text-soft)]">
              {labels.loadingSales}
            </div>
          ) : saleResults.length === 0 ? (
            <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.42)] px-3 py-2 text-xs text-[var(--dash-text-soft)]">
              {labels.emptySales}
            </div>
          ) : (
            saleResults.map((sale) => (
              <button
                key={sale.salesOrderId}
                type="button"
                className={cn(
                  "rounded-lg border px-3 py-2 text-left text-xs transition",
                  selectedSaleId === sale.salesOrderId
                    ? "border-[var(--dash-spruce)]/55 bg-[var(--dash-spruce-soft)] text-[#d9fffb]"
                    : "border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.42)] text-[var(--dash-text)] hover:border-[var(--dash-brand)]/45",
                )}
                onClick={() => onSelectSale(sale.salesOrderId)}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate font-semibold">{sale.orderNumber}</span>
                  <span className="shrink-0 font-mono">{labels.total(formatTotal(sale.total))}</span>
                </span>
                <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[var(--dash-text-soft)]">
                  <span>{labels.completed(safeDate(sale.completedAt))}</span>
                  <span>{labels.tokenSummary(sale.tokenCount, sale.activeTokenCount)}</span>
                  <span className="sr-only">{labels.selectSale}</span>
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}

      <div className="mt-3 text-xs text-[var(--dash-text-soft)]">
        {selectedSaleId ? labels.selectedSale(selectedSaleId) : labels.noSale}
      </div>

      {selectedSaleId && errorMessage ? (
        <div
          className={cn(
            "mt-3 rounded-lg border px-3 py-2 text-xs",
            "border-[var(--dash-warning)]/25 bg-[var(--dash-warning-soft)] text-[#ffe4a8]",
          )}
        >
          {labels.denied}: {errorMessage}
        </div>
      ) : null}

      {selectedSaleId && !errorMessage ? (
        <ReceiptTokenControlStrip
          tokens={tokens}
          isLoading={isLoading}
          revokePendingTokenId={revokePendingTokenId}
          labels={controlLabels}
          onRevoke={(tokenId) => onRevoke(tokenId, selectedSaleId)}
        />
      ) : null}
    </section>
  )
}