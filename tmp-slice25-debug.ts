import { evaluatePosCashShortageCheckpointPersistencePreflight } from "./services/leakage/pos-cash-shortage-worker-checkpoint-persistence-preflight";

const schema = `
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

const result = evaluatePosCashShortageCheckpointPersistencePreflight({ schemaText: schema });
console.log(result);
