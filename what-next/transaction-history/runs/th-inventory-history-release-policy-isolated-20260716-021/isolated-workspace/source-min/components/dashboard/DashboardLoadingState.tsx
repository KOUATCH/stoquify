import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export function DashboardLoadingState({
  title = "Preparing command surface",
  subtitle = "Trusted dashboard data is loading.",
  className,
}: {
  title?: string
  subtitle?: string
  className?: string
}) {
  return (
    <main className={cn("dashboard-landing-theme dark min-h-screen overflow-x-hidden bg-[var(--dash-canvas)]", className)}>
      <div className="dashboard-landing-content mx-auto w-full max-w-[88rem] min-w-0 space-y-5 px-4 py-6 text-[var(--dash-text)] sm:px-6 sm:py-8">
        <section className="dashboard-glass-panel rounded-lg p-4 md:p-5" aria-busy="true">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 max-w-5xl space-y-3">
              <div className="dashboard-eyebrow w-fit">
                <span className="dashboard-live-dot" />
                <span>Loading</span>
              </div>
              <h1 className="text-2xl font-semibold tracking-normal text-[var(--dash-text)] md:text-3xl">{title}</h1>
              <p className="max-w-3xl text-sm leading-6 text-[var(--dash-text-soft)]">{subtitle}</p>
              <Skeleton className="h-4 w-full max-w-3xl rounded-md bg-[var(--dash-border-subtle)]" />
              <Skeleton className="h-4 w-2/3 rounded-md bg-[var(--dash-border-subtle)]" />
            </div>
            <Skeleton className="h-32 rounded-lg bg-[var(--dash-surface-raised)] xl:w-[420px]" />
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-lg bg-[var(--dash-surface-raised)]" />
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <Skeleton className="h-64 rounded-lg bg-[var(--dash-surface-raised)]" />
          <Skeleton className="h-64 rounded-lg bg-[var(--dash-surface-raised)]" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-lg bg-[var(--dash-surface-raised)]" />
          ))}
        </div>
      </div>
    </main>
  )
}