# Stoquify Supabase/Postgres and Web Quality Skill Pilot

**Date:** 2026-08-05  
**Mode:** Read-only source and architecture review  
**Skills:** `supabase-postgres-best-practices` 1.1.1 and `web-quality-audit`  
**Decision:** Retain both as explicitly invoked advisory skills; adapt their use to Stoquify's controls and evidence model.

## Executive decision

Both skills are useful, but neither should be treated as an autonomous fixer or a certifier.

| Skill | Stoquify value | Best role | Decision |
|---|---:|---|---|
| Supabase Postgres Best Practices | High — 86/100 | Provider-neutral PostgreSQL design, migration, query, and operational review | Adopt as a required advisory review for database-affecting work after Stoquify-specific adaptation |
| Web Quality Audit | High — 82/100 | Source-level web release triage across performance, accessibility, SEO, and browser best practices | Adopt as a pre-release checklist, paired with measured browser evidence |

The highest-value result is not a generic list of best practices. The database skill exposed a material discrepancy between Stoquify's accepted tenant-defence documentation and the current database client: the ADR says the exported Prisma client is extended and a raw `dbUnscoped` escape hatch exists, but the current `prisma/db.ts` exports a plain `PrismaClient`, and the documented extension/context files and symbols are absent. PostgreSQL RLS is also absent by explicit earlier design choice. This does not prove a current exploit, but it means the documented automatic query-layer tenant boundary is not present in the reviewed source.

The web skill found a solid semantic and interaction baseline on the landing page, alongside actionable gaps in localized discovery metadata, form-label/error associations, skip navigation, global client-provider cost, and runtime measurement.

## Scope and limits

Reviewed evidence included:

- the installed skill instructions and the relevant Supabase/Postgres reference rules;
- the current Prisma schema, database clients, migrations, selected services, and existing architecture graph reports;
- the public landing page, authentication V2 forms, root and locale layouts, dashboard shell, global providers, middleware, and Next.js configuration;
- static searches for RLS, privileges, indexes, transactions, N+1 query shapes, pagination, image handling, metadata, semantics, focus behavior, and reduced-motion handling.

Not performed:

- no application, schema, migration, dependency, hook, CI, or runtime configuration changes;
- no `.env` inspection and no database connection;
- no production or customer data access;
- no `EXPLAIN (ANALYZE, BUFFERS)`, `pg_stat_statements`, Lighthouse, axe, screen-reader, keyboard-only, or real-device run;
- no build, lint, typecheck, E2E, or full test suite, because this pilot changed no application code or dependencies.

The findings are source-based review results, not security, privacy, accessibility, accounting, compliance, performance, or release-readiness certification.

## Skill validation

Both project-local skills passed the current Codex `quick_validate.py` validator with the system Python interpreter. The bundled workspace Python could not import the validator's `yaml` dependency; no dependency was installed, and the same validator then completed successfully using the already-available system Python.

## 1. Supabase Postgres Best Practices pilot

### What it brings to Stoquify

The skill supplies a compact, repeatable PostgreSQL review vocabulary that Stoquify's domain-specific accounting, payroll, reconciliation, and assurance skills do not consistently cover:

- database-enforced tenant isolation and least privilege;
- indexes matched to actual filter, join, and queue-claim patterns;
- foreign-key support indexes and safe constraints;
- connection-pool and prepared-statement compatibility;
- short, retryable transactions and consistent locking;
- N+1 detection and batch-query alternatives;
- evidence-driven query tuning with `EXPLAIN`, database statistics, and staged measurements.

Although the package is branded for Supabase, most guidance is PostgreSQL-general. Supabase Auth examples such as `auth.uid()` are not directly applicable to Stoquify, which uses BetterAuth and may run on Neon, Supabase, or another managed PostgreSQL provider (`docs/architecture/system/ARCHITECTURE.md:16`). Any RLS design must therefore use a Stoquify-owned tenant-context and database-role contract.

### Positive findings

