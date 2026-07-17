export default function ManagerActionCenterLoading() {
  return <CommandSurfaceLoading title="Preparing Manager Daily Run Sheet" />
}

function CommandSurfaceLoading({ title }: { title: string }) {
  return (
    <main className="dashboard-landing-theme dark min-h-screen bg-[var(--dash-canvas)]">
      <div className="dashboard-landing-content mx-auto w-full max-w-[1920px] space-y-4 px-4 py-4 text-[var(--dash-text)] md:px-6 lg:px-8">
        <section className="dashboard-glass-panel rounded-lg p-4 md:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 max-w-5xl space-y-3">
              <div className="h-7 w-40 animate-pulse rounded-md bg-[var(--dash-border-subtle)]" />
              <h1 className="text-2xl font-semibold tracking-normal text-[var(--dash-text)] md:text-3xl">{title}</h1>
              <div className="h-4 w-full max-w-3xl animate-pulse rounded-md bg-[var(--dash-border-subtle)]" />
              <div className="h-4 w-2/3 animate-pulse rounded-md bg-[var(--dash-border-subtle)]" />
            </div>
            <div className="h-28 rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.32)] xl:w-[420px]" />
          </div>
        </section>
        <section className="grid gap-4 xl:grid-cols-2">
          <div className="h-64 animate-pulse rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.32)]" />
          <div className="h-64 animate-pulse rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.32)]" />
        </section>
      </div>
    </main>
  )
}