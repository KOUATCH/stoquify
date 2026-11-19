# P04-D01 — Finance export visibility decision

Status: **awaiting your decision**. Prepared 9 November 2026 from current source. No policy has been approved and no product behavior was changed. This package is distinct from global roadmap decision D01 about M1/M2 scope.

## Decision to make

Who may inspect an asynchronous finance export job and its artifact metadata within one organization: any current report reader, only its creator, or its creator plus explicitly approved delegates? Decide download authority separately from report viewing.

**Recommendation: C — creator plus explicit delegates, always subject to current permissions.** Keep ordinary report viewing available to report readers. Restrict export-job details and file references to the creator or a named, revocable delegate; require current export authority and fresh authentication to issue a download grant. This supports accounting handover without giving every report reader access to every saved export.

| Choice | Job status and artifact metadata | File download | Workflow effect |
|---|---|---|---|
| A — any authorized report reader | Any same-tenant reader who currently has the class-specific read scope | Still requires explicit export authority and guarded delivery | Broad collaboration and exposure; closest to current status behavior |
| B — creator only | Original creator with current class-specific read scope | Creator also needs current export authority | Narrow access; handover requires a new export or another approved procedure |
| **C — creator plus explicit delegates** | Creator or named active same-tenant delegate with current class-specific read scope | Same relationship, current export authority and fresh authentication | Controlled controller/reviewer handoff; requires bounded delegation implementation |

All choices retain server-derived tenant scope, current actor/session/module checks and uniform denied responses. A reserved administrator role name must not bypass these boundaries.

## What the code does today

- Creation uses **accounting.exports.create**, a fresh-authentication check of 300 seconds, and an enforced accounting module export boundary. The server supplies actor and organization. Replaying another actor’s creation key is rejected. See [actions/accounting/finance-statement-export.actions.ts:16](<E:/ohada saas/Focused projects/stoquify/actions/accounting/finance-statement-export.actions.ts:16>) and [services/accounting/finance-statement-export.service.ts:198](<E:/ohada saas/Focused projects/stoquify/services/accounting/finance-statement-export.service.ts:198>).
- Status uses **accounting.reports.read** and an enforced accounting module read boundary. It passes only the server organization and job ID to the service. The query checks organization, REPORT_EXPORT channel and finance.statement.export.requested event; **it does not check creator or delegate**. A report reader knowing another same-tenant job ID can therefore pass the current status query. See [actions/accounting/finance-statement-export.actions.ts:45](<E:/ohada saas/Focused projects/stoquify/actions/accounting/finance-statement-export.actions.ts:45>) and [services/accounting/finance-statement-export.service.ts:287](<E:/ohada saas/Focused projects/stoquify/services/accounting/finance-statement-export.service.ts:287>).
- A completed receipt includes provider, storage key, content type, byte length, content hash and expiry, alongside job/request IDs and timestamps. It does not itself contain a public URL or file bytes. See [services/accounting/finance-statement-export.service.ts:137](<E:/ohada saas/Focused projects/stoquify/services/accounting/finance-statement-export.service.ts:137>) and [components/DataTableComponents/finance-accounting-contracts.ts:583](<E:/ohada saas/Focused projects/stoquify/components/DataTableComponents/finance-accounting-contracts.ts:583>).
- The operations summary separately uses accounting.reports.read for tenant queue counts, oldest pending time and runtime configuration readiness. No per-job artifact key is returned by that summary. See [actions/accounting/finance-statement-export.actions.ts:68](<E:/ohada saas/Focused projects/stoquify/actions/accounting/finance-statement-export.actions.ts:68>) and [services/accounting/finance-statement-export-operations.service.ts:130](<E:/ohada saas/Focused projects/stoquify/services/accounting/finance-statement-export-operations.service.ts:130>).
- This packet’s lexical caller search of app/actions/hooks/components/services found no production HTTP download consumer of this asynchronous artifact reference. The worker receives an injected buildArtifact function. A renderer, approved artifact store, download-grant policy and retention configuration are separate readiness requirements. **Metadata visibility is established by source; usable byte delivery is not established.** See [services/accounting/finance-statement-export.service.ts:399](<E:/ohada saas/Focused projects/stoquify/services/accounting/finance-statement-export.service.ts:399>) and [services/accounting/finance-statement-export-operations.service.ts:95](<E:/ohada saas/Focused projects/stoquify/services/accounting/finance-statement-export-operations.service.ts:95>).

This is an unresolved business policy, not a confirmed defect: the intended same-tenant visibility has not yet been approved. Tests were inspected, not rerun. No database, browser or hosted-provider result is claimed by this packet. Eleven current files and inert snapshots are bound in [source-manifest.json](source-manifest.json).

## Proposed visibility matrix for approval

