"use client"

import { useId } from "react"
import Link, { useLinkStatus } from "next/link"
import { ArrowUpRight, ShieldAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { localizePath } from "@/i18n/routing"
import { biLocale } from "@/lib/dashboard/bi-presentation"
import { cn } from "@/lib/utils"
import type { BIActionLink } from "@/services/bi/bi-contracts"

type Props = {
  action: Pick<BIActionLink, "label" | "href" | "disabled" | "disabledReason">
  locale?: string
  context?: string
  primary?: boolean
  className?: string
}

/** Presentation only: preserves the server's destination and disabled decision. */
export function BIActionButton({ action, locale = "en", context, primary = false, className }: Props) {
  const reasonId = useId()
  const language = biLocale(locale)
  const generic = /^(open|ouvrir)$/i.test(action.label.trim())
  const verb = language === "fr" ? "Ouvrir" : "Open"
  const label = generic ? context ? `${verb}${language === "fr" ? " : " : ": "}${context}` : verb : action.label
  const unavailable = action.disabled || !action.href.trim()
  const reason = action.disabledReason || (language === "fr" ? "Cette action est indisponible pour le moment." : "This action is currently unavailable.")
  const buttonClass = cn(
    "h-auto min-h-11 max-w-full whitespace-normal break-words rounded-lg py-2 text-start",
    primary ? "dashboard-button-primary w-full" : "border-[var(--dash-border-subtle)] text-[var(--dash-text)]",
  )

  return (
    <div className={cn("min-w-0 max-w-full space-y-2", className)}>
      {unavailable ? (
        <>
          <Button type="button" size="sm" variant={primary ? "default" : "outline"} disabled aria-describedby={reasonId} className={buttonClass}>
            <ShieldAlert className="h-4 w-4" aria-hidden="true" />
            {label}
          </Button>
          <p id={reasonId} className="break-words text-xs leading-5 text-[var(--dash-text-soft)]">{reason}</p>
        </>
      ) : (
        <Button asChild size="sm" variant={primary ? "default" : "outline"} className={buttonClass}>
          <Link href={localizePath(action.href, language)}>
            <ActionLinkContent label={label} language={language} />
          </Link>
        </Button>
      )}
    </div>
  )
}

function ActionLinkContent({ label, language }: { label: string; language: "en" | "fr" }) {
  const { pending } = useLinkStatus()
  return <span className="inline-flex min-w-0 flex-wrap items-center gap-2" aria-busy={pending}>
    <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
    <span>{label}</span>
    {pending ? <span role="status" className="text-xs">{language === "fr" ? "Ouverture…" : "Opening…"}</span> : null}
  </span>
}
