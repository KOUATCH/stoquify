"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatReconciliationAmount } from "@/components/finance/reconciliation-amount"
import type { PaymentReconciliationSignOffCommandCandidate } from "@/services/reconciliation/payment-reconciliation-sign-off-command-state-contracts"

// The action center discovers work. The destination owns current review, signing and recovery.
export function PaymentReconciliationSignOffCommand({ locale, command }: {
  locale: "en" | "fr"; command: PaymentReconciliationSignOffCommandCandidate
}) {
  const t = useTranslations("paymentReconciliationWorkbench.signReview")
  const href = `/${locale}/dashboard/finance/reconciliation?reviewRun=${encodeURIComponent(command.source.id)}`
  return <div className="w-full min-w-0 space-y-2 lg:w-auto lg:max-w-sm" data-testid="payment-reconciliation-sign-off-command">
    <div className="space-y-1 text-xs text-[var(--dash-text-soft)]">
      <p className="break-words font-medium text-[var(--dash-text)]">{command.provider.displayName}</p>
      <p>{new Date(command.businessDate).toLocaleDateString(locale)}</p>
      <p>{t("totals.matched")}: {formatReconciliationAmount(command.totals.matchedAmount, locale)} {command.provider.currencyCode}</p>
      <p>{t("managerHandoff")}</p>
    </div>
    <Button asChild size="sm" className="dashboard-button-primary h-auto min-h-10 w-full whitespace-normal rounded-lg sm:w-auto">
      <Link href={href}><ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />{t("open")}</Link>
    </Button>
  </div>
}
