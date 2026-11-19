"""Read only AF08 synthetic exports; write reconciliation evidence and a contact sheet."""
import csv
import io
import json
from pathlib import Path
from pypdf import PdfReader
import pypdfium2 as pdfium
from PIL import Image, ImageOps, ImageDraw

root = Path(__file__).resolve().parents[1]
out = root / "docs/accounting-firms/roadmap-2026-10-19/execution/AF08/2026-10-20-run-01"
canonical = json.loads((out / "sample-workpapers.json").read_text(encoding="utf-8"))
rows = list(csv.reader(io.StringIO((out / "sample-workpapers.csv").read_text(encoding="utf-8"))))
header_index = next(i for i, row in enumerate(rows) if row and row[0] == "client")
headers = rows[header_index]
records = [dict(zip(headers, row)) for row in rows[header_index + 1:]]
reader = PdfReader(out / "sample-workpapers.pdf")
page_text = [page.extract_text() for page in reader.pages]
text = "\n".join(page_text)
assert len(reader.pages) >= 5
assert all("DRAFT" in page for page in page_text)
assert "private-personal-data" not in text
assert canonical["periodStart"] in text and canonical["periodEnd"] in text
assert canonical["watermarkId"] in text
checked = []
for schedule in canonical["schedules"]:
    for account in schedule["accounts"]:
        matches = [r for r in records if r["account"] == account["accountCode"] and r["currency"] == account["currency"]]
        assert len(matches) == 1
        row = matches[0]
        assert row["client"] == canonical["organizationId"] and row["period"] == canonical["periodId"]
        assert row["source_revision"] == account["sourceRevision"]
        assert row["evidence_hash"] == account["evidenceHash"]
        for basis, csv_basis in [("ledger", "ledger"), ("schedule", "schedule"), ("differences", "difference")]:
            for column, value in account["balances"][basis].items():
                assert row[f"{csv_basis}_{column}"].lstrip("'") == value
                assert value in text
        checked.append({"kind": schedule["kind"], "currency": account["currency"], "ledgerClosing": account["balances"]["ledger"]["closingBalance"], "fourColumnsInAllFormats": True})
assert len(checked) == 4
document = pdfium.PdfDocument(str(out / "sample-workpapers.pdf"))
tiles = []
for i in range(len(document)):
    bitmap = document[i].render(scale=1.15).to_pil().convert("RGB")
    bitmap.thumbnail((480, 680))
    tile = Image.new("RGB", (510, 720), "white")
    tile.paste(bitmap, ((510 - bitmap.width) // 2, 23))
    ImageDraw.Draw(tile).text((15, 7), f"AF08 workpapers — page {i + 1}", fill="black")
    tiles.append(ImageOps.expand(tile, border=1, fill="#c0c0c0"))
sheet = Image.new("RGB", (512 * 3, 722 * ((len(tiles) + 2) // 3)), "#e5e5e5")
for i, tile in enumerate(tiles):
    sheet.paste(tile, ((i % 3) * 512, (i // 3) * 722))
sheet.save(out / "workpapers-contact-sheet.png")
result = {"passed": True, "pages": len(reader.pages), "csvSchedules": len(records), "checked": checked,
          "scopeAndUtcDatesPresent": True, "draftOnEveryPage": True, "redactionPassed": True}
(out / "artifact-inspection.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
print(json.dumps(result))
