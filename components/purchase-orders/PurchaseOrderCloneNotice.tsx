"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"

export function PurchaseOrderCloneNotice({ pending, failure, ordersHref }: {
  pending: boolean
  failure: "denied" | "unavailable" | "stopped" | "unknown" | null
  ordersHref: string
}) {
  const t = useTranslations("purchaseOrderClone")
  const alertRef = useRef<HTMLDivElement>(null)
  useEffect(() => { if (failure) alertRef.current?.focus() }, [failure])

  return (
    <div className="space-y-2 text-sm text-[var(--dash-text-soft)]">
      <p>{t("scope")} {t("draftOnly")}</p>
      {pending ? <p role="status">{t("pending")}</p> : null}
      {failure ? (
        <div ref={alertRef} role="alert" tabIndex={-1}
          className="rounded-lg border border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] p-4 text-[var(--dash-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--dash-brand)]">
          <p className="font-semibold">{t(failure === "unknown" ? "unknownTitle" : "failedTitle")}</p>
          <p className="mt-1">{t(failure)}</p>
          {failure === "unknown" ? <Link href={ordersHref} target="_blank" rel="noopener noreferrer"
            className="mt-2 inline-block underline underline-offset-4">{t("openOrders")}</Link> : null}
        </div>
      ) : null}
    </div>
  )
}
