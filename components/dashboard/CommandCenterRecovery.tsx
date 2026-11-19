"use client"

import { Fragment, useRef, useState, useEffect, useLayoutEffect, useTransition, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

/** A refresh only succeeds when a new server-rendered snapshot is committed.
 * Private descendants are unmounted during refresh/failure and on snapshot replacement.
 * No private payload or receipt is persisted, and refresh cannot execute business commands.
 */
export function CommandCenterRecovery({snapshot, locale, children}: {snapshot: object; locale: "en" | "fr"; children: ReactNode}) {
  const contentRoot = useRef<HTMLDivElement>(null)
  const focusToRestore = useRef<{id: string; mode: string | null} | null>(null)
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [accepted, setAccepted] = useState(snapshot)
  const [generation, setGeneration] = useState(0)
  const [status, setStatus] = useState<"idle" | "pending" | "success" | "failed">("idle")
  const active = useRef(false)
  if (accepted !== snapshot) {
    const focused = typeof document !== "undefined" ? document.activeElement : null
    focusToRestore.current = focused instanceof HTMLElement && contentRoot.current?.contains(focused)
      ? {id: focused.id, mode: focused.getAttribute("data-command-mode")} : null
    setAccepted(snapshot)
    setGeneration(generation + 1)
    setStatus(status === "pending" ? "success" : "idle")
    active.current = false
  }
  useLayoutEffect(() => {
    const focus = focusToRestore.current
    focusToRestore.current = null
    // A protected response can replace the snapshot after a drawer has closed.
    // Restore only an equivalent permitted control, without retaining private UI state.
    if (!focus || document.activeElement !== document.body) return
    const mode = focus.mode && ["brief", "command", "investigate"].includes(focus.mode) ? focus.mode : null
    if (!focus.id && !mode) return
    const modes = mode ? contentRoot.current?.querySelectorAll<HTMLElement>(`button[data-command-mode="${mode}"]`) : null
    const replacement = focus.id ? document.getElementById(focus.id) : modes?.length === 1 ? modes[0] : null
    if (!replacement || !contentRoot.current?.contains(replacement)) {
      document.getElementById("dashboard-main-content")?.focus()
      return
    }
    if (!replacement.matches(":disabled")) {
      replacement.focus()
      return
    }
    if (!mode) {
      document.getElementById("dashboard-main-content")?.focus()
      return
    }
    // Mode controls become enabled after hydration. Restore only while focus is
    // still unclaimed; never move it back after the user chooses another control.
    const cleanup = () => {
      observer.disconnect()
      document.removeEventListener("focusin", cleanup)
    }
    const observer = new MutationObserver(() => {
      if (document.activeElement !== document.body || !contentRoot.current?.contains(replacement)) {
        cleanup()
      } else if (!replacement.matches(":disabled")) {
        cleanup()
        replacement.focus()
      }
    })
    observer.observe(replacement, {attributes: true, attributeFilter: ["disabled"]})
    document.addEventListener("focusin", cleanup)
    return cleanup
  }, [generation])
  useEffect(() => {
    if (status !== "pending") return
    const timeout = window.setTimeout(() => { active.current = false; setStatus("failed") }, 20000)
    return () => window.clearTimeout(timeout)
  }, [status, accepted])
  const fr = locale === "fr"
  function refresh() {
    if (active.current) return
    active.current = true
    setStatus("pending")
    startTransition(() => {
      try { router.refresh() }
      catch { active.current = false; setStatus("failed") }
    })
  }
  return <div ref={contentRoot} className="dashboard-landing-theme dark bg-[var(--dash-canvas)] text-[var(--dash-text)]">
    <div className="mx-auto flex max-w-[1920px] flex-wrap items-center gap-3 px-4 py-3 md:px-6 lg:px-8" aria-busy={status === "pending"}>
      <Button variant="outline" onClick={refresh} disabled={status === "pending"}>{fr ? "Actualiser la vue" : "Refresh view"}</Button>
      <p role="status" aria-atomic="true" className="text-sm text-[var(--dash-text-soft)]">
        {status === "pending" ? fr ? "Actualisation et vérification des accès…" : "Refreshing and checking access…"
          : status === "success" ? fr ? "Vue rechargée. Consultez la fraîcheur de chaque source ; aucune action n’a été résolue." : "View reloaded. Check each source’s freshness; no action was resolved."
          : status === "failed" ? fr ? "Actualisation non confirmée. Les anciennes données sont masquées. Réessayez ou rechargez la page." : "Refresh was not confirmed. Previous data is hidden. Retry or reload the page."
          : fr ? "Périodes et échéances en UTC." : "Periods and deadlines use UTC."}
      </p>
      {status === "failed" ? <Button variant="outline" onClick={() => window.location.reload()}>{fr ? "Recharger la page" : "Reload page"}</Button> : null}
    </div>
    {status !== "pending" && status !== "failed" ? <Fragment key={`${generation}:${locale}`}>{children}</Fragment> : null}
  </div>
}
