import { BIActionButton } from "@/components/bi/BIActionButton"
import { dashboardPanelClass } from "@/components/finance/finance-dashboard-theme"
import { cn } from "@/lib/utils"
import type { BIDailyDigest } from "@/services/bi/bi-contracts"
import { groupDigestBlockers } from "./digest-blocker-groups"

export function DigestSourceLimitations({ digest, locale, children }: { digest: BIDailyDigest; locale: "en" | "fr"; children?: React.ReactNode }) {
  const groups = groupDigestBlockers(digest)
  const fr = locale === "fr"
  if (!groups.length && !digest.redactions.length) return null
  const title = fr ? "Limites des sources" : "Source limitations"
  return <section className={cn(dashboardPanelClass, "border-[var(--dash-gold)] p-4")} aria-label={title}>
    <h2 className="text-sm font-semibold">{title}</h2>
    <p className="mt-1 text-sm text-[var(--dash-text-soft)]">{fr ? "Blocages distincts" : "Distinct blockers"}: {groups.length} · {fr ? "Données masquées" : "Redactions"}: {digest.redactions.length}</p>
    <ul className="mt-3 space-y-3 text-sm">
      {groups.map(group => <li key={group.key} className="min-w-0 [overflow-wrap:anywhere]">
        <details className="rounded-md border border-[var(--dash-border-subtle)] p-2">
          <summary className="min-h-11 cursor-pointer rounded-md py-2 focus-visible:ring-2 focus-visible:ring-[var(--dash-brand)]">
            {group.variants[0].title}
            {group.references.length ? <span className="ml-2 text-xs text-[var(--dash-text-soft)]">— {[...new Set(group.references.map(ref => `${ref.label}${ref.scope ? ` (${ref.scope})` : ""}`))].join(" · ")}</span> : null}
          </summary>
          {group.variants.map((blocker, index) => <div key={index} className="mt-2 space-y-1 text-[var(--dash-text-soft)]">
            {index > 0 ? <p className="font-medium">{blocker.title}</p> : null}<p>{blocker.detail}</p>
            {blocker.nextAction ? <p>{fr ? "Prochaine étape" : "Next step"}: <span>{blocker.nextAction}</span></p> : null}
          </div>)}
          {group.references.map((ref, index) => <div key={index} className="mt-3">
            <p className="text-xs">{ref.label}{ref.scope ? ` · ${ref.scope}` : ""}</p>
            {ref.action ? <BIActionButton action={ref.action} locale={locale} context={ref.label} /> : <p className="text-xs text-[var(--dash-text-soft)]">{ref.unavailableReason ?? (fr ? "Aucun lien source autorisé disponible." : "No authorized source link is available.")}</p>}
          </div>)}
        </details>
        {[...new Set(group.variants.filter(item => item.severity === "critical" || item.severity === "high").map(item => item.nextAction || item.detail))].map(text => <p key={text} className="mt-1 text-[var(--dash-gold)]">{text}</p>)}
      </li>)}
    </ul>
    {children}
  </section>
}
