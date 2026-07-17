"""Apply focused finance and country-pack boundary hardening from retest."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    match_policy = {
        "schema_version": "1.0.0", "policy_id": "reconciliation-match-policy", "policy_version": "1.0.0",
        "owner": "Payment Reconciliation Control Owner", "production_state": "requires domain calibration",
        "minimum_compared_fields": ["tenant", "currency", "amount", "payment_or_statement_date", "provider_or_account", "stable transaction reference when available"],
        "hard_contradictions": ["tenant mismatch", "currency mismatch", "amount outside approved deterministic tolerance", "already finally matched", "conflicting stable transaction reference"],
        "bands": {"no_suggestion": "missing a minimum field, any hard contradiction, or score below calibrated review floor", "mandatory_human_review": "score at or above review floor but below approved suggestion threshold", "suggestion_only": "score at or above approved threshold with no hard contradiction; never automatic resolution"},
        "release_requirements": ["versioned deterministic scoring implementation", "representative calibration dataset", "false-match and missed-match analysis", "named threshold approver", "effective date and rollback version"],
    }
    (ROOT / "contracts" / "reconciliation-match-policy.json").write_text(json.dumps(match_policy, indent=2) + "\n", encoding="utf-8")

    s20 = ROOT / "skills" / "stoquify-reconciliation-match-suggestion" / "SKILL.md"
    s20.write_text(s20.read_text(encoding="utf-8") + """

## Match-confidence policy

Apply `../../contracts/reconciliation-match-policy.json`. A production candidate must register the calibrated deterministic implementation, threshold owner, effective policy version, minimum compared fields, contradiction overrides, human-review band, calibration evidence, and rollback version. Until those release requirements are satisfied, return top-level `blocked` with `result.reason_code = POLICY_UNCALIBRATED`; never guess a threshold or issue a match suggestion.
""", encoding="utf-8")

    provenance = """

## Mandatory country-pack provenance

For every statutory, payroll, compliance, declaration, tax, or country-dependent accounting conclusion, require the exact country-pack ID, jurisdiction, version, effective-from/effective-to dates, review owner, review state, source provenance, environment, and production-support state. This requirement applies even under direct skill invocation. If any field is missing, stale, unreviewed, suspended, outside its effective period, or unsupported in the current environment, return top-level `blocked` or `unavailable` with `result.reason_code = UNSUPPORTED`; do not provide the conclusion.
"""
    for slug in ["stoquify-compliance-readiness-explanation", "stoquify-payroll-readiness-variance"]:
        path = ROOT / "skills" / slug / "SKILL.md"
        path.write_text(path.read_text(encoding="utf-8") + provenance, encoding="utf-8")
    print(json.dumps({"status": "final-hardening-applied", "match_policy": 1, "country_pack_skill_boundaries": 2}))


if __name__ == "__main__":
    main()
