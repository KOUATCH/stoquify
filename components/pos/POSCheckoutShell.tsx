"use client"

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { ArrowLeft, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

type POSCheckoutShellProps = {
  children: ReactNode
  locale: string
  lineCount: number
  formattedTotal: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onReturnToSearch?: () => void
  onCloseAutoFocus?: (event: Event) => void
}

const desktopQuery = "(min-width: 1280px)"

/** Presentation only: cart, tender, customer and recovery state belong to POSWorkspace. */
export function POSCheckoutShell({ children, locale, lineCount, formattedTotal, open, onOpenChange, onReturnToSearch, onCloseAutoFocus }: POSCheckoutShellProps) {
  const [isDesktop, setIsDesktop] = useState(false)
  const asideRef = useRef<HTMLElement>(null)
  const returnToSearchRef = useRef(false)
  const [desktopBounds, setDesktopBounds] = useState<{ top: number; height: number | null }>({ top: 140, height: null })
  const fr = locale === "fr"
  const lineLabel = fr ? `${lineCount} ligne${lineCount === 1 ? "" : "s"}` : `${lineCount} line${lineCount === 1 ? "" : "s"}`

  useEffect(() => {
    const media = window.matchMedia(desktopQuery)
    const update = () => setIsDesktop(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    if (!isDesktop) return
    const aside = asideRef.current
    if (!aside) return
    const header = document.querySelector<HTMLElement>("[data-pos-header]")
    const shortcuts = document.querySelector<HTMLElement>("[data-pos-shortcuts]")
    let frame = 0
    const measure = () => {
      frame = 0
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight
      const top = Math.max(0, Math.ceil(header?.getBoundingClientRect().bottom ?? 128)) + 12
      const shortcutBounds = shortcuts?.getBoundingClientRect()
      const fixedShortcutHeight = shortcuts && shortcutBounds && getComputedStyle(shortcuts).position === "fixed" && shortcutBounds.height > 0
        ? Math.max(0, viewportHeight - shortcutBounds.top)
        : 0
      const bottomClearance = shortcuts ? Math.max(16, fixedShortcutHeight + 12) : 45
      const height = Math.max(0, Math.floor(viewportHeight - Math.max(top, aside.getBoundingClientRect().top) - bottomClearance))
      setDesktopBounds(previous => previous.top === top && previous.height === height ? previous : { top, height })
    }
    const scheduleMeasure = () => {
      if (!frame) frame = window.requestAnimationFrame(measure)
    }
    measure()
    const observer = new ResizeObserver(scheduleMeasure)
    observer.observe(aside)
    if (header) observer.observe(header)
    if (shortcuts) observer.observe(shortcuts)
    const workspace = aside.closest("main")
    if (workspace) observer.observe(workspace)
    window.addEventListener("resize", scheduleMeasure)
    window.addEventListener("scroll", scheduleMeasure, { passive: true, capture: true })
    window.visualViewport?.addEventListener("resize", scheduleMeasure)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", scheduleMeasure)
      window.removeEventListener("scroll", scheduleMeasure, true)
      window.visualViewport?.removeEventListener("resize", scheduleMeasure)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [isDesktop])

  if (isDesktop) {
    const style: CSSProperties = {
      top: desktopBounds.top,
      height: desktopBounds.height ?? "calc(100dvh - 185px)",
    }
    return (
      <aside
        ref={asideRef}
        aria-label={fr ? "Panier et paiement" : "Cart and checkout"}
        data-testid="pos-desktop-checkout"
        className="sticky min-h-0 min-w-0 self-start [&>div]:h-full"
        style={style}
      >
        {children}
      </aside>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <div
        data-testid="pos-cart-summary"
        aria-label={fr ? "Résumé du panier" : "Cart summary"}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--dash-border)] bg-[var(--dash-surface)] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 text-[var(--dash-text)] shadow-lg md:left-[var(--pos-sidebar-width,280px)]"
      >
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <ShoppingCart aria-hidden="true" className="h-5 w-5 shrink-0 text-[var(--dash-brand-strong)]" />
          <div className="min-w-0 flex-1">
            <div className="text-xs text-[var(--dash-text-soft)]">{lineLabel}</div>
            <div className="break-words text-lg font-bold tabular-nums">{formattedTotal}</div>
          </div>
          <SheetTrigger asChild>
            <Button
              type="button"
              data-pos-cart-trigger
              className="dashboard-button-primary h-auto min-h-11 shrink-0 rounded-lg px-4 py-2 text-sm font-semibold"
            >
              {fr ? "Voir le panier" : "View cart"}
            </Button>
          </SheetTrigger>
        </div>
      </div>
      <SheetContent
        side="right"
        data-testid="pos-tablet-checkout"
        closeLabel={fr ? "Fermer le panier" : "Close cart"}
        className="dashboard-landing-theme dark enterprise-floating-surface flex h-[100dvh] max-h-[100dvh] w-full flex-col gap-0 border-[var(--dash-border)] p-0 pb-[env(safe-area-inset-bottom)] text-[var(--dash-text)] sm:max-w-xl motion-reduce:animate-none motion-reduce:transition-none [&>button]:flex [&>button]:h-11 [&>button]:w-11 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-lg [&>button]:text-[var(--dash-text)]"
        overlayClassName="motion-reduce:animate-none"
        onCloseAutoFocus={event => {
          if (returnToSearchRef.current) {
            returnToSearchRef.current = false
            event.preventDefault()
            onReturnToSearch?.()
          } else {
            onCloseAutoFocus?.(event)
          }
        }}
      >
        <SheetHeader className="flex shrink-0 flex-row items-center gap-3 space-y-0 border-b border-[var(--dash-border-subtle)] px-4 py-2 pr-16 text-left">
          <div className="min-w-0 flex-1">
            <SheetTitle className="text-base text-[var(--dash-text)]">{fr ? "Panier et paiement" : "Cart and checkout"}</SheetTitle>
            <SheetDescription className="mt-1 break-words text-xs text-[var(--dash-text-soft)]">{lineLabel}</SheetDescription>
          </div>
          {onReturnToSearch ? (
            <Button
              type="button"
              variant="ghost"
              className="h-11 shrink-0 gap-2 rounded-lg px-2 text-sm text-[var(--dash-text)] hover:bg-[var(--dash-brand-soft)]"
              aria-label={fr ? "Continuer la saisie" : "Continue scanning"}
              title={fr ? "Continuer la saisie" : "Continue scanning"}
              onClick={() => {
                returnToSearchRef.current = true
                onOpenChange(false)
              }}
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              <span className="hidden sm:inline">{fr ? "Continuer la saisie" : "Continue scanning"}</span>
            </Button>
          ) : null}
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden [&>div]:h-full">{children}</div>
      </SheetContent>
    </Sheet>
  )
}
