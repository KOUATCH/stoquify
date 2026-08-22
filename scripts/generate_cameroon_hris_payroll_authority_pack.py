"""Generate the Cameroon HRIS/payroll authority evidence assessment pack.

This script is intentionally report-only. It reads repository evidence, writes only
under docs/blockers-and-gates/cameroon-hris-payroll-authority, and never mutates
the live G1 approval register, HRIS data, or the frozen G1 contract.
"""

from __future__ import annotations

import hashlib
import json
import sys
from collections import Counter
from pathlib import Path
from typing import Any, Iterable

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts import generate_landing_innovation_pdfs as pdf_base


OUT = ROOT / "docs" / "blockers-and-gates" / "cameroon-hris-payroll-authority"
SOURCES = OUT / "sources"
TEMPLATES = OUT / "templates"
DATE = "2026-08-19"
GENERATED_AT = "2026-08-19T15:30:00Z"

CONTRACT_PATH = ROOT / "docs" / "pos-enterprise-grade-audit" / "EXECUTION_06_G1_CONTRACT_FREEZE_V0_2_0.json"
LIVE_REGISTER_PATH = ROOT / "docs" / "pos-enterprise-grade-audit" / "EXECUTION_06_G1_CONTRACT_APPROVAL_REGISTER.json"
FINALIZATION_PATH = ROOT / "docs" / "blockers-and-gates" / "G1_33_OBLIGATION_FINALIZATION_REGISTER_2026-08-19.json"
PREFILL_PATH = ROOT / "docs" / "blockers-and-gates" / "COMPLIANCE_AUTHORIZATION_G1_PREFILL_STATUS_2026-08-19.json"
UNRESOLVED_PATH = ROOT / "docs" / "blockers-and-gates" / "COMPLIANCE_AUTHORIZATION_G1_UNRESOLVED_FIELDS_2026-08-19.json"
SOURCE_DOCX_PATH = ROOT / "docs" / "Compliance" / "Complaince authorization validation.docx"
WORKING_DOCX_PATH = ROOT / "docs" / "blockers-and-gates" / "COMPLIANCE_AUTHORIZATION_VALIDATION_G1_COMPLETION_FORM_2026-08-19.docx"

WARNING = "LEGAL REVIEW REQUIRED — not a legal-compliance certification."
TEMPLATE_WARNING = "UNSIGNED TEMPLATE — NOT AUTHORITY OR APPROVAL EVIDENCE"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.rstrip() + "\n", encoding="utf-8")


def write_json(path: Path, value: Any) -> None:
    write_text(path, json.dumps(value, indent=2, ensure_ascii=False))


def esc(value: Any) -> str:
    text = "" if value is None else str(value)
    return text.replace("|", "\\|").replace("\n", "<br>")


def table(headers: list[str], rows: Iterable[Iterable[Any]]) -> str:
    materialized = [list(row) for row in rows]
    return "\n".join(
        [
            "| " + " | ".join(headers) + " |",
            "| " + " | ".join("---" for _ in headers) + " |",
            *("| " + " | ".join(esc(cell) for cell in row) + " |" for row in materialized),
        ]
    )


def bullets(items: Iterable[str]) -> str:
    return "\n".join(f"- {item}" for item in items)


def repository_evidence() -> list[dict[str, Any]]:
    paths = [
        CONTRACT_PATH,
        LIVE_REGISTER_PATH,
        FINALIZATION_PATH,
        PREFILL_PATH,
        UNRESOLVED_PATH,
        SOURCE_DOCX_PATH,
        WORKING_DOCX_PATH,
        ROOT / "prisma" / "schema.prisma",
        ROOT / "prisma" / "migrations" / "20260719190000_hris_org_manager_scope_foundation" / "migration.sql",
        ROOT / "services" / "hris" / "org.service.ts",
        ROOT / "lib" / "security" / "auth-session.ts",
        ROOT / "services" / "security" / "step-up-auth.service.ts",
        ROOT / "scripts" / "pos-g1-contract-gate.js",
        ROOT / "graphify-out" / "GRAPH_REPORT_actions.md",
    ]
    return [
        {
            "path": rel(path),
            "sha256": sha256(path),
            "bytes": path.stat().st_size,
            "classification": "VERIFIED_REPOSITORY_ARTIFACT",
        }
        for path in paths
    ]


def legal_sources() -> list[dict[str, Any]]:
    definitions = [
        {
            "sourceId": "CM-LAB-001",
            "title": "Law No. 92/007 of 14 August 1992 issuing the Cameroon Labour Code",
            "issuingAuthority": "Republic of Cameroon",
            "host": "ILO NATLEX controlled repository",
            "instrumentNumber": "Law No. 92/007",
            "publicationDate": "1992-08-14",
            "effectiveDate": None,
            "language": "English",
            "officialUrl": "https://natlex.ilo.org/dyn/natlex2/natlex2/files/download/31629/CMR-31629%20%28EN%29.pdf",
            "localName": "cameroon-labour-code-law-92-007-en-natlex.pdf",
            "relevantSections": ["23-29", "44", "67-69", "80", "95-100", "114-116"],
            "use": "Employment relationship, conditional writing rules, probation, termination certificate, wage evidence, workplace health, labour-inspector declarations, manpower reporting and employer register.",
            "sourceClass": "AUTHORITATIVE_CROSS_CHECK_NOT_CERTIFIED_GAZETTE_COPY",
            "supersessionStatus": "Current consolidated legal status and implementing instruments must be confirmed with MINTSS or qualified Cameroon counsel.",
        },
        {
            "sourceId": "CM-CNPS-001",
            "title": "CNPS Recueil des textes de base",
            "issuingAuthority": "Caisse Nationale de Prévoyance Sociale du Cameroun",
            "host": "CNPS",
            "instrumentNumber": "Compilation including Decree No. 74-733 of 19 August 1974",
            "publicationDate": "2021",
            "effectiveDate": None,
            "language": "French",
            "officialUrl": "https://www.cnps.cm/images/parutions/recueiltextesbasecnps2021.pdf",
            "localName": "cnps-recueil-textes-base-2021.pdf",
            "relevantSections": ["Decree 74-733, Articles 5-16"],
            "use": "Worker registration, insurance number/booklet, hiring and cessation notice, contribution responsibility, nominative statements and individual insured accounts.",
            "sourceClass": "OFFICIAL_REGULATOR_COMPILATION",
            "supersessionStatus": "Confirm later amendments and current e-filing procedure with CNPS before operational use.",
        },
        {
            "sourceId": "CM-CNPS-002",
            "title": "CNPS Avis d'embauche / de cessation d'emploi d'un travailleur",
            "issuingAuthority": "Caisse Nationale de Prévoyance Sociale du Cameroun",
            "host": "CNPS",
            "instrumentNumber": "COM/DECT/CNPS/2021",
            "publicationDate": "2021",
            "effectiveDate": None,
            "language": "French and English",
            "officialUrl": "https://www.cnps.cm/images/pdf/Avisdembaucheduntravailleurdecessationdemploiduntravailleur.pdf",
            "localName": "cnps-avis-embauche-cessation.pdf",
            "relevantSections": ["Official form fields and instructions"],
            "use": "Official evidence format for employer, worker, hiring/cessation date and company signature/stamp.",
            "sourceClass": "OFFICIAL_REGULATOR_FORM",
            "supersessionStatus": "Confirm that this remains the accepted form or approved electronic equivalent.",
        },
        {
            "sourceId": "CM-CNPS-003",
            "title": "Charte du client CNPS 2024 — revised",
            "issuingAuthority": "Caisse Nationale de Prévoyance Sociale du Cameroun",
            "host": "CNPS",
            "instrumentNumber": None,
            "publicationDate": "2024",
            "effectiveDate": None,
            "language": "French",
            "officialUrl": "https://www.cnps.cm/images/charte-du-client-cnps-2024-revue.pdf",
            "localName": "cnps-charte-client-2024-revue.pdf",
            "relevantSections": ["Employer rights and obligations"],
            "use": "Operational guidance on employer/worker registration, declarations, contributions, hiring/cessation notices and receipts.",
            "sourceClass": "OFFICIAL_REGULATOR_GUIDANCE",
            "supersessionStatus": "Operational guidance; underlying legislation controls if inconsistent.",
        },
        {
            "sourceId": "CM-DGI-001",
            "title": "Code Général des Impôts — Edition 2024",
            "issuingAuthority": "Direction Générale des Impôts, Ministère des Finances",
            "host": "DGI Cameroon",
            "instrumentNumber": "CGI 2024",
            "publicationDate": "2024",
            "effectiveDate": "2024-01-01",
            "language": "French",
            "officialUrl": "https://www.impots.cm/sites/default/files/documents/CGI%202024%20version%20francaise.pdf",
            "localName": "dgi-code-general-impots-2024-fr.pdf",
            "relevantSections": ["Articles 30-33", "81-84", "101-102"],
            "use": "Salary-tax base, employer withholding, payslip notation, remittance/DIPE and annual employee-level reporting.",
            "sourceClass": "OFFICIAL_TAX_CODE_EDITION",
            "supersessionStatus": "Must be reconciled with Finance Laws and DGI guidance for 2025 and 2026 before calculations or filing.",
        },
        {
            "sourceId": "CM-DGI-002",
            "title": "Circular of Finance Law 2026",
            "issuingAuthority": "Direction Générale des Impôts, Ministère des Finances",
            "host": "DGI Cameroon",
            "instrumentNumber": "Finance Law implementation circular 2026",
            "publicationDate": "2026-03",
            "effectiveDate": "2026",
            "language": "English",
            "officialUrl": "https://www.impots.cm/sites/default/files/publications/circulaire%20lf%202026%20VA%20%281%29-compress%C3%A9.pdf",
            "localName": "dgi-circulaire-loi-finances-2026-en.pdf",
            "relevantSections": ["Current-law supersession review; image-based edition"],
            "use": "Current-source check. No payroll interpretation is asserted from automated extraction; qualified review must reconcile it with CGI 2024.",
            "sourceClass": "OFFICIAL_CURRENT_TAX_GUIDANCE",
            "supersessionStatus": "Current review source; legal/payroll specialist must identify payroll-affecting changes.",
        },
        {
            "sourceId": "OHADA-ACC-001",
            "title": "Acte uniforme relatif au droit comptable et à l'information financière (AUDCIF)",
            "issuingAuthority": "OHADA Council of Ministers",
            "host": "OHADA",
            "instrumentNumber": "AUDCIF adopted 26 January 2017",
            "publicationDate": "2017-02-15",
            "effectiveDate": "2018-01-01",
            "language": "French",
            "officialUrl": "https://www.ohada.org/acte-uniforme-relatif-au-droit-comptable-et-a-linformation-financiere-audcif/",
            "localName": "ohada-audcif-official-page.html",
            "relevantSections": ["Official adoption, publication and effective-date notice"],
            "use": "Accounting framework and recordkeeping context for payroll journals and financial reporting; not proof of employment or G1 authority.",
            "sourceClass": "OFFICIAL_SUPRANATIONAL_ACCOUNTING_SOURCE",
            "supersessionStatus": "Confirm detailed accounting treatment with a qualified OHADA/SYSCOHADA reviewer.",
        },
    ]
    result = []
    for item in definitions:
        source_path = SOURCES / item.pop("localName")
        result.append(
            {
                **item,
                "retrievedAt": GENERATED_AT,
                "localPath": rel(source_path),
                "bytes": source_path.stat().st_size,
                "sha256": sha256(source_path),
                "reviewStatus": "LEGAL_REVIEW_REQUIRED",
                "reviewer": None,
            }
        )
    return result


