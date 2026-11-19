# P04-V02 qualification contract

User authorization: 9 November 2026. Qualification and decision preparation only. No product repair, commit, push, production change or deployment.

## Required evidence

| Gate | Required observation | Failure disposition |
|---|---|---|
| Candidate | Current source hashes, installed dependency identity, isolated build and verified artifact; explicit qualification-only fixtures | Candidate evidence cannot advance until reconciled |
| Target | Fresh owned database/runtime, explicit local ports and environment, blocked external traffic, no inherited application credentials | Stop the unsafe operation; retain failed attempt |
| Real authentication | Actual current Better Auth sign-in creates signed cookies; independent authorized session succeeds | No substitution with stubbed transport or manually forged sessions |
| Session invalidation | Expired/revoked sessions are denied at relevant core-auth and private application endpoints; signed cookie-cache remains present during the negative | Record the exact failing endpoint and state; no security pass from another endpoint |
| Authority changes | Current permissions, module and tenant/object boundaries apply to existing sessions, with restored/independent authorized positive controls | Record bounded defect or untested limitation |
| Private browser recovery | An authorized private consumer is rendered first; revoked/expired or changed authority is then exercised through stale tab, back and reload | Prior content must not be restored from stale authority; static screenshots alone do not prove recovery |
| Read privacy | Denied responses expose neither seeded private records/bytes nor credentials/session secrets | Capture redacted proof and bounded repair recommendation |
| Write integrity | Each denied mutation has database before/after evidence; allowed session/security/audit effects are named separately | An unauthorized authentication-account change is a defect even if ordinary business rows are unchanged |
| Provider protocol | Actual UploadThing wrapper and implicit methods; signed/unsigned/tampered callbacks and local positive callback processing | Local protocol proof never substitutes for hosted provider/storage admission |
| Independent review | Reviewer validates current source, recipe side effects, observations, failure classification, cleanup and publication | Retain package blocked if required evidence or confirmed defect remains |
| Cleanup | Stop only owned processes/listeners, release ports and revoke/remove synthetic sessions with separate cleanup evidence; retain data/evidence | Unverified cleanup stays explicit |

Source inspection, isolated helper checks, native database observations, actual HTTP, rendered browser and hosted-provider evidence are separate classes. An application failure is not a test-harness failure. If the harness is corrected, preserve the earlier attempt and rerun the affected claims on the same admitted candidate or refresh the candidate explicitly.

P04-V02 may be **verified** only when its required local gates pass. An executed qualification that finds a defect remains **blocked**, with evidence and a bounded repair package proposal. Parent P04 and production remain blocked while their other required children and decisions remain unresolved.

## P04-D01 decision boundary

Prepare the current finance report/export visibility matrix, alternatives, recommended policy and acceptance cases from current source. The user must approve the policy before a dependent behavior repair. `P04-D01` is distinct from global release decision `D01` (M1/M2 exposure scope). Preserve all existing global decisions and deferred commitments.
