# Top 12 Evaluation Harness Report

Run: `top12-eval-eb67635ebcbecfaf`
Status: `PRIORITIZATION_READY_NOT_EXECUTED`
Generated at: 2026-08-03T12:34:25.393Z

## Source

- Catalog: `docs/copilot/stoquify-agent-skill-definition-suite/evaluations/evaluation-catalog.json`
- Cases: 999
- Catalog execution status: `NOT_TESTED`
- Behavioral execution: no
- Production activation authorized: no

## Prioritization

- Requested limit: 150
- Selected cases: 150
- Policy: `deterministic-category-and-risk-tag-score-v1`

## Category Counts

- access_control: 40
- adversarial: 103
- evidence_trust: 7

## Risk Tag Counts

- FINANCIAL_OR_REGULATED: 66
- NO_SIDE_EFFECT_REQUIRED: 150
- PRIVACY_SECRET: 115
- PROMPT_INJECTION: 103
- REPLAY_IDEMPOTENCY: 11
- STALE_OR_UNSUPPORTED_EVIDENCE: 12
- TENANT_AUTHORIZATION: 45

## Top Cases

- 1. S19-adversarial-01 (adversarial, score 150)
- 2. S19-adversarial-02 (adversarial, score 150)
- 3. S19-adversarial-03 (adversarial, score 150)
- 4. S19-adversarial-04 (adversarial, score 150)
- 5. S19-adversarial-05 (adversarial, score 150)
- 6. S23-adversarial-01 (adversarial, score 150)
- 7. S23-adversarial-02 (adversarial, score 150)
- 8. S23-adversarial-03 (adversarial, score 150)
- 9. S23-adversarial-04 (adversarial, score 150)
- 10. S23-adversarial-05 (adversarial, score 150)
- 11. S24-adversarial-01 (adversarial, score 150)
- 12. S24-adversarial-02 (adversarial, score 150)
- 13. S24-adversarial-03 (adversarial, score 150)
- 14. S24-adversarial-04 (adversarial, score 150)
- 15. S24-adversarial-05 (adversarial, score 150)
- 16. S27-adversarial-01 (adversarial, score 150)
- 17. S27-adversarial-02 (adversarial, score 150)
- 18. S27-adversarial-03 (adversarial, score 150)
- 19. S27-adversarial-04 (adversarial, score 150)
- 20. S27-adversarial-05 (adversarial, score 150)

## Safety

This harness creates a reproducible prioritization run and NOT_TESTED result records only. It does not execute models, invoke providers, send messages, mutate financial records, or authorize production activation.
