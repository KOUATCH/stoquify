# Historical Close evidence context

Primary FA-CASH-COMMAND; supporting FA-CLOSE-PACK. This correction identifies the retained assessment behind each item of evidence recovery work. It does not close either parent workflow or change the platform coverage denominator.

Baseline: 2026-10-03, branch `codex/migration-control-plane-release-2026-08-29`, HEAD `62a56036a5ac9b37236a20c9b148052199069479`. Register SHA256 `797be0b9c5e4d5ea7165135c32d1f85ee5adbaadc692b95913ce7bc41e3d8b2b`; progress SHA256 `9887592ea9fae3f1277541d0d05ba8b74d961e8f082dd1180dece084479fdc39`. Existing shared changes are preserved. Graph action node `accounting_close_assurance_actions_ts`, community 6, locates the Close boundary; current service/action/component sources establish this correction's behavior.

## Problem and acceptance criteria

The workbench intentionally retains open findings from earlier assessments. Multiple assessments can produce identical finding titles, but the recovery cards previously omitted their assessment dates and references. A user could not distinguish those obligations or confirm the selected historical target from the request form. Known system titles also remained English on the French route.

Acceptance requires the original assessment time and reference on finding, assigned-request and review cards, and on the selected form. Metadata must come only from current tenant/period records associated with the authorized visible page. Continuation must retain earlier context. Missing context must be explicit; query failure cannot become successful emptiness. Localized presentation must preserve original source wording. Actual EN/FR request, response and independent acceptance must retain financial and historical-evidence invariants.

## Implementation and user benefit

`close-evidence-workflow.service.ts` reads a bounded set of assessment records after retrieving authorized work. It scopes those reads by organization, period and the distinct run IDs on the returned page. The 101st look-ahead finding is excluded. The existing final authority check runs after context collection. Direct review detail also resolves its original assessment. The contract exposes the assessment's `asOf` and recording time, without claims that it is the latest assessment or that its conclusions are currently healthy.

The recovery panel shows the assessment time in the browser timezone, full assessment reference and finding/request reference. The selected form repeats this context. Continuation merges context with retained rows; a complete refresh replaces it. Unavailable context has an explicit localized message. Due dates now carry a visible label.

Eight exact built-in finding titles have French presentation mappings. Unknown and customer-authored titles remain verbatim. The lookup accepts only own dictionary entries, including when source titles match JavaScript object properties. Original finding title/detail remain available in a keyboard-operable native disclosure labeled “Retained source wording” / “Texte source conservé”. Arbitrary historical diagnostic prose is not automatically translated. No stored evidence is rewritten.

The inherited dashboard panel, controls, text tokens, focus treatment and wrapping remain in use. Assessment context is neutral information, not a success or approval indicator. No new shell, role, provider, schema or migration is introduced.

## Verification

Final static verification passed: **439 tests /13 suites, zero failures or skips** in `evidence/close-evidence-recovery-jest-e4837093-c71f-4a86-8a68-3b9e691e3205.json`; no-emit TypeScript in `evidence/close-evidence-recovery-typecheck-8fca150e-bf59-430a-bc78-23746ba2c00e.json`; changed-file lint in `evidence/close-evidence-recovery-lint-0e6f4c26-5069-41e1-9321-82a2a5cf773a.json`. All source bindings remained stable.

Initial focused receipt `evidence/close-evidence-recovery-jest-ec3bd14b-b57c-4e04-b50e-e97fa5df1bd2.json` had 434 passes and one failure: an existing test selected a title globally after that title became intentionally present in both the card and selected form. The assertion now scopes to the finding card. The subsequent 435-test run, TypeScript and lint passed; these intermediate receipts predate four final exact-title lookup regressions.

All **eleven database checks** passed in `lanes/environment/close-evidence-workflow-runtime-1c02ed13-0322-448f-9099-713dd6f7553a.json`, SHA256 `88b1fed08cb0747d3b0d2753154596bca4b6a657f5b057b961973284bbc7a7b1`. Source, financial and outside-fixture observations passed. The target remained the owned loopback `stoquify_local_registration_20260906_01`; no schema/migration/seed command was run.

The existing owned-loopback capacity driver additionally compares every visible assessment projection against actual persisted run timestamps across continuation pages. The browser driver verifies the assessment date/reference and retained wording before submitting a request, then follows the existing response, fresh-authentication and explicit independent acceptance journey.

Both actual browser journeys passed in `lanes/environment/close-evidence-browser-d65eb427-59ba-4916-b79a-c107828aa727.json`. Each traversed findings, recipients, assigned requests and reviews, checked the historical assessment timestamp/reference and source disclosure, retained the request draft across reload, submitted a response and completed independent acceptance after explicit identity verification and retry. Exactly one durable acceptance was recorded per journey. Original missing evidence remained retained; financial, outside-fixture and source-stability checks passed. No browser errors were recorded.

Each language passed reflow measurements at 1440, 768 and 320 CSS pixels with reduced motion and no horizontal overflow. Native disclosure, buttons and recovery use actual keyboard interaction and focus assertions. Sixteen screenshots accompany the receipt; `close-evidence-browser-d65eb427-59ba-4916-b79a-c107828aa727-fr-historical-assessment-context.png` was visually inspected. Full screen-reader and zoom coverage remains open. Individual local development route-readiness observations were EN maker/checker/reviewer 44,493/9,152/9,303 ms and FR 7,541/12,462/11,586 ms. The cold EN visit includes development compilation and these are not production performance measurements. The identity-verified listener on port 3110 was stopped; its launcher exited 0.

## User and operator guidance

Open `/en/dashboard/accounting/close` or `/fr/dashboard/accounting/close`, choose the accounting period and use evidence recovery. Match the assessment time and reference to the obligation you intend to address; identical titles do not mean identical records. Expand the retained source wording for its original diagnostic. Confirm the same reference in the form before requesting evidence. A later successful assessment does not erase an earlier open obligation.

If context is unavailable, refresh the workbench. If it stays unavailable, provide the work and assessment references to an authorized support operator for tenant-scoped investigation. Do not create a duplicate request to compensate for a failed read. Normal existing request, response and independent acceptance permissions still apply.

## Scope, rollout and remaining work

This is an additive service/UI read-contract change with no data conversion. Release it with its component and service together through the normal release process. Recovery can revert these specific source additions without modifying retained evidence. Rollout and production performance/accessibility approval remain separate from local verification.

Architecture, backend/data, IAM/privacy, workflow/localization, records, quality and operations reviews apply. Financial controls remain invariant and are verified around the journey. Statutory/country calculations, POS/offline, payroll calculations, packaging/billing, integrations/providers and AI behavior: not applicable to this assessment display change; their full workflow reviews remain in the program.

Requester tracking, recipient replacement/leaver recovery, delegated-summary historical context, broader source-message localization, screen-reader/zoom coverage and the remaining Cash/Close lifecycle/race requirements remain open. The previously rejected all-period manual-posting helper remains unapplied pending the existing approval request. No production operation or X1 clearance is claimed.

Next recovery prerequisite found in current source: `requestMissingCloseEvidence` checks replay by finding plus correlation ID, then permits any finding except resolved/waived and appends a new request. The reviewer projection explicitly rejects a finding with other than one request. A second distinct request therefore appears capable of making that finding's review ambiguous, even though the UI hides already-requested findings. Reproduce the serial and concurrent service/action paths before implementing a correction and explicit replacement lifecycle. This is a source-confirmed contract mismatch, not yet a demonstrated runtime defect or completed remediation.
