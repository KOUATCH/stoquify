"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { flushSync } from "react-dom"
import Link from "next/link"
import { getAccountantPortfolioAction } from "@/actions/accounting/accountant-access.actions"
import { RouteStatePanel } from "@/components/dashboard/primitives/command-center-primitives"
import type { AccountantPortfolio as Portfolio } from "@/services/accounting/accountant-access.service"
import { AccountantPortfolio, portfolioButton } from "./AccountantPortfolio"
import { AccountantWorkDesk } from "./AccountantWorkDesk"
import type { DelegatedEvidenceRecovery } from "./DelegatedEvidenceDesk"
import { accountantPortfolioCopy } from "./accountant-portfolio-copy"
import { dashboardLoginRecoveryHref } from "@/lib/security/dashboard-session-recovery"

type PageInput = { search?: string; cursor?: string; pageSize?: number }
type Failure = keyof typeof accountantPortfolioCopy.en.errors

export function AccountantPortfolioWorkspace({ locale = "en", initialInput = {} }: { locale?: string; initialInput?: PageInput }) {
  const language = locale === "fr" ? "fr" : "en"
  const copy = accountantPortfolioCopy[language]
  const [search, setSearch] = useState(initialInput.search ?? "")
  const [data, setData] = useState<Portfolio | null>(null)
  const [pending, setPending] = useState(true)
  const [failure, setFailure] = useState<Failure | null>(null)
  const input = useRef<PageInput>(initialInput)
  const revision = useRef(0)
  // Keep only the exact uncertain command across private-DOM removal. Never persist it.
  const evidenceRecovery = useRef<DelegatedEvidenceRecovery | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const route = `/${language}/dashboard/accounting/accountant-portfolio`
  const initialKey = JSON.stringify(initialInput)

  const load = useCallback(async (next: PageInput, focus = false) => {
    const current = ++revision.current
    input.current = next
    // Clear both portfolio and work-desk private state before any reauthorization.
    setData(null); setPending(true); setFailure(null)
    try {
      const response = await getAccountantPortfolioAction(next)
      if (current !== revision.current) return
      if (response.success) {
        if (evidenceRecovery.current?.actorId !== response.data.accountantUserId) evidenceRecovery.current = null
        setData(response.data)
        input.current = { ...next, search: response.data.page.search, pageSize: response.data.page.pageSize }
        const query = new URLSearchParams({ search: response.data.page.search, pageSize: String(response.data.page.pageSize) })
        if (next.cursor) query.set("cursor", next.cursor)
        window.history.replaceState(window.history.state, "", `${route}?${query}`)
      } else {
        if (response.code === "FORBIDDEN" || response.code === "AUTH_REQUIRED" || response.code === "FRESH_AUTH_REQUIRED") evidenceRecovery.current = null
        setFailure(response.code === "AUTH_REQUIRED" || response.code === "FRESH_AUTH_REQUIRED" ? "stale_session"
          : response.code === "FORBIDDEN" ? "permission_denied"
            : response.code === "BUSINESS_RULE_VIOLATION" || response.code === "VALIDATION_ERROR" ? "stale_data" : "error")
      }
    } catch { if (current === revision.current) setFailure("error") }
    finally {
      if (current === revision.current) { setPending(false); if (focus) heading.current?.focus() }
    }
  }, [route])

  useEffect(() => {
    input.current = JSON.parse(initialKey) as PageInput
    setSearch(input.current.search ?? "")
    void load(input.current)
    const hide = () => {
      revision.current++
      // Flush before the browser can freeze a private DOM snapshot in BFCache.
      flushSync(() => { setData(null); setPending(true); setFailure(null) })
    }
    const visible = () => { if (document.visibilityState === "hidden") hide(); else void load(input.current) }
    const restore = (event: PageTransitionEvent) => { if (event.persisted) void load(input.current) }
    document.addEventListener("visibilitychange", visible)
    window.addEventListener("pagehide", hide)
    window.addEventListener("pageshow", restore)
    return () => {
      revision.current++
      document.removeEventListener("visibilitychange", visible)
      window.removeEventListener("pagehide", hide)
      window.removeEventListener("pageshow", restore)
    }
  }, [load, initialKey])

  useEffect(() => {
    if (!data?.clients.length) return
    const expires = Math.min(...data.clients.map(row => Date.parse(row.grant.expiresAt)))
    // Known expiry removes details and asks the server for a new authorized page.
    if (!Number.isFinite(expires)) return
    const delay = expires - Date.now()
    if (delay > 2_147_483_647) return
    const timer = window.setTimeout(() => void load(input.current), Math.max(0, delay))
    return () => window.clearTimeout(timer)
  }, [data, load])

  const returnQuery = new URLSearchParams({ search: search.trim(), pageSize: String(input.current.pageSize ?? 10) })
  return <div id="accountant-portfolio-workspace" className="min-w-0 space-y-5">
    <form className="dashboard-glass-panel rounded-lg p-4" onSubmit={event => {
      event.preventDefault(); void load({ search: search.trim(), pageSize: input.current.pageSize }, true)
    }}>
      <label htmlFor="portfolio-search" className="block text-sm font-medium">{copy.search}</label>
      <p id="portfolio-search-help" className="mb-2 text-sm text-[var(--dash-text-soft)]">{copy.searchHelp}</p>
      <div className="flex flex-wrap gap-3">
        <input id="portfolio-search" name="search" type="search" maxLength={100} value={search} onChange={e => setSearch(e.target.value)} aria-describedby="portfolio-search-help" className="min-h-11 w-full min-w-0 basis-full rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] px-3 text-[var(--dash-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dash-brand)] sm:w-auto sm:flex-1 sm:basis-auto" />
        <button className={portfolioButton} disabled={pending} type="submit">{copy.submit}</button>
        <button className={portfolioButton} disabled={pending} type="button" onClick={() => void load(input.current, true)}>{copy.refresh}</button>
      </div>
    </form>
    <section aria-labelledby="portfolio-heading" aria-busy={pending}>
      <h2 ref={heading} id="portfolio-heading" tabIndex={-1} className="mb-3 text-lg font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--dash-brand)]">{copy.title}</h2>
      <div role="status" aria-live="polite" className={pending || failure ? "mb-3 text-sm" : "sr-only"}>{pending ? copy.loading : failure ? copy.errors[failure][0] : data ? `${data.page.loadedCount} ${copy.scope}` : ""}</div>
      {pending && <RouteStatePanel kind="loading" title={copy.loading} message={copy.searchHelp} />}
      {failure && <>
        <RouteStatePanel kind={failure} title={copy.errors[failure][0]} message={copy.errors[failure][1]} action={{ label: failure === "stale_data" ? copy.restart : copy.retry, onClick: () => void load(failure === "stale_data" ? { search: search.trim(), pageSize: 10 } : input.current, true) }} />
        {failure === "stale_session" && <Link prefetch={false} className={`${portfolioButton} mt-3`} href={dashboardLoginRecoveryHref(`${route}?${returnQuery}`, language)}>{copy.signIn}</Link>}
      </>}
      {data && <AccountantPortfolio portfolio={data} locale={language} onPage={cursor => void load({ ...input.current, cursor }, true)} />}
    </section>
    {data && <div><p className="mb-3 text-sm text-[var(--dash-text-soft)]">{copy.workScope}</p><AccountantWorkDesk locale={language} evidenceRecoveryRef={evidenceRecovery} /></div>}
  </div>
}
