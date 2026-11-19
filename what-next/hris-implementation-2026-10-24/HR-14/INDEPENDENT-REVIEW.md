# HR-14 independent source review

Reviewer: `/root/hr09_independent_review`, independent read-only agent. No reviewer code edits or test execution. Parent implemented fixes and owns verification. Final disposition: **PASS for the reviewed source scope**, no remaining concrete blocking finding across nine targeted domains.

| Finding | Disposition and evidence |
|---|---|
| Preflight: comparison outside native transaction cannot prevent intervening changes | Shared employee/source locks; preview version recomputed with native mutation and receipt in one transaction. Real concurrent retry, direct-edit stale rejection, metadata-writer collision and rollback cases. |
| Preflight: generic COMPLETED obscured scheduled lifecycle apply | Native result now distinguishes APPROVED, REJECTED, APPLIED and SCHEDULED; future application retains scheduledFor and exact recovery. |
| Preflight: contract-ID-only key conflated later pending requests | Review version binds actual request identity, source version, actor, decision and scope. Receipt identity binds the review version; changed envelope conflicts. |
| R1: evidence attachment could overwrite newly approved employee metadata | Shared employee lock added before attachment read. Real test holds approval transaction open and proves attachment cannot read until release; both retained evidence and approved lifecycle survive. |
| R2: wrong employee/request pair could lock a second employee | Salary/payment lock helpers accept expected employee identity; review lookups scope identity before acquiring source employee lock. |
| R3: material component/contract facts hashed but not displayed | Classification, grade, convention, component nature/calculation/tax/social/employer-charge flags and active contract coverage displayed. Salary disclosure requires explicit current salary permission. |
| R4: controlled/native policy lock order differed; compatibility dispatcher upgraded SHARE to UPDATE | All policy approval entry paths acquire organization UPDATE before account/source locks. Real direct-versus-controlled and concurrent compatibility cases pass without deadlock. Delegated review is not converted into manager authority. |
| R5: postcommit cache failure/structured internal error could hide a successful receipt | Revalidation cannot replace durable receipt. Unknown/internal responses freeze the original envelope and offer recovery. Action regression and browser simulated postcommit internal response recover exact receipt. |
| R6: authoring completion refresh could replace a newly selected employee | Review disabled while navigation loads; completion reload applies only for matching navigation generation. |
| R7: French team page omitted locale prop | Parent now passes locale. Browser uses actual manager component and native manager read model at EN/FR team paths. |

Additional parent-discovered issue: receipt recovery originally trusted active-session context after account disable. Live account and role rows now checked/locked before review and recovery; current salary visibility and explicit scoped grants also apply to replay. Real denial test passes.

Source review is not a production security, privacy, payroll, statutory or accessibility certification. See RESULT and OPERATIONS for executed boundaries.
