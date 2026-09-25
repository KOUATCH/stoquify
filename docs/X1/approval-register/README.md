# Stoquify local X1 approval register

This register prepares the paperwork and records for actual local X1 approvals. Fill the Word forms, sign the approval PDFs, and have the appointed document controller verify and seal the records. You do not need a commercial approval subscription. The register starts with four draft records and grants no approval until the required people act.

## Start here

Open `Open-Register.cmd` in this folder. It starts a numbered Windows menu. The manager uses the existing bundled Node and Python runtimes; Word is needed only to edit the forms and export printable PDFs. Windows PowerShell supplies the local certificate store. If your organization's script-execution policy blocks the manager, have its administrator approve the script through the normal process; the launcher does not weaken that policy.

| Packet | Person who acts | What their decision covers |
| --- | --- | --- |
| Adoption | Authorized owner, candidate Mireille Nkoa | Recognizes the register, controller, manual verification method, authority appointments, retention, backup and bounded automation. |
| Product | Product authority, candidate Kouatchoua Mark | Accepts, rejects or revises the specified X1 performance budgets. |
| Evidence | Security/control owner, candidate Yonga Springfield | Authorizes the named fixture account, tenant, seeded data, read-only isolation probe and evidence scope. |
| Independent | Independent reviewer authority, candidate Sonkeng Steve | Accepts the independent-review delegation; this does not approve future evidence in advance. |

Names and account mappings come from the recorded read-only database context. They identify candidates, not proof of authority. If an actual signer differs, stop and reconcile the mapping explicitly before issuing a replacement packet. Do not impersonate a fixture persona or edit a user ID to obtain approval.

## Folder layout

```text
approval-register/
  README.md                         This guide
  README.pdf                        Printable guide
  Open-Register.cmd                  Open the numbered manager
  Manage-Register.ps1                Manager and controller attestation
  register.json                     Reserved IDs, scope and candidate mappings
  audit-head.json                   Latest local history checkpoint
  controllers/
    controller-public.json          Created when the controller enrolls
  records/
    <issued-record-id>/
      approval-record.json          Permanent draft allocation and exact scope
      approval-form.docx            Approver fills this
      approval-form-unsigned.pdf    Printable draft, never evidence of signing
      controller-review.docx        Controller fills this after checking signing
      controller-review-unsigned.pdf
      approver-input.json           Imported automatically from the Word form
      verification-input.json       Imported automatically from controller review
      signed-approval.pdf           Supplied by the human signing process
      authority-evidence.pdf        Required for the adoption packet only
      signature-verification.json   Pending initially; sealed after verification
      pending-attestation.json      Exact content the controller will attest
      revocation.json               Exists only if the record is revoked
  events/                           Numbered history with linked hashes
  exports/<export-id>/
    approval-manifest.json          Record, signature, hash and expiry references
    finance-x1-approval-binding.json Input for the existing evidence workflow
```

The system deliberately does not create empty `signed-approval.pdf` or `authority-evidence.pdf` files. Only real signed and authority evidence belongs at those locations. Record IDs are reserved by the register; they are actual draft tracking IDs, not approval decisions. The status of an allocated record is determined by its verified receipt and current validity, not by editing `approval-record.json`.

## The completion sequence

1. **Appoint the document controller.** Use menu option 1 under that person's Windows account. Enter their real name. The manager creates a non-exportable local certificate key in `CurrentUser\\My`, stores only its public certificate in the register, and fills the controller name and fingerprint into the unsealed Word forms. Enrollment is not approval. The owner must recognize this controller in the adoption decision.
2. **Complete adoption first.** Open its `approval-form.docx`. Confirm the scope and authority appointments. Fill the yellow decision, real authority reference, actual signing time, expiry, retention days and separate backup location. Attach the actual appointment, ownership or delegation evidence as `authority-evidence.pdf`. A database role or typed assertion alone is not that evidence.
3. **Sign the adoption approval.** Menu option 3 exports printable unsigned PDFs. Use the accepted manual signing process and retain the signed copy as `signed-approval.pdf`. Do not merely rename the unsigned export. Record the real signing time with timezone. If the time was written on paper, copy that actual value into the Word form before controller review; do not alter the signed PDF.
4. **Complete the separate controller review.** In `controller-review.docx`, describe how the actual identity, authority, signature, decision scope and signing time were checked. Include concrete evidence references. The controller must compare the filled Word form and signed PDF, including all dates, IDs, contract hashes and decisions.
5. **Seal adoption.** Choose menu option 4 and `adoption`. The manager imports the forms, checks required files, shows the PDF hash and asks the controller to type `VERIFY` followed by the exact issued record ID. Only do this after the stated checks. The Windows key signs the verification receipt. The software verifies that attestation; it does not automatically authenticate a handwriting image.
6. **Complete and seal the other three packets.** Each appointed person fills and signs their approval form. The controller completes each separate review, then seals `product`, `evidence` and `independent` using option 4. Their actual signing times must follow adoption, and their expiries cannot exceed adoption's expiry. REJECT and REVISE are preserved and block synchronization.
7. **Check completion.** Menu option 5 lists precise missing fields or failed checks. Once all four records pass, menu option 6 writes a new approval manifest and an X1 evidence binding. It never fabricates screenshots or grants production release.
8. **Capture fresh evidence.** The generated binding can be supplied to the existing X1 preflight and capture workflow. Use the exact authorized origin, tenant and external-accountant persona. A new run must occur after both actual product and evidence signing times. Independent review of the resulting run remains required.