def document_requirements() -> list[dict[str, Any]]:
    return [
        {"id":"CAM-EMP-01","document":"Enterprise opening/change/closure declaration","class":"STATUTORY_MANDATORY","basis":"Labour Code s.114","issuer":"Employer to local Labour Inspectorate","proves":"Declared establishment status","g1Use":"Employer provenance only","action":"Obtain filed copy and receipt; verify legal entity and establishment scope."},
        {"id":"CAM-EMP-02","document":"Manpower situation declaration","class":"STATUTORY_MANDATORY","basis":"Labour Code s.115; implementing order to verify","issuer":"Employer to labour/employment services","proves":"Reported workforce population","g1Use":"Cross-check employee population; not role authority","action":"Obtain latest accepted return and current filing rule."},
        {"id":"CAM-EMP-03","document":"Employer's register","class":"STATUTORY_MANDATORY_SUBJECT_TO_IMPLEMENTING_RULES","basis":"Labour Code s.116","issuer":"Employer; available to control officials","proves":"Current employment-control information","g1Use":"Employment cross-check","action":"Obtain current register, applicable form/order and restricted evidence extract."},
        {"id":"CAM-EMP-04","document":"Employment relationship evidence","class":"STATUTORY_EVIDENCE","basis":"Labour Code ss.23-24","issuer":"Employer and worker","proves":"Service under employer authority for remuneration","g1Use":"Employment layer only","action":"Collect contract or other admissible evidence; use written contracts as the controlled HRIS source."},
        {"id":"CAM-EMP-05","document":"Written employment contract when legally required","class":"CONDITIONAL_STATUTORY_MANDATORY","basis":"Labour Code s.27","issuer":"Employer and worker; Labour Inspector/Minister where applicable","proves":"Terms for specified-duration >3 months, displacement or foreign worker","g1Use":"Employment status and scope","action":"Classify each worker; obtain inspector copy/foreign-worker endorsement where applicable."},
        {"id":"CAM-EMP-06","document":"Written probationary hiring record","class":"CONDITIONAL_STATUTORY_MANDATORY","basis":"Labour Code s.28","issuer":"Employer and worker","proves":"Probation terms and duration","g1Use":"Prevents treating probation as settled authority without review","action":"Collect if applicable and block long-lived control appointment beyond employment authority."},
        {"id":"CAM-EMP-07","document":"Internal regulations and Labour Inspector endorsement","class":"CONDITIONAL_STATUTORY_MANDATORY","basis":"Labour Code s.29; threshold/order to verify","issuer":"Company head; staff representatives; Labour Inspector","proves":"Approved work, discipline, safety and hygiene rules","g1Use":"Governance context only","action":"Determine workforce threshold and obtain endorsed version if applicable."},
        {"id":"CAM-EMP-08","document":"Employment certificate at departure","class":"STATUTORY_MANDATORY","basis":"Labour Code s.44","issuer":"Employer","proves":"Entry/departure dates and posts held","g1Use":"Terminates/supersedes active authority eligibility","action":"Capture termination certificate reference and immediately revoke control assignments."},
        {"id":"CAM-PAY-01","document":"Wage-payment evidence and individual pay voucher","class":"STATUTORY_MANDATORY","basis":"Labour Code ss.68-69","issuer":"Employer","proves":"Wage period, payment and worker-level voucher","g1Use":"Payroll status only","action":"Retain evidence under restricted access; do not use voucher signature as G1 approval."},
        {"id":"CAM-HS-01","document":"Occupational-health service and examination evidence","class":"STATUTORY_OR_CONDITIONAL_REQUIREMENT","basis":"Labour Code ss.98-100 and implementing orders","issuer":"Approved occupational-health provider/employer","proves":"Required medical service/examination completion","g1Use":"No control-role authority","action":"Confirm applicable orders; store only status/reference, not unnecessary medical details."},
        {"id":"CAM-CNPS-01","document":"CNPS employer registration","class":"OFFICIAL_STATUTORY_REGISTRATION","basis":"CNPS law/procedure","issuer":"CNPS","proves":"Employer registration with CNPS","g1Use":"Employer provenance","action":"Obtain employer number and CNPS-issued confirmation; mask in general reports."},
        {"id":"CAM-CNPS-02","document":"CNPS worker registration and insurance number","class":"OFFICIAL_STATUTORY_REGISTRATION","basis":"Decree 74-733 arts.5-8; current procedure to verify","issuer":"CNPS","proves":"Worker's CNPS insurance identity/history","g1Use":"Employment cross-check only","action":"Obtain CNPS confirmation with consent/authority; store masked value and keyed hash, never as app subject ID."},
        {"id":"CAM-CNPS-03","document":"CNPS hiring/cessation notice","class":"OFFICIAL_STATUTORY_NOTICE","basis":"Decree 74-733 art.9; CNPS official form","issuer":"Employer to CNPS","proves":"Hiring/cessation date reported to CNPS","g1Use":"Effective-date and revocation cross-check","action":"Obtain filed notice and acceptance/receipt; reconcile the applicable filing deadline with CNPS."},
        {"id":"CAM-CNPS-04","document":"Insurance booklet or CNPS individual account evidence","class":"OFFICIAL_SOCIAL_INSURANCE_RECORD","basis":"Decree 74-733 arts.7-8,16","issuer":"CNPS; employer annotations where prescribed","proves":"Employment periods and monthly insured salary history","g1Use":"Employment corroboration","action":"Use a redacted verification result; never expose family or identity data unnecessarily."},
        {"id":"CAM-CNPS-05","document":"Nominative salary/contribution declaration","class":"STATUTORY_MANDATORY","basis":"Decree 74-733 arts.13-15; current e-filing procedure to verify","issuer":"Employer to CNPS","proves":"Worker list, insurance numbers and remuneration base","g1Use":"Payroll-employment tie-out","action":"Obtain accepted declaration and reconcile employee/status counts."},
        {"id":"CAM-CNPS-06","document":"CNPS contribution payment receipt","class":"STATUTORY_PAYMENT_EVIDENCE","basis":"CNPS contribution rules and official account","issuer":"CNPS/payment provider","proves":"Declared contribution payment","g1Use":"Payroll compliance status only","action":"Reconcile receipt to declaration and period; independently verify source."},
        {"id":"CAM-TAX-01","document":"Payslip salary-tax notation","class":"STATUTORY_MANDATORY","basis":"CGI 2024 art.81; 2026 reconciliation required","issuer":"Employer","proves":"Tax withheld on taxable remuneration","g1Use":"Payroll status only","action":"Confirm current 2026 rule/rates; retain payslip under employee-confidential access."},
        {"id":"CAM-TAX-02","document":"Payroll-tax remittance and DIPE evidence","class":"STATUTORY_MANDATORY","basis":"CGI 2024 arts.82-84; 2026 reconciliation required","issuer":"Employer to DGI","proves":"Withheld tax remittance and payroll declaration","g1Use":"Payroll compliance status only","action":"Obtain DGI-generated filing/payment evidence and reconcile period totals."},
        {"id":"CAM-TAX-03","document":"Annual employee remuneration declaration","class":"STATUTORY_MANDATORY","basis":"CGI 2024 arts.101-102; 2026 reconciliation required","issuer":"Employer to DGI","proves":"Employee-level annual remuneration declaration","g1Use":"Employee/payroll cross-check","action":"Obtain accepted filing; validate legal identity and tax-ID treatment under restricted access."},
        {"id":"CAM-ACC-01","document":"Payroll journals and SYSCOHADA accounting records","class":"ACCOUNTING_REQUIREMENT","basis":"AUDCIF/SYSCOHADA; detailed treatment review required","issuer":"Employer accounting function","proves":"Payroll financial recognition and audit trail","g1Use":"Accounting-role context, not appointment","action":"Tie payroll register to journals and obtain qualified reviewer conclusion."},
        {"id":"CAM-CBA-01","document":"Applicable collective agreement determination","class":"LEGAL_APPLICABILITY_DECISION","basis":"Labour Code ss.52-56","issuer":"Qualified labour reviewer/governance","proves":"Sector/territory agreement applicability","g1Use":"Qualification and employment terms","action":"Determine Stoquify legal entity, sector and establishment before selecting an agreement."},
        {"id":"CAM-FOR-01","document":"Foreign-worker contract endorsement/work authorization","class":"CONDITIONAL_STATUTORY_MANDATORY","basis":"Labour Code ss.25(2),27(2)-(5),113","issuer":"Minister/MINTSS or competent authority","proves":"Authority for covered foreign worker to work","g1Use":"Employment eligibility only","action":"Classify nationality/work location; obtain endorsement before authority assignment if applicable."},
        {"id":"STQ-INT-01","document":"Identity-to-employee verification record","class":"INTERNAL_CONTROL_REQUIRED_FOR_G1","basis":"Stoquify identity and evidence control","issuer":"Authorized HR/security owner; independent checker","proves":"User.id belongs to the verified employee","g1Use":"Stable subject binding","action":"Verify legal identity, User.id, PayrollEmployee.id and tenant; store evidence hash and checker."},
        {"id":"STQ-INT-02","document":"Position and organizational assignment","class":"INTERNAL_HRIS_CONTROL","basis":"HrisPosition/HrisEmploymentAssignment","issuer":"Authorized HR owner","proves":"Position, unit, dates and status","g1Use":"Eligibility context only","action":"Create effective-dated assignment after employment evidence is verified."},
        {"id":"STQ-INT-03","document":"G1 control-role appointment","class":"INTERNAL_GOVERNANCE_CONTROL_REQUIRED_FOR_G1","basis":"Frozen G1 contract plus governance authority policy","issuer":"Authorized governance/corporate appointing authority","proves":"Exact canonical control role, scope and dates","g1Use":"Authority reference","action":"Issue signed/hash-bound appointment; independent verifier confirms issuer and scope."},
        {"id":"STQ-INT-04","document":"Delegation of G1 authority","class":"INTERNAL_GOVERNANCE_CONTROL","basis":"Approved delegation policy","issuer":"Authorized delegator and governance checker","proves":"Bounded temporary delegated authority","g1Use":"Delegated eligibility","action":"Record role, decision/scope, start/end, reason, evidence hash and non-conflict check."},
        {"id":"STQ-INT-05","document":"Delegation/appointment revocation","class":"INTERNAL_GOVERNANCE_CONTROL","basis":"Authority lifecycle policy","issuer":"Governance/HR/security owner","proves":"Authority no longer active","g1Use":"Immediate invalidation","action":"Revoke eligibility, invalidate affected unconsumed approvals and emit audited event."},
        {"id":"STQ-INT-06","document":"SoD and conflict-of-interest assessment","class":"INTERNAL_CONTROL_REQUIRED_FOR_G1","basis":"Approved G1 SoD/COI policy","issuer":"Independent controls reviewer","proves":"Assignment conflicts reviewed","g1Use":"Eligibility gate","action":"Evaluate all same-person combinations and evidence-producer/checker conflicts; never self-certify."},
        {"id":"STQ-INT-07","document":"Independent evidence verification record","class":"INTERNAL_ASSURANCE_CONTROL_REQUIRED_FOR_G1","basis":"Evidence-integrity policy","issuer":"Independent verifier","proves":"Artifact resolved, rehashed and matched","g1Use":"Approval-credit prerequisite","action":"Resolve immutable bytes, recompute SHA-256 and record pass/fail separately from producer."},
        {"id":"STQ-INT-08","document":"Fresh-authenticated approval envelope","class":"INTERNAL_APPROVAL_CONTROL_REQUIRED_FOR_G1","basis":"G1 validator and approved authentication policy","issuer":"Human approver through controlled workflow","proves":"Deliberate approval of exact decision/contract","g1Use":"Actual G1 approval","action":"Require fresh authentication, role eligibility, exact contract hash, decision option, timestamp and independent verification."},
    ]