1. **Strong tenant-leading index baseline.** The schema has 158 models, 130 models with an `organizationId` field, and 627 model-level `@@index`, `@@unique`, or `@@id` declarations. A static model-block check found all 130 tenant-keyed models have at least one index or unique constraint beginning with `organizationId`.

2. **Financial and operational uniqueness is frequently tenant-scoped.** For example, `LedgerPostingBatch` uses tenant-scoped source and idempotency uniqueness, plus an organization/status/time index.

3. **Critical state transitions use explicit isolation and retry patterns.** POS shift close uses serializable transactions with conflict handling (`services/pos/pos.service.ts:1356`), and fiscal sequence allocation uses serializable transactions with bounded retries (`services/compliance/fiscal-document.service.ts:259`).

4. **Several high-volume reads are explicitly bounded.** Representative finance, POS, HRIS, payroll, and inventory reads use `take`, cursor, or page-size limits. Assurance checks also cap many scans at a default of 500 rows.

5. **Queue claims are concurrency-aware.** Alert and fiscalization workers claim candidates with conditional `updateMany` transitions, so competing workers cannot both successfully claim the same row (`services/assurance/assurance-alert-delivery.service.ts:141`; `services/compliance/fiscalization-outbox.service.ts:183`).

### Findings and recommendations

#### DB-01 — High: documented automatic tenant scoping is absent from the current client

Evidence:

- ADR-0002 states that `db` is an org-scoped Prisma extension and `dbUnscoped` is the raw escape hatch (`docs/architecture/decisions/0002-org-scoped-prisma-extension.md:9`).
- The closed backlog also records the extension as implemented (`docs/planning/backlog/014-org-scoped-prisma-extension.md:93`).
- Current `prisma/db.ts:8` constructs and exports a plain `PrismaClient`.
- `lib/prisma/extensions/org-scope.ts` and `lib/context.ts` do not exist in the reviewed workspace, and current `lib`, `prisma`, `services`, and `actions` contain no `TENANT_MODELS`, `orgScopeExtension`, `dbUnscoped`, `withOrgContext`, or `withRequestContext` symbols.
- Migrations contain no `ENABLE ROW LEVEL SECURITY`, `FORCE ROW LEVEL SECURITY`, or `CREATE POLICY` statements. The ADR documents RLS as deliberately deferred (`docs/architecture/decisions/0002-org-scoped-prisma-extension.md:25`).

Impact:

Application filters and authorization wrappers remain important controls, but the automatic query-layer defence described in the architecture record is not present. A future missed `organizationId` filter can therefore become a cross-tenant exposure path.

Recommendation:

Treat this as a P0 control-drift investigation. Establish whether the extension was intentionally retired. Then choose and document one authoritative defence:

1. restore a current, complete org-scoped Prisma extension with a deliberately governed raw escape hatch and real-Postgres integration tests; or
2. introduce PostgreSQL RLS through a narrowly staged design that sets transaction-local Stoquify tenant context, survives the selected pool mode, denies missing context, and has explicit background-worker and privileged-role rules.

Do not copy the skill's `auth.uid()` examples into Stoquify, and do not activate RLS across 130 models in one migration.

#### DB-02 — High: bounded N+1 query shapes in assurance and agent reconciliation

Evidence:

- completed inventory-tracked sales are loaded, then one `inventoryTransaction.count` is executed per sale (`services/assurance/assurance-registry.service.ts:1281`);
- completed sales similarly execute one ledger proof count per sale (`services/assurance/assurance-registry.service.ts:1363`);
- up to 500 receipts execute one stock-movement count each (`services/assurance/assurance-registry.service.ts:2413`);
- up to 500 stock adjustments execute one projection-movement count each (`services/assurance/assurance-registry.service.ts:2814`);
- agent release reconciliation executes an active-package count per release (`services/agents/agent-control-plane-reconciliation.service.ts:97`).

Impact:

The checks are bounded, which limits failure size, but a 500-row assurance scan can still become roughly 501 serial database round trips for a single rule. Multiple checks can compound that cost.

Recommendation:

Replace per-row counts with grouped aggregate queries, `in`-set batch reads, or a single existence query that returns all source IDs having proof. Preserve the current scan limits and evidence semantics. Compare query count, latency, and buffers on a synthetic staging dataset before and after.

