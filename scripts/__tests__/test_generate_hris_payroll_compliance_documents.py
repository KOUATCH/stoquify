from __future__ import annotations

import copy
import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "generate-hris-payroll-compliance-documents.py"
SPEC = importlib.util.spec_from_file_location("generate_hris_payroll_compliance_documents", SCRIPT)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"Unable to load {SCRIPT}")
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class ComplianceAuthorizationDocumentGeneratorTests(unittest.TestCase):
    def setUp(self) -> None:
        self.source_register = MODULE.load_source_register()
        self.snapshot = MODULE.load_json(MODULE.SNAPSHOT_JSON)
        self.gate_statuses = MODULE.load_gate_statuses()

    def test_source_register_is_hash_verified_and_not_self_referential(self) -> None:
        source_paths = {
            item["path"].replace("\\", "/")
            for item in self.source_register["sourceArtifacts"]
        }
        self.assertNotIn(MODULE.repository_path(MODULE.TARGET_DOCX), source_paths)
        MODULE.validate_source_register(self.source_register)

    def test_every_claim_resolves_to_complete_evidence_requirements(self) -> None:
        claims = MODULE.enriched_claims(self.source_register)
        self.assertGreater(len(claims), 0)
        for claim in claims:
            for field in MODULE.REQUIRED_EVIDENCE_REQUEST_FIELDS:
                self.assertIn(field, claim, f'{claim["id"]} is missing {field}')

    def test_unsupported_yes_claims_receive_zero_approval_credit(self) -> None:
        claims = {item["id"]: item for item in self.source_register["claims"]}
        self.assertEqual(
            claims["production_authorization_claim"]["disposition"],
            "REJECTED_AS_UNSUPPORTED",
        )
        self.assertEqual(
            claims["statutory_fiscal_authorization_claim"]["disposition"],
            "REJECTED_AS_UNSUPPORTED",
        )

    def test_identity_conflicts_remain_explicit_and_human_owned(self) -> None:
        conflicts = {item["id"]: item for item in self.source_register["identityConflicts"]}
        self.assertEqual(conflicts["checker_yonga_name_conflict"]["status"], "REQUIRES_HUMAN_REVIEW")
        self.assertEqual(conflicts["kouatchoua_mark_transcription_conflict"]["status"], "REQUIRES_HUMAN_REVIEW")

    def test_missing_evidence_request_fields_fail_validation(self) -> None:
        invalid = copy.deepcopy(self.source_register)
        invalid["evidenceRequests"]["production_authorization"].pop("acceptanceTest")
        with self.assertRaisesRegex(ValueError, "acceptanceTest"):
            MODULE.validate_source_register(invalid)

    def test_machine_register_never_authorizes_production(self) -> None:
        register = MODULE.build_evidence_register(
            self.snapshot,
            self.source_register,
            self.gate_statuses,
        )
        self.assertFalse(register["assertions"]["productionAuthorized"])
        self.assertFalse(register["assertions"]["statutoryOrFiscalCertified"])
        self.assertFalse(register["assertions"]["liveAuthoritySubmissionPermitted"])

    def test_default_cli_does_not_generate_or_read_credentials(self) -> None:
        with patch.object(sys, "argv", [str(SCRIPT)]):
            args = MODULE.parse_args()
        self.assertFalse(args.include_credential_document)

    def test_word_lock_routes_output_to_side_by_side_candidate(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "Compliance authorization validation.docx"
            target.write_bytes(b"existing")
            MODULE.word_lock_path(target).write_bytes(b"lock")
            output, locked = MODULE.safe_output_path(target)
            self.assertTrue(locked)
            self.assertEqual(output.name, "Compliance authorization validation.candidate.docx")

    def test_compliance_docx_generation_is_deterministic_for_frozen_inputs(self) -> None:
        evidence = MODULE.build_evidence_register(
            self.snapshot,
            self.source_register,
            self.gate_statuses,
        )
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "compliance.docx"
            MODULE.build_compliance_document(self.snapshot, self.source_register, evidence, output)
            first_hash = MODULE.sha256(output)
            MODULE.build_compliance_document(self.snapshot, self.source_register, evidence, output)
            self.assertEqual(first_hash, MODULE.sha256(output))


if __name__ == "__main__":
    unittest.main()