def field_register() -> list[dict[str, Any]]:
    return [
        {"field":"tenantId","type":"string/cuid","source":"User.organizationId / Organization.id","owner":"IAM/platform","sensitivity":"INTERNAL","retention":"Authority lifetime + audit retention","validation":"Exact tenant match across user, employee, assignment, evidence and approval","verifier":"Security checker","expiry":"Organization deactivation","missing":"Block eligibility"},
        {"field":"stableSubjectId","type":"string/cuid","source":"User.id","owner":"IAM","sensitivity":"RESTRICTED","retention":"Account + audit retention","validation":"Active verified account; tenant match; not display name/email","verifier":"Security/HR checker","expiry":"Account revoked/deleted","missing":"Do not assign authority"},
        {"field":"employeeId","type":"string/cuid","source":"PayrollEmployee.id","owner":"HR","sensitivity":"RESTRICTED","retention":"Employment + statutory/audit retention","validation":"Tenant match, verified employment evidence, non-deleted","verifier":"HR checker","expiry":"Employment end does not erase history","missing":"Block authority"},
        {"field":"employeeNumber","type":"string","source":"PayrollEmployee.employeeNumber / employer register","owner":"HR","sensitivity":"RESTRICTED","retention":"Employment record retention","validation":"Unique within tenant; tie to employer register","verifier":"HR checker","expiry":"Never reused","missing":"Resolve before assignment"},
        {"field":"legalName","type":"string","source":"Verified identity and employment records","owner":"HR","sensitivity":"PERSONAL","retention":"Employment/legal retention","validation":"Exact controlled cross-check; variants recorded, not silently normalized","verifier":"HR/security checker","expiry":"Update on legal-name change with provenance","missing":"Block identity verification"},
        {"field":"identityVerificationReference","type":"URI/opaque ID","source":"Restricted HR identity evidence","owner":"HR/security","sensitivity":"HIGHLY_RESTRICTED","retention":"Policy/jurisdiction dependent","validation":"Resolvable, access-controlled, hash-bound","verifier":"Independent identity checker","expiry":"Document expiry/change","missing":"Block stable link"},
        {"field":"employerIdentifier","type":"string","source":"Organization/corporate records","owner":"Governance/legal","sensitivity":"INTERNAL","retention":"Entity life + audit","validation":"Legal entity and establishment scope","verifier":"Legal/governance checker","expiry":"Entity change","missing":"Block employer provenance"},
        {"field":"cnpsEmployerReference","type":"masked string + keyed hash","source":"CNPS employer registration","owner":"Payroll/compliance","sensitivity":"RESTRICTED","retention":"Statutory","validation":"CNPS-issued, legal-entity match","verifier":"Payroll checker","expiry":"CNPS status change","missing":"Flag statutory gap; do not synthesize"},
        {"field":"cnpsEmployeeReference","type":"masked string + keyed hash","source":"CNPS worker registration","owner":"Payroll/HR","sensitivity":"HIGHLY_RESTRICTED","retention":"Statutory","validation":"CNPS-issued and employee match; never app identity key","verifier":"Payroll checker","expiry":"Corrected/superseded record","missing":"Flag statutory gap"},
        {"field":"employmentContractReference","type":"opaque ID/URI","source":"Signed employment evidence","owner":"HR/legal","sensitivity":"HIGHLY_RESTRICTED","retention":"Employment + legal limitation period","validation":"Resolvable, parties/scope/dates match","verifier":"HR/legal checker","expiry":"Amendment/termination","missing":"Block verified-employment status"},
        {"field":"employmentContractSha256","type":"64-char hex","source":"Exact contract bytes","owner":"Evidence service","sensitivity":"INTERNAL","retention":"With contract metadata","validation":"Recompute and match","verifier":"Independent evidence checker","expiry":"Any byte change","missing":"Evidence remains unverified"},
        {"field":"employmentStatus","type":"enum","source":"PayrollEmployee.status + employment evidence","owner":"HR","sensitivity":"RESTRICTED","retention":"History retained","validation":"Effective-dated; termination/suspension rules","verifier":"HR checker","expiry":"Status event","missing":"Not eligible"},
        {"field":"positionId","type":"string/cuid","source":"HrisPosition.id","owner":"HR","sensitivity":"INTERNAL","retention":"Assignment history","validation":"Active/effective and tenant-scoped","verifier":"HR checker","expiry":"Position end","missing":"Block organizational context"},
        {"field":"orgUnitId","type":"string/cuid","source":"HrisOrgUnit.id","owner":"HR","sensitivity":"INTERNAL","retention":"Org history","validation":"Active/effective and tenant-scoped","verifier":"HR checker","expiry":"Unit end/reorganization","missing":"Block scoped authority"},
        {"field":"employmentAssignmentId","type":"string/cuid","source":"HrisEmploymentAssignment.id","owner":"HR","sensitivity":"RESTRICTED","retention":"Employment history","validation":"Employee, position and unit match; active period","verifier":"HR checker","expiry":"Assignment end/suspension","missing":"Control role cannot be activated"},
        {"field":"canonicalControlRole","type":"versioned code","source":"G1 authority-role catalog","owner":"Governance","sensitivity":"INTERNAL","retention":"Permanent catalog history","validation":"Exact canonical code; not job title/RBAC role","verifier":"Controls checker","expiry":"Policy version superseded","missing":"No G1 role match"},
        {"field":"authorityReference","type":"opaque ID/URI","source":"Signed appointment/resolution","owner":"Governance","sensitivity":"RESTRICTED","retention":"Authority + audit/legal retention","validation":"Issuer authorized; exact role/scope/dates/tenant; artifact hash match","verifier":"Independent governance checker","expiry":"End/revocation/policy drift","missing":"Zero approval credit"},
        {"field":"appointmentEvidenceSha256","type":"64-char hex","source":"Exact appointment bytes","owner":"Evidence service","sensitivity":"INTERNAL","retention":"With authority history","validation":"Recompute and match","verifier":"Independent evidence checker","expiry":"Any byte change","missing":"Authority unverified"},
        {"field":"delegationReference","type":"opaque ID/URI","source":"Controlled delegation instrument","owner":"Governance","sensitivity":"RESTRICTED","retention":"Delegation + audit retention","validation":"Delegator eligible; bounded role/scope/dates; no self-delegation","verifier":"Independent controls checker","expiry":"Mandatory end/revocation","missing":"No delegated eligibility"},
        {"field":"authorityScope","type":"structured JSON","source":"Appointment/delegation","owner":"Governance","sensitivity":"INTERNAL","retention":"Authority history","validation":"Tenant, decisions, locations/capabilities and exclusions explicit","verifier":"Controls checker","expiry":"Scope/policy change","missing":"Fail closed"},
        {"field":"effectiveFrom/effectiveTo","type":"timestamps","source":"Appointment/assignment/delegation","owner":"HR/governance","sensitivity":"INTERNAL","retention":"History","validation":"No inverted/future-invalid periods; approval time inside interval","verifier":"Independent checker","expiry":"At effectiveTo","missing":"No active eligibility"},
        {"field":"appointingAuthoritySubjectId","type":"string/cuid","source":"User.id plus corporate authority evidence","owner":"Governance","sensitivity":"RESTRICTED","retention":"Authority history","validation":"Issuer themselves authorized; no self-certification","verifier":"Independent governance checker","expiry":"Issuer authority change affects new appointments","missing":"Appointment invalid"},
        {"field":"sodResult","type":"PASS/FAIL/EXCEPTION_PENDING","source":"Independent SoD assessment","owner":"Internal controls","sensitivity":"RESTRICTED","retention":"Authority + audit retention","validation":"Policy-versioned matrix; producer/checker and maker/checker tested","verifier":"Independent controls reviewer","expiry":"Assignment/policy/team change","missing":"Block eligibility"},
        {"field":"coiResult","type":"PASS/FAIL/DISCLOSED_REVIEW_REQUIRED","source":"Signed COI declaration and review","owner":"Governance/HR","sensitivity":"HIGHLY_RESTRICTED","retention":"Policy/legal dependent","validation":"Current declaration; reviewer not subject","verifier":"Independent governance reviewer","expiry":"Periodic or event-driven renewal","missing":"Block where policy requires"},
        {"field":"qualificationEvidenceReference","type":"opaque ID/URI","source":"Professional/legal qualification evidence","owner":"Governance/compliance","sensitivity":"RESTRICTED","retention":"Qualification + audit retention","validation":"Issuer, scope, validity and Cameroon/accounting relevance","verifier":"Independent qualified reviewer","expiry":"Credential expiry/suspension","missing":"Block qualified-reviewer roles"},
        {"field":"evidencePathOrUri","type":"content-addressed URI","source":"Evidence vault","owner":"Evidence custodian","sensitivity":"VARIES","retention":"Artifact-specific","validation":"Allowlisted scheme, tenant scope, immutable version, hash match","verifier":"Evidence checker","expiry":"Retention expiry only after hold review","missing":"Evidence unresolved"},
        {"field":"evidenceSha256","type":"64-char hex","source":"Exact artifact bytes","owner":"Evidence service","sensitivity":"INTERNAL","retention":"At least as long as decision","validation":"Independent recomputation","verifier":"Independent evidence checker","expiry":"Any byte drift invalidates","missing":"No verification"},
        {"field":"verifiedBy/verifiedAt","type":"subject ID + timestamp","source":"Independent verification event","owner":"Assurance","sensitivity":"RESTRICTED","retention":"Audit retention","validation":"Verifier differs from producer/subject; active authority","verifier":"Assurance supervisor","expiry":"Underlying evidence drift","missing":"Not verified"},
        {"field":"freshAuthenticatedAt","type":"timestamp","source":"Controlled auth session assurance","owner":"IAM","sensitivity":"SECURITY","retention":"Security/audit retention","validation":"Same subject/tenant/session; not future; approval within 10 minutes","verifier":"Approval service","expiry":"10 minutes for G1 approval","missing":"Approval rejected"},
        {"field":"authenticationAssurance","type":"method + level","source":"Session assurance record","owner":"IAM","sensitivity":"SECURITY","retention":"Security/audit retention","validation":"Policy-approved method; password step-up exists, MFA decision unresolved","verifier":"Security control","expiry":"Policy/max-age/revocation","missing":"Approval rejected"},
        {"field":"decisionIntent","type":"APPROVE/REJECT/ABSTAIN","source":"Human approval UI/API","owner":"Human approver","sensitivity":"INTERNAL","retention":"Decision history","validation":"Explicit action; no role-assignment implication","verifier":"Approval service","expiry":"Superseded decision only","missing":"No approval"},
        {"field":"contractArtifactId/version/path/hash","type":"structured binding","source":"Frozen G1 contract","owner":"Product/governance","sensitivity":"INTERNAL","retention":"Permanent release evidence","validation":"Exact path and SHA-256; hash currently 11434e…36db","verifier":"Gate/evidence checker","expiry":"Any contract byte/version change","missing":"Approval rejected"},
        {"field":"signatureReference","type":"provider-neutral opaque ID","source":"Controlled approval/e-signature adapter","owner":"Approval service","sensitivity":"RESTRICTED","retention":"Decision/audit/legal retention","validation":"Resolvable to immutable evidence and audit trail","verifier":"Independent evidence checker","expiry":"Revocation/provider invalidation/artifact drift","missing":"Zero G1 credit"},
        {"field":"approvedAt","type":"timestamp","source":"Controlled approval service","owner":"Approval service","sensitivity":"INTERNAL","retention":"Decision history","validation":"At/after fresh auth, within 10 minutes, inside authority period","verifier":"Gate/evidence checker","expiry":"Underlying binding drift","missing":"No approval"},
        {"field":"revocationOrSupersessionStatus","type":"enum + event ref","source":"HR/governance lifecycle event","owner":"HR/governance","sensitivity":"INTERNAL","retention":"Permanent authority history","validation":"Append-only state transition, reason hash and actor","verifier":"Independent checker","expiry":"N/A","missing":"Treat ambiguous authority as inactive"},
    ]


