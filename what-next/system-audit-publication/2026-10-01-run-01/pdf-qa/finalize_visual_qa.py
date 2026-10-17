"""Record bounded visual review and verify table tokens split by PDF line wraps."""
from collections import Counter
from datetime import datetime, timezone
import json
from pathlib import Path
import re
from pypdf import PdfReader

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parents[2]
initial = json.loads((HERE / "pdf-inspection.json").read_text())
text = "\n".join(page.extract_text() or "" for page in PdfReader(str(ROOT / "docs/system-audit/EXECUTION_REGISTER.pdf")).pages)
found = sorted({"R" + number for number in re.findall(r"\bR\s*(\d{2})\b", text)})
table = text.split("Package status", 1)[1].split("Evidence and completion rules", 1)[0]
labels = ["CONDITIONAL_NOT_STARTED", "NOT_STARTED", "PARTIAL"]
pattern = r"\b(?:" + "|".join(r"\s*".join(label) for label in labels) + r")\b"
counts = dict(Counter(re.sub(r"\s+", "", match) for match in re.findall(pattern, table)))
passed = found == [f"R{number:02d}" for number in range(38)] and counts == {"PARTIAL": 12, "NOT_STARTED": 22, "CONDITIONAL_NOT_STARTED": 4}
assert passed, "Register line-wrap normalization did not recover expected packages and statuses"
assert initial["failures"] == ["Semantic check failed: registerHasAllR00ThroughR37"], "Unexpected initial failure requires review"
result = {
    "checkedAt": datetime.now(timezone.utc).isoformat(),
    "status": "PASS_WITH_MINOR_LAYOUT_LIMITATION",
    "pdfCount": 19, "pageCount": 115,
    "initialReceipt": "pdf-inspection.json",
    "initialCheckDisposition": "Contiguous ID regex missed register IDs visibly wrapped over two lines; underlying content is present. Initial result preserved unchanged.",
    "registerPackageIdsAfterLineWrapNormalization": found,
    "registerTableStatusCountsAfterLineWrapNormalization": counts,
    "latestReleaseBlockedStatementsPresent": True,
    "roadmapR00ThroughR37Present": True,
    "allPdfsParsedAndAllPagesHaveText": True,
    "characterBoxesOutsidePageBounds": 0,
    "visualPagesReviewed": initial["renderedPages"],
    "visualResult": "No material clipping, missing table content, text overlap or illegible headings observed in the 11 sampled rendered pages.",
    "minorLayoutIssue": "Narrow first columns split register IDs (R then 00) and findings IDs (F0 then 1). Register long status labels wrap across lines. Content remains readable, but simple contiguous text searches can miss these labels.",
    "sourcePreservation": "Root separately verified 18 source/archive SHA256 matches and preservation of prior non-PDF artifacts.",
    "writes": "QA scripts, receipts and rendered page PNGs only, under this pdf-qa directory",
    "limitations": "Visual inspection sampled first/middle/final report, register and findings pages plus both index pages. Text parsing and geometric bounds checks covered all 115 pages; this is not an exhaustive visual review of every page or a fresh platform audit."
}
(HERE / "visual-review.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"status": result["status"], "pages": result["pageCount"], "registerPackages": len(found), "registerStatuses": counts, "visualPages": len(result["visualPagesReviewed"])}))
