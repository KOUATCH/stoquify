# Next connected boundary: reconciliation certificate export

Current-source inspection, 9 September 2026, during v99. These are open implementation findings, not completed remediation or professional certification. The correction-record export added in v99 is a separate operation.

## Revalidated findings

1. `actions/payments/reconciliation.actions.ts` passes `Date.now()` as `lastAuthAt` to the existing certificate-export service, despite the protected context containing verified authentication provenance. This replaces the actual authentication age. Other corrected reconciliation actions already use `verifiedFreshAuthTime(ctx)`.
2. That certificate-export action has an export permission/fresh-auth guard but no explicit module read contract, unlike the correction export. Revalidate actual middleware/protect coverage before changing transport enforcement.
3. `exportReconciliationCertificate` upserts one inbox key per run/certificate/file type. Each repeated export generates new actor/time/correlation-dependent bytes and overwrites the retained payload hash and processed timestamp. Original download bytes are not retained in that receipt. This makes recovery and evidence interpretation ambiguous.
4. The client creates a temporary link directly from returned content without checking a returned file hash or current actor/organization scope. Its request identity is not retained across a lost response/reload. The current result contract does not return an export byte hash, immutable request receipt or scope.
5. The export service correctly checks signed status, certificate payload hash and current source-manifest hash, with close invalidation on drift. Preserve those controls while correcting download evidence and recovery. Exporting a valid certificate does not establish external statutory approval.

## Required implementation and evidence

- Trace PR-06/PR-10 and register certificate export explicitly if their existing boundaries do not cover the complete download/recovery lifecycle. Discovery must update the denominator rather than silently treating a button as a completed workflow.
- Reproduce the authentication-age and overwritten-receipt issues with focused action tests and actual owned database records.
- Use verified server authentication time and current tenant/module/operation authority; preserve appropriately authorized retained access.
- Bind an immutable export request to selected certificate/source evidence and actor. Reject conflicting key reuse and stale preview. Store exact issued bytes/hash and audit atomically, without overwriting historical export records or reissuing on exact retry.
- Preserve source/certificate drift detection and durable invalidation. Revalidate permission and authentication on retry. Clearly define historical replay versus a new observed export.
- Add scoped EN/FR download/recovery UI, fresh-auth flow, exact request persistence, hash validation and keyboard focus return; reuse proven patterns without exposing correction-specific terminology.
- Verify actual sign-off issuance before claiming certificate lifecycle coverage. Synthetic `SIGNED` fixtures alone are insufficient. Include period/country/provider prerequisites, independent authority, failed effects, concurrency, changed source, revoked access, preserved records and exact downloaded bytes.
- Update user/records-owner inputs, source locations and operational recovery instructions. Do not clear X1 or claim statutory/security/accessibility certification.

The full suspense resolution/write-off workflow and other register entries remain required. This sequence chooses the next connected risk; it does not reduce the assignment's scope.


## v100 implementation update

The auth provenance, mutable receipt and scoped recovery findings above are addressed in [v100 verification](CERTIFICATE_EXPORT_VERIFICATION_V100.md). PR-14 is now an explicit register entry. The original findings are retained as the before record; extended contexts and historical retrieval remain incomplete.
