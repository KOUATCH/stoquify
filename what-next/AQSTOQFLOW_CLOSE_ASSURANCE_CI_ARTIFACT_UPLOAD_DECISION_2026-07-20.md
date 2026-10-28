# AqStoqFlow Close Assurance CI Artifact Upload Decision

Date: 2026-07-20
Scope: close-assurance browser smoke CI evidence handling

## Decision Status

Status: PENDING EXPLICIT APPROVAL

The close-assurance browser smoke is now wired into GitHub Actions, but CI artifact upload was not enabled because it would export local Playwright traces, screenshots, and close-assurance evidence files to the GitHub Actions artifact store.

## Current CI State

- Workflow job: `.github/workflows/ci.yml` -> `close-assurance-smoke`
- Command: `npm run test:e2e:close-assurance`
- CI readiness ratchet: `close_assurance_browser_smoke_is_configured`
- CI readiness report: `what-next/ci-release-readiness.md`
- Local artifact readiness gate: `npm run test:e2e:close-assurance:artifact-gate`
- The named package script scans the bounded `what-next/accounting` evidence set; Playwright traces/videos require separate explicit approval.
- The close-assurance e2e command now runs the bounded artifact gate after the authenticated browser smoke passes.

## Artifact Upload Candidate

If approved, the job should upload only bounded smoke evidence:

```yaml
- name: Upload Close Assurance Smoke Evidence
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: close-assurance-smoke-evidence
    if-no-files-found: warn
    retention-days: 14
    path: |
      playwright-report/
      test-results/
      what-next/accounting/
```

## Risk Controls Before Enabling

- Confirm downloaded close-pack JSON remains redacted and watermarked as draft/not certified.
- Keep the artifact retention short.
- Do not include `.env`, auth state files, database dumps, production secrets, provider payloads, or statutory authority credentials.
- Keep CI on synthetic PostgreSQL credentials only.
- Keep the evidence boundary explicit: CI artifacts are system release evidence, not OHADA, SYSCOHADA, statutory, legal, tax-authority, or external-auditor certification evidence.

## Approval Wording

To enable this in the workflow, use explicit approval such as:

```text
I approve adding GitHub Actions artifact upload for close-assurance smoke evidence, limited to Playwright report/test-results and what-next/accounting, with short retention and no secrets.
```

## Next Action After Approval

- Add the artifact upload step to `.github/workflows/ci.yml`.
- Add a CI readiness ratchet check such as `close_assurance_smoke_artifacts_are_uploaded`.
- Run the local artifact readiness gate before enabling upload in CI.
- Add focused tests in `scripts/__tests__/ci-release-readiness-gate.test.js`.
- Regenerate `what-next/ci-release-readiness.md` and `.json`.