def build_plain_language(prefill: dict[str, Any]) -> str:
    counts = prefill["authoritativeLookup"]["recordCounts"]
    return f"""# Cameroon HRIS/payroll authority evidence — plain-language guide

Prepared {DATE}  
Status: **DESIGN AND EVIDENCE ASSESSMENT ONLY**  
{WARNING}

## The short answer

There is no single Cameroon document called a “Stoquify HRIS/payroll statute” that can fill the G1 names, roles and approvals automatically. The legal sources tell the employer what employment, payroll, social-security, tax and recordkeeping evidence to maintain. Stoquify's employer and governance owners must still identify the real people, verify their employment, appoint them to exact control roles, check conflicts, and obtain their deliberate approvals.

## What the repository actually contains

- The HRIS tables are **not absent**. Prisma contains `PayrollEmployee`, `HrisOrgUnit`, `HrisPosition`, `HrisEmploymentAssignment`, `HrisReportingRelationship` and `HrisManagerDelegation`.
- The foundation migration creates tenant-scoped foreign keys, effective dates, evidence hashes, delegation expiry and revocation checks.
- The controlled read-only assessment recorded {counts['organizations']} organizations, {counts['users']} users and {counts['employees']} payroll employees, but **{counts['employmentAssignments']} employment assignments** and **{counts['managerDelegations']} manager delegations**.
- None of the 17 page-6 candidate names matched an authoritative user or employee record exactly, and the asserted tenant value did not match the configured organizations.
- G1 therefore remains **0/11 decisions and 0/33 role obligations approved**.

## The four separate proof layers

{table(['Layer','Question answered','Example'], [
['Law and regulator rules','What must an employer keep or file?','Labour Code, CNPS notice, DGI declaration'],
['Employment evidence','Is this person really employed by this entity?','Contract, employer register, CNPS record'],
['Authority evidence','May this person act as the Product owner or Financial controller for G1?','Appointment or bounded delegation'],
['Approval evidence','Did that authorized person approve this exact contract decision?','Fresh-authenticated, hash-bound approval envelope'],
])}

Passing one layer never automatically passes the next. A CNPS number is not a Stoquify user ID. A job title is not a G1 appointment. A role assignment is not a decision. A signature image is not an authenticated approval trail.

## What “statut” can mean

{table(['Possible meaning','What to obtain'], [
['Statutory legal pack','Dated Labour Code, CNPS, DGI and OHADA sources plus qualified review'],
['Employer status','Corporate record, labour-inspector declaration, CNPS employer registration and DGI taxpayer evidence'],
['Employee status','Identity check, employment contract/evidence, employer-register entry and CNPS hiring/worker record'],
['Payroll status','Payroll register, payslip, DIPE/tax evidence, CNPS declaration/payment and accounting tie-out'],
['Governance status','Position assignment, exact G1 appointment/delegation, dates, scope and SoD/COI decision'],
['Approval status','Fresh-authenticated human decision bound to the frozen G1 contract and independently verified'],
])}

## What to do first

1. **Name the legal employer and evidence owner.** Confirm the exact Stoquify legal entity, tenant, CNPS employer reference, DGI taxpayer reference and the accountable HR/governance custodian.
2. **Build the employee master from real records.** For each proposed person, obtain authorized identity and employment evidence, create or verify `User.id` and `PayrollEmployee.id`, and never match only by display name.
3. **Create effective-dated HR assignments.** Populate position, organizational unit and employment assignment from verified HR evidence. Termination or suspension must close eligibility automatically.
4. **Issue separate G1 appointments.** An authorized governance body must appoint each person to the exact canonical G1 role, scope and dates. Run independent SoD/COI and qualification checks.
5. **Only then collect approvals.** Require fresh authentication, exact contract hash `11434eb3e1af1826516426e90d2d53a2faa47ade361d91191b5f3e0c950a36db`, explicit decision intent, immutable evidence and independent rehashing.

## Who provides what

{table(['Provider','Expected evidence','Cannot prove by itself'], [
['MINTSS/Labour Inspectorate','Applicable labour texts, establishment filings, contract endorsement where required, employer-register rules','Who holds an internal G1 role'],
['CNPS','Employer/worker registration, hiring/cessation notices, declarations, account and payment evidence','Stoquify stable subject ID or G1 approval'],
['DGI','Taxpayer, payroll-tax filing and payment evidence','Employment appointment or control authority'],
['Employer HR','Identity cross-check, contract, employee record, position and effective dates','Deliberate G1 approval'],
['Employer governance','Control-role appointment, delegation, SoD/COI policy and decision','Employment or regulator filing unless separately evidenced'],
['Human approver','Explicit approval through controlled authentication','Independent verification of their own evidence'],
['Independent verifier','Artifact resolution, rehash, authority and conflict checks','The approval itself'],
])}

## Safe interim process

Until the module exists, HR and governance can operate the templates in this pack manually. Keep original evidence in a restricted repository; place only opaque references, masked identifiers and SHA-256 values in the working register. A second person must verify every identity, appointment and evidence artifact. Candidate names remain candidates until this process completes.

## Current disposition

The architecture can be built, and the repository already has useful foundations. The release blocker cannot be cleared by legal documents alone. It clears only after authentic employment and appointment records exist and the actual G1 validator accepts all 11 human-approved decisions.
"""


def build_legal_source_markdown(sources: list[dict[str, Any]]) -> str:
    rows = [
        [s["sourceId"], s["title"], s["sourceClass"], s["relevantSections"], s["sha256"], s["reviewStatus"]]
        for s in sources
    ]
    details = []
    for source in sources:
        details.append(
            f"""## {source['sourceId']} — {source['title']}

- Issuer: {source['issuingAuthority']}
- Host: {source['host']}
- Instrument: {source['instrumentNumber'] or 'Not stated'}
- Publication/effective date: {source['publicationDate']} / {source['effectiveDate'] or 'UNRESOLVED'}
- Retrieved: {source['retrievedAt']}
- URL: {source['officialUrl']}
- Local evidence: `{source['localPath']}`
- SHA-256: `{source['sha256']}`
- Relevant sections: {', '.join(source['relevantSections'])}
- Controlled use: {source['use']}
- Supersession note: {source['supersessionStatus']}
- Review: **{source['reviewStatus']}**; reviewer not yet assigned.
"""
        )
    return f"""# Cameroon HRIS/payroll legal source register

Prepared {DATE}  
Classification: **SOURCE PROVENANCE — NOT LEGAL CERTIFICATION**  
{WARNING}

## Source hierarchy

1. Certified Cameroon Official Gazette or current MINTSS/government publication.
2. Official CNPS and DGI legislation, forms and procedures.
3. Official OHADA accounting sources.
4. ILO NATLEX/NORMLEX as a controlled cross-check.
5. Qualified Cameroon labour/payroll interpretation and sign-off.

The pack preserves source bytes and hashes, but hashing proves file stability—not current legal force or correct interpretation.

## Register

{table(['ID','Source','Class','Relevant provisions','SHA-256','Review'], rows)}

## Material legal findings

- Labour Code sections 23-24 define the employment relationship and allow proof of contract existence generally; section 27 makes writing mandatory for specified-duration contracts exceeding three months, displacement, and foreign-worker cases. Section 28 requires probationary hiring to be written.
- Section 44 requires an employment certificate at departure stating dates and posts held.
- Sections 68-69 require regular wage payment, employer-certified payment evidence and an individual pay voucher, with records available to Labour Inspection.
- Sections 114-116 address establishment declarations, manpower information and an up-to-date employer's register.
- CNPS source material describes worker registration, insurance records, hiring/cessation notices, nominative declarations and contribution responsibility. The exact current deadlines and electronic procedure require CNPS confirmation because source wording and guidance are not perfectly uniform.
- DGI CGI 2024 articles 81-84 address employer withholding, payslip notation, remittance and DIPE; articles 101-102 address annual employee-level declarations. The 2026 circular must be reviewed for amendments before calculation or filing.
- AUDCIF/SYSCOHADA governs accounting records and financial reporting. It does not appoint employees or G1 control owners.

## Limitations

- No certified Official Gazette copy was supplied.
- No MINTSS confirmation of current implementing orders, employer-register format, internal-regulation threshold or applicable collective agreement was obtained.
- The DGI 2026 circular is image-based in the downloaded edition; no automated payroll-law conclusion was drawn from it.
- No qualified Cameroon lawyer, CNPS practitioner, tax adviser or OHADA accountant has signed this register.

{''.join(details)}
"""


