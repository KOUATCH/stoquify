# Journal review and recovery

Primary workflow: FA-CASH-COMMAND. Supporting workflow: FA-CLOSE-PACK. This is a correction within those workflows, not a new workflow or a whole-workflow closure.

Evidence date: 2026-10-01. Branch `codex/migration-control-plane-release-2026-08-29`, HEAD `62a56036a5ac9b37236a20c9b148052199069479`. Shared dirty checkout preserved; this milestone changes the journals page/tests and adds its client controller, copy and tests. Relevant service/action/scope-helper hashes remain unchanged.

## Bounded acceptance criteria

- Load tenant-authorized journal records and distinguish successful empty, partial and failed reads.
- Offer generic posting/reversal only for supported manual entries and the current server-derived role permissions. The action/service remain authoritative for current grants, identity, independent review, financial and period controls.
- Review the selected entry; require explicit reversal reason and accounting date. Preserve the operation and details through recoverable errors and password confirmation. Never automatically submit a financial operation after confirming identity.
- Prevent overlapping submissions; require a list refresh for uncertain outcomes. Retain original evidence and confirm actual persisted posting/reversal.
- Preserve separate nominal currencies and exact cents; explain the loaded 100-entry scope. Include voided/other retained states.
- Verify EN/FR, keyboard focus, dialog containment/return, narrow layout and actual database-backed journeys with distinct maker/poster/reverser/reader identities.

## Changes and design decisions

The existing authenticated journals route and accounting panels/tables are retained. A small client action controller uses the shared dialog, inputs and buttons. Review controls use brand treatment; drafts use information treatment; retained ledger evidence uses trust treatment. Only a successful action response creates a focused success receipt, held above the tables so a server refresh can move the entry without losing the feedback.

The previous redirect discarded structured authentication errors and the selected operation. In-page password confirmation now preserves the operation/reason/date, clears password input and requires a deliberate confirmation afterward. The stable page provider owns reviews independently of table-cell remounts; changing the trusted organization/actor key discards the old context's selection and password. Unknown or transport outcomes require an explicit refresh followed by a different successful server-read revision before confirmation is re-enabled. Failed, missing, unchanged or unrelated pre-request revisions cannot clear that local barrier. This read revision coordinates UI recovery; it grants no financial authority.

Failed reads no longer become zero counts or successful empty tables. Successful partial data remains visible. Technical read errors are not echoed to users. Counts and search describe the latest 100 loaded entries, with an observation time in UTC.

Previously nominal amounts in different currencies were added and labeled XAF, and fractional amounts were rounded away. The page now groups amounts by the currency recorded on each line, sums with decimal arithmetic and preserves two decimal places. Missing amounts/currencies display unavailable. Nominal grouped totals are not represented as a base-currency trial balance.

The page uses the route wrapper's authenticated permission context for command visibility. It does not redefine retained read access or replace server controls. Recovery-owned entries and entries from other sources explain that correction belongs to their originating workflow. A URL query string is no longer treated as posting/reversal success evidence.

## Operating instructions

Open `/en/dashboard/accounting/journals` or `/fr/dashboard/accounting/journals`.

1. Find the entry in the loaded result; review its recorded currency, date and status.
2. An authorized reviewer selects Post for a supported manual draft, or Reverse for a supported posted manual entry.
3. For reversal, enter the business reason and choose the accounting date from the organization's open periods. Obtain the reason from the documented correction request and the date from the responsible accounting reviewer; the server validates the period and financial constraints.
4. Review the confirmation. If identity confirmation is required, use your current account password. Verify the preserved details and deliberately confirm again after identity succeeds.
5. Read the entry-specific result and refreshed record. On an uncertain outcome, refresh and inspect the status before attempting another operation. For denied access, ask the organization's administrator to review role/module authority; password confirmation does not grant permission.

An entry owned by inventory, reconciliation or another source must be corrected through that workflow so its related records remain consistent. A reversed original remains visible. The list is a loaded slice; absence from it is not proof that an older entry does not exist.

## Verification

Final static verification is terminal: 70 tests across four suites, full no-emit TypeScript and five-file lint passed with stable source hashes. This includes real table-cell replacement during authentication and in-flight requests, scope changes, failed/pending/completed read barriers, and EN/FR server rendering followed by real hydration and keyboard review. The focused runner is `lanes/environment/verify-manual-journal-recovery.cjs`, executed with phases `jest`, `typecheck`, then `lint`; it invokes the repository's Jest/TypeScript/ESLint binaries without build hooks, migrations or seeds.

- [Final Jest pass](evidence/manual-journal-recovery-jest-b99e8967-31e6-4237-b6c3-1e8b059bf1a5.json).
- [Final TypeScript pass](evidence/manual-journal-recovery-typecheck-aef5d171-463d-4559-b878-53179ce1fbb0.json).
- [Final changed-file lint pass](evidence/manual-journal-recovery-lint-dbb58ba4-eeae-4178-9e5c-11f91041575b.json).
- [Initial failed attempt](evidence/manual-journal-recovery-jest-9feddc0a-ce10-4bc2-aac5-9dea9a9a79ff.json): 21 action tests passed; both UI suites failed to load the icon package's ES module. Narrow icon mocks fixed the test fixtures. Actual Radix dialogs and focus tests remain intact. Failed test bytes are retained in the evidence folder.

