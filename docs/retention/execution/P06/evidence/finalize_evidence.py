"""P06 artifact-only finalization; no application or database commands."""
from pathlib import Path
import datetime
import difflib
import hashlib
import json
import re
import subprocess

EVIDENCE = Path(__file__).resolve().parent
ROOT = EVIDENCE.parents[4]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() else None


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


baseline = read(EVIDENCE / "INITIAL_BASELINE.json")
owned = {
    "services/pos/__tests__/offline-sync.service.test.ts": "offline-sync.service.test.ts.before.txt",
    "lib/pos/__tests__/offline-local-queue.test.ts": "offline-local-queue.test.ts.before.txt",
}
patch = ""
preservation = {}
for path, before_name in owned.items():
    before = (EVIDENCE / before_name).read_bytes()
    after = (ROOT / path).read_bytes()
    changes = [op for op in difflib.SequenceMatcher(None, before.splitlines(True), after.splitlines(True)).get_opcodes() if op[0] != "equal"]
    preservation[path] = all(op[0] == "insert" for op in changes)
    patch += "".join(difflib.unified_diff(before.decode("utf-8").splitlines(True), after.decode("utf-8").splitlines(True), fromfile="before/" + path, tofile="after/" + path))
config = "jest.retention-offline.config.cjs"
patch += "".join(difflib.unified_diff([], (ROOT / config).read_text(encoding="utf-8").splitlines(True), fromfile="/dev/null", tofile="after/" + config))
(EVIDENCE / "OWNED_CODE.patch").write_text(patch, encoding="utf-8")
extra = [
    config, "actions/pos/sync.actions.ts", "actions/pos/offline-review.actions.ts", "services/_shared/protect.ts",
    "components/pos/ProfessionalPOSSystem.tsx", "components/pos/offline/OfflineSyncStatusStrip.tsx",
    "jest.setup.ts", "docs/ecc/test-lanes.md", "prisma/schema.prisma",
]
manifest = {path: sha(ROOT / path) for path in sorted(set(baseline["selected"]) | set(extra))}
(EVIDENCE / "SOURCE_MANIFEST.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
register = "docs/retention/execution/STATUS.md"
prior_drift = [path for path, old in baseline["prior_artifacts"].items() if path != register and sha(ROOT / path) != old]
unowned_drift = [path for path, old in baseline["selected"].items() if path not in owned and sha(ROOT / path) != old]
before_status = (EVIDENCE / "STATUS_BEFORE.txt").read_bytes()
after_status = (ROOT / register).read_bytes()
strip_p06 = lambda data: b"".join(line for line in data.splitlines(True) if not line.startswith(b"| [P06]"))
checks = {
    "head_unchanged": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip() == baseline["head"],
    "prior_artifacts_unchanged": not prior_drift,
    "selected_production_sources_unchanged": not unowned_drift,
    "test_original_bytes_preserved": all(preservation.values()),
    "only_p06_status_row_changed": strip_p06(before_status) == strip_p06(after_status),
    "baseline_status_snapshot_matches": sha(EVIDENCE / "STATUS_BEFORE.txt") == baseline["prior_artifacts"][register],
}
broken = []
for doc in EVIDENCE.parent.glob("*.md"):
    for target in re.findall(r"\]\(([^)]+)\)", doc.read_text(encoding="utf-8")):
        if "://" in target or target.startswith("#"):
            continue
        resolved = (doc.parent / target.split("#", 1)[0]).resolve()
        if resolved != EVIDENCE / "VALIDATION.json" and not resolved.exists():
            broken.append({"file": doc.name, "target": target})
checks["links_resolve"] = not broken
result = {
    "utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "artifact_validation": "PASS" if all(checks.values()) else "FAIL",
    "p06_status": "PARTIAL — predecessor and real DB/application-browser proof incomplete",
    "checks": checks, "prior_artifacts_checked": len(baseline["prior_artifacts"]) - 1,
    "prior_artifact_drift": prior_drift, "unowned_selected_drift": unowned_drift,
    "test_preservation": preservation, "broken_links": broken,
    "limitation": "Scoped artifact/source integrity only; does not execute or certify application tests.",
}
(EVIDENCE / "VALIDATION.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps(result, indent=2))
raise SystemExit(0 if all(checks.values()) else 1)
