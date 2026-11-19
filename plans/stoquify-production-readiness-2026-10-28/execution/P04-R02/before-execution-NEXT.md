# Next execution boundary

Recommended first repair: **P04-R02 — close alternate public-static access to private uploads**. Start by capturing an isolated asset/reference/hash manifest and a two-path failing regression for the protected API and alternate static URL. Preserve originals and authorized references. Refresh the source candidate first; unrelated untracked scripts appeared during P04 and were not qualified.

Acceptance requires denied requests on both URLs return no private bytes, valid same-tenant reads work, private files are absent from candidate public delivery, references/recovery mapping reconcile and independent review passes. Deployed ingress acceptance remains separate.

R01 reserved-code scope and R03 safe error response repairs can proceed in parallel with distinct ownership once repair execution is requested. Read-only surface packet subdivision and P04-D01 export-visibility policy preparation can proceed independently. Do not guess business approval.

P04 is BLOCKED until required children are verified; P05 and other dependants remain gated. The current request authorized verification and repair planning only. No application fixes, production changes, commit/push or deployment occurred.
