"use client"

export function PrintReceiptButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()}
      className="min-h-11 rounded-lg bg-foreground px-5 py-3 text-sm font-semibold text-background hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring print:hidden">
      {label}
    </button>
  )
}