The [first actual browser attempt](lanes/environment/manual-journal-recovery-browser-c4b33ba8-1c65-469b-a2f7-7059cd438c16.json) failed both journeys with stable source and unchanged observed outside-fixture state. EN reached a real FRESH_AUTH_REQUIRED refusal and unchanged financial records, but then lost the password dialog. FR failed to retain the initially opened dialog. The shared table recreates cell-render component functions when refreshed column props arrive; that remounts cell-local dialog state. The selected reviews now live in the existing persistent workflow provider, leaving table cells as triggers. The failed screenshots and original controller/test bytes are retained. Earlier 61-test and 67-test passes bind preceding revisions and are historical. Initial static passes alone did not establish recovery.

Read-failure and partial-read rendering are proven at the page's action-response boundary in unit tests; the browser journeys exercise real authentication and financial transitions, not injected read outages.

The [second actual browser attempt](lanes/environment/manual-journal-recovery-browser-a65cae40-2b4a-49c4-8245-58e1602ba512.json) also failed overall. EN posting completed the real expired-authentication refusal, password confirmation without financial effects, deliberate retry, exact persisted posting and focused success after the row moved. The next EN reversal review and the initial FR posting review did not open. Both had focused native buttons, no financial requests and no recorded page exceptions; source and observed outside-fixture state remained unchanged. The prior source rendered these buttons enabled before hydration attached their handlers. That is a confirmed readiness gap and a possible explanation for the lost initial interaction, not a conclusively observed event trace. Each command trigger now remains disabled until its own mount effect runs. The observed white strip below successful feedback was the feedback paragraph's outside margin; that margin is removed without replacing the inherited shell. The preceding 68-test pass binds the version before this correction.

### Final actual application proof

The unchanged browser driver [passed both complete journeys](lanes/environment/manual-journal-recovery-browser-46603d50-6c47-4a03-b505-5af21824893b.json), exit 0, with stable source and observed outside-fixture state. It used the existing loopback development listener on port 3110 and only the owned `stoquify_local_registration_20260906_01` database. The served route references the current controller and its recorded build hash remains stable within each journey.

| Verified boundary | Result |
|---|---|
| EN desktop and FR 320px posting/reversal | Both pass with distinct poster, reverser and reader identities; actual journal and compensation effects verified |
| Genuine expired assurance | Each operation refuses without financial effects; password confirmation preserves the review and performs no automatic financial retry |
| Deliberate retry | Exactly two financial requests per operation: initial refusal and successful explicit confirmation; reversal reason/date match persisted evidence |
| Keyboard and recovery | Review heading focus, containment, Escape/return, preserved details and success focus after actual action-row unmount pass |
| Permission/source presentation | Ungranted command absent; inventory-owned entry directs users to its originating workflow; reader retains draft/posted/reversed history without actions |
| EN/FR read-only at 1440/768/320px | Document and body fit the viewport; labelled table region takes keyboard focus and retains local horizontal scrolling where needed; reads have no financial effects |

Actual screenshots: [EN posting success](lanes/environment/manual-journal-recovery-46603d50-6c47-4a03-b505-5af21824893b-en1440-post-success-focus.png), [EN reversal success](lanes/environment/manual-journal-recovery-46603d50-6c47-4a03-b505-5af21824893b-en1440-reverse-success-focus.png), [FR mobile identity recovery](lanes/environment/manual-journal-recovery-46603d50-6c47-4a03-b505-5af21824893b-fr320-reverse-identity-required.png), [FR mobile retained history](lanes/environment/manual-journal-recovery-46603d50-6c47-4a03-b505-5af21824893b-fr320-read-only-history-width-320.png). The receipt lists all 32 screenshots. Synthetic record descriptions remain fixture data, not translated product copy.

Local development navigation-to-visible-heading observations were EN 7.389s/2.657s/3.483s and FR 14.281s/3.528s/3.065s for posting/reversal/reader pages. Initial requests include variable development compilation; the first historical attempt recorded a 110.757s EN load. These are observations with different cache states, not a controlled performance improvement or approved-budget pass. No production build was executed.

All cases required by this bounded runner passed; none were skipped or timed out. This proves the listed journal recovery criteria, not the full Cash/Close workflow. Native screen reader, actual browser zoom, full contrast and inherited console/hydration checks remain unverified. The development issue badge remains visible; zero recorded page exceptions does not clear those issues.

Before-edit snapshot: `evidence/manual-journal-recovery-before-30d6d6fd-0f26-4c73-ab11-9d173730c35a/manifest.json`.

Independent review: [MANUAL_JOURNAL_RECOVERY_REVIEW_2026-10-01.md](MANUAL_JOURNAL_RECOVERY_REVIEW_2026-10-01.md).

## Rollout and remaining boundaries

No schema migration or new provider is required. This change is source-only and verified against the owned local registration environment. Before deploying, bind the reviewed files and required release checks to the target build. Restore only this milestone's page/controller/copy changes if recovery is required; preserve unrelated shared-checkout edits and all ledger/audit records.

The rejected all-period posting helper remains unapplied. Earlier-period Close invalidation, draft-created snapshot freshness, current role/session revocation serialization, other producer lifecycle coverage, interrupted/background delivery and the wider workflow inventory remain open. The new journal page does not certify those boundaries. No X1 clearance, live activation, external message, production deployment or professional approval is implied.

Architecture/data/finance/security/frontend/accessibility/localization/quality and rollout reviews apply to these boundaries. Statutory country rules, payroll business behavior, POS/offline, external integrations, billing and AI-agent behavior: not applicable to this UI correction because no rules or state transitions in those domains are changed; their original workflow requirements remain in the register.
