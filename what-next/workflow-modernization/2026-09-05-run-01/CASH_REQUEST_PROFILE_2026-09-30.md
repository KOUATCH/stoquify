# Cash Command: actual request profile

FA-CASH-COMMAND remains in progress. This milestone supplies actionable runtime evidence for the existing latency requirement. It makes no permanent application or permission change. Branch/HEAD remain `codex/migration-control-plane-release-2026-08-29` / `62a56036a5ac9b37236a20c9b148052199069479`; unrelated changes were preserved.

## What the evidence changes

The previous direct-service baseline cannot stand in for the service's cost inside Next.js. Four actual authenticated EN/FR requests measured:

| Stage | Observed range |
|---|---:|
| Session lookup | 54–57 ms |
| Shell RBAC | 335–964 ms |
| Module navigation | 50–169 ms |
| Cash service | 1,790–2,439 ms |

These spans can overlap across server components and must not be summed into a request total. The Cash service is a material part of the current development request cost; the earlier approximately 0.4s direct harness result did not exclude it as a bottleneck. No source query failure became a zero result and no authority gate was bypassed.

The separate browser CPU/resource profile found about 7.7 MB decoded framework JavaScript, 4.8 MB dashboard-shell JavaScript and 2.0 MB Cash-route JavaScript. The first EN profile recorded main-thread tasks of 908 and 1,152 ms after assets arrived. Framework development work, React hydration, layout work and some date formatting appear in the sampled CPU data; the profile also contains testing-tool overhead. No single function accounts for the entire delay.

Playwright 1.62.1's installed implementation explicitly sends `Network.setCacheDisabled` when request interception is enabled. Our external-network fence uses interception. Accordingly, all these browser samples use disabled HTTP caching; repeated navigation is not warm-cache evidence. The development response is also marked no-store. There is no production performance, percentile or approved-budget pass.

The long-running development server's retained trace reported approximately 6.6 GB RSS in the observed window. This is environment context, not proof of a leak or a reason to restart a live process. Compiled development bundles, tracing, query logging and concurrent work can influence timings. The direct harness disables query logging while the development Prisma configuration enables it, so those two environments are not equivalent.

## Method, privacy and restoration

`evidence/cash-request-profile-review-2026-09-30.json` indexes the receipts and current source hashes. The first six navigations captured resource timings, two CPU profiles summarized to function/source self-time and browser long tasks. Four further navigations inspected React development response metadata. Component names were available, but usable component timestamps were absent; that attempt is retained as incomplete attribution, not a timing pass. Raw response bodies, component props, cookies and credentials were never saved in these receipts.

Four final navigations used temporary wrappers around session lookup, RBAC, module navigation and the Cash service. Wrappers activated only in development, for the exact owned disposable database and a correlated diagnostic request header. They logged only the correlation ID, stage, time and elapsed milliseconds. Diagnostic file-write failure could not change the business operation. The first preparation refused a line-ending mismatch before any application write; the manager was corrected and then applied.

After capture, both temporarily changed application files were restored byte-for-byte. Restoration refused concurrent edits and checked the saved hashes. The diagnostic utility remains under the run's evidence directory and is not imported by application source. Existing application tests remain applicable to the restored source; no unchanged heavy suite was rerun merely to refresh a timestamp. No migration, provider operation, external message, deployment or real payment occurred.

## Next implementation candidate

Current source confirms that Cash's source collection requests several independent `observeModuleAccess` decisions. Each decision reads the same active organization, module configuration and grants. A map already deduplicates requests for the same module, but different modules still repeat that persisted-authority read. Module navigation has its own legitimate request context. This is a concrete candidate for a request-local batch read, not evidence that batching is already safe or sufficient.

Before implementation, measure the actual query multiplicity and prove equivalence for missing organizations, empty/expired/suspended/read-only grants, dependencies, module-specific audits and tenant scope. A batch must remain service-owned, use current persisted authority, preserve each decision/audit, propagate failures and retain no authority cache across requests. Compare before/after request samples with the same environment and data. Do not remove RBAC, weaken checks or introduce cross-tenant caching to chase latency.

Production-build/cache-enabled measurements and representative larger data remain separate requirements. The guarded local development route profile is now established. The broader financial/proof lifecycles, statutory review and remaining accessibility requirements are unchanged.

## Review responsibilities

Architecture/backend/security: actual request boundaries traced; source inspection identifies repeated module-authority reads; no guard alteration. Frontend/QA/SRE: resource, hydration and server costs separated with instrumentation/cache limitations made explicit. Privacy/audit: only sanitized timing metadata retained and exact source restoration verified. Finance/data: read workflow and existing controls retained; no financial action claimed. Product/operations: review the same EN/FR Cash routes; no user procedure changed. Statutory, migration, providers, billing and AI: not applicable to this diagnostic milestone; their registered requirements remain intact.
