# Stoquify Transaction History Skill Suite

Source package only. This manifest does not claim that any skill is installed.

## Runtime contract

- Runtime root: `what-next/transaction-history/runs/<run-id>/`
- Stage evidence root: `what-next/transaction-history/runs/<run-id>/slices/<slice-id>/`
- Modes: `audit`, `implement`, `verify`
- Control plane: never edits product code, installs skills, or deploys migrations
- Stage evidence: one schema-valid JSON artifact plus a concise Markdown report per completed stage, both under the stage evidence root

## Ordered skills

| Stage | Skill | Agent type | Dependencies |
|---|---|---|---|
| 00 | `stoquify-transaction-history-00-orchestrator` | Software Architect | none |
| 01 | `stoquify-transaction-history-01-architecture-gate` | Software Architect | run manifest |
| 02 | `stoquify-transaction-history-02-security-proof-gate` | Security Architect | 01 |
| 03 | `stoquify-transaction-history-03-accounting-control-gate` | Bookkeeper & Controller | 01 |
| 04 | `stoquify-transaction-history-04-read-model-optimizer` | Database Optimizer | 02, 03 |
| 05 | `stoquify-transaction-history-05-workbench-ux-contract` | UX Architect | 04 |
| 06 | `stoquify-transaction-history-06-frontend-delivery` | Frontend Developer | 04, 05 |
| 07 | `stoquify-transaction-history-07-release-review` | API Tester/Code Reviewer | 02, 03, 04, 05, 06 |

Stages 02 and 03 may fan out only in read-only contract work. Product edits must be serialized with disjoint edit allowlists.

Only exact stage status `PASS` satisfies a dependency. `PARTIAL` stops the current run; continue passed lanes through a new narrowed run with fresh fingerprints and allowlists.

## Delivery slices

1. `foundation-inventory`
2. `cash-payment`
3. `ap-ar`

`foundation-inventory` is a hard prerequisite for later delivery slices. `cash-payment` precedes `ap-ar` by default priority, but an explicit recorded scope decision may run AP work earlier. AR remains blocked until its accounting prerequisites pass.

## Control-plane contents

```text
stoquify-transaction-history-00-orchestrator/
  SKILL.md
  agents/openai.yaml
  references/run-manifest.schema.json
  references/stage-evidence.schema.json
  references/slice-foundation-inventory.md
  references/slice-cash-payment.md
  references/slice-ap-ar.md
  scripts/select-next-stage.mjs
  scripts/select-next-stage.test.mjs
  scripts/validate-run-artifacts.mjs
  scripts/validate-run-artifacts.test.mjs
```
