import { roleEditorCopy, rolePermissionLabel } from "./role-editor-copy"

type Record = { id: string; createdAt: string; operation: "create" | "update" | "change"; added: string[] | null; removed: string[] | null }
export function RoleHistory({ locale, allowed, records }: { locale: "en" | "fr"; allowed: boolean; records: Record[] }) {
  const t = roleEditorCopy[locale]
  return <section aria-label={t.history} className="dashboard-glass-panel space-y-3 rounded-lg p-4">
    <h2 className="text-lg font-semibold">{t.history}</h2>
    {!allowed ? <p className="text-sm">{t.historyDenied}</p> : <>
      <p className="text-sm text-[var(--dash-text-soft)]">{t.historyHelp}</p>
      {records.length === 0 && <p>{t.historyEmpty}</p>}
      {records.map(record => <details key={record.id} className="rounded-lg border border-[var(--dash-border-subtle)] p-3">
        <summary className="cursor-pointer rounded text-sm focus-visible:outline focus-visible:outline-2">{new Date(record.createdAt).toLocaleString(locale)} · {record.operation === "create" ? t.historyCreated : record.operation === "update" ? t.historyUpdated : t.historyChanged}</summary>
        <p className="mt-2 break-all font-mono text-xs text-[var(--dash-text-soft)]">{record.id}</p>
        {record.added === null || record.removed === null ? <p className="mt-2 text-sm">{t.historyMissing}</p> : <div className="mt-2 space-y-2 text-sm">
          <p>{t.adds}: {record.added.length}</p>{record.added.map(permission => <p key={permission} className="break-words">{rolePermissionLabel(permission, locale)}</p>)}
          <p>{t.removes}: {record.removed.length}</p>{record.removed.map(permission => <p key={permission} className="break-words">{rolePermissionLabel(permission, locale)}</p>)}
        </div>}
      </details>)}
    </>}
  </section>
}
