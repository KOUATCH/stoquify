# Compliance authorization DOCX validation — 2026-08-18

Source: `docs/Compliance/Complaince authorization validation.docx`  
Stable source SHA-256: `cdca6c7d2bf6513b84301713e529cfea9d6dc8f218a4acdb8d51bc538d626f3f`  
Bytes: `464884`  
Last modified UTC: `2026-08-18T03:10:28.3890841Z`  
Validation time: `2026-08-18T04:44:09.8632269Z`

Verdict: **stable and readable, but rejected as gate signature evidence**.

Two complete reads produced the same SHA-256. The source was not locked during this validation and was not modified.

## Package and signature inspection

| Test | Result | Classification |
| --- | --- | --- |
| OOXML package entries | 19 | `VERIFIED_REPOSITORY_FACT` |
| OOXML digital-signature parts | 0 | `VERIFIED_REPOSITORY_FACT` |
| Certificate relationships | 0 | `VERIFIED_REPOSITORY_FACT` |
| Signature-origin relationships | 0 | `VERIFIED_REPOSITORY_FACT` |
| Detached-signature references | 0 | `VERIFIED_REPOSITORY_FACT` |
| Immutable approval identifiers | 0 | `VERIFIED_REPOSITORY_FACT` |
| Handwritten-signature-like media | 2 JPEG files | byte presence verified; signer/authority unverified |

The media files are:

- `word/media/image1.jpeg`: `268495` bytes, SHA-256 `aa77607039406b919bef4d65fc16424aea9f45b10de39fa47415a98a1e8a864a`.
- `word/media/image2.jpeg`: `180993` bytes, SHA-256 `cdfd3824056ea30ea941c0ed8395cf75ad07d632e53e1c7812c59c9f64072b29`.

Both images appear in the same unlabelled drawing paragraph immediately before a separate Maker/Checker name section. The OOXML has no trustworthy relationship tying either image to a named person, role, target hash, decision, scope, fresh-authentication event, or signing time. Their presence is a repository fact; treating them as a verified signature would be unsupported.

## Identity and role reconciliation

| Observed value | Document assertion | Classification | Gate use |
| --- | --- | --- | --- |
| SANGO MALO | Migration operator; Database administrator / engineering lead | `VERIFIED_HUMAN_DECLARATION_NOT_GATE_APPROVAL` | Name/asserted role only; no maker signature credit |
| MAXIMILLIANO BONGA | Migration checker; Database administrator / engineering lead | `VERIFIED_HUMAN_DECLARATION_NOT_GATE_APPROVAL` | Name/asserted role only; no checker decision credit |
| Tamen Marceline | Maker | `CONFLICTING_EVIDENCE` | Conflicts with the SANGO MALO maker proposal |
| Yonga Springfield | Checker | `CONFLICTING_EVIDENCE` | Conflicts with the MAXIMILLIANO BONGA checker proposal |
| KOUATCHOUA MARK | Product approver; Product Owner or Financial Controller | `ROLE_OR_AUTHORITY_UNVERIFIED` | Author/declarant only; no D-01–D-11 approval credit |
| KOUATCHOUA MARCELINE | Controller approver; SYSTEM ADMINISTRATION | `ROLE_OR_AUTHORITY_UNVERIFIED` | Does not prove financial-controller authority |
| DGI / MINFI / CNPS | Signature labels | `MISSING` | Organization labels are not individual qualified signers |
| Qualified Cameroon reviewer | Not identified | `MISSING` | G3B remains blocked |
| Independent Cameroon checker | Not identified | `MISSING` | G3B remains blocked |

Package metadata naming `KOUATCHOUA MARK` as creator and last modifier is authorship metadata, not authenticated approval intent.

## Binding and timing defects

- The current source hash is `cdca6c7d...`; historical `499b...` and `f373...` values are stale for the current bytes.
- The document simultaneously declares a localhost development-only certification schema and production/statutory authorization, so the scope is internally conflicting.
- The supplied `2026-08-17T08:00:00Z` operator/checker timestamps predate later evidence and do not bind the current final hashes.
- No approval binds the frozen G1 contract SHA-256 `11434eb3e1af1826516426e90d2d53a2faa47ade361d91191b5f3e0c950a36db` or any specific D-01–D-11 selected option.
- No maker/checker decision binds all 13 destructive finding hashes, a final evidence manifest, production target census, backup, or restore proof.

## Gate disposition

| Gate/control | Permitted use | Approval credit | Result |
| --- | --- | ---: | --- |
| G1 D-01–D-11 | Identity/scope declaration only | 0 | `BLOCKED_0_OF_11` |
| Destructive migration | Conflicting named parties and image-byte evidence only | 0 | Exact-hash maker/checker approval absent |
| Authentication attestation | Names and historical timestamps only | 0 | Fresh-auth/immutable identity proof absent |
| Cameroon country pack | Requested scope and organization labels only | 0 | Qualified reviewer/checker absent |
| Hardware | Simulation-scope declaration only | 0 | Physical proof or signed production exclusion absent |

No production, statutory, provider, hardware, human-approval, migration, or pilot gate is lifted by this DOCX. Safe cash-only, synthetic, non-statutory development may continue under the existing fail-closed scope.