def build_document_matrix_markdown(requirements: list[dict[str, Any]], fields: list[dict[str, Any]]) -> str:
    requirement_rows = [[r["id"], r["document"], r["class"], r["basis"], r["proves"], r["g1Use"], r["action"]] for r in requirements]
    field_rows = [[f["field"], f["type"], f["source"], f["owner"], f["sensitivity"], f["validation"], f["expiry"], f["missing"]] for f in fields]
    return f"""# Cameroon employment and HRIS/payroll document requirements matrix

Prepared {DATE}  
Classification: **REQUIREMENTS ASSESSMENT — NOT COMPLIANCE CERTIFICATION**  
{WARNING}

## Classification key

- `STATUTORY_MANDATORY`: the reviewed source expresses a legal duty; current applicability still requires qualified confirmation.
- `CONDITIONAL_STATUTORY_MANDATORY`: applies only when the stated condition is present.
- `OFFICIAL_*`: regulator-issued evidence or procedure.
- `INTERNAL_*`: not created by Cameroon statute; required by Stoquify to establish authority and approval integrity.
- `LEGAL_APPLICABILITY_DECISION`: cannot be decided safely until entity, sector, worker and establishment facts are known.

## Document requirements

{table(['ID','Document','Class','Basis','Proves','G1 use','Resolution action'], requirement_rows)}

## Required data classification and validation

{table(['Field','Type','Authoritative source','Owner','Sensitivity','Validation rule','Expiry/invalidation','If missing'], field_rows)}

## Minimum evidence chain for one G1 signer

1. `User.id` is active, verified and tenant-bound.
2. `PayrollEmployee.id` is linked to that subject using controlled identity evidence.
3. Employment status is corroborated by employer and, where applicable, CNPS records.
4. An active `HrisEmploymentAssignment` identifies position and organizational scope.
5. A separate governance appointment grants the exact canonical G1 control role.
6. Independent SoD/COI and qualification checks pass.
7. The human signs the exact decision through fresh authentication.
8. The final artifact is exported, rehashed and independently verified.

No step may be inferred solely from the one before it.
"""


def build_schema_gap_markdown(prefill: dict[str, Any], repo: list[dict[str, Any]]) -> str:
    counts = prefill["authoritativeLookup"]["recordCounts"]
    repo_rows = [[r["path"], r["sha256"], r["bytes"]] for r in repo]
    return f"""# Cameroon HRIS schema and data gap report

Prepared {DATE}  
Classification: **VERIFIED REPOSITORY ASSESSMENT**

## Outcome

The HRIS schema and its migration are present. The blocking condition is missing or unverified runtime data and missing governance control-role evidence.

{table(['Question','Finding','Evidence'], [
['Are the core HRIS tables absent?','No','`prisma/schema.prisma` and migration `20260719190000_hris_org_manager_scope_foundation`'],
['Do employment assignments exist in the controlled lookup?','No — 0 records',rel(PREFILL_PATH)],
['Do manager delegations exist?','No — 0 records',rel(PREFILL_PATH)],
['Do the 17 candidate names exactly match verified users/employees?','No — 0 exact matches',rel(PREFILL_PATH)],
['Does the asserted tenant match?','No — 0 tenant matches',rel(PREFILL_PATH)],
['Can candidate names be imported as authorities?','No','All 17 remain CANDIDATE_NOT_VERIFIED'],
])}

## Controlled data snapshot

{table(['Record type','Count'], [
['Organizations', counts['organizations']],
['Users', counts['users']],
['Payroll employees', counts['employees']],
['Employment assignments', counts['employmentAssignments']],
['Manager delegations', counts['managerDelegations']],
['Candidate names queried', prefill['authoritativeLookup']['candidateNamesQueried']],
['Exact identity matches', prefill['authoritativeLookup']['exactIdentityMatches']],
])}

The snapshot was recorded by the existing prefill assessment as a read-only transaction and rolled back after retrieval. This run did not mutate or reseed the configured database.

## Existing reusable capabilities

- `User.id` is the application subject key; `User.organizationId` provides direct tenant ownership.
- Sessions persist assurance time, method, organization and level.
- `requireFreshAuth()` rejects future, stale, cross-tenant or insufficient assurance.
- Password step-up has session CAS-style updates, lockout and security-event logging.
- `PayrollEmployee` has tenant uniqueness, employment status/dates, masked identifier fields and identifier hashes.
- HRIS units, positions and employment assignments are effective-dated and tenant-scoped.
- Reporting relationships and manager delegations require evidence/reason hashes, forbid self-relations/delegations and model revocation/supersession.
- HRIS scope resolution enforces tenant, permission, effective-date and delegated-scope checks and emits audit records.
- `BusinessEvent` provides tenant/idempotency/payload-hash foundations; `AuditLog` provides actor, organization and change history.

## Material gaps before G1 authority can rely on them

1. **Subject-to-employee binding is not evidence-grade.** `PayrollEmployee.userId` is optional and unique per tenant but is not modeled as a database foreign-key relation to `User`.
2. **No control-role catalog or appointment model exists.** Job titles, RBAC roles and manager delegations cannot safely represent the 17 canonical G1 roles.
3. **Manager delegation is too generic.** `APPROVAL_DECISION` does not identify the G1 role, decision IDs, contract/policy version or capability exclusions.
4. **No employment/identity evidence registry exists.** Contract, CNPS, identity, issuer, path, hash, verification and expiry are not first-class records.
5. **No first-class SoD/COI assessment exists.** Distinct names are not proof of independence or conflict clearance.
6. **No qualification registry exists** for the Cameroon country-pack reviewer or qualified accounting reviewer.
7. **Current step-up assurance is password level only.** MFA requirements for G1 remain a governance/security decision.
8. **Audit evidence is not sufficient by itself.** `AuditLog` is useful history but has no visible hash chain or independent-verification boundary.
9. **The G1 validator is necessary but presence-oriented.** It validates required fields, roles, contract-register binding and the ten-minute window, but a separate verifier must resolve authority and evidence artifacts and recompute hashes.
10. **No authority-drift invalidation engine exists** connecting HR termination, appointment revocation, policy changes and artifact changes to approval eligibility.

## Architecture graph evidence

`graphify-out/GRAPH_REPORT_actions.md` identifies HRIS payment-destination workflow Community 16 and payroll action/test communities 47-55. The payroll communities consistently expose RBAC and fresh-authentication test dependencies, supporting reuse of those controls. The graph also flags `MockFreshAuthRequiredError` as weakly connected, so graph inference is not treated as proof of runtime enforcement; source-code verification remains required.

## Verified artifact fingerprints

{table(['Path','SHA-256','Bytes'], repo_rows)}

## Disposition

- Do not add replacement HRIS tables.
- Populate verified employee/assignment records through a controlled onboarding workflow.
- Add a narrow, separate authority-evidence layer rather than overloading employment, job-title or RBAC data.
- Do not populate the live G1 register until independent authority and approval evidence exists.
"""


def build_bridge(prefill: dict[str, Any], finalization: dict[str, Any]) -> tuple[dict[str, Any], str]:
    role_map = {row["role"]: row for row in prefill["roles"]}
    obligations = []
    for source in finalization["obligations"]:
        role = source["authority"]["approverRole"]
        candidate = role_map.get(role, {})
        obligations.append(
            {
                "obligationId": source["obligationId"],
                "decisionId": source["contractBinding"]["decisionId"],
                "decisionTitle": source["contractBinding"]["decisionTitle"],
                "selectedOption": source["contractBinding"]["selectedOption"],
                "requiredRole": role,
                "page6CandidateName": candidate.get("candidateName"),
                "candidateClassification": "CANDIDATE_NOT_VERIFIED",
                "stableSubjectId": None,
                "employeeId": None,
                "employmentAssignmentId": None,
                "authorityReference": None,
                "appointmentEvidenceSha256": None,
                "sodResult": None,
                "coiResult": None,
                "qualificationEvidenceReference": None,
                "independentVerifierSubjectId": None,
                "freshAuthenticatedAt": None,
                "approvedAt": None,
                "signatureReference": None,
                "signatureEvidenceSha256": None,
                "status": "BLOCKED_MISSING_VERIFIED_IDENTITY_EMPLOYMENT_AUTHORITY_AND_APPROVAL",
                "externalConflict": candidate.get("externalConflict"),
                "nextAction": f"HR/security verifies identity and employment; governance appoints the exact {role} role; an independent checker clears SoD/COI and qualification where applicable; only then may the human approve this decision.",
            }
        )
    roles = []
    for role in prefill["roles"]:
        roles.append(
            {
                "role": role["role"],
                "obligations": role["obligations"],
                "page6CandidateName": role["candidateName"],
                "candidateClassification": "CANDIDATE_NOT_VERIFIED",
                "stableSubjectId": None,
                "employeeId": None,
                "employmentAssignmentId": None,
                "authorityReference": None,
                "appointmentScope": None,
                "effectiveFrom": None,
                "effectiveTo": None,
                "sodResult": None,
                "coiResult": None,
                "authorityVerifier": None,
                "externalConflict": role.get("externalConflict"),
            }
        )
    payload = {
        "schemaVersion": "1.0.0",
        "artifactId": "STOQUIFY-CAMEROON-G1-AUTHORITY-EVIDENCE-BRIDGE-20260819",
        "generatedAt": GENERATED_AT,
        "classification": "PREPARATION_AND_GAP_REGISTER_NOT_AUTHORITY_OR_APPROVAL_EVIDENCE",
        "g1Passed": False,
        "productionAuthorized": False,
        "contractBinding": finalization["contractBinding"],
        "repositoryDataState": prefill["authoritativeLookup"],
        "summary": {
            "decisions": 11,
            "obligations": len(obligations),
            "canonicalRoles": len(roles),
            "verifiedStableSubjectIds": 0,
            "verifiedEmploymentAssignments": 0,
            "verifiedAuthorityAppointments": 0,
            "sodCoiPasses": 0,
            "authenticatedApprovals": 0,
            "completedDecisions": 0,
        },
        "roles": roles,
        "obligations": obligations,
        "invalidationRules": [
            "Contract artifact/version/path/hash drift",
            "Identity or tenant mismatch",
            "Employment termination, suspension or assignment expiry",
            "Appointment or delegation expiry, revocation or scope mismatch",
            "SoD/COI/qualification evidence expiry or policy change",
            "Fresh authentication outside the ten-minute approval window",
            "Signature/evidence reference cannot be resolved or rehashed",
        ],
        "liveRegisterModified": False,
        "nextPermittedStep": "Complete verified employment and authority records; then collect deliberate fresh-authenticated human approvals and independently verify exported evidence.",
    }
    decision_counts = Counter(row["decisionId"] for row in obligations)
    role_rows = [[r["role"], r["page6CandidateName"], r["obligations"], "0", "CANDIDATE_NOT_VERIFIED", r["externalConflict"] or "None recorded"] for r in roles]
    obligation_rows = [[o["obligationId"], o["decisionId"], o["requiredRole"], o["page6CandidateName"], o["status"], o["nextAction"]] for o in obligations]
    md = f"""# Cameroon G1 authority-evidence bridge

Prepared {DATE}  
Classification: **PREPARATION REGISTER — NOT AUTHORITY OR APPROVAL EVIDENCE**

## Outcome

All 11 decisions and exactly 33 decision-role obligations are represented. All remain blocked. Page-6 names are preserved only as unverified candidates; none has a verified stable subject ID, employment assignment, authority appointment, SoD/COI result or authenticated approval.

## Contract binding

- Artifact: `{payload['contractBinding']['contractArtifactId']}`
- Version: `{payload['contractBinding']['contractVersion']}`
- Path: `{payload['contractBinding']['contractPath']}`
- SHA-256: `{payload['contractBinding']['contractSha256']}`
- Current live approval register remains unchanged at SHA-256 `{sha256(LIVE_REGISTER_PATH)}`.

## Coverage check

{table(['Decision','Obligations','Completed'], [[d, decision_counts[d], 0] for d in sorted(decision_counts)])}

Total: **{len(obligations)} obligations; 0 complete**.

## Canonical roles and page-6 candidates

{table(['Canonical role','Page-6 candidate','Obligations','Verified IDs','Classification','Conflict note'], role_rows)}

Candidate-name propagation is not authority verification. The names must not be imported into the live register until HR/security and governance evidence is complete.

## Obligation-by-obligation resolution map

{table(['Obligation','Decision','Role','Candidate','Status','Required resolution'], obligation_rows)}

## Required manual sequence

1. Governance confirms the legal employer, tenant and canonical authority-role policy.
2. HR/security independently verifies the person and binds `User.id` to `PayrollEmployee.id`.
3. HR creates a current effective-dated position and employment assignment.
4. An authorized corporate/governance issuer signs a separate G1 control-role appointment or bounded delegation.
5. An independent controls reviewer records SoD/COI and qualification results.
6. The approval service verifies eligibility, then requires fresh authentication.
7. The human deliberately approves the exact decision and option bound to the frozen contract hash.
8. Final evidence is exported; a separate verifier resolves it, recomputes SHA-256 and records pass/fail.
9. Only a minimal verified payload may be copied to the live G1 approval register.
10. The actual `pos:g1:contract:gate` decides whether G1 passes; this bridge never declares passage.

## Invalidation

{bullets(payload['invalidationRules'])}
"""
    return payload, md


