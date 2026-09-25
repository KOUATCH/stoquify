# Implementation Roadmap

## P0 — Restore formal skill validation

**Objective:** Run the required `quick_validate.py` successfully.

**Dependency:** Python runtime with the YAML dependency available.

**Verification:**

```powershell
python C:\Users\J COMPUTER\.codex\skills\.system\skill-creator\scripts\quick_validate.py .agents/skills/stoquify-prompt-execution-roadmap-publisher
```

**Definition of done:** Validator exits successfully and its result is recorded in the execution report.

## P0 — Publish and validate report pairs

**Objective:** Generate the five matching PDF files from the five Markdown sources.

**Implementation:** Run:

```powershell
node .agents/skills/docs-report-publisher/scripts/publish_reports.mjs prompt-execution 01_REFINED_PROMPT.md 02_EXECUTION_REPORT.md 03_EXECUTION_FINDINGS_AND_RISKS.md 04_IMPLEMENTATION_ROADMAP.md 05_ROADMAP_EXECUTIVE_SUMMARY.md
```

**Definition of done:** Publisher exits successfully; all ten expected files exist; PDFs are non-empty; no intermediate files remain.

## P1 — Dry-run the reusable skill

**Objective:** Prove the refinement-to-roadmap pipeline without external or destructive actions.

**Implementation:** Use a read-only fixture prompt and capture refinement, execution, findings, roadmap and publication evidence.

**Definition of done:** Dry-run results are traceable and blockers are reported without claiming live implementation success.

## P1 — Add operational manifest validation

**Objective:** Make report-pair verification deterministic for future runs.

**Implementation:** Add a narrowly scoped helper only if repeated manual validation proves error-prone. Keep it under the new skill and avoid replacing `docs-report-publisher`.

**Definition of done:** The helper verifies filenames, pair existence, non-empty PDFs and destination containment.

## P2 — Add optional UI metadata

**Objective:** Improve discoverability in Codex skill selection.

**Dependency:** Confirm the project’s desired invocation policy.

**Definition of done:** Any `agents/openai.yaml` metadata is consistent with the skill frontmatter and does not change safety behavior.

## Rollout gates

1. Skill validation passes.
2. Dry-run produces all five report stages.
3. PDF publication passes the pair invariant.
4. No external actions occur without authority.
5. Final summary reports all passed, failed, skipped and blocked checks.
