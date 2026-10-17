# Close certification denial: retained evidence and recovery

Primary workflow: **FA-CASH-COMMAND**. Supporting dependency: **FA-CLOSE-PACK**. This checkpoint delivers a bounded correction; neither complete workflow is closed.

Evidence date: 2026-10-01. Branch `codex/migration-control-plane-release-2026-08-29`, HEAD `62a56036a5ac9b37236a20c9b148052199069479`. The shared checkout's unrelated changes remain intact. Exact changed-file predecessors, source hashes and final receipts are retained with this report. No schema or migration change.

## Changed behavior

When current inventory evidence disagreed with a saved assessment, the certified-export transaction previously wrote invalidation evidence and then threw an error. PostgreSQL rolled back that evidence along with the rejected export. The saved run consequently remained READY despite the detected discrepancy.

An authorized certification request now records the invalidation, marks the run blocked, marks its latest retained certified export stale where one exists, and commits the event, audit and outbox together. Only after commit does the service return the existing certification-denied error. It creates no new certified export. The shared run lock remains in place. Permission, fresh-authentication, accounting-setup and independent-certifier controls still precede this change. A persistence failure rolls back and propagates; an already-invalidated run preserves its original evidence on retry.

The client now awaits refresh of Close dashboard and evidence queries after a certified-export error. Automatic certification retry is explicitly disabled. The existing error banner announces the failure and gives EN/FR next steps. Failed refresh leaves current proof unavailable, preserves the original refusal and retains the editable notes. Download and success feedback still require an actual successful export.

The chosen contract is deliberate: a rejected export can commit an adverse observation. Treating all failed commands as entirely read-only would lose that observation again. This is evidence retention, not permission to certify, and no successful financial operation is fabricated.

## Bounded acceptance and results

| Criterion | Result and scope |
|---|---|
| Reproduce rollback with actual source evidence | Passed on the owned disposable PostgreSQL target. An actual independently posted zero-variance stock count changed the inventory source fingerprint while reconciliation stayed PASSED. Captured predecessor pack-module bytes were loaded in memory against current dependencies; denial left no invalidation event/outbox and the run remained READY. This is not a complete historical build. |
| Persist refused certification atomically | Passed: corrected denial left BLOCKED/EVIDENCE_STALE, exactly one invalidation event, audit and PENDING REPORT_EXPORT outbox, and no certified export. Saved evidence/checklist/findings and draft export remained unchanged. |
| Repeat safely | Passed with another correlation, authentication time and independent authorized fixture actor. The first invalidation state, event/outbox and retained history stayed identical. |
| Recover through actual assessment | Passed: a new actual READY/T4 assessment bound the changed fingerprint and a separate certifier exported it. Current selected proof became certified; the older blocked run and draft remained intact. System evidence on synthetic data is not statutory or expert approval. |
| Preserve financial and other-tenant records | Passed: operation financial fingerprints and outside-fixture fingerprints stayed unchanged. Synthetic accounting setup effects are separately recorded. |
| Client error, query failure and draft handling | Passed in focused tests: awaited refresh, query failure preserving the original denial, no automatic export retry/download, existing identity/setup errors, EN/FR alerts and all three comment/waiver/review drafts retained. |
| Focused regression and source contracts | **283 tests / 12 suites initially passed**, with six-file lint, TypeScript and two static gates. After the French copy correction, **47 tests / two affected UI suites**, UI lint and TypeScript passed again. The new composed tests cover both languages. Unchanged service/static evidence is retained; the final review explicitly records superseded UI hashes and the fresh evidence replacing them. |
| Actual browser recovery | Passed in actual EN1440 and FR320 application journeys: manual password verification and deliberate retry; refusal with no download; refreshed blocked proof and retained review notes; new actual assessment by the original maker; manual refresh and independent certification; exactly one downloaded pack bound to its retained record, run metadata and audit. Ten screenshots retained; EN completed proof and FR alert/completed proof visually inspected. |

Actual database coverage is the STALE-fingerprint case with zero-valued inventory and no payroll. MISSING, BLOCKED, UNAVAILABLE, failed persistence, and invalidation of an existing certified export also have focused unit coverage; they are not all independently reproduced in PostgreSQL here. The retained-history comparison covers saved evidence, checklist, findings and exports, not every comment/review/audit table. Enqueue is verified; outbox delivery is not.

Detailed results are recorded once:

- `evidence/close-denied-invalidation-owner-jest-a6929183-07e3-465c-80b1-a29cf89d7b72.json` — 45 pack tests.
- `evidence/close-denial-recovery-jest-5b9c9862-6d66-415b-a451-b0bc16fafbad.json` — 283 tests / 12 suites.
- `evidence/close-denial-recovery-lint-f6518bc4-1797-4eef-b05b-290973392bad.json`.
- `evidence/close-denial-recovery-typecheck-5af74d27-e65b-4321-8f5e-5998405ac556.json`.
- `evidence/close-denial-recovery-boundary-bc053f57-f3e2-46d6-bff7-b90e5dc0deab.json`.
- `evidence/close-denial-recovery-ledger-c43d191f-6b90-455c-9fae-ecdb3b6c2370.json`.
- `evidence/close-denial-copy-jest-e163a10f-9eb6-4d72-b483-4ad54aad7945.json` — 47 refreshed UI tests.
- `evidence/close-denial-copy-lint-c9968f61-b539-4ce8-97c1-b7c0c0cf222d.json`.
- `evidence/close-denial-copy-typecheck-d76d3d8b-61f4-4a53-98ec-e55ff7a391fb.json`.
- `lanes/environment/close-denial-recovery-runtime-08a45f7e-01e5-4eb7-9b2e-34608f66c393.json` — five actual database checks and predecessor reproduction.
- `lanes/environment/cash-close-recovery-readonly-4e711acb-b190-418a-826a-f6e8400bf410.json` — recovered selected proof is certified while the aggregate is blocked by retained history; scoped records and financial fingerprints unchanged.
- `lanes/environment/close-denial-recovery-browser-9e554a0b-3a0a-4c77-8d1f-4e926cc42905.json` — final two browser journeys and downloaded-artifact bindings.