def build_module_design() -> str:
    return f"""# Cameroon HRIS authority-evidence module design

Prepared {DATE}  
Status: **PROPOSED — G1-FOCUSED — NOT IMPLEMENTED**  
{WARNING}

## Architecture decision

Build the first version as a **bounded module inside the existing Stoquify application**, not a separate network service. It should reuse the current Prisma transaction boundary, tenant resolver, RBAC, session assurance, audit/security events and HRIS effective-dating. Keep provider adapters behind interfaces so the module can be extracted later if scale, legal isolation or integration volume justifies it.

This boundary minimizes distributed failure modes while the first use case is only 17 roles, 33 obligations and one frozen G1 contract.

## Responsibility boundary

{table(['Component','Owns','Must not do'], [
['Identity link resolver','Verified User.id ↔ PayrollEmployee.id binding','Match by display name/email alone'],
['Employment evidence registry','Contract/CNPS/employer-register references, hashes, issuer and verification','Declare a control role'],
['HR assignment resolver','Effective position, unit and employment status','Grant G1 authority automatically'],
['Authority catalog','Versioned canonical roles and permitted scopes','Reuse mutable job titles or ordinary RBAC role labels'],
['Authority assignment/delegation','Appointment issuer, subject, scope, dates, evidence and revocation','Perform a human approval'],
['SoD/COI evaluator','Policy-versioned conflict result and independent checker','Self-certify evidence it produced'],
['Eligibility engine','Fail-closed current eligibility read model','Treat authentication as authorization'],
['Approval envelope','Exact decision/option/contract binding, fresh auth and deliberate intent','Accept UI-only success'],
['Independent verifier','Resolve artifacts, rehash, compare and record pass/fail','Edit producer evidence silently'],
['External adapter','CNPS/DGI/e-sign provider-neutral ingestion','Make unverified provider data authoritative'],
])}

## Proposed data model

Reuse `User`, `Session`, `PayrollEmployee`, `HrisOrgUnit`, `HrisPosition`, `HrisEmploymentAssignment`, `HrisReportingRelationship`, `BusinessEvent` and `AuditLog`.

Add only after Phase 0 governance approval:

1. `HrisIdentityEmploymentEvidence` — subject, employee, evidence type, issuer, URI, SHA-256, validity, producer and independent verifier.
2. `ControlAuthorityRole` — immutable/versioned canonical role code, domain, allowed decision/capability scope and qualification rule.
3. `ControlAuthorityAssignment` — subject/employee/role/tenant/scope/effective dates, appointing authority, appointment evidence hash and status.
4. `ControlAuthorityDelegation` — bounded role/decision scope, delegator, delegate, mandatory expiry, reason/evidence hashes, revocation and supersession.
5. `ControlSodAssessment` — assignment set, policy version/hash, result, conflicts, exception reference, independent reviewer and expiry.
6. `ControlQualificationEvidence` — qualification type, issuing body, jurisdiction, scope, expiry, evidence and verification.
7. `ControlApprovalEnvelope` — contract and policy hashes, decision/option, required roles, status and invalidation state.
8. `ControlApprovalAttestation` — signer subject, authority snapshot, fresh-auth evidence, intent, timestamp and immutable signature/evidence reference.
9. `ControlEvidenceVerification` — producer/verifier separation, resolved bytes hash, expected hash, result and timestamp.
10. `ControlInvalidationEvent` — append-only cause linking employment, authority, policy or artifact drift to affected eligibility/approvals.

Do not overload `HrisManagerDelegation.APPROVAL_DECISION`: it lacks the exact canonical control role and decision/contract scope required by G1.

## State model

`SOURCE_MISSING → SOURCE_CAPTURED → SOURCE_VERIFIED → EMPLOYMENT_VERIFIED → AUTHORITY_APPOINTED → SOD_CLEARED → ELIGIBLE_TO_APPROVE → APPROVED_PENDING_VERIFICATION → VERIFIED_APPROVAL`

Any drift produces `INVALIDATED`; ambiguous evidence produces `BLOCKED`, never a soft pass.

## APIs

{table(['Method','Route/command','Purpose','Minimum control'], [
['POST','/internal/hris/evidence/intake','Register metadata and expected hash; no authority yet','HR permission, tenant scope, idempotency'],
['POST','/internal/hris/evidence/:id/verify','Independent artifact resolution/rehash','Verifier permission, producer ≠ verifier'],
['POST','/internal/control-authority/assignments','Create pending appointment from verified evidence','Governance permission, fresh auth, issuer authority'],
['POST','/internal/control-authority/assignments/:id/activate','Activate after SoD/COI/qualification','Independent checker, policy hash'],
['POST','/internal/control-authority/delegations','Create bounded temporary delegation','Eligible delegator, mandatory expiry, fresh auth'],
['POST','/internal/control-authority/:id/revoke','Revoke and invalidate dependents','Governance/HR event, reason hash'],
['GET','/internal/control-authority/eligibility','Resolve current role/decision eligibility','Tenant scoped, fail closed'],
['POST','/internal/g1/envelopes/:decisionId/approve','Deliberate human approval','Eligible role, fresh auth ≤10 minutes, exact hashes'],
['POST','/internal/g1/attestations/:id/verify','Independent final evidence verification','Verifier separation, content rehash'],
['GET','/internal/g1/export','Build minimal detached register candidate','All required attestations verified; no direct live write'],
])}

Service/API checks, not the UI, determine success. UI controls are guidance only.

## Events

- `hris.identity_employment_evidence.verified`
- `hris.employment_assignment.changed`
- `control.authority_assignment.activated|revoked|expired`
- `control.delegation.activated|revoked|expired`
- `control.sod_assessment.completed|invalidated`
- `control.approval_attestation.recorded|verified|invalidated`
- `control.artifact_drift.detected`

Every event carries tenant, actor, subject, source IDs, payload hash, policy/contract hash and correlation/idempotency key. It must exclude raw national IDs, CNPS numbers, passwords, tokens and unneeded medical data.

## Fresh authentication

The repository already supports session-bound password step-up and `requireFreshAuth`. G1 should call it with the approved maximum age and additionally bind signer, tenant, session, decision, option and contract hash. Whether password-only assurance is sufficient is unresolved; the proposed policy default is MFA for activation, delegation, approval and evidence verification, subject to security/governance approval.

## SoD policy baseline

- Evidence producer cannot be the independent verifier.
- Appointment subject cannot verify their own appointment.
- Delegator cannot equal delegate; the existing schema already enforces this for manager delegations.
- Maker/checker and signer/verifier combinations fail unless an explicit, independently approved exception exists.
- A person may hold multiple business roles only if the exact role pair and decisions are approved by policy; distinct names alone do not prove a pass.
- Qualified Cameroon and accounting reviewer roles require current qualification evidence, not ordinary application permissions.

## Threat model

{table(['Threat','Failure mode','Required mitigation'], [
['Identity confusion','Candidate/display name mapped to wrong account','Stable subject ID, HR cross-check, tenant binding, independent verification'],
['Authority laundering','Job title/RBAC role treated as control appointment','Separate versioned authority catalog and signed appointment'],
['Evidence substitution','Path content changes after approval','Content-addressed URI, SHA-256, immutable version and rehash'],
['Self-certification','Producer approves/verifies own artifact','Database/service SoD constraints and verifier permission'],
['Replay after drift','Old approval reused for new contract/policy','Exact contract/policy hash and invalidation events'],
['Cross-tenant access','Evidence or authority resolved in wrong organization','Tenant in every key/query/event; deny and audit mismatch'],
['Session theft/stale auth','Approval uses old or wrong session','Fresh auth, session/subject/tenant match, revocation and short window'],
['Provider spoofing','Fake CNPS/e-sign callback','Allowlisted adapter, signature validation, idempotency and independent reconciliation'],
['PII leakage','National/CNPS/medical data appears in reports/logs','Masking, keyed hashes, field-level permissions, redaction and retention'],
['UI bypass','Direct API creates pass without checks','Server-side state machine and database transaction; UI never authoritative'],
])}

## UI

Provide a role-aware command center with four separate statuses: Employment, Authority, Conflict review and Approval. Display blocker reasons and next owners. Never show “approved” because a name or image was entered. Sensitive evidence opens only through audited, expiring access grants.

## Observability

Track evidence-verification failures, stale appointments, delegations near expiry, conflict failures, cross-tenant denials, failed fresh-auth attempts, artifact drift, invalidations and time-to-resolve. Alert on any transition to eligible/verified that lacks a complete event chain.

## Adapter strategy

Start with controlled manual upload and independent verification. Add CNPS/DGI read or submission adapters only with documented authority and stable supported interfaces. Add external e-signature through a provider-neutral envelope adapter; internal operational approval must continue to work without a full e-signature platform.

## Reuse beyond G1

The same evidence/authority primitives can support payroll compensation, payment-destination changes, purchasing/AP, inventory write-offs, reconciliations, country-pack reviews and close certification. Domain services remain owners of business truth; the control module only proves identity, authority, evidence and approval state.
"""