#### DB-03 — Medium-high: partial-index intent is documented but not implemented

Evidence:

- the schema header explicitly recommends an active-row partial index for soft-deleted records (`prisma/schema.prisma:20`);
- static inspection found no partial index in the migration SQL;
- many hot paths filter `organizationId` together with `deletedAt: null`.

Impact:

As historical/soft-deleted data grows, full indexes include rows that active operational queries never need, increasing index size and write cost and reducing cache efficiency.

Recommendation:

Use staging query statistics to select the highest-volume active-row predicates, then add a small number of concurrently created, evidence-backed partial indexes through reviewed raw migrations. Do not generate one for every soft-deleted model.

#### DB-04 — Medium-high: relation-index review has a sizeable evidence backlog

A refined static schema heuristic found 101 relation field sets without a scalar `@id`/`@unique` or model-level index/unique constraint beginning with the same fields. Examples include `InventoryTransaction.createdById`, `BranchDailyCloseRun.locationId`, `PayrollRun.payrollPeriodId`, and multiple employee, provider-account, actor, and period relations.

This is a candidate list, not proof that 101 indexes should be added. PostgreSQL does not automatically index the referencing side of a foreign key, but some relations may be cold, deletion may be restricted operationally, and overlapping indexes may already be sufficient for actual queries.

Recommendation:

Turn the heuristic into a reviewed index register. Prioritize by table size, delete/update behavior, join frequency, and `pg_stat_statements`; verify each candidate with query plans before adding it.

#### DB-05 — Medium: queue access patterns deserve exact composite/partial indexes

`claimFiscalizationRequests` permits a cross-tenant call because `organizationId` is optional and filters by `channel`, status, availability, and lock staleness (`services/compliance/fiscalization-outbox.service.ts:183`). The current outbox indexes begin with `organizationId`; there is no index beginning with the global worker's channel/status/availability predicate. The alert-delivery queue is better aligned with `channel`, `status`, and `nextAttemptAt`.

Recommendation:

Measure the global fiscalization claim plan. If it scans broadly, add a partial queue index matching claimable states and ordering. Keep the conditional update claim semantics. Consider a single SQL claim using `FOR UPDATE SKIP LOCKED` only after validating Prisma/raw-SQL ownership, fairness, failure recovery, and testability.

#### DB-06 — Medium: connection-pool behavior is an undeclared deployment dependency

The schema uses only `DATABASE_URL` (`prisma/schema.prisma:34`), and `prisma/db.ts:8` creates one global client with 10-second max wait and 15-second transaction timeout. The repository allows different managed PostgreSQL providers, but the reviewed source does not establish pool mode, connection limit, prepared-statement compatibility, or a direct migration connection.

Recommendation:

Create a non-secret deployment contract documenting provider, pooled runtime endpoint, direct migration endpoint where needed, pool mode, maximum connections by environment, statement/lock/idle transaction timeouts, and Prisma prepared-statement compatibility. Verify values operationally without committing credentials.

### Database adoption recommendation

Adopt this skill as a **provider-neutral PostgreSQL assurance checklist**, invoked for:

- any Prisma schema or raw migration change;
- new list/report/worker queries;
- financial or inventory transaction changes;
- provider/pool deployment changes;
- pre-release capacity and tenant-isolation reviews.

Add Stoquify overlays that require tenant-boundary evidence, synthetic data only, no direct production execution, no auto-fix, and no claim that the skill certifies security or accounting correctness.

## 2. Web Quality Audit pilot

### What it brings to Stoquify

The skill provides a single cross-functional release lens. Stoquify's UI/UX and business-surface skills are deeper in domain workflows, but this checklist catches the seams between disciplines: rendering cost, semantic accessibility, internationalized SEO, and browser/security hygiene.

The installed version is content-only. It does not include an analyzer or browser runner, so it produces a structured expert review rather than a reproducible metric artifact by itself.

### Positive findings

1. **Correct locale at the document boundary.** The root layout resolves a supported locale and renders `<html lang={locale}>` (`app/layout.tsx:25`).