The actual READY fixtures had no selectable findings, so comment and waiver inputs were correctly disabled. Their draft retention is unit-covered; actual browser retention covers review notes. Keyboard focus, deliberate Enter activation, focus return after identity verification, reduced motion and horizontal reflow passed. Zero page errors is not complete console/hydration or assistive-technology verification. The mobile notification overlays part of the inline content in the screenshots; unobscured-content and broader notification usability remain in the full accessibility review. Final development page-ready observations were 10,912ms EN and 13,304ms FR, without a production performance claim.

The first browser attempt is retained in `lanes/environment/close-denial-recovery-browser-5dbf54af-742f-4103-a52b-32db77c02caa.json`, including screenshots. English passed denial, refresh, notes and explicit password/retry, then failed reassessment. The fixture had added explicit grants after its initial assessment but omitted `payment_reconciliation`; the actual server correctly recorded a HIGH unavailable-evidence finding. The read-only diagnostic `close-denial-browser-diagnostic-bd54bebe-51a9-4738-b252-f39ff7ea0ab9.json` confirms the precise finding. The corrected fixture must include this source prerequisite and produce a new assessment after its final grants are installed.

French reached durable denial and blocked proof, but the browser timed out waiting for the explanatory alert. Its new message exceeded the existing 240-character safe-message limit, so the banner used a generic fallback. The correction shortens the French guidance and tests the real hook-to-banner contract; the sanitizer remains unchanged. This was a product-copy regression missed by the earlier separately mocked UI tests. The failed run preserved source, outside-fixture and operation financial fingerprints.

The second browser attempt, `close-denial-recovery-browser-2ed54623-d728-4223-a396-193e40a86496.json`, passed both language denial paths and reached successful downloads with verified canonical hashes. Its record lookup then failed because the verifier assumed the embedded document UUID equaled the database row ID. Existing source generates those IDs separately. The corrected verification binds the downloaded tenant/run/watermark/hash to exactly one retained record and checks the certified-run and audit references to that record; both identifiers remain explicit. No product identity migration or historical artifact rewrite is made in this checkpoint. The distinction is retained as an existing contract clarification requirement.

## Use and recovery

Open `/en/dashboard/accounting/close` or `/fr/dashboard/accounting/close` for the relevant organization and period. Review current proof before requesting certification. If the export is refused, the page refreshes its evidence and preserves your notes. If the read itself fails, use **Refresh / Actualiser**. Refresh retries reading; it does not submit another export.

For stale evidence, inspect the underlying source change and run a new assessment through an authorized operator. A different authorized certifier must then review the new assessment and explicitly request the export. If identity verification is requested, complete it and make a separate deliberate export request. Keep previous blocked assessments and packs as history; do not delete them or manually change their status.

The operator needs the organization, accounting period and underlying source-change record; these come from the workspace selection, period selector and the relevant inventory/accounting source history. Appropriate permissions, fresh identity verification and completed setup come from the existing organization administrator and accounting controls. This code correction requires no new approval document from the user. Actual professional/country approvals remain separate where applicable.

## Open boundaries and rollout

Two actionable gaps remain visible. First, the zero-variance stock-count producer changes the source fingerprint without immediately invalidating an existing READY assessment. Export freshness catches it, but the intervening presentation can remain outdated. Second, the actual follow-up confirms selected-run recovery does not restore the Cash aggregate: it includes retained overlapping blocked runs and reports `close-runs-blocked` and `close-evidence-stale`. Recovery semantics must distinguish superseded assessments from unresolved obligations without dropping historical evidence or other-period blockers.

Continue with those bounded producer/aggregate contracts under the existing primary/supporting workflows. New-run assessment/discovery races, global multi-period lock ordering, interrupted recovery and all source producers remain open. Broader Cash authority/source consistency, nonempty inventory/payroll prerequisites, native screen-reader use, real browser zoom, complete inherited FR copy/contrast/hydration, and representative production latency remain unverified. All original workflow families remain in the register.

No backfill is required. Release via the existing approved process; observe transaction errors and invalidation/outbox counts. Rollback of the commit-before-denial contract reintroduces lost adverse evidence. Preserve committed stale records and exports during any rollback. No migration-bearing default build or broad release-policy chain was invoked.

Architecture/backend/database, security/IAM/tenant privacy, frontend/design system, workflow/localization, product, quality, SRE, finance/audit and event responsibilities were applied to the changed contract. Independent review found no material issue within it and identified the aggregate-recovery limitation above. Statutory/country approval was not supplied. Pricing/billing, external provider execution, offline/POS behavior and AI behavior are not applicable to this correction because their operations are unchanged. No deployment, live approval, payment, external message, X1 clearance or platform completion is claimed.
