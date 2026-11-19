# Independent auth review

Reviewer /root/hr09_independent_review performed read-only source and evidence review.

Confirmed permanent-lock semantics mismatch in the baseline and required conditional bookkeeping. Confirmed roles must be filtered to current organization before permissions, returned roles and superuser authority. Clarified that the existing Session schema does not persist a general tenant binding. Recommended cache-free session reads, retained cookie-cache revocation tests, explicit audit counts and exact401/403 denials.

Product verdict: PASS_SCOPED_SOURCE_ONLY. Final source/retained-evidence verdict: PASS_SCOPED,13 native checks and24 mocked tests agree with their artifacts; no remaining material finding. Initial type diagnostics were explicitly pending at review; the subsequent bounded rerun produced0 diagnostics and is separately retained.

The reviewer did not execute tools against the database or claim full Next/browser/module/password-step-up acceptance. The final harness also verifies removal of synthetic users, accounts and sessions before reporting success.
