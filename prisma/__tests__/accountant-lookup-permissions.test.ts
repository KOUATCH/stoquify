/** @jest-environment node */
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { PERMISSIONS } from "../../lib/permissions";
import { hasRbacPermission } from "../../lib/security/rbac-permissions";

// Read definitions without importing either seed (which can construct clients).
function accountantTerms(file: string): string[] {
  const source = ts.createSourceFile(file, fs.readFileSync(path.join(process.cwd(), file), "utf8"), ts.ScriptTarget.Latest, true);
  let role: ts.ObjectLiteralExpression | undefined;
  function visit(node: ts.Node) {
    if (ts.isObjectLiteralExpression(node) && node.properties.some(property =>
      ts.isPropertyAssignment(property) && property.name.getText(source) === "code" &&
      ts.isStringLiteral(property.initializer) && property.initializer.text === "accountant")) role = node;
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (!role) throw new Error(`Missing accountant definition in ${file}`);
  const property = role.properties.find(property => ts.isPropertyAssignment(property) &&
    ["permissions", "permissionTerms"].includes(property.name.getText(source))) as ts.PropertyAssignment;
  const value = property.initializer;
  const terms = ts.isCallExpression(value) && value.expression.getText(source) === "permissionsContaining"
    ? value.arguments : ts.isArrayLiteralExpression(value) ? value.elements : undefined;
  if (!terms) throw new Error(`Unexpected accountant permission definition in ${file}`);
  return terms.map(term => {
    if (ts.isStringLiteral(term)) return term.text;
    if (term.getText(source) === "PERMISSIONS.VIEW_CHART_OF_ACCOUNTS") return PERMISSIONS.VIEW_CHART_OF_ACCOUNTS;
    throw new Error(`Unreviewed permission expression: ${term.getText(source)}`);
  });
}

describe.each(["prisma/comprehensive-seed.ts", "prisma/compliance-hris-role-seed.ts"])("Accountant lookup prerequisite: %s", file => {
  const terms = accountantTerms(file);
  const select = (values: string[]) => Object.values(PERMISSIONS).filter(permission => values.some(term => permission.includes(term)));
  const permissions = select(terms);
  const previous = select(terms.filter(term => term !== PERMISSIONS.VIEW_CHART_OF_ACCOUNTS));

  test("permits the chart lookup required by the existing journal-preparer workflow", () => {
    expect(hasRbacPermission(permissions, "accounting.journal.read")).toBe(true);
    expect(hasRbacPermission(permissions, "accounting.journal.create")).toBe(true);
    expect(hasRbacPermission(permissions, "accounting.accounts.read")).toBe(true);
  });

  test("adds only chart reading to the previous grants", () => {
    expect(permissions.filter(permission => !previous.includes(permission))).toEqual([PERMISSIONS.VIEW_CHART_OF_ACCOUNTS]);
    expect(previous.every(permission => permissions.includes(permission))).toBe(true);
    expect(permissions).not.toContain("*");
    for (const operation of ["accounting.journal.post", "accounting.journal.reverse", "accounting.accounts.manage", "roles.permissions.assign"]) {
      expect(hasRbacPermission(permissions, operation)).toBe(hasRbacPermission(previous, operation));
    }
  });
});

test("chart reading alone grants no preparation, posting, management or role administration", () => {
  for (const operation of ["accounting.journal.create", "accounting.journal.post", "accounting.journal.reverse", "accounting.accounts.manage", "roles.permissions.assign"]) {
    expect(hasRbacPermission([PERMISSIONS.VIEW_CHART_OF_ACCOUNTS], operation)).toBe(false);
  }
});