def build_backlog() -> str:
    rows = [
        ["P0-01","Phase 0","Confirm Stoquify legal employer, tenant and evidence owner","Governance/legal","Signed decision record; no guessed entity"],
        ["P0-02","Phase 0","Qualified review of Labour Code, implementing orders, CNPS and DGI 2026 applicability","Cameroon counsel/payroll specialist","Reviewed source register with dated conclusions"],
        ["P0-03","Phase 0","Approve 17 canonical role codes, scope and 33-obligation matrix","Governance/product/controls","Versioned role catalog and policy hash"],
        ["P0-04","Phase 0","Approve SoD/COI, qualification, delegation, retention and MFA policies","Security/controls/legal","No unresolved policy required by eligibility"],
        ["P1-01","Phase 1","Implement read-only evidence intake and independent verification records","HRIS/backend","No authority from unverified evidence; tenant tests pass"],
        ["P1-02","Phase 1","Implement verified User↔PayrollEmployee identity link","IAM/HRIS","Stable ID, tenant and evidence checks; display-name matching rejected"],
        ["P1-03","Phase 1","Populate verified positions and employment assignments for real staff","HR owner","Effective-dated records; 17 candidate rows resolved or rejected"],
        ["P1-04","Phase 1","Add privacy/redaction and evidence access controls","Security/privacy","No raw ID/CNPS/session secrets in logs/reports"],
        ["P2-01","Phase 2","Add versioned control-role catalog and assignments","Controls/backend","Role separate from job/RBAC; appointment evidence required"],
        ["P2-02","Phase 2","Add bounded delegations with mandatory expiry and invalidation","Controls/backend","No self-delegation; role/decision/scope explicit"],
        ["P2-03","Phase 2","Implement SoD/COI and qualification assessment","Controls/compliance","Producer/checker and role-pair policies fail closed"],
        ["P2-04","Phase 2","Build current eligibility read model","Backend","Employment, authority, dates, policy and conflicts jointly enforced"],
        ["P3-01","Phase 3","Create G1 approval envelope and attestations","Backend/security","Exact contract/option/role, fresh auth and deliberate intent"],
        ["P3-02","Phase 3","Implement independent final evidence verification","Assurance/backend","Artifact resolves and rehashes; verifier separated"],
        ["P3-03","Phase 3","Implement drift invalidation and dependency graph","Backend/SRE","Contract/authority/policy/evidence change invalidates affected approvals"],
        ["P3-04","Phase 3","Build detached register export with human-controlled import","Backend/governance","No silent live-register write; minimal patch reviewable"],
        ["P3-05","Phase 3","Run narrow G1 tests and validator only when eligible","QA/governance","11/11 actual validator result required"],
        ["P4-01","Phase 4","Add provider-neutral e-signature adapter if required","Integration/security/legal","Provider audit trail maps to internal envelope"],
        ["P4-02","Phase 4","Assess supported CNPS/DGI adapters","Integration/compliance","No scraping or credential reuse; manual fallback preserved"],
    ]
    return f"""# Cameroon HRIS authority implementation backlog

Prepared {DATE}  
Status: **PROPOSED — NO IMPLEMENTATION OR MIGRATION PERFORMED**

## Delivery principle

Keep the first implementation narrow and G1-focused. Each phase is additive, testable and reversible. No phase may create human approvals automatically.

{table(['ID','Phase','Work item','Owner','Acceptance evidence'], rows)}

## Phase gates

- **Phase 0 exit:** legal/governance decisions are signed and source-provenanced.
- **Phase 1 exit:** identities and employment records are verified; no G1 authority yet.
- **Phase 2 exit:** all 17 roles have verified assignments or explicit unresolved status; SoD/COI/qualification results exist.
- **Phase 3 exit:** all 33 approvals are deliberate, fresh-authenticated, artifact-bound and independently verified; the actual validator reports 11/11.
- **Phase 4 entry:** only after a documented need for external integration and security/legal review.

## Rollback

- Disable the module feature flag and return eligibility as blocked.
- Preserve append-only evidence, invalidation and audit history.
- Do not delete employment or authority history.
- Keep the manual templates/process available.
- Never roll back by accepting stale or weaker evidence.

## Required test families

- Tenant-crossing and identity mismatch.
- Display-name collision and renamed user.
- Employment termination/suspension/assignment expiry.
- Appointment/delegation expiry, revocation and supersession.
- Maker/checker, producer/verifier and role-pair conflicts.
- Qualification expiry.
- Contract, policy, authority and evidence hash drift.
- Future/stale/cross-tenant authentication and >10-minute approval.
- Evidence path substitution and failed rehash.
- Duplicate/replayed provider or approval events.
"""


def build_unresolved() -> str:
    decisions = [
        ["GOV-01","What is the exact Stoquify legal employer and establishment for Cameroon staff?","Corporate governance/legal","Blocks employer/CNPS/DGI provenance"],
        ["GOV-02","Which repository tenant/Organization.id represents that legal employer?","Platform owner + governance","Blocks all tenant-bound identity and authority records"],
        ["GOV-03","Who owns the canonical HR and authority roster?","Executive governance","Blocks appointments and verification"],
        ["LEG-01","What is the current consolidated force of Law 92/007 and its relevant implementing orders?","Qualified Cameroon labour counsel","Blocks legal-compliance claims"],
        ["LEG-02","Which employer-register form/order and internal-regulation threshold apply?","MINTSS/labour counsel","Blocks complete statutory document pack"],
        ["LEG-03","Which collective agreement applies to Stoquify's entity, sector and establishments?","Labour counsel/HR","Blocks terms/qualification assessment"],
        ["LEG-04","Are any of the 17 candidates foreign workers or otherwise subject to special endorsement?","HR/legal","Blocks employment eligibility where applicable"],
        ["CNPS-01","Which current CNPS registration/notice/declaration deadlines and electronic forms control?","CNPS practitioner","Source wording/guidance must be reconciled"],
        ["TAX-01","What 2025/2026 amendments affect CGI 2024 payroll articles and DIPE procedure?","Cameroon tax/payroll specialist","Blocks current payroll-calculation/filing claims"],
        ["ID-01","Who are the real 17 people, and what are their verified User.id and PayrollEmployee.id values?","HR/security","Currently 0/17 verified"],
        ["ID-02","Why did the asserted tenant and all 17 names fail exact authoritative lookup?","HR/platform governance","Candidate list may reference another entity/environment"],
        ["AUTH-01","Who is authorized to appoint each canonical G1 role?","Corporate governance","Blocks authority references"],
        ["AUTH-02","Which same-person role combinations are prohibited or conditionally allowed?","Controls/risk","Blocks SoD results"],
        ["AUTH-03","What bounded delegation rules, maximum duration and revocation process apply?","Governance/controls","Blocks delegation activation"],
        ["QUAL-01","What qualification evidence is accepted for Cameroon and accounting reviewers?","Legal/finance governance","Blocks D-07 and D-09 reviewer roles"],
        ["SEC-01","Is password-only step-up sufficient, or is MFA mandatory for G1?","Security/governance","Blocks approved assurance level"],
        ["SEC-02","Which evidence store, URI schemes, encryption and retention controls are approved?","Security/privacy/legal","Blocks evidence-path acceptance"],
        ["APR-01","Which decisions use internal attestation and which require external e-signature?","Governance/legal","Blocks provider policy, not internal workflow design"],
        ["APR-02","Who independently verifies each of the 33 final artifacts?","Assurance owner","No verifier assignments currently exist"],
        ["CONFLICT-01","Resolve Tamen Marceline's separate destructive-migration maker conflict","Governance","Blocks clean identity/SoD assessment"],
        ["CONFLICT-02","Resolve Yonga Springfield's separate destructive-migration checker conflict","Governance","Blocks clean identity/SoD assessment"],
    ]
    return f"""# Cameroon HRIS unresolved governance decisions

Prepared {DATE}  
Status: **OPEN — DO NOT GUESS**

{table(['ID','Unresolved decision','Required owner','Impact'], decisions)}

## Resolution rule

Each decision must be closed by an identified human authority with a dated source, exact scope, evidence reference and independent review where required. A meeting note, typed name, page-6 candidate entry or agent-generated proposal is not sufficient by itself.

## Current gate consequence

Until the identity, authority, conflict, qualification, assurance and verification questions are closed, the G1 approval register must remain unchanged and G1 must remain 0/11.
"""