2. **Sound landing-page structure.** The main public page has a single primary `<main>` and a clear H1 followed by section H2/H3 hierarchy (`app/[locale]/(home)/page.tsx:14`; `components/landing/hero.tsx:27`).

3. **Good custom-control work.** Landing tabs use tablist/tab/tabpanel semantics, roving `tabIndex`, and Arrow/Home/End keyboard handling. Carousel controls have labels, visible focus rings, and polite position announcements (`components/landing/module-deep-dives.tsx:85`; `components/landing/connected-workflow.tsx:212`).

4. **Reduced-motion handling exists.** Landing animations are disabled under `prefers-reduced-motion: reduce` (`app/[locale]/(home)/landing.css:314`).

5. **Landing imagery uses `next/image`.** The product screenshot has translated alt text and responsive `sizes` (`components/landing/product-gallery.tsx:33`). The 723 KB source asset is therefore eligible for Next.js resizing/format optimization rather than being sent blindly at source size.

6. **Baseline browser security headers exist.** The project sets clickjacking, MIME-sniffing, referrer, permissions, HSTS, CSP, and related headers in middleware/configuration.

### Findings and recommendations

#### WEB-01 — High: registration and verification controls need programmatic labels and error associations

Evidence:

- reusable registration `Field` and `SelectField` render `<Label>` without `htmlFor` (`components/auth/v2/RegisterV2Form.tsx:556`);
- their child inputs shown in the main form do not supply corresponding IDs (`components/auth/v2/RegisterV2Form.tsx:434`);
- visual errors are not connected with `aria-describedby`, `aria-invalid`, or a live announcement (`components/auth/v2/RegisterV2Form.tsx:654`);
- the OTP label is a paragraph, not a programmatic label, and the OTP error is not associated with the control (`components/auth/v2/VerifyV2Form.tsx:192`).

Impact:

Screen-reader users may hear unlabeled controls or miss which input an error belongs to. Placeholder text is not a label substitute.

Recommendation:

Give each field a stable ID, connect every label with `htmlFor`, and connect help/error text using `aria-describedby` and `aria-invalid`. Add an accessible name and error association for the OTP group. Test error recovery with keyboard-only navigation and at least one screen reader.

#### WEB-02 — Medium-high: localized SEO and discovery are incomplete

Evidence:

- root metadata supplies a title, description, icon, and base URL, but the text is English for both locales (`app/layout.tsx:11`);
- the primary localized landing route has no `generateMetadata`;
- no canonical, locale alternates/hreflang, Open Graph, or Twitter metadata was found for the primary landing page;
- only `public/favicon.ico` was found; there is no app robots, sitemap, manifest, or social-image discovery file;
- the metadata base falls back to `http://localhost:3000` if both public URL variables are absent (`app/layout.tsx:12`).

Recommendation:

Add locale-aware landing metadata, canonical and alternate-language URLs, share metadata/images, `robots.ts`, and `sitemap.ts`. Fail deployment configuration safely rather than emitting localhost canonical/share URLs in production.

#### WEB-03 — Medium-high: public pages carry avoidable dynamic and global client cost

Evidence:

- the locale layout forces every localized route to be dynamic (`app/[locale]/layout.tsx:10`);
- the public home layout reads the session for its header (`app/[locale]/(home)/layout.tsx:27`);
- the root wraps every route, including marketing pages, in TanStack Query, the 923-line notification provider, themes, and UploadThing's client plugin (`components/Providers.tsx:21`);
- the notification provider reads/writes local storage and installs several global event integrations even on public routes (`components/notifications/NotificationProvider.tsx:122`, `:772`).

Impact:

This can reduce caching/static-render opportunities and increase hydration and JavaScript work on the acquisition funnel. Exact bundle and timing impact is not known until measured.

Recommendation:

First capture route-level bundle sizes and Core Web Vitals. Then move dashboard-only providers into the dashboard layout, keep the marketing shell mostly server-rendered, and replace full session resolution in the marketing header with the smallest safe strategy. Remove `force-dynamic` only after confirming next-intl and authentication behavior.

