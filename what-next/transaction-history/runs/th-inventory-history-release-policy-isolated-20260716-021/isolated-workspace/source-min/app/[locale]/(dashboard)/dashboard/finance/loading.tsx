import { Skeleton } from "@/components/ui/skeleton"

export default function FinanceLoading() {
  return (
    <main className="dashboard-landing-theme dark min-h-screen overflow-x-hidden bg-[var(--dash-canvas)]">
      <div className="dashboard-landing-content mx-auto w-full max-w-[1920px] space-y-4 px-4 py-4 text-[var(--dash-text)]">
        <Skeleton className="h-28 w-full rounded-lg bg-[var(--dash-surface-raised)]" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-lg bg-[var(--dash-surface-raised)]" />
          ))}
        </div>
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Skeleton className="h-[520px] rounded-lg bg-[var(--dash-surface-raised)]" />
          <Skeleton className="h-[520px] rounded-lg bg-[var(--dash-surface-raised)]" />
        </div>
      </div>
    </main>
  )
}
