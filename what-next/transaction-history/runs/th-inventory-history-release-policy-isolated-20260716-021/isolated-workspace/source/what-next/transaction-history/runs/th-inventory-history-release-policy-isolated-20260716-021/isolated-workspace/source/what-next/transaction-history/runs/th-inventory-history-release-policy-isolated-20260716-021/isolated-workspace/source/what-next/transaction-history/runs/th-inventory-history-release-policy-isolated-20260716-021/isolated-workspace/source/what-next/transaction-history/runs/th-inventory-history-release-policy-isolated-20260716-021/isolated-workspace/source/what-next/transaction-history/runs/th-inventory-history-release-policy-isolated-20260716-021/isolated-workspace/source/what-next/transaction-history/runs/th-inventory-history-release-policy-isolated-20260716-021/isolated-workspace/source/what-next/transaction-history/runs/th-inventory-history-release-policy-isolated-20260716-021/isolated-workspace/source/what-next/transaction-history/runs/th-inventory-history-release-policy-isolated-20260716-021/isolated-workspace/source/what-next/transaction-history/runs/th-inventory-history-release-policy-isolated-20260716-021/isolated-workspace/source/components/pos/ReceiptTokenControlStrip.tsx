"use client"

import { Receipt, ShieldCheck, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type ReceiptTokenControlItem = {
  id: string
  tokenIdSuffix: string
  salesOrderId: string
  status: string
  isActive: boolean
  issuedAt: string
  expiresAt: string
  lastAccessedAt: string | null
  accessCount: number
  revokedAt: string | null
  revocationReason: string | null
}

type ReceiptTokenControlLabels = {
  title: string
  loading: string
  empty: string
  active: string
  revoked: string
  expired: string
  accessed: (count: number) => string
  expires: (date: string) => string
  revoke: string
}

type ReceiptTokenControlStripProps = {
  tokens: ReceiptTokenControlItem[]
  isLoading?: boolean
  revokePendingTokenId?: string | null
  labels: ReceiptTokenControlLabels
  onRevoke: (tokenId: string) => void
}

function safeDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function statusLabel(token: ReceiptTokenControlItem, labels: ReceiptTokenControlLabels) {
  if (token.status === "REVOKED" || token.revokedAt) return labels.revoked
  if (!token.isActive) return labels.expired
  return labels.active
}

export function ReceiptTokenControlStrip({
  tokens,
  isLoading = false,
  revokePendingTokenId,
  labels,
  onRevoke,
}: ReceiptTokenControlStripProps) {
  if (isLoading) {
    return (
      <section className="mt-3 rounded-lg border border-[var(--dash-spruce)]/25 bg-[rgba(12,20,24,0.24)] p-2 text-xs" aria-label={labels.title}>
        <div className="flex items-center gap-2 text-[#d9fffb]">
          <ShieldCheck className="h-3.5 w-3.5" />
          {labels.loading}
        </div>
      </section>
    )
  }

  if (tokens.length === 0) {
    return (
      <section className="mt-3 rounded-lg border border-[var(--dash-spruce)]/25 bg-[rgba(12,20,24,0.24)] p-2 text-xs" aria-label={labels.title}>
        <div className="flex items-center gap-2 text-[#d9fffb]">
          <Receipt className="h-3.5 w-3.5" />
          {labels.empty}
        </div>
      </section>
    )
  }

  return (
    <section className="mt-3 rounded-lg border border-[var(--dash-spruce)]/25 bg-[rgba(12,20,24,0.24)] p-2 text-xs" aria-label={labels.title}>
      <div className="mb-2 flex items-center gap-2 font-semibold text-[#d9fffb]">
        <ShieldCheck className="h-3.5 w-3.5" />
        {labels.title}
      </div>
      <div className="grid gap-2">
        {tokens.map((token) => {
          const pending = revokePendingTokenId === token.id
          return (
            <div key={token.id} className="flex min-w-0 items-center justify-between gap-2 rounded-md border border-[var(--dash-spruce)]/20 bg-[rgba(37,57,67,0.36)] px-2 py-1.5">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="min-w-0 truncate font-mono">#{token.tokenIdSuffix}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "shrink-0 border-[var(--dash-spruce)]/30 bg-[var(--dash-spruce-soft)] text-[#d9fffb]",
                      !token.isActive && "border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.42)] text-[var(--dash-text-soft)]",
                    )}
                  >
                    {statusLabel(token, labels)}
                  </Badge>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[var(--dash-text-soft)]">
                  <span>{labels.accessed(token.accessCount)}</span>
                  <span>{labels.expires(safeDate(token.expiresAt))}</span>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 shrink-0 rounded-lg border-[var(--dash-danger)]/45 bg-[var(--dash-danger-soft)] px-2 text-[#ffd4db] hover:border-[var(--dash-danger)]/65 hover:bg-[rgba(239,106,106,0.22)] hover:text-white disabled:opacity-55"
                disabled={!token.isActive || pending}
                aria-label={`${labels.revoke} #${token.tokenIdSuffix}`}
                onClick={() => onRevoke(token.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:ml-1">{labels.revoke}</span>
              </Button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
