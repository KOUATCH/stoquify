# Development and promotion gate evidence

Selected skill: `017-aqstoqflow-enterprise-release-gate`. Only new audit scripts/reports were written under this directory. No application, gate, schema, database, supplied document or approval register was modified.

Fresh result: **21 gates executed: 13 pass, 8 blocked**. Logs and original gate JSON/Markdown accompany `gate-assessment.json`; `required-input-contracts.json` gives exact storage fields, types, accepted formats, observed values and responsible providers.

## What does not require new human names

The supplied working copies and seed mapping already record the 17 candidate G1 roles. The refreshed 2026-08-22 working copy explicitly states that it is not authority, signature, approval or release evidence. Its old identity counts are historical; the parent audit joins current stable database IDs. User-supplied names must not be requested again or silently treated as confirmed appointments.

One concrete discrepancy needs resolution: paragraph 38 of `COMPLIANCE_AUTHORIZATION_G1_EVIDENCE_SEEDED_RECONCILIATION_REFRESHED_WORKING_COPY_2026-08-22.docx` says **Yonga Claude** for the legacy checker; paragraph 184 and the candidate-role seed map say **Yonga Springfield** for Security owner. Confirm intended person and scope rather than merging these identities. The full extracted text and original-file hashes are retained here.

## Engineering work, separate from authority evidence

- Payroll trust-spine: `cas_idempotency_and_partial_commit_regressions_covered` fails solely because the gate expects the old literal test title. The current test at `services/payroll/__tests__/payroll-run-approval-transition.service.test.ts:955` parameterizes P2002/P2034 using `%s`, checks two attempts and one transition; all persistence-order and SERIALIZABLE source markers pass. No fix was made in this read-only audit.
- Module surface ratchet: 181 active findings versus 55 baseline; 174 newly identified and 48 resolved. These are scanner findings, not 174 proven access vulnerabilities. Sample false positives include `transferLifecycleActions.ts` conditional permissions, `payment-request.actions.ts` template permissions and the internal server-only POS cache helper. Review actual guard chains and repair scanner/implementation issues with regression evidence; do not waive by overwriting baseline.
- Release evidence aggregate: 11 structural checks pass but six release blockers remain. It reads historical default readiness paths and this process's environment, so absent release secrets/production target here do not prove absence in deployed infrastructure.

## Genuine stage-specific authority requirements

- **Cameroon production CNPS:** actual qualified independent review of exact source artifacts, CM-2026.1 scope and four CNPS fixture families; real approval artifact and hash, reviewer identity, reviewed/effective dates and reviewed runtime publication. Both captured source artifacts and declared runtime source hashes verify today. CNPS authority is still `SUPPORTED_DRAFT` / `SOURCE_CHECKED`. The simple country-pack gate does not itself authenticate qualifications/signatures or enforce date formats; the linked qualified review artifact must do so. IRPP and production e-invoicing remain separate unsupported authority scopes.
- **POS G1:** all 13 technical checks pass, runtime conformance remains partial, and all 11 decisions await accountable approval (33 role obligations). Approvals require appointed real signers, exact frozen contract/version binding, deliberate approval within ten minutes of fresh authentication, future review/expiry and trusted Ed25519 evidence envelopes. `POS_GATE_TRUSTED_PUBLIC_KEYS_PATH` is not configured in this process; its operator-controlled public-key file must live outside the candidate repository. A signature image is not that attestation.
- **Agent pilot/release:** genuine distinct Product/Security approval, six operational roles with distinct primary/backup, accepted runbook and effective coverage; actual release/CI artifact hashes; controlled evidence endpoints; qualified statutory evidence where required; current scheduler/alert/credential evidence. Passing these evidence gates still does not activate an agent.
- **Module setup:** real same-tenant accounting/provider configuration and explicitly selected payroll/compliance scope, with current permissions and authentic sandbox-review evidence. Selection is not a grant of entitlement or authority.

No external evidence collector or protected action was invoked. Secret values are never required in these reports. The parent report should present decisions only for genuine missing authority/configuration, while scheduling engineering findings as engineering work.
