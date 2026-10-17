"""Read-only repository checks; writes only this P05 run's VALIDATION.json."""
from pathlib import Path
import datetime
import difflib
import hashlib
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parents[5]
EVIDENCE = Path(__file__).resolve().parent


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest() if path.exists() else None


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


baseline = read_json(EVIDENCE / "INITIAL_BASELINE.json")
owned = {
    "services/pos/pos.service.ts": "pos.service.ts.before.txt",
    "services/pos/__tests__/pos.service.test.ts": "pos.service.test.ts.before.txt",
    "services/pos/__tests__/commit-recovery.service.test.ts": "commit-recovery.service.test.ts.before.txt",
    "services/pos/__tests__/pos-full-commit.postgres.test.ts": "pos-full-commit.postgres.test.ts.before.txt",
}
register = "docs/retention/execution/STATUS.md"
prior_drift = [path for path, sha in baseline["preserved"].items()
               if path != register and digest(ROOT / path) != sha]
selected_drift = [path for path, sha in baseline["selected"].items()
                  if digest(ROOT / path) != sha]
unexpected_selected_drift = [path for path in selected_drift if path not in owned]
preservation = {}
for path, snapshot in owned.items():
    before = (EVIDENCE / snapshot).read_bytes()
    after = (ROOT / path).read_bytes()
    if path.endswith("/pos.service.ts"):
        expected = before.replace(
            b'      if (!retained || posSaleCommitRequestHash(rawInput, retained) !== requestHash)',
            b'      // The payload hash excludes the operation key; both must match retained intent.\r\n'
            b'      if (!retained || retained.clientCommitId !== input.clientCommitId || posSaleCommitRequestHash(rawInput, retained) !== requestHash)',
            1,
        )
        preservation[path] = {"only_owned_predicate_and_comment": after == expected}
    else:
        opcodes = difflib.SequenceMatcher(None, before.splitlines(keepends=True), after.splitlines(keepends=True)).get_opcodes()
        changes = [opcode for opcode in opcodes if opcode[0] != "equal"]
        preservation[path] = {"only_additions_original_bytes_preserved": all(op[0] == "insert" for op in changes),
                              "insertion_blocks": len(changes)}
before_status = (EVIDENCE / "STATUS_BEFORE.txt").read_bytes()
after_status = (ROOT / register).read_bytes()
strip_p05 = lambda raw: b"".join(line for line in raw.splitlines(keepends=True) if not line.startswith(b"| [P05]"))
status_valid = (strip_p05(before_status) == strip_p05(after_status)
                and digest(EVIDENCE / "STATUS_BEFORE.txt") == baseline["preserved"][register]
                and len([line for line in after_status.splitlines() if line.startswith(b"| [P05]") and b"PARTIAL" in line]) == 1)
p01 = []
for name in ["SOURCE_MANIFEST.json", "SUPPLEMENTARY_SOURCE_MANIFEST.json"]:
    p01 += read_json(ROOT / "docs/retention/execution/P01/evidence" / name)
p01_drift = [entry["path"] for entry in p01 if digest(ROOT / entry["path"]) != entry["sha256_raw"]]
results = {}
for name in ["CHECKOUT_RECOVERY_AFTER.json", "CHECKOUT_LIFECYCLE_FINAL.json", "PENDING_REQUEST_RESULTS.json"]:
    result = read_json(EVIDENCE / name)
    results[name] = {key: result[key] for key in ["success", "numPassedTests", "numFailedTests", "numPendingTests", "numPassedTestSuites"]}
red = read_json(EVIDENCE / "RETAINED_IDENTITY_BEFORE.json")
links = []
for doc in EVIDENCE.parent.glob("*.md"):
    for target in re.findall(r"\]\(([^)]+)\)", doc.read_text(encoding="utf-8")):
        if "://" in target or target.startswith("#"):
            continue
        path = target.split("#", 1)[0]
        if not (doc.parent / path).exists():
            links.append({"document": doc.name, "target": target})
head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
source_manifest = read_json(EVIDENCE / "SOURCE_MANIFEST.json")
manifest_drift = [path for path, sha in source_manifest.items() if digest(ROOT / path) != sha]
checks = {
    "head_unchanged": head == baseline["head"],
    "prior_83_artifacts_unchanged": len(baseline["preserved"]) - 1 == 83 and not prior_drift,
    "only_p05_register_row_changed": status_valid,
    "selected_unowned_sources_unchanged": not unexpected_selected_drift,
    "original_source_and_test_bytes_preserved_except_owned_additions": all(
        all(value for key, value in details.items() if key != "insertion_blocks") for details in preservation.values()),
    "p01_drift_only_owned": all(path in owned for path in p01_drift),
    "manifest_matches_final_source": not manifest_drift,
    "green_109_tests_6_suites_zero_skips": (sum(r["numPassedTests"] for r in results.values()) == 109
        and sum(r["numPassedTestSuites"] for r in results.values()) == 6
        and all(r["success"] and r["numFailedTests"] == 0 and r["numPendingTests"] == 0 for r in results.values())),
    "red_reproduced_one_failure": red["numFailedTests"] == 1 and red["numPassedTests"] == 1 and not red["success"],
    "local_artifact_links_resolve": not links,
}
report = {
    "utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "artifact_validation": "PASS" if all(checks.values()) else "FAIL",
    "p05_execution_state": "PARTIAL — mandatory real database and browser verification NOT_RUN",
    "checks": checks, "prior_artifact_drift": prior_drift,
    "selected_owned_source_drift": selected_drift, "unexpected_selected_drift": unexpected_selected_drift,
    "preservation": preservation, "p01_fingerprint_count": len(p01), "p01_final_drift": p01_drift,
    "source_manifest_drift": manifest_drift, "test_results": results, "broken_links": links,
    "limitations": "Hashes cover selected sources and all prior retention artifacts captured at start, not every dirty file. No database, browser or application command is run by this validator.",
}
(EVIDENCE / "VALIDATION.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
raise SystemExit(0 if all(checks.values()) else 1)
