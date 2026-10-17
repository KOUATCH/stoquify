"use client"
import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { exportSalesPerformanceAction } from "@/actions/analytics/sales-export.actions"
import type { SalesPerformance } from "@/services/analytics/sales-performance.service"
import type { PerformanceScope } from "@/lib/analytics/sales-performance-scope"
import { Button } from "@/components/ui/button"
import { analyticsMutedTextClass } from "./dashboard/analytics-dashboard-theme"

export default function SalesPerformanceExport({ scope, onReport }: { scope: PerformanceScope; onReport: (report: SalesPerformance) => void | Promise<void> }) {
  const t = useTranslations("salesExport"), active = useRef(true)
  const [busy, setBusy] = useState(false), [message, setMessage] = useState<string | null>(null)
  useEffect(() => { active.current = true; return () => { active.current = false } }, [])
  const download = async () => {
    setBusy(true); setMessage(null)
    try {
      const result = await exportSalesPerformanceAction(scope)
      if (!active.current) return
      if (!result.success) { setMessage(result.code === "FRESH_AUTH_REQUIRED" ? "freshAuth" : "failed"); return }
      await onReport(result.data.report)
      if (!active.current) return
      const url = URL.createObjectURL(new Blob([result.data.file.content], { type: result.data.file.mimeType }))
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = result.data.file.fileName; document.body.appendChild(anchor); anchor.click(); anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setMessage("done")
    } catch { if (active.current) setMessage("failed") } finally { if (active.current) setBusy(false) }
  }
  return <div className="min-w-0 space-y-1"><Button className="dashboard-button-secondary h-auto min-h-10 max-w-full whitespace-normal py-2" variant="outline" disabled={busy} onClick={() => void download()}>{t(busy ? "preparing" : "download")}</Button>
    <p className={analyticsMutedTextClass + " text-xs"}>{t("basis")}</p>{message && <p role="status" className="text-sm">{t(message)}</p>}
  </div>
}
