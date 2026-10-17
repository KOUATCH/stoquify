const fs = require('node:fs');
const path = require('node:path');
const target = path.resolve(__dirname, '../../prisma/schema.prisma');
let source = fs.readFileSync(target, 'utf8');
if (source.includes('model PurchaseOrderAuthoringDraft {')) throw new Error('Model already present; do not rerun.');
const newline = source.includes('\r\n') ? '\r\n' : '\n';
function replaceOnce(from, to) {
  if (source.split(from).length !== 2) throw new Error('Expected one anchor: ' + from);
  source = source.replace(from, to);
}
replaceOnce('  reviewedAccessRequests AccessRequest[] @relation("AccessReviewer")', '  reviewedAccessRequests AccessRequest[] @relation("AccessReviewer")' + newline + '  purchaseOrderAuthoringDrafts PurchaseOrderAuthoringDraft[]');
replaceOnce('  acknowledgementEnvelopes SupplierPoEnvelope[]', '  acknowledgementEnvelopes SupplierPoEnvelope[]' + newline + '  authoringDrafts PurchaseOrderAuthoringDraft[]');
const model = `// Authoring drafts are not business purchase orders and allocate no document number.
model PurchaseOrderAuthoringDraft {
  id String @id
  organizationId String
  actorId String
  actor User @relation(fields: [organizationId, actorId], references: [organizationId, id], onDelete: Restrict, onUpdate: Restrict, map: "po_authoring_actor_fkey")
  title String @db.VarChar(100)
  status String @default("ACTIVE")
  revision Int @default(1)
  content Json
  lastSaveHash String
  commandHash String?
  preparedAt DateTime?
  resultOrderId String?
  resultOrder PurchaseOrder? @relation(fields: [organizationId, resultOrderId], references: [organizationId, id], onDelete: Restrict, onUpdate: Restrict, map: "po_authoring_result_fkey")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([organizationId, actorId, createdAt, id], map: "po_authoring_scope_page_idx")
  @@unique([organizationId, resultOrderId], map: "po_authoring_result_key")
  @@map("purchase_order_authoring_drafts")
}

`.replace(/\n/g, newline);
replaceOnce('model PurchaseOrder {', model + 'model PurchaseOrder {');
fs.writeFileSync(target, source);
