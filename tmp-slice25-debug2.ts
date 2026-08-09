const schemaText = `
model PosCashShortageWorkerCheckpoint {
  id String @id
  organizationId String
  checkKey String
  workerKey String
  status String
  recordedFromInclusive DateTime
  recordedThroughExclusive DateTime
  cursor Json?
  lastProcessedCursor Json?
  attempt Int
  leaseOwnerId String?
  leaseToken String?
  leaseExpiresAt DateTime?
  lastErrorCode String?
  lastErrorMessage String?
  nextAttemptAt DateTime?
  completedAt DateTime?
  deadLetteredAt DateTime?
  deadLetterReason String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([organizationId, checkKey, workerKey, recordedFromInclusive, recordedThroughExclusive // checkpoint window identity])
  @@index([organizationId, status, nextAttemptAt])
  @@index([organizationId, status, leaseExpiresAt])
  @@map("pos_cash_shortage_worker_checkpoints")
}
`;
const stripSchemaComments = (schemaText:string)=>schemaText.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const sanitize = stripSchemaComments(schemaText);
const escapedAttr='\\@\\@unique';
const pattern = new RegExp(`${escapedAttr}\\s*\\(\\s*\\[([\\s\\S]*?)\\]\\s*(?:,\\s*[^)]*)?\\)`,'g');
const match = sanitize.matchAll(pattern);
for (const m of match){
  console.log('raw', JSON.stringify(m[1]));
  const declared = m[1].split(',').map(field=>field.replace(/\/\/.*$/g,'').trim()).filter(Boolean);
  console.log('declared', declared);
}