| Actor/state | Aggregate queue summary | Individual job/status/locator | File bytes |
|---|---|---|---|
| Creator with all current read/module/object scope | Existing reports.read rule | Allow | Allow only with current accounting.exports.create, class read authority and fresh authentication |
| Named delegate with active job/hash-scoped inspect grant and read scope | Existing reports.read rule | Allow within grant | Deny without download grant and current export authority |
| Named delegate with active download grant, read/export scopes and fresh authentication | Existing reports.read rule | Allow within grant | Allow exact artifact within grant |
| Same-tenant report reader, no creator/delegate relationship | Existing reports.read rule | Deny without artifact or existence leakage | Deny |
| Creator or delegate whose session, permission, grant, module, location or applicable period scope was revoked | Only if independently authorized now | Deny | Deny |
| Different tenant or no current read authority (including role name alone) | Deny | Deny uniformly | Deny |
| Same-tenant authorized actor submits a forged job ID/key | Existing reports.read rule, independently checked | Deny uniformly | Deny |
| Expired artifact, creator/delegate still authorized for retained history | Existing reports.read rule | Historical job status only; omit provider/key and any delivery grant | Deny |

An explicit grant must name the organization, actor, job/content hash, inspect/download capability, grantor, reason, start, expiry and revocation. It cannot grant more authority than the grantor or recipient currently possesses, cannot transfer to another account and does not allow onward delegation by default. Original creation is not permanent authorization. Recheck current authority immediately before releasing bytes, including after storage latency. Artifact expiry must not be bypassed by issuing a new link.

Apply this default to all 14 currently registered classes below. Each still needs its underlying class/module/location and redaction contract; a generic accounting report permission must not silently substitute for a finance payment, journal, close evidence or location-specific permission.

- finance.payments-ledger
- finance.receivables
- finance.receivables-history
- finance.payables
- finance.payables-history
- finance.cash-history
- accounting.journal-entries-posted
- accounting.journal-entries-drafts
- accounting.trial-balance
- accounting.profit-loss
- accounting.balance-sheet
- finance.cash-flow
- accounting.close-evidence
- accounting.close-findings

This decision does not approve payroll/payslip files, HR documents, public customer statements, inventory background exports, cross-tenant accountant delegation, hosted storage or statutory correctness. Those retain their own gates.

## Acceptance evidence after a decision

- **D01-T01** — Current authorized creator reads own same-tenant status and downloads the exact artifact once its class and export authority pass.
- **D01-T02** — Same-tenant reader without creator status or an explicit grant receives no job metadata, provider/key, file bytes or existence distinction.
- **D01-T03** — Same-tenant explicitly delegated reader with current underlying read scope sees granted status/metadata only; download denied without current export authority.
- **D01-T04** — Same-tenant delegated exporter with all current scopes and fresh authentication downloads only the granted job/hash until expiry.
- **D01-T05** — Other-tenant creator, reader, administrator or delegate cannot inspect or download; forged organization, job, key and manifest rejected.
- **D01-T06** — Creator permission removal, session revocation/expiry, module deactivation and location/period restriction removal take effect on next status/download; historic creation grants no continuing authority.
- **D01-T07** — Grant revoked/expired/wrong actor/wrong job/wrong content hash is denied; direct object key/old URL does not bypass current policy.
- **D01-T08** — An administrator needs explicit current class/export authority; role name alone does not bypass scope. Delegation cannot exceed grantor or recipient authority.
- **D01-T09** — Concurrent revocation or artifact replacement during storage latency is rechecked before bytes are released. Expired artifacts do not yield a fresh delivery grant.
- **D01-T10** — Denied reads leave business/job/artifact/grant state unchanged; permitted security audit entries are classified separately.
- **D01-T11** — Queue summary remains tenant-scoped under its separately approved existing reports.read boundary and contains no per-job artifact locator.
- **D01-T12** — Existing callers and absent/unknown jobs retain a safe uniform denial; browser back/reload does not restore unauthorized metadata/download affordances.

Verification must record actual signed-session HTTP results, database before/after state, exact authorized content hashes and denied body scans. Mocked policy tests alone do not admit file delivery. Keep security/audit/session bookkeeping separate from unauthorized business changes.

## Approval record and next step

Please select **A, B or C**, identify who approves for product/accounting and security, and state any class-specific exception. The complete proposed C matrix above may be approved as written; changes must identify affected classes and whether they concern status, locator metadata or bytes. The machine record keeps selected_option and owner approvals unset until your response.

After approval: derive the smallest repair package if the selected rule differs from current source, implement only under a separate repair authorization, then run the policy-specific negative and positive cases before P04-V01 can close this family. P04-V02 session qualification can continue independently. Parent P04 and production stay blocked while their other gates remain open.

Recovery: this preparation changes documentation only. Preserve the current behavior and snapshots; do not turn on delivery or relax controls while the decision is pending.
