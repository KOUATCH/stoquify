# ID-05 — change a password

Status: **Complete—verified** for the supported local implementation. Eight criteria and source bindings are recorded in the [final audit](PASSWORD_CHANGE_FINAL_AUDIT_2026-09-27.md) and [immutable closure receipt](evidence/password-closure-2026-09-27.json).

Scope: permitted entry, actual authentication, atomic self-service/admin credential change, target-session revocation, reset-link invalidation, retained history/audit, failure recovery and new-password sign-in. The existing administrator action/service has no dedicated target UI; none is claimed. Three scanner findings remain under MC-11 with actual runtime guards independently verified. Native screen-reader speech/browser-chrome zoom and production/release limits remain explicit.

Use the [operating guide](PASSWORD_CHANGE_OPERATING_GUIDE.md). The prior checklist is preserved in the adjacent retained file.
