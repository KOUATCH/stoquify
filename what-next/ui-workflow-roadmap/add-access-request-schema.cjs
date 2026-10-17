const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const target = path.join(root, 'prisma/schema.prisma');
let source = fs.readFileSync(target, 'utf8');
if (source.includes('model AccessRequest {')) throw new Error('AccessRequest already present; do not rerun.');
const newline = source.includes('\r\n') ? '\r\n' : '\n';
function replaceOnce(from, to) {
  if (source.split(from).length !== 2) throw new Error('Expected exactly one anchor: ' + from);
  source = source.replace(from, to);
}
replaceOnce('  roles Role[] @relation("UserRoles")', '  roles Role[] @relation("UserRoles")' + newline + '  accessRequests AccessRequest[] @relation("AccessRequester")' + newline + '  reviewedAccessRequests AccessRequest[] @relation("AccessReviewer")');
replaceOnce('  @@map("users")', '  @@unique([organizationId, id])' + newline + '  @@map("users")');
const model = `
// Decision and application are separate. History is retained in AuditLog.
// The migration also enforces one open request per task and state constraints.
model AccessRequest {
  id String @id
  organizationId String
  requesterId String
  requester User @relation("AccessRequester", fields: [organizationId, requesterId], references: [organizationId, id], onDelete: Restrict, onUpdate: Restrict, map: "access_requests_requester_fkey")
  reviewerId String?
  reviewer User? @relation("AccessReviewer", fields: [organizationId, reviewerId], references: [organizationId, id], onDelete: Restrict, onUpdate: Restrict, map: "access_requests_reviewer_fkey")
  targetKey String
  reason String @db.VarChar(400)
  submissionHash String
  decision String @default("PENDING")
  application String @default("NOT_REQUIRED")
  revision Int @default(1)
  expiresAt DateTime
  decidedAt DateTime?
  appliedAt DateTime?
  decisionReason String? @db.VarChar(400)
  selectedRoleIds String[] @default([])
  memberRevision String?
  applicationCommandId String?
  applicationError String?
  grantAuditId String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([organizationId, requesterId, createdAt, id])
  @@index([organizationId, decision, createdAt, id])
  @@map("access_requests")
}
`.replace(/\n/g, newline);
replaceOnce('model Role {', model + newline + 'model Role {');
if (process.argv.includes('--stage')) {
  fs.writeFileSync(path.join(__dirname, 'access-request-schema.prisma'), source);
} else {
  fs.writeFileSync(target, source);
}
