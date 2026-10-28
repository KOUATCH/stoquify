# Hardware Compliance Matrix — Filled with supplied credentials

Packet: `STOQUIFY-POS-PROD-GATE-20260817-01`

## Supplied DOCX signature assessment

The supplied DOCX does not contain an artifact-bound product/controller signature, physical-device execution evidence or a signed production exclusion. It supports only the already-declared simulation scope. Hardware status remains `SIMULATION_ONLY`. Assessment: `docs/pos-enterprise-grade-audit/evidence/migration-certification/2026-08-17/compliance-authorization-document-validation.json`.

- Location: `Douala Akwa Development Certification Store (loc_cm_dla_akwa_cert_001)`
- Terminal: `Douala Akwa Certification Terminal 01 (term_cm_dla_akwa_cert_001)`
- Drawer: `Douala Akwa Certification Cash Drawer 01 (drawer_cm_dla_akwa_cert_001, DRAWER-CERT-001)`
- Hardware scope: `Simulated desktop POS (keyboard + mouse only)`
- OS: `Microsoft Windows 10 Pro`
- OS build: `10.0.26200.9168 / 25H2`
- Browser: `Microsoft Edge 151.0.4129.86` (alt `Google Chrome 151.0.7922.138`)

Known scope restrictions from packet:
- Receipt output limited to browser print preview and PDF.
- No physical receipt printer, cash-drawer kick interface, barcode scanner, payment terminal, customer display, or offline device certified.

Approvals:
- Product approver: `KOUATCHOUA MARK` (`Product Owner or Financial Controller`)
- Product approval timestamp: `2026-08-17T08:00:00Z`
- Controller approver: `KOUATCHOUA MARCELINE` (`SYSTEM ADMINISTRATION`)
- Controller approval timestamp: `2026-08-17T08:00:00Z`

Recommended device row conclusion (for this packet):
- Printer: `EXCLUDED`
- Cash drawer: `EXCLUDED`
- Scanner: `EXCLUDED`
- Customer display: `EXCLUDED`
- Payment terminal: `EXCLUDED`
- Offline device: `EXCLUDED`

Pending closure fields:
- Explicit dual signatures confirming this hardware scope is intentional.
- If production rollout later needs hardware certification, create a separate packet:
  - `TICKET: PHW-01` (printer and drawer)
  - `TICKET: PHW-02` (scanner)
  - `TICKET: PHW-03` (customer display)
  - `TICKET: PHW-04` (payment terminal and payout error states)
  - `TICKET: PHW-05` (offline sync and replay)

Matrix status:
- Current compliance claim: `SIMULATION_ONLY`
- Release implication: this cannot satisfy `G3A` full hardware evidence requirement without additional I/O evidence.
