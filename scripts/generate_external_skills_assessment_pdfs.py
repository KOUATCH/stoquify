"""Render the external-skills prompt and report with the established PDF style."""

from __future__ import annotations

from scripts import generate_agents_and_skills_assessment_pdfs as renderer


renderer.DOCUMENTS = (
    (
        renderer.OUTPUT_DIR / "STOQUIFY_EXTERNAL_SKILLS_ASSESSMENT_PROMPT_2026-08-05.md",
        renderer.OUTPUT_DIR / "STOQUIFY_EXTERNAL_SKILLS_ASSESSMENT_PROMPT_2026-08-05.pdf",
        "ASSESSMENT PROMPT",
        "Five external workflow skills under a read-only evidence contract",
    ),
    (
        renderer.OUTPUT_DIR / "STOQUIFY_EXTERNAL_SKILLS_EXPERT_REPORT_2026-08-05.md",
        renderer.OUTPUT_DIR / "STOQUIFY_EXTERNAL_SKILLS_EXPERT_REPORT_2026-08-05.pdf",
        "EXPERT REPORT",
        "Governed adoption decisions for five external workflow skills",
    ),
)


if __name__ == "__main__":
    renderer.main()
