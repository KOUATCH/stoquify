# Startup and worker boundary review

Before smoke startup, the current frozen sources were searched for instrumentation hooks, interval/timeouts, worker/scheduler construction, worker invocations, and explicit cron/internal handlers. No root instrumentation bootstrap or imported financial-worker auto-start was found in the inspected app/lib/services paths.

- `lib/error-handling/database-resilience.ts`: the singleton constructor starts `startHealthMonitoring`; its recurring `performHealthCheck` uses `SELECT 1`. It does not process a payment, journal, payroll run, outbox item or payout.
- `lib/error-handling/monitoring.ts`: performance/business-health collection timers exist inside explicit `startMonitoring()`. The exported singleton constructor does not start them. No app/lib/services caller of the exported start function was found.
- `lib/error-handling/setup.ts`: its import-time `initializeErrorHandling()` returns error-handler/configuration callbacks; it does not execute the development sample-error helpers or financial workers.
- Business-event outbox, fiscalization, finance-statement export, receipt/invitation/statement delivery, reconciliation notification and payroll-provider inbox processing are exported worker functions. The inspected runtime references do not start them during app import. Worker scripts are not launched by the harness.
- `app/api/internal/agents/reconcile-abandoned/route.ts` exposes explicit scheduler request handlers. The smoke does not call these, and its browser interceptor refuses `/api/internal`, `/api/cron`, `/api/jobs` and `/api/workers` paths.

No worker-disabling environment toggle was needed or changed. The smoke runs only Next's compiled production server, one ordinary existing-fixture login if necessary, permission verification, and five read-only page navigations. Loopback-only server sockets and origin-restricted browser requests also prevent the inspected delivery paths from contacting external providers. The owned process is stopped after the bounded smoke; this review is scoped to this startup/navigation path, not a certification that every repository import is side-effect free.
