"""Summarize existing P06 test JSON; never runs tests or accesses a database."""
from pathlib import Path
import json

HERE = Path(__file__).resolve().parent
prefix = "node node_modules/jest/bin/jest.js --config jest.retention-offline.config.cjs --runInBand --no-cache "
lanes = [
    ("M", "service", "OFFLINE_SERVICE_FINAL.json", "--runTestsByPath services/pos/__tests__/offline-sync.service.test.ts"),
    ("M", "hooks", "OFFLINE_HOOK_FINAL.json", "--env=jsdom --runTestsByPath hooks/posHooks/__tests__/offline-flush-recovery.test.ts hooks/posHooks/__tests__/offline-dashboard-scope.test.ts"),
    ("B", "isolated browser storage", "OFFLINE_BROWSER_EXPLICIT_CACHE.json", "--runTestsByPath lib/pos/__tests__/offline-local-queue.test.ts"),
]
rows = []
for evidence_class, name, filename, args in lanes:
    result = json.loads((HERE / filename).read_text(encoding="utf-8"))
    rows.append({
        "class": evidence_class, "lane": name, "date": "2026-10-17",
        "command": prefix + args + " --json --outputFile docs/retention/execution/P06/evidence/" + filename,
        "shell": "PowerShell -> reviewed Python subprocess wrapper" if evidence_class == "B" else "C:/Windows/System32/cmd.exe", "evidence": filename,
        "exit_code": 0 if result["success"] else 1,
        "environment_override": {"PLAYWRIGHT_BROWSERS_PATH": "C:/Users/J COMPUTER/AppData/Local/ms-playwright"} if evidence_class == "B" else {},
        "execution_boundary": "Escalated isolated localhost fixture after sandbox network denial; no application database" if evidence_class == "B" else "Default sandbox",
        "success": result["success"], "passed": result["numPassedTests"], "failed": result["numFailedTests"],
        "skipped": result["numPendingTests"], "passed_suites": result["numPassedTestSuites"],
        "failed_suites": result["numFailedTestSuites"],
        "suites": [{"path": suite["name"], "status": suite["status"], "cases": len(suite["assertionResults"])} for suite in result["testResults"]],
        "limitation": "Isolated real Chromium queue helper; no application/DB/ingestion" if evidence_class == "B" else "Mocked Prisma/commit or transport/query/queue collaborators; no real database",
    })
report = {
    "prompt": "P06", "state": "PARTIAL", "started": "2026-10-16", "resumed": "2026-10-17",
    "workflow": {"command": "npm run agent:workflow:check", "exit_code": 0, "unclassified_scripts": 196,
        "dates": ["2026-10-16", "2026-10-17"], "side_effect_review": "Current package script, absent hooks, registry and fs/path/crypto-only runner inspected. No application commands executed by validator."},
    "runtime": {"node": "22.17.0", "jest": "30.4.1", "configuration": "jest.retention-offline.config.cjs", "next_project_dir": None},
    "final_lanes": rows,
    "mocked_passed": sum(row["passed"] for row in rows if row["class"] == "M"),
    "isolated_browser_passed": sum(row["passed"] for row in rows if row["class"] == "B"),
    "new_cases": {"mocked_service": 7, "isolated_browser": 1},
    "earlier_attempts": [
        {"lane": "browser explicit cache in sandbox", "exit_code": 1, "evidence": "OFFLINE_BROWSER_SANDBOX_DENIED.json", "log": "BROWSER_SANDBOX_DENIED_LOG.txt", "results": "Chromium launched; all 19 cases failed in setup navigating to isolated localhost with ERR_NETWORK_ACCESS_DENIED; no queue assertions ran"},
        {"lane": "browser default cache", "exit_code": 1, "evidence": "OFFLINE_BROWSER_FINAL.json", "results": "19 cases failed at shared browser launch; Chromium not found in sandbox-specific cache; no browser behavior exercised"},
        {"lane": "browser cmd cache override attempt", "exit_code": 1, "evidence": "OFFLINE_BROWSER_CACHED.json", "results": "19 cases failed at shared launch; attempted cmd env assignment was ineffective; still resolved sandbox-specific cache"},
        {"lane": "browser PowerShell direct retry", "exit_code": 1, "results": "Interrupted after no output or result JSON; no behavioral evidence"},
        {"lane": "Python cmd wrapper launch", "exit_code": 1, "results": "cmd executable quoting failed before Python ran; retried with PowerShell invocation"},
        {"lanes": ["service", "hooks", "browser"], "started": "2026-10-16", "exit_code": 1073807364, "results": "No test JSON/output; not passes; termination cause not established", "commands": [prefix + args + " --json --outputFile docs/retention/execution/P06/evidence/" + name for _, _, name, args in [
            ("M", "service", "OFFLINE_SERVICE_RESULTS.json", lanes[0][3]),
            ("M", "hooks", "OFFLINE_HOOK_RESULTS.json", lanes[1][3]),
            ("B", "browser", "OFFLINE_BROWSER_RESULTS.json", lanes[2][3])]]},
        {"lane": "resumed PowerShell service", "exit_code": 1, "command": prefix + lanes[0][3] + " --json --outputFile docs/retention/execution/P06/evidence/OFFLINE_SERVICE_RESULTS.json", "results": "Interrupted after no result; not a test pass"},
        {"lane": "service fixture correction", "exit_code": 1, "passed": 40, "failed": 1, "evidence": "OFFLINE_SERVICE_CMD_RESULTS.json", "command": prefix + lanes[0][3] + " --json --outputFile docs/retention/execution/P06/evidence/OFFLINE_SERVICE_CMD_RESULTS.json", "reason": "New expired-device fixture used shared update mock that discarded expiry; corrected only the added fixture"},
    ],
    "not_run": {"D": "Real DB and complete ingestion/commit/acknowledgement concurrency; P05 prerequisite incomplete", "B_application": "Authenticated application checkout/recovery UI and local-only queue visibility at close", "P": "Provider/authority", "C": "Customer observations/retention", "E": "Qualified expert review", "O": "Operational restore/load/power-loss"},
    "browser_envelope_evidence": "BROWSER_RUN_LOG.txt, when the fixture emits P06_BROWSER_ENVELOPE; no package-version inference",
}
for line in (HERE / 'BROWSER_RUN_LOG.txt').read_text(encoding='utf-8').splitlines():
    if 'P06_BROWSER_ENVELOPE ' in line:
        report['observed_browser_envelope'] = json.loads(line.split('P06_BROWSER_ENVELOPE ', 1)[1])
        break
(HERE / "VERIFICATION.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"mocked_passed": report["mocked_passed"], "isolated_browser_passed": report["isolated_browser_passed"], "all_lanes_passed": all(row["success"] for row in rows)}))
