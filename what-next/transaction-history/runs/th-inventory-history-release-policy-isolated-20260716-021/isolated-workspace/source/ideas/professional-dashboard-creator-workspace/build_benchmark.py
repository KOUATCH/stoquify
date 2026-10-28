"""Build a schema-correct benchmark.json + upgrade grading.json files."""
from __future__ import annotations
import json
from pathlib import Path
from datetime import datetime, timezone

WORKSPACE = Path(r"C:\Users\J COMPUTER\.claude\skills\professional-dashboard-creator-workspace\iteration-1")

# Upgrade grading.json: add `summary` and `timing` blocks per skema
for eval_dir in sorted(WORKSPACE.iterdir()):
    if not eval_dir.is_dir() or not eval_dir.name.startswith("eval-"):
        continue
    for variant in ("with_skill", "without_skill"):
        vd = eval_dir / variant
        if not (vd / "outputs").exists():
            continue
        grading_path = vd / "grading.json"
        timing_path = vd / "timing.json"
        if not grading_path.exists():
            continue
        grading = json.loads(grading_path.read_text())
        timing = json.loads(timing_path.read_text()) if timing_path.exists() else {}

        # Re-shape into schema-correct grading.json
        passed = grading.get("passed", 0)
        total = grading.get("total", 0)
        grading["summary"] = {
            "passed": passed,
            "failed": total - passed,
            "total": total,
            "pass_rate": grading.get("pass_rate", 0),
        }
        grading["timing"] = {
            "executor_duration_seconds": timing.get("total_duration_seconds", 0),
            "total_duration_seconds": timing.get("total_duration_seconds", 0),
        }
        grading["execution_metrics"] = {
            "total_tool_calls": timing.get("tool_uses", 0),
            "total_steps": timing.get("tool_uses", 0),
        }
        grading_path.write_text(json.dumps(grading, indent=2))

# Build benchmark.json in expected shape
runs = []
configs = set()
for eval_dir in sorted(WORKSPACE.iterdir()):
    if not eval_dir.is_dir() or not eval_dir.name.startswith("eval-"):
        continue
    meta = json.loads((eval_dir / "eval_metadata.json").read_text())
    for variant in ("with_skill", "without_skill"):
        vd = eval_dir / variant
        if not (vd / "outputs").exists():
            continue
        grading = json.loads((vd / "grading.json").read_text())
        timing = json.loads((vd / "timing.json").read_text()) if (vd / "timing.json").exists() else {}
        configs.add(variant)
        runs.append({
            "eval_id": meta["eval_id"],
            "eval_name": meta["eval_name"],
            "configuration": variant,
            "run_number": 1,
            "result": {
                "pass_rate": grading.get("pass_rate", 0),
                "passed": grading.get("passed", 0),
                "failed": grading.get("total", 0) - grading.get("passed", 0),
                "total": grading.get("total", 0),
                "time_seconds": timing.get("total_duration_seconds", 0),
                "tokens": timing.get("total_tokens", 0),
                "tool_calls": timing.get("tool_uses", 0),
                "errors": 0,
            },
        })

# Aggregate per configuration
def agg(config_name):
    cs = [r for r in runs if r["configuration"] == config_name]
    if not cs:
        return None
    n = len(cs)
    pr = sum(r["result"]["pass_rate"] for r in cs) / n
    t = sum(r["result"]["time_seconds"] for r in cs) / n
    tk = sum(r["result"]["tokens"] for r in cs) / n
    return {"name": config_name, "runs": n, "mean_pass_rate": pr, "mean_time_seconds": t, "mean_tokens": tk}

aggregates = [agg(c) for c in ["with_skill", "without_skill"] if agg(c)]

benchmark = {
    "metadata": {
        "skill_name": "professional-dashboard-creator",
        "skill_path": str(Path(r"C:\Users\J COMPUTER\.claude\skills\professional-dashboard-creator")),
        "executor_model": "claude-sonnet (subagent)",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "evals_run": sorted(set(r["eval_id"] for r in runs)),
        "runs_per_configuration": 1,
        "note": "All 5 with-skill agents hit a session limit before writing RUN-NOTES.md and quality-gates-plan.md, but produced full Phase 0-3 artifacts (DASHBOARD-INSPIRATION.md, IA-NOTES.md, DASHBOARD-SPEC.md) and 3 of 5 produced sample widget files. Baseline (no skill) completed all artifacts but did zero design research."
    },
    "runs": runs,
    "aggregates": aggregates,
}

bp = WORKSPACE / "benchmark.json"
bp.write_text(json.dumps(benchmark, indent=2))
print(f"Wrote {bp}")
print()
for a in aggregates:
    print(f"  {a['name']}: pass_rate={a['mean_pass_rate']:.2f}, time={a['mean_time_seconds']:.1f}s, tokens={a['mean_tokens']:.0f} (n={a['runs']})")
