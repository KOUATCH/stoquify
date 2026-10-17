"use client"

import { useEffect, useId, useState } from "react"
import { useRouter } from "next/navigation"
import { localizePath } from "@/i18n/routing"
import { searchBusinessRecordsAction } from "@/actions/search/business-record-search.actions"
import type { RecordSearchResult } from "@/services/search/business-record-search-contracts"

type PageHit = { href: string; title: string; context: string }
export function BusinessRecordSearch({ query, onQueryChange, pages, locale, authority }: {
  query: string
  onQueryChange: (query: string) => void
  pages: PageHit[]
  locale: "en" | "fr"
  authority: string
}) {
  const router = useRouter()
  const listId = useId()
  const [active, setActive] = useState(-1)
  const [retry, setRetry] = useState(0)
  const [response, setResponse] = useState<{ key: string; data: RecordSearchResult | null } | null>(null)
  const key = JSON.stringify([authority, query.trim(), locale, retry])
  const fr = locale === "fr"
  useEffect(() => {
    let current = true
    setActive(-1)
    if (query.trim().length < 2 || !authority) return
    const timer = setTimeout(async () => {
      try {
        const result = await searchBusinessRecordsAction(query, locale)
        if (current) setResponse({ key, data: result.success ? result.data : null })
      } catch {
        if (current) setResponse({ key, data: null })
      }
    }, 250)
    return () => { current = false; clearTimeout(timer) }
  }, [key, query, locale, authority])
  const current = response?.key === key ? response : null
  const records = current?.data?.hits ?? []
  const options = [...pages, ...records]
  const open = Boolean(query.trim())
  const go = (href: string) => { onQueryChange(""); setActive(-1); router.push(localizePath(href, locale)) }
  const domainName = { items: fr ? "Articles" : "Items", customers: fr ? "Clients" : "Customers", purchaseOrders: fr ? "Commandes d’achat" : "Purchase orders" }

  return <div className="relative min-w-0">
    <input type="search" role="combobox" aria-autocomplete="list" aria-expanded={open}
      aria-controls={open ? listId : undefined}
      aria-activedescendant={open && active >= 0 && active < options.length ? `${listId}-${active}` : undefined}
      value={query} maxLength={100}
      onChange={event => { setActive(-1); onQueryChange(event.target.value) }}
      onKeyDown={event => {
        if (event.key === "Escape") { onQueryChange(""); setActive(-1) }
        if (event.key === "ArrowDown" && options.length) { event.preventDefault(); setActive(value => (value + 1) % options.length) }
        if (event.key === "ArrowUp" && options.length) { event.preventDefault(); setActive(value => value <= 0 ? options.length - 1 : value - 1) }
        if (event.key === "Enter" && options.length) { event.preventDefault(); go(options[active >= 0 && active < options.length ? active : 0].href) }
      }}
      placeholder={fr ? "Rechercher une page ou un document" : "Search pages or records"}
      aria-label={fr ? "Rechercher une page ou un document" : "Search pages or records"}
      className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.055] px-3 text-sm text-white outline-none placeholder:text-[#8fa4ab] focus:border-[#5796ff] focus:ring-2 focus:ring-[#5796ff]" />
    {open && <div className="absolute left-0 right-0 top-12 z-50 max-h-[65vh] overflow-auto rounded-xl border border-white/10 bg-[#142129] p-2 text-sm text-[#d3ddd8] shadow-xl">
      <div id={listId} role="listbox" aria-label={fr ? "Résultats de recherche" : "Search results"}>
        <div role="group" aria-label="Pages">
          <p className="px-2 py-1 font-semibold">Pages</p>
          {pages.map((page, index) => <button type="button" role="option" aria-selected={active === index} id={`${listId}-${index}`} key={page.href}
            onMouseDown={event => event.preventDefault()} onClick={() => go(page.href)}
            className={`block w-full rounded-lg px-3 py-2 text-left focus-visible:ring-2 focus-visible:ring-blue-400 ${active === index ? "bg-white/15" : "hover:bg-white/10"}`}>
            <span className="block font-medium">{page.title}</span><span className="block text-xs text-[#9fb4bb]">{page.context}</span>
          </button>)}
        </div>
        <div role="group" aria-label={fr ? "Documents" : "Records"}>
          <p className="px-2 py-1 font-semibold">{fr ? "Documents" : "Records"}</p>
          {records.map((record, index) => <button type="button" role="option" aria-selected={active === pages.length + index} id={`${listId}-${pages.length + index}`} key={`${record.domain}:${record.id}`}
            onMouseDown={event => event.preventDefault()} onClick={() => go(record.href)}
            className={`block w-full rounded-lg px-3 py-2 text-left focus-visible:ring-2 focus-visible:ring-blue-400 ${active === pages.length + index ? "bg-white/15" : "hover:bg-white/10"}`}>
            <span className="block break-words font-medium">{record.title}</span><span className="block break-all text-xs text-[#9fb4bb]">{domainName[record.domain]} · {record.reference}</span>
          </button>)}
        </div>
      </div>
      <div role="status" aria-live="polite" className="px-2 py-2 text-[#9fb4bb]">
        {query.trim().length < 2 ? (fr ? "Saisissez au moins deux caractères pour rechercher des documents." : "Enter at least two characters to search records.")
          : !current ? (fr ? "Recherche des documents…" : "Searching records…")
          : !current.data ? (fr ? "Documents indisponibles. Votre recherche est conservée." : "Records unavailable. Your query is preserved.")
          : !records.length ? (fr ? "Aucun document accessible trouvé." : "No accessible records found.") : `${records.length} ${fr ? "documents" : "records"}`}
        {Boolean(current?.data?.partialDomains.length) && <p>{fr ? "Résultats partiels : " : "Partial results: "}{current?.data?.partialDomains.map(domain => domainName[domain]).join(", ")}</p>}
      </div>
      {current && (!current.data || current.data.partialDomains.length > 0) && <button type="button" className="rounded px-2 py-2 underline" onClick={() => setRetry(value => value + 1)}>{fr ? "Réessayer" : "Retry"}</button>}
    </div>}
  </div>
}
