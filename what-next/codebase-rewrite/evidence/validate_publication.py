import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from pypdf import PdfReader
import pypdfium2 as pdfium

root = Path(__file__).resolve().parents[3]
archive = root / "docs/platform-evaluation"
evidence = root / "what-next/codebase-rewrite/evidence"
digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
report_names = ["baseline", "rewrite-plan", "progress", "reviewer-coverage", "verification", "final-report", "execution-roadmap"]
sources = [root / "what-next/codebase-rewrite" / (name + ".md") for name in report_names]
sources += [evidence / (name + ".md") for name in ["runtime-check", "service-boundary", "inventory-boundary"]]
copies = []
for source in sources:
    target = archive / source.name
    assert source.read_bytes() == target.read_bytes(), f"Report content changed: {source.name}"
    copies.append({"source": str(source), "destination": target.name, "sha256": digest(target), "byteIdentical": True})

attachment = Path(r"C:\Users\J COMPUTER\.codex\attachments\8fd37a6e-1e89-4396-9513-51f4a72a8cce\Pasted text.txt")
rewrite_prompt = archive / "codebase-review-rewrite-execution-prompt.md"
assert attachment.read_bytes() == rewrite_prompt.read_bytes(), "Original rewrite prompt changed"
copies.append({"source": str(attachment), "destination": rewrite_prompt.name, "sha256": digest(rewrite_prompt), "byteIdentical": True})
before = json.loads((evidence / "publication-archive-before.json").read_text(encoding="utf-8-sig"))
for entry in before:
    assert digest(archive / entry["name"]).lower() == entry["sha256"].lower(), f"Existing Markdown changed: {entry['name']}"

method_path = archive / "codebase-execution-method-prompt.md"
method = method_path.read_text(encoding="utf-8").rstrip("\n")
assert len(method) == 16768, "Execution-method prompt was truncated or modified"
assert method.startswith("Act as a Stoquify multidisciplinary principal")
assert method.endswith("for executing the first milestone.")
pairs = []
for markdown in sorted(archive.glob("*.md")):
    pdf = markdown.with_suffix(".pdf")
    assert pdf.is_file() and pdf.stat().st_size >= 1024, f"Missing/empty PDF: {pdf.name}"
    assert pdf.read_bytes().startswith(b"%PDF-"), f"Invalid PDF: {pdf.name}"
    reader = PdfReader(pdf)
    assert reader.pages, f"PDF has no pages: {pdf.name}"
    texts = [page.extract_text() or "" for page in reader.pages]
    assert all(text.strip() for text in texts), f"Empty PDF page: {pdf.name}"
    assert all(abs(float(page.mediabox.width) - 595.28) < 2 and abs(float(page.mediabox.height) - 841.89) < 2 for page in reader.pages), f"Non-A4 PDF: {pdf.name}"
    if markdown.name == method_path.name:
        normalized = " ".join(" ".join(texts).split())
        assert "13. Success criteria and boundaries" in normalized
        assert "for executing the first milestone." in normalized
    pairs.append({"markdown": markdown.name, "markdownSha256": digest(markdown), "pdf": pdf.name, "pdfSha256": digest(pdf), "pdfBytes": pdf.stat().st_size, "pages": len(reader.pages), "textCharacters": sum(map(len, texts)), "a4": True})

task_published_names = {entry["name"] for entry in before} | {source.name for source in sources}
assert len(task_published_names) == 19
current_names = {pair["markdown"] for pair in pairs}
assert task_published_names.issubset(current_names), "A task-published document is missing"
additional_root_documents = sorted(current_names - task_published_names)
# Other tasks may add documents beneath the same user-selected archive.
# Validate their pair invariant without rewriting or claiming their content.
recursive_markdown = list(archive.rglob("*.md"))
for markdown in recursive_markdown:
    pdf = markdown.with_suffix(".pdf")
    assert pdf.is_file() and pdf.stat().st_size >= 1024, f"Missing/empty PDF: {pdf}"
    with pdf.open("rb") as handle:
        assert handle.read(5) == b"%PDF-", f"Invalid PDF: {pdf}"
assert not list(archive.glob("*.tmp")) and not list(archive.glob("*.html")), "Intermediate render files remain in destination"
previews = evidence / "publication-preview"
previews.mkdir(exist_ok=True)
preview_files = []
for filename, requested_page in [("execution-roadmap.pdf", 1), ("codebase-execution-method-prompt.pdf", -1)]:
    document = pdfium.PdfDocument(str(archive / filename))
    page_number = requested_page if requested_page >= 0 else len(document) - 1
    page = document[page_number]
    image = page.render(scale=1.4).to_pil()
    output = previews / (Path(filename).stem + "-page-" + str(page_number + 1) + ".png")
    image.save(output)
    preview_files.append(str(output))
    page.close()
    document.close()

manifest = {
    "publishedAt": datetime.now(timezone.utc).isoformat(),
    "destination": str(archive),
    "publisher": ".agents/skills/docs-report-publisher/scripts/publish_reports.mjs",
    "publisherExitCode": 0,
    "taskPublisherPairCount": len(task_published_names),
    "validatedRootPairCount": len(pairs),
    "additionalRootDocumentsFromConcurrentWork": additional_root_documents,
    "recursivePairInvariantCount": len(recursive_markdown),
    "existingMarkdownPreserved": [entry["name"] for entry in before],
    "sourceCopies": copies,
    "executionMethodPrompt": {**{"threadId":"01a0cfd5-f627-7111-b7c6-fa287c5542d3","turnId":"01a0d27b-4989-7162-9953-0081ca7edf8a","itemId":"msg_0acfe69983e3d0f3016ab4dae702cc87d28068bc4f99eade07","transportFenceRemoved":True,"characters":16768}, "markdownSha256": digest(method_path), "terminalNewlineAdded": True},
    "rawCodebaseEvidence": str(evidence),
    "pairs": pairs,
}
# Use a task-specific basename to preserve the existing archive's own evidence.
manifest_path = archive / "evidence/codebase-publication-manifest.json"
manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"pairs": len(pairs), "totalPages": sum(p["pages"] for p in pairs), "byteIdenticalReportCopies": len(sources), "originalPromptByteIdentical": True, "existingMarkdownPreserved": len(before), "manifest": str(manifest_path), "previews": preview_files, "documents": [{"name": p["pdf"], "pages": p["pages"]} for p in pairs]}, indent=2))