The manager does not send email, contact a paid service, reset the database, change users or permissions, generate passwords, or sign an approval on an approver's behalf. The controller's explicit action seals their verification of an already signed decision.

## What to fill and what the system supplies

| Value | Source |
| --- | --- |
| Register name, record ID, record URI | Allocated automatically. Already included in the record and form. |
| Database, tenant, probe tenant, account mapping, contract and bundle hashes | Prefilled from repository and recorded database context. |
| Real decision | Appointed approver selects APPROVE, REJECT or REVISE. |
| Authority evidence | Actual appointment, delegation or ownership record; root adoption records later appointments. |
| Signing time and expiry | Actual signing process and authorized validity decision, entered with timezone. |
| Signature and signature verification | Human signing process, followed by the controller's documented review and explicit seal. |
| Retention and backup | Owner supplies these in adoption. Retention is recorded; automatic deletion is not enabled. |
| PDF hashes, verification reference, registration timestamp | Computed or issued automatically after the controller acts. |
| X1 intake values | Exported by synchronization from the verified records. |

For the nine X1 intake fields, the product record supplies the decision, record ID, actual signing timestamp and `<record-id>#controller-attestation`. The evidence record supplies the security decision, `<record-id>#credential-use`, `<record-id>#seeded-data`, actual signing timestamp and its controller-attestation reference. Both evidence clauses appear explicitly in the signed authorization form. These are identifiers for this local register, not IDs from an external signing provider.

## Important operating rules

- The private key remains in the enrolled controller's Windows certificate store. Do not export keys, put credentials in this folder, or let automation impersonate the controller.
- Do not change a sealed record, signed PDF, filled form, imported input or verification receipt. Changes invalidate the checks. Use menu option 7 for a signed revocation, preserve the old record, then issue a reviewed replacement package.
- Protect the whole register with Windows access controls and maintain the separate backup named in adoption. Copy audit checkpoints to that backup. Hash-linked local files detect inconsistencies but do not provide external timestamping or protect against a machine administrator rewriting all local state.
- The certificate is local and self-issued. It proves possession of the enrolled key, not an independently certified identity or qualified electronic signature. The adopted process and retained human verification supply the identity and authority basis for this local scope.
- Adoption's actual authority reference must exist. Signing this form does not manufacture a prior ownership or appointment record.
- The earlier unsigned form proposed 900 days. Choose the actual expiry deliberately. All decisions must remain within adoption validity and controller certificate validity; a material contract change needs a new approved package.
- The current fixture scope is limited to `stoquify_replay_next_20260830`, `rds_org_001`, read-only probe `rds_org_002`, and `http://127.0.0.1:3000`. The register does not authorize production deployment.
- Existing legacy provider configuration and the simulator remain separate. This manual path does not need fake service-principal IDs or a commercial provider. It is explicitly selected with `--local-register`.
- The existing schema calls an accepted budget flag `productionBudgetsApproved`. The exported sidecar explains that this means the budget decision is present; this local package still grants no production release authority.
- Signed files and personal review records are excluded from ordinary repository staging. The register needs a separate controlled backup. Do not treat a source-code checkout alone as archival storage.

## Commands for the implementation team

The Windows menu handles routine work. Equivalent repository-root commands are:

```powershell
node scripts/x1-local-approval-register.js report
npm run table:x1:approval:create -- --local-register
npm run table:x1:approval:sync -- --local-register
```

The create command preserves an existing register and reserved IDs. Turn off simulator mode before selecting the manual register. A successful synchronization prints the exact new binding path. To capture after approval, set that path as `FINANCE_X1_EVIDENCE_APPROVAL_MANIFEST`, generate a new `FINANCE_X1_EVIDENCE_RUN_ID`, and supply the approved storage-state path. Set `FINANCE_X1_FOREIGN_TENANT_ID=rds_org_002` and `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000`, then run the existing evidence preflight and capture commands.

The preflight rechecks local register exports against current controller signatures, hashes, decisions, expiry and revocation before capture. A copied or altered export is not a way around a revoked approval. The 42 earlier local screenshots remain local test evidence.

## Current status

The supplied package contains draft records and unsigned forms. No person has been enrolled, no signature has been applied, and no real approval has been inferred by constructing it. Once the actual decisions, signatures and controller checks are complete, the system can supply the missing approval references and advance to fresh authorized evidence capture. Passing capture, performance assessment and independent review still determine whether X1 can be completed.