def templates() -> dict[str, str]:
    prefix = f"# {{title}}\n\n**{TEMPLATE_WARNING}**  \nPrepared template version: {DATE}  \n{WARNING}\n\n"
    common = """## Document control

- Template ID:
- Document ID:
- Version:
- Tenant / legal employer:
- Effective date:
- Supersedes:
- Evidence repository URI:
- Final artifact SHA-256:
- Retention class:

"""
    return {
        "TEMPLATE_EMPLOYEE_IDENTITY_EMPLOYMENT_VERIFICATION_2026-08-19.md": prefix.format(title="Employee identity and employment verification") + common + """## Subject and employee

- Stable application subject ID (`User.id`):
- Payroll employee ID (`PayrollEmployee.id`):
- Employee number:
- Legal name:
- Verified name variants:
- Organization ID / tenant:
- Employment status:
- Hire date:
- Termination/suspension date, if any:

## Evidence reviewed

| Evidence type | Issuer | Reference/URI | SHA-256 | Validity | Result |
| --- | --- | --- | --- | --- | --- |
| Controlled identity evidence | | | | | |
| Employment contract/evidence | | | | | |
| Employer-register evidence | | | | | |
| CNPS worker/hiring evidence, if applicable | | | | | |

Do not place raw national-ID or CNPS numbers in this form. Store masked values or keyed hashes in authorized systems.

## Independent verification

- Producer stable subject ID:
- Independent verifier stable subject ID:
- Verification method:
- Verified at:
- Tenant and subject match: PASS / FAIL
- Artifact hashes recomputed: PASS / FAIL
- Result: VERIFIED / REJECTED / UNRESOLVED
- Reason/reference:

No authority role or approval is created by this verification.
""",
        "TEMPLATE_POSITION_APPOINTMENT_2026-08-19.md": prefix.format(title="Position and organizational assignment") + common + """## Employee and assignment

- Stable subject ID:
- Payroll employee ID:
- Position code / ID:
- Position title:
- Organizational unit code / ID:
- Location, if scoped:
- Assignment type: PRIMARY / SECONDARY
- Effective from:
- Effective to or approved open-ended assertion:
- Employment evidence reference:
- Appointment issuer stable subject ID:
- Appointment issuer authority reference:

## Checks

- Employee identity verified: PASS / FAIL
- Employment active for the full assignment period: PASS / FAIL
- Position and unit tenant match: PASS / FAIL
- Appointment artifact resolved and rehashed: PASS / FAIL
- Independent verifier stable subject ID:
- Verified at:

This establishes HR position context only. It does not grant a G1 control role.
""",
        "TEMPLATE_G1_CONTROL_ROLE_APPOINTMENT_2026-08-19.md": prefix.format(title="G1 canonical control-role appointment") + common + """## Appointed subject

- Stable subject ID:
- Payroll employee ID:
- Employment assignment ID:
- Canonical G1 role code and label:
- Covered decision IDs:
- Tenant / organization:
- Capability/location scope:
- Explicit exclusions:
- Effective from:
- Effective to:
- Qualification evidence reference, if required:

## Appointing authority

- Issuer stable subject ID:
- Issuer corporate/governance role:
- Issuer authority reference:
- Decision/resolution reference:
- Deliberate appointment intent:

## Independent checks

- Identity and employment: PASS / FAIL
- Issuer authority: PASS / FAIL
- Role/scope/dates: PASS / FAIL
- SoD/COI: PASS / FAIL / EXCEPTION PENDING
- Qualification: PASS / FAIL / NOT APPLICABLE
- Artifact hash recomputed: PASS / FAIL
- Verifier stable subject ID:
- Verified at:

The appointed person must later perform each required G1 approval deliberately through fresh authentication.
""",
        "TEMPLATE_DELEGATION_OF_AUTHORITY_2026-08-19.md": prefix.format(title="Bounded delegation of G1 authority") + common + """## Delegation

- Delegator stable subject ID:
- Delegator active authority reference:
- Delegate stable subject ID:
- Delegate payroll employee and assignment IDs:
- Canonical G1 role:
- Covered decision IDs:
- Tenant / organization:
- Scope and exclusions:
- Reason:
- Effective from:
- Mandatory effective to:
- Automatic expiry action:
- Supersedes delegation ID, if any:

## Checks

- Delegator ≠ delegate: PASS / FAIL
- Delegator may delegate this role/scope: PASS / FAIL
- Delegate identity/employment current: PASS / FAIL
- SoD/COI after delegation: PASS / FAIL
- Evidence producer ≠ verifier: PASS / FAIL
- Independent verifier stable subject ID:
- Verified at:

Delegation never transfers authority beyond the stated role, decisions, tenant, scope or period.
""",
        "TEMPLATE_DELEGATION_REVOCATION_2026-08-19.md": prefix.format(title="Authority appointment or delegation revocation") + common + """## Revocation

- Assignment/delegation ID:
- Subject stable ID:
- Canonical role:
- Revocation effective at:
- Reason code:
- Reason evidence reference and hash:
- Revoked by stable subject ID:
- Revoker authority reference:
- Affected decisions/approvals:
- Required invalidation event ID:
- Notifications/escalations:

## Verification

- Revoker authority: PASS / FAIL
- State transition valid: PASS / FAIL
- Dependent eligibility invalidated: PASS / FAIL
- Unconsumed/stale approvals invalidated: PASS / FAIL
- Independent verifier stable subject ID:
- Verified at:
""",
        "TEMPLATE_SOD_COI_DECLARATION_2026-08-19.md": prefix.format(title="Segregation-of-duties and conflict-of-interest assessment") + common + """## Assessment subject and scope

- Subject stable ID:
- Candidate role/assignment IDs:
- Covered decision IDs:
- SoD policy version and SHA-256:
- COI policy version and SHA-256:
- Other roles/assignments considered:
- Evidence produced by subject: yes / no
- Verification duties held by subject: yes / no

## Results

| Check | Result | Evidence/reference | Required remediation |
| --- | --- | --- | --- |
| Maker/checker conflict | | | |
| Signer/verifier conflict | | | |
| Evidence producer/checker conflict | | | |
| Business-role conflict | | | |
| Personal/financial COI | | | |
| Qualification independence | | | |

- Overall SoD result: PASS / FAIL / EXCEPTION PENDING
- Overall COI result: PASS / FAIL / DISCLOSED REVIEW REQUIRED
- Exception authority/reference, if any:
- Review/expiry date:
- Independent reviewer stable subject ID:
- Reviewed at:

The subject must not approve or verify this assessment themselves.
""",
        "TEMPLATE_INDEPENDENT_EVIDENCE_VERIFICATION_2026-08-19.md": prefix.format(title="Independent evidence verification") + common + """## Artifact

- Evidence type:
- Producer stable subject ID:
- Subject/signatory stable subject ID:
- Expected immutable URI:
- Expected SHA-256:
- Contract artifact/version/path/SHA-256:
- Decision ID and selected option:
- Required canonical role:
- Authority reference:
- Signature/envelope reference:
- Authentication evidence reference:

## Verification procedure

1. Resolve the exact artifact through the approved evidence store/provider.
2. Confirm tenant, subject, role, authority period and decision binding.
3. Confirm fresh authentication precedes approval by no more than ten minutes.
4. Recompute SHA-256 from the resolved final bytes.
5. Confirm producer, signer and verifier separation under policy.
6. Record pass/fail without changing the producer's artifact.

## Result

- Resolved successfully: PASS / FAIL
- Recomputed SHA-256:
- Hash match: PASS / FAIL
- Contract hash match: PASS / FAIL
- Role/authority match: PASS / FAIL
- Authentication window: PASS / FAIL
- SoD/COI valid: PASS / FAIL
- Verification result: VERIFIED / REJECTED
- Verifier stable subject ID:
- Verifier role/authority reference:
- Verified at:
- Failure reason/remediation:
""",
    }


def render_pdfs(markdown_paths: list[Path]) -> None:
    def evidence_page_decor(canvas, document) -> None:
        canvas.saveState()
        width, height = pdf_base.A4
        if document.page > 1:
            canvas.setStrokeColor(pdf_base.RULE)
            canvas.setLineWidth(0.5)
            canvas.line(18 * pdf_base.mm, height - 13 * pdf_base.mm, width - 18 * pdf_base.mm, height - 13 * pdf_base.mm)
            canvas.setFont("Helvetica-Bold", 7.5)
            canvas.setFillColor(pdf_base.NAVY)
            canvas.drawString(18 * pdf_base.mm, height - 10 * pdf_base.mm, "STOQUIFY")
            canvas.setFont("Helvetica", 7.5)
            canvas.setFillColor(pdf_base.MUTED)
            canvas.drawRightString(width - 18 * pdf_base.mm, height - 10 * pdf_base.mm, "Cameroon HRIS / payroll authority")
        canvas.setStrokeColor(pdf_base.RULE)
        canvas.line(18 * pdf_base.mm, 13 * pdf_base.mm, width - 18 * pdf_base.mm, 13 * pdf_base.mm)
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(pdf_base.MUTED)
        canvas.drawString(18 * pdf_base.mm, 9 * pdf_base.mm, DATE)
        canvas.drawRightString(width - 18 * pdf_base.mm, 9 * pdf_base.mm, f"{document.page:02d}")
        canvas.restoreState()

    pdf_base.DATE = DATE
    pdf_base.page_decor = evidence_page_decor
    for path in markdown_paths:
        pdf_base.build_document(
            path,
            path.with_suffix(".pdf"),
            "CAMEROON HRIS / PAYROLL AUTHORITY EVIDENCE",
            "Employment, statutory provenance, governance authority and G1 approval readiness",
        )


def manifest() -> str:
    entries = []
    for path in sorted(OUT.rglob("*")):
        if not path.is_file() or path.name.endswith(".sha256"):
            continue
        entries.append(f"{sha256(path)}  {rel(path)}")
    return "\n".join(entries) + "\n"


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    TEMPLATES.mkdir(parents=True, exist_ok=True)

    prefill = load_json(PREFILL_PATH)
    finalization = load_json(FINALIZATION_PATH)
    repo = repository_evidence()
    sources = legal_sources()
    requirements = document_requirements()
    fields = field_register()
    bridge_json, bridge_md = build_bridge(prefill, finalization)

    major = {
        f"CAMEROON_HRIS_PAYROLL_PLAIN_LANGUAGE_GUIDE_{DATE}.md": build_plain_language(prefill),
        f"CAMEROON_HRIS_PAYROLL_LEGAL_SOURCE_REGISTER_{DATE}.md": build_legal_source_markdown(sources),
        f"CAMEROON_EMPLOYMENT_DOCUMENT_REQUIREMENTS_MATRIX_{DATE}.md": build_document_matrix_markdown(requirements, fields),
        f"CAMEROON_HRIS_SCHEMA_AND_DATA_GAP_REPORT_{DATE}.md": build_schema_gap_markdown(prefill, repo),
        f"CAMEROON_G1_AUTHORITY_EVIDENCE_BRIDGE_{DATE}.md": bridge_md,
        f"CAMEROON_HRIS_AUTHORITY_MODULE_DESIGN_{DATE}.md": build_module_design(),
        f"CAMEROON_HRIS_AUTHORITY_IMPLEMENTATION_BACKLOG_{DATE}.md": build_backlog(),
        f"CAMEROON_HRIS_UNRESOLVED_GOVERNANCE_DECISIONS_{DATE}.md": build_unresolved(),
    }
    for filename, content in major.items():
        write_text(OUT / filename, content)

    write_json(OUT / f"CAMEROON_HRIS_PAYROLL_LEGAL_SOURCE_REGISTER_{DATE}.json", {
        "schemaVersion": "1.0.0",
        "generatedAt": GENERATED_AT,
        "classification": "SOURCE_PROVENANCE_NOT_LEGAL_CERTIFICATION",
        "legalReviewRequired": True,
        "sources": sources,
    })
    write_json(OUT / f"CAMEROON_EMPLOYMENT_DOCUMENT_REQUIREMENTS_MATRIX_{DATE}.json", {
        "schemaVersion": "1.0.0",
        "generatedAt": GENERATED_AT,
        "classification": "REQUIREMENTS_ASSESSMENT_NOT_COMPLIANCE_CERTIFICATION",
        "legalReviewRequired": True,
        "requirements": requirements,
        "fields": fields,
    })
    write_json(OUT / f"CAMEROON_G1_AUTHORITY_EVIDENCE_BRIDGE_{DATE}.json", bridge_json)
    write_json(OUT / f"CAMEROON_HRIS_REPOSITORY_EVIDENCE_REGISTER_{DATE}.json", {
        "schemaVersion": "1.0.0",
        "generatedAt": GENERATED_AT,
        "repositoryEvidence": repo,
        "liveRegisterModified": False,
    })

    template_paths = []
    for filename, content in templates().items():
        path = TEMPLATES / filename
        write_text(path, content)
        template_paths.append(path)

    major_paths = [OUT / filename for filename in major]
    render_pdfs(major_paths + template_paths)

    write_text(OUT / f"CAMEROON_HRIS_PAYROLL_AUTHORITY_ARTIFACTS_{DATE}.sha256", manifest())
    print(json.dumps({
        "output": rel(OUT),
        "majorMarkdown": len(major_paths),
        "templates": len(template_paths),
        "pdfs": len(major_paths) + len(template_paths),
        "legalSources": len(sources),
        "documentRequirements": len(requirements),
        "dataFields": len(fields),
        "g1Obligations": len(bridge_json["obligations"]),
    }, indent=2))


if __name__ == "__main__":
    main()
