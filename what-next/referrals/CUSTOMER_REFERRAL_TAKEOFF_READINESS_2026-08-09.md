# Customer Referral Takeoff Readiness — 2026-08-09

## Decision

The customer referral loop is **pilot-ready on a freshly replayed and comprehensively seeded PostgreSQL database** and **not yet production-release-ready**.

Supplier statements are intentionally deferred until the customer loop has been used by real customers and accountants. Financing and broad AI expansion are outside this gate.

## Customer loop now complete

- Immutable customer receivable documents with append-only lifecycle evidence.
- Settlement allocation, compensating reversal, and protected reversal actions.
- Immutable, content-hashed customer statement snapshots with reconciliation.
- Signed, expiring, revocable statement access tokens.
- Redacted public statement view and append-only access logging.
- Recipient dispute and promise-to-pay commands.
- Explicit-consent email or WhatsApp delivery with sealed provider envelopes.
- Stable branded referral attribution and append-only funnel events.
- Secret-bound, revocable accountant invitations and net-new accountant onboarding.
- Tenant-scoped accountant access grants created only after valid invite acceptance.

## Verification evidence

- Isolated PostgreSQL smoke: ready; receivable, statement, delivery, public view, redaction, dispute, promise to pay, referral attribution, accountant onboarding, wrong-token denial, and revocation denial all passed.
- Authenticated browser: statement generated for customer 002, closing balance `66,630.00 XAF`, secure email delivery queued to a redacted destination, referral code rendered, and zero browser console errors.
- Authentication audit: successful login kept failed attempts at zero and left the account unlocked.
- Referral regression: 29 suites and 155 tests passed.
- TypeScript: passed.
- ESLint: zero errors; three pre-existing warnings outside the referral change.
- Production Next.js build: passed.
- Canonical report-trust gate: 35/35 ready.
- Fresh migration replay: 62/62 repository migrations applied from a blank PostgreSQL database with exact checksums and no missing, unknown, unfinished, or duplicate successful migrations.
- Fresh schema certification: zero unexpected structural drift and no missing tables, enums, columns, or indexes. Only explicit retention/hardening and metadata-name drift remains allowlisted by a fail-closed gate.
- Fresh comprehensive seed and referral PostgreSQL smoke: passed on the same 62-migration database.
- Post-Slice-438 architecture graph: refreshed; merged graph contains 9,484 nodes, 14,371 edges, and 293 referral-related nodes.
- Customer statement entitlement activation: Accounting module enforced and audited on the page plus create, delivery, and revocation actions; 318/318 canonical gate mutations and 16/16 boundary regressions passed.
- Real-user takeoff certification: a 16-check, read-only pilot evidence gate now binds an exact deployed Git revision to the immutable statement, sent delivery, redacted view log, recipient response, referral impression/click/conversion, and a newly activated Accounting organization with a verified user login. The pre-pilot report is correctly blocked until real production evidence is supplied.
- Exact release isolation: the read-only scope classifier assigns every current changed path to referral candidate, mixed shared hunk-isolation, graph-regeneration, or explicit exclusion categories with zero unclassified or conflicting paths. It protects the two pre-existing staged inventory renames from referral release operations.
- Mixed shared-file contract: `npm run referral:release:hunks:report` certifies the four split paths against positive referral anchors and negative unrelated-work anchors, records a stable selection digest, exposes no source content, and leaves the Git index untouched.

## Production blockers

1. On a production clone, verify and adopt the seven restored/reconstructed baseline migrations with DBA/release approval. Do not execute their fresh-database bridge SQL against a populated database.
2. Resolve the historical checksum mismatch for `20260619120000_backfill_purchase_receive_permission` using approved deployment-history evidence and an exact hash approval in `prisma/migration-history-checksum-approvals.json`. The original bytes are not recoverable from tracked Git history; do not rewrite history silently.
3. Obtain exact-hash risk approval for the guarded accounting/auth fresh-baseline bridge and run the migration gates against the real target configuration.
4. Configure production-only boundary secrets: statement signing, statement-envelope AES-256, accountant-invite AES-256, public identity, receipt token, and history cursor. Every value must be strong, dedicated, and distinct from auth secrets.
5. Configure the canonical HTTPS application origin.
6. Enable at least one live customer statement channel and its provider credentials; enable accountant invitation delivery and its provider credentials.
7. Provision the pilot organization with the explicit `accounting` module entitlement and retain an audited allow decision.
8. Deploy the six referral migrations plus accounting enum completion to a non-production target, repeat the seedless production-like smoke, then promote the exact revision.
9. Run the production migration, secret, build, browser, and release gates in the target environment and retain their remote evidence.
10. Isolate only the classified referral candidate, extract only the referral hunks from the four mixed shared files, regenerate architecture graphs on that isolated tree, create the exact Git revision, and run the security-diff scan against that revision without consuming the protected staged inventory changes.

## Takeoff sequence

1. Follow `CUSTOMER_REFERRAL_MIGRATION_BASELINE_REPAIR_2026-08-09.md` on a non-production clone: verify seven baseline migrations, record approved adoption, resolve the historical checksum discrepancy, and deploy the seven real pending migrations.
2. Provision production secrets and HTTPS origin through the deployment platform; never commit them.
3. Enable the `accounting` module for the pilot organization and verify an audited allow decision.
4. Enable email first for the smallest operational surface; keep WhatsApp disabled until provider and consent operations are proven.
5. Run a controlled internal rehearsal with real provider sandbox/test recipients.
6. Pilot with a small cohort of customers and accountants. Measure delivery acceptance, statement opens, dispute/PTP use, referral clicks, invite acceptance, and support load.
7. Confirm token revocation, consent withdrawal, access expiry, bounce/failure handling, and audit review during the pilot.
8. Copy `CUSTOMER_REFERRAL_PILOT_EVIDENCE_INPUT.template.json` to an operator-owned evidence input, complete only non-PII references and accountable attestations, set `AQSTOQFLOW_REFERRAL_PILOT_DATABASE_URL`, and run `npm run referral:pilot:evidence:gate`.
9. Promote the customer loop only when all 16 pilot evidence checks are ready.
10. Begin supplier-statement design from the proven customer pattern, preserving separate consent, identity, and accounting boundaries.

## Remaining effort

- Application workflow: complete for the customer pilot.
- Production configuration: incomplete.
- Application entitlement boundary: certified; target-organization Accounting provisioning remains a production activation step.
- Production migration certification: fresh replay is certified; target adoption remains blocked by the historical checksum disposition, baseline adoption approval, exact-hash risk approval, and missing remote target evidence.
- Exact release isolation: scope classification and the mixed-file referral selection contract are certified; applying those referral-only hunks, graph regeneration, the Git revision, and the revision-bound security scan remain pending.
- Real-user adoption proof: the fail-closed evidence gate is implemented and PostgreSQL-query certified; the real production pilot evidence is not yet available.
- Supplier statements: intentionally not started.