#### WEB-04 — Medium: no skip navigation link

No skip-to-content link was found in the root, marketing, auth, or dashboard shells. Repeated landing and dashboard navigation therefore increases keyboard and switch-user effort.

Recommendation:

Add one shared, visually-hidden-until-focused skip link and stable main-content targets in the marketing, authentication, and dashboard shells.

#### WEB-05 — Medium: CSP is broad and duplicated

The production CSP permits inline script and style, all HTTPS connections, and all HTTPS images (`middleware.ts:10`). Security headers are also split between middleware and `next.config.mjs`, with different HSTS durations and different permissions-policy values.

Recommendation:

Create one owned header contract. Replace production inline-script allowance with a nonce/hash strategy compatible with Next.js, and narrow connect/image origins to approved providers. Test authentication, uploads, image optimization, and locale routing before enforcement.

#### WEB-06 — Low-medium: hydration warnings are globally suppressed

Both `<html>` and `<body>` use `suppressHydrationWarning` (`app/layout.tsx:31`). This can hide real server/client divergence beyond the specific theme or extension-controlled attribute that motivated it.

Recommendation:

Measure actual hydration warnings and narrow suppression to the minimum required boundary.

### What remains unproven

The static review cannot determine:

- actual LCP, INP, CLS, TTFB, route JavaScript, or image transfer size;
- computed color contrast at all theme/state combinations;
- keyboard order and focus restoration across real dialogs/navigation;
- accessible names produced by third-party primitives;
- screen-reader behavior, zoom/reflow, touch target success, or real-device responsiveness;
- production header behavior after proxy/CDN processing.

The next evidence step should use a production-like local or staging build, synthetic accounts/data, Lighthouse traces, axe, keyboard-only walkthroughs, screen-reader smoke tests, and captured response headers. Do not use customer or production data.

### Web-quality adoption recommendation

Adopt the skill as a **triage and release-review template**, not as a standalone test system. A Stoquify wrapper should define:

- representative public, auth, dashboard, table, form, error, and loading routes;
- synthetic identities and fixtures;
- target Core Web Vitals and accessibility thresholds;
- required screenshots/traces and artifact retention;
- severity-to-owner routing;
- an explicit statement that automated checks do not certify accessibility or release readiness.

## Combined prioritized action plan

| Priority | Action | Evidence required before change |
|---|---|---|
| P0 | Resolve the missing automatic tenant-scoping control and reconcile ADR-0002 with current code | current architecture decision, threat model, real-Postgres cross-tenant tests, rollback plan |
| P1 | Batch the identified assurance/agent N+1 checks | synthetic-volume query counts, latency, buffers, semantic-equivalence tests |
| P1 | Fix auth field/OTP labels and error associations; add skip navigation | keyboard and screen-reader evidence, focused component tests |
| P1 | Add localized canonical/discovery/share metadata | generated metadata inspection for EN/FR and production URL guard |
| P1 | Establish PostgreSQL pool/timeout/prepared-statement deployment contract | provider documentation and non-secret environment verification |
| P2 | Select partial and FK-support indexes from measured workload evidence | table sizes, `pg_stat_statements`, query plans, write-cost review |
| P2 | Measure and reduce public-route dynamic/client cost | route bundles, Lighthouse traces, CWV baseline |
| P2 | Consolidate and narrow the CSP/header contract | staged header report-only run and browser smoke tests |

## Final recommendation

Keep both skills installed with explicit invocation only.

- Make the Postgres skill mandatory for proposed schema, migration, worker-queue, reporting-query, or database-provider changes. Internally describe it as PostgreSQL assurance so Supabase-specific examples are not mistaken for Stoquify architecture.
- Make the web-quality skill mandatory for release-candidate reviews of changed public/auth surfaces and for periodic sampled dashboard audits. Pair it with browser-based evidence tooling before any release gate is allowed to block delivery.
- Do not enable auto-fix, autonomous writes, production database access, or certification language for either skill.
- Re-run the current Codex skill validator after every skill update before use.

