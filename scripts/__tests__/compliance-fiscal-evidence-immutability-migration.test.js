const fs = require("fs");
const path = require("path");

const migrationPath = path.join(
  __dirname,
  "..",
  "..",
  "prisma",
  "migrations",
  "20260801153000_certified_fiscal_evidence_immutability",
  "migration.sql",
);

const migrationSql = fs.readFileSync(migrationPath, "utf8");

describe("certified fiscal evidence immutability migration", () => {
  it("locks certified fiscal documents, lines, submissions, and evidence", () => {
    for (const fragment of [
      '"compliance_assert_immutable_content"',
      '"compliance_fiscal_documents_prevent_certified_mutation"',
      '"compliance_fiscal_document_lines_prevent_certified_parent_mutation"',
      '"compliance_submissions_prevent_certified_document_mutation"',
      '"compliance_evidence_prevent_certified_document_mutation"',
      'BEFORE UPDATE OR DELETE ON "fiscal_documents"',
      'BEFORE INSERT OR UPDATE OR DELETE ON "fiscal_document_lines"',
      'BEFORE INSERT OR UPDATE OR DELETE ON "compliance_submissions"',
      'BEFORE INSERT OR UPDATE OR DELETE ON "compliance_evidence"',
      "Cannot modify immutable fiscal evidence",
    ]) {
      expect(migrationSql).toContain(fragment);
    }
  });

  it("keeps certification content immutable while allowing only reversal lifecycle markers", () => {
    expect(migrationSql).toContain("OLD.\"status\"::TEXT = 'CERTIFIED'");
    expect(migrationSql).toContain(
      "NEW.\"status\"::TEXT NOT IN ('CERTIFIED', 'REVERSED')",
    );
    expect(migrationSql).toContain("IF NEW.\"status\"::TEXT = 'REVERSED' THEN");
    expect(migrationSql).toContain(
      "ARRAY['updatedAt', 'status', 'reversedAt', 'reversedById', 'reversalReason']::TEXT[]",
    );
    expect(migrationSql).toContain("ARRAY['updatedAt']::TEXT[]");
  });

  it("guards evidence reached directly or through a compliance submission", () => {
    expect(migrationSql).toContain(
      '"compliance_fiscal_status_for_evidence_relation"',
    );
    expect(migrationSql).toContain('OLD."fiscalDocumentId"');
    expect(migrationSql).toContain('OLD."submissionId"');
    expect(migrationSql).toContain('JOIN "fiscal_documents" fiscal_document');
  });
});