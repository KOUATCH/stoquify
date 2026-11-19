# Build qualification limits

The final U02 candidate is frozen AF16 source plus the four reviewed grant-recovery application-file deltas, including command/refresh completion and explicit reload recovery. It uses a physical copy of the pinned installed dependencies, not a clean dependency installation.

The final [U02 build log](u02-artifact-build.log) records secret preflight at **2026-10-29T09:22:25.629Z**: conditional, 19/21 ready, zero blockers and two warnings, with release enforcement off. The two conditional checks are live statement delivery and live accountant invitation delivery, explicitly disabled for this synthetic local run. This is not production-secret/provider admission. The earlier 28 October preflight remains historical evidence in its original build log.

Lint completed with zero errors and 24 warnings in unchanged frozen-source files. Compilation also reported a next-intl dynamic-import cache-invalidation warning; no dependency or unrelated source edits were made.

Current-root compiler and test evidence are separately identified. The sealed candidate does not include newer unrelated authority hardening and cannot certify the combined current release.
