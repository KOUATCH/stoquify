"""Read-only PDF QA; write artifacts only under this run's pdf-qa directory."""
import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
import pypdf
import pypdfium2 as pdfium

HERE = Path(__file__).resolve().parent
RUN = HERE.parent
ROOT = RUN.parents[2]
DEST = ROOT / "docs/system-audit"


def compact(text):
    return re.sub(r"\s+", " ", text).strip()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--publisher-completed", action="store_true", required=True)
    parser.parse_args()
    inputs = json.loads((RUN / "publication-inputs.json").read_text(encoding="utf-8-sig"))
    names = [Path(source).name for source in inputs["sources"]] + [inputs["indexName"]]
    report = {
        "checkedAt": datetime.now(timezone.utc).isoformat(),
        "scope": "19 newly published PDFs; page extraction and bounded rendered-page review",
        "tools": {"pypdf": pypdf.__version__, "pypdfium2": str(pdfium.PYPDFIUM_INFO)},
        "pdfs": [], "semanticChecks": {}, "renderedPages": [], "failures": [],
        "visualReview": "Pending separate inspection of rendered images",
        "markdownPreservation": "Parent verifies source/archive byte hashes against publication-baseline.json separately",
    }
    texts = {}
    for name in names:
        path = DEST / Path(name).with_suffix(".pdf")
        item = {"name": path.name, "bytes": path.stat().st_size,
                "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}
        try:
            reader = pypdf.PdfReader(str(path), strict=True)
            page_texts = [page.extract_text() or "" for page in reader.pages]
            item.update({"pages": len(reader.pages), "textCharactersPerPage": [len(compact(t)) for t in page_texts],
                         "pageSizesPoints": [[round(float(page.mediabox.width), 2), round(float(page.mediabox.height), 2)] for page in reader.pages]})
            item["allPagesNonempty"] = len(page_texts) > 0 and all(compact(text) for text in page_texts)
            if not item["allPagesNonempty"]:
                report["failures"].append(f"Empty pages: {path.name}")
            texts[name] = compact(" ".join(page_texts))
            pdf = pdfium.PdfDocument(str(path))
            outside = []
            for index in range(len(pdf)):
                page = pdf[index]
                width, height = page.get_size()
                textpage = page.get_textpage()
                count = 0
                for char_index in range(textpage.count_chars()):
                    left, bottom, right, top = textpage.get_charbox(char_index)
                    if left < -1 or bottom < -1 or right > width + 1 or top > height + 1:
                        count += 1
                outside.append(count)
                textpage.close()
                page.close()
            item["characterBoxesOutsidePage"] = outside
            if any(outside):
                report["failures"].append(f"Character geometry requires review: {path.name}")
            if name in {"EXECUTION_REPORT.md", "EXECUTION_REGISTER.md", inputs["indexName"], "findings.md"}:
                for index in sorted({0, len(pdf) // 2, len(pdf) - 1}):
                    page = pdf[index]
                    image = page.render(scale=1.7).to_pil()
                    output = HERE / f"{Path(name).stem}-page-{index + 1:02d}.png"
                    image.save(output)
                    report["renderedPages"].append({"pdf": path.name, "page": index + 1, "image": output.name,
                                                    "pixels": list(image.size)})
                    page.close()
            pdf.close()
            item["parsed"] = True
        except Exception as error:
            item["parsed"] = False
            item["error"] = f"{type(error).__name__}: {error}"
            report["failures"].append(f"PDF inspection failed: {path.name}")
        report["pdfs"].append(item)
    checks = report["semanticChecks"]
    checks["latestReportReleaseBlocked"] = "release remains blocked" in texts.get("EXECUTION_REPORT.md", "").lower()
    checks["latestRegisterNoReleaseApproved"] = "roadmap is not complete and no release is approved" in texts.get("EXECUTION_REGISTER.md", "").lower()
    checks["indexReleaseBlocked"] = "roadmap in progress; release blocked" in texts.get(inputs["indexName"], "").lower()
    expected = {f"R{number:02d}" for number in range(38)}
    for name, label in [("04_IMPLEMENTATION_ROADMAP.md", "roadmap"), ("EXECUTION_REGISTER.md", "register")]:
        found = set(re.findall(r"\bR\d{2}\b", texts.get(name, "")))
        checks[f"{label}PackageIds"] = sorted(found)
        checks[f"{label}HasAllR00ThroughR37"] = expected.issubset(found)
    for name, result in checks.items():
        if result is False:
            report["failures"].append(f"Semantic check failed: {name}")
    report["summary"] = {"pdfCount": len(report["pdfs"]), "totalPages": sum(item.get("pages", 0) for item in report["pdfs"]),
                         "renderedPageCount": len(report["renderedPages"]), "automatedChecksPass": not report["failures"]}
    (HERE / "pdf-inspection.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"summary": report["summary"], "failures": report["failures"], "semanticChecks": checks}))
    raise SystemExit(0 if not report["failures"] else 1)


if __name__ == "__main__":
    main()
