---
name: docs-report-publisher
description: Publish one or more reports as matching Markdown and PDF artifacts beneath a user-supplied docs subfolder. Use when reports must be archived in both .md and .pdf formats and the caller should provide only the subfolder name under docs.
---

# Docs Report Publisher

Require one input from the user: `docs_subfolder`, expressed relative to the repository's `docs/` directory. For example, `system-evaluation-and-redirection` resolves to `docs/system-evaluation-and-redirection/`.

Do not ask the user for `docs/`, an absolute path, or separate Markdown and PDF destinations. Reject an empty value, an absolute path, a value beginning with `docs/`, or any value containing `.` or `..` path segments. Nested subfolders such as `evaluations/2026-08` are valid.

## Publish reports

1. Identify the reports from the current request and conversation. Prefer existing Markdown source files when they contain the requested reports. If a report is new, author its final Markdown directly in `docs/<docs_subfolder>/`.
2. Preserve the report content and basename. Do not rewrite an existing report merely to publish it.
3. From the repository root, run the bundled publisher with the supplied subfolder and any existing Markdown sources:

   ```powershell
   node .agents/skills/docs-report-publisher/scripts/publish_reports.mjs <docs_subfolder> <source-1.md> <source-2.md>
   ```

   When the final Markdown files already exist in the destination, omit the source arguments:

   ```powershell
   node .agents/skills/docs-report-publisher/scripts/publish_reports.mjs <docs_subfolder>
   ```

4. Treat publication as complete only when every destination `.md` file has a same-named, non-empty `.pdf` file and the publisher exits successfully.
5. Report the resolved `docs/<docs_subfolder>/` path and the published file pairs. Keep intermediate HTML or browser artifacts out of the destination.

The publisher creates the destination directory, prevents writes outside `docs/`, copies Markdown sources without changing them, renders PDFs with print-friendly A4 styling, and validates the file-pair invariant.
