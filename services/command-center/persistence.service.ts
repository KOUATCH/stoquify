import "server-only";
import { queueAssignmentNotice, visibleNotices } from "./notices";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/prisma/db";
import { hasRbacPermission } from "@/lib/security/rbac-permissions";
import {
  BusinessRuleError,
  ConflictError,
} from "@/services/_shared/action-errors";
import { deny, loadAuthority, moduleAllowed, type Identity } from "./authority";
import {
  canReadSource,
  digest,
  readSources,
  sources,
  sourceModulesAllowed,
  type Observation,
} from "./sources";
import type {
  Coordination,
  Condition,
  FollowUpQuery,
  FollowUpCommand,
  FollowUpData,
  ReviewCommand,
  SourceKey,
} from "./contracts";

type Occurrence = {
  id: string;
  organizationId: string;
  logicalKey: string;
  sourceKey: SourceKey;
  sourceRefs: string[];
  scopeKey: string;
  windowKey: string;
  episode: number;
  sourceRevision: string;
  revision: number;
  condition: Condition;
  coordination: Coordination;
  ownerId: string | null;
  dueAt: Date | null;
  updatedAt: Date;
};
type ReviewState = { id: string; evidenceKey: string; revision: number };
const conflict = () =>
  new ConflictError(
    "The source or follow-up changed. Refresh before trying again.",
  );
export async function inCoordinationTransaction<T>(
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  try {
    return await db.$transaction(work, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 10000,
      timeout: 45000,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      ["P2034", "P2002"].includes(error.code)
    )
      throw conflict();
    throw error;
  }
}
async function latest(tx: Prisma.TransactionClient, org: string, key: string) {
  const rows = await tx.$queryRaw<Occurrence[]>(
    Prisma.sql`SELECT * FROM "command_center_occurrences" WHERE "organizationId"=${org} AND "logicalKey"=${key} ORDER BY "episode" DESC LIMIT 1 FOR UPDATE`,
  );
  return rows[0] ?? null;
}
async function event(
  tx: Prisma.TransactionClient,
  identity: Identity,
  row: Occurrence,
  type: string,
  changes: unknown,
  requestId: string | null = null,
  intentHash: string | null = null,
) {
  await tx.$executeRaw(
    Prisma.sql`INSERT INTO "command_center_events" ("id","organizationId","occurrenceId","actorId","requestId","intentHash","type","resultRevision","changes") VALUES (${randomUUID()},${identity.organizationId},${row.id},${identity.actorId},${requestId},${intentHash},${type},${row.revision},${JSON.stringify(changes)}::jsonb)`,
  );
}
async function observe(
  tx: Prisma.TransactionClient,
  identity: Identity,
  observation: Observation,
) {
  let row = await latest(tx, identity.organizationId, observation.logicalKey);
  if (!row && observation.condition !== "ACTIVE") return null;
  if (
    !row ||
    (row.condition === "CLEAR" && observation.condition === "ACTIVE")
  ) {
    const id = randomUUID(),
      episode = (row?.episode ?? 0) + 1;
    const rows = await tx.$queryRaw<Occurrence[]>(
      Prisma.sql`INSERT INTO "command_center_occurrences" ("id","organizationId","logicalKey","sourceKey","sourceRefs","scopeKey","windowKey","episode","sourceRevision","condition") VALUES (${id},${identity.organizationId},${observation.logicalKey},${observation.source},${JSON.stringify(observation.refs)}::jsonb,${observation.scopeKey},${observation.windowKey},${episode},${observation.revision},${observation.condition}) RETURNING *`,
    );
    row = rows[0];
    await event(tx, identity, row, "OBSERVED", {
      source: observation.source,
      episode,
      condition: observation.condition,
      sourceRevision: observation.revision,
      sourceRefs: observation.refs,
    });
    return row;
  }
  if (
    row.sourceRevision !== observation.revision ||
    row.condition !== observation.condition
  ) {
    const before = {
      condition: row.condition,
      sourceRevision: row.sourceRevision,
      coordination: row.coordination,
      sourceRefs: row.sourceRefs,
    };
    // Evidence changes invalidate a coordination review even when a hash returns
    // to an earlier value. Assignment survives changes within the same episode.
    const coordination =
      row.coordination === "REVIEWED"
        ? row.ownerId
          ? "ASSIGNED"
          : "OPEN"
        : row.coordination;
    const rows = await tx.$queryRaw<Occurrence[]>(
      Prisma.sql`UPDATE "command_center_occurrences" SET "sourceRevision"=${observation.revision},"sourceRefs"=${JSON.stringify(observation.refs)}::jsonb,"condition"=${observation.condition},"coordination"=${coordination},"revision"="revision"+1,"updatedAt"=(CURRENT_TIMESTAMP AT TIME ZONE 'UTC') WHERE "id"=${row.id} AND "organizationId"=${identity.organizationId} RETURNING *`,
    );
    row = rows[0];
    await event(tx, identity, row, "SOURCE_CHANGED", {
      before,
      after: {
        condition: row.condition,
        sourceRevision: row.sourceRevision,
        coordination: row.coordination,
        sourceRefs: row.sourceRefs,
      },
    });
  }
  return row;
}
async function updateReviewState(
  tx: Prisma.TransactionClient,
  identity: Identity,
  evidence: Awaited<ReturnType<typeof readSources>>,
  rows: Occurrence[],
) {
  const scopeKey = evidence.scope.locationId ?? "TENANT",
    periodKey = JSON.stringify([
      evidence.scope.periodStart,
      evidence.scope.periodEnd,
    ]);
  // Unavailable coverage and all authorized evidence participate in the review.
  const evidenceKey = digest([
    "follow-up-review-v1",
    scopeKey,
    periodKey,
    evidence.unavailable,
    evidence.observations.map((o) => [o.source, o.condition, o.revision]),
    rows.map((r) => [r.id, r.revision]),
  ]);
  let states = await tx.$queryRaw<ReviewState[]>(
    Prisma.sql`SELECT "id","evidenceKey","revision" FROM "command_center_review_states" WHERE "organizationId"=${identity.organizationId} AND "actorId"=${identity.actorId} AND "scopeKey"=${scopeKey} AND "periodKey"=${periodKey} FOR UPDATE`,
  );
  if (!states.length) {
    states = await tx.$queryRaw<ReviewState[]>(
      Prisma.sql`INSERT INTO "command_center_review_states" ("id","organizationId","actorId","scopeKey","periodKey","evidenceKey") VALUES (${randomUUID()},${identity.organizationId},${identity.actorId},${scopeKey},${periodKey},${evidenceKey}) RETURNING "id","evidenceKey","revision"`,
    );
  } else if (states[0].evidenceKey !== evidenceKey) {
    states = await tx.$queryRaw<ReviewState[]>(
      Prisma.sql`UPDATE "command_center_review_states" SET "evidenceKey"=${evidenceKey},"revision"="revision"+1,"updatedAt"=(CURRENT_TIMESTAMP AT TIME ZONE 'UTC') WHERE "id"=${states[0].id} RETURNING "id","evidenceKey","revision"`,
    );
  }
  return { state: states[0], evidenceKey };
}
async function snapshot(
  tx: Prisma.TransactionClient,
  identity: Identity,
  query: FollowUpQuery,
  ownerId?: string | null,
) {
  const authority = await loadAuthority(tx, identity, query, ownerId);
  const evidence = await readSources(
    tx,
    identity.organizationId,
    authority.actor,
    query,
    (key) => latest(tx, identity.organizationId, key),
  );
  const rows: Occurrence[] = [];
  for (const observation of evidence.observations) {
    const row = await observe(tx, identity, observation);
    if (row) rows.push(row);
  }
  const review = await updateReviewState(tx, identity, evidence, rows);
  authority.revalidate();
  return { ...evidence, authority, rows, ...review };
}
async function present(
  tx: Prisma.TransactionClient,
  identity: Identity,
  current: Awaited<ReturnType<typeof snapshot>>,
): Promise<FollowUpData> {
  const receipts = await tx.$queryRaw<{ createdAt: Date }[]>(
    Prisma.sql`SELECT "createdAt" FROM "command_center_review_receipts" WHERE "organizationId"=${identity.organizationId} AND "actorId"=${identity.actorId} AND "stateId"=${current.state.id} AND "revision"=${current.state.revision} AND "evidenceKey"=${current.evidenceKey} ORDER BY "createdAt" DESC LIMIT 1`,
  );
  const items: FollowUpData["items"] = [];
  for (const row of current.rows) {
    const owner = row.ownerId
      ? await tx.user.findFirst({
          where: {
            id: row.ownerId,
            organizationId: identity.organizationId,
            isActive: true,
          },
          select: { firstName: true, lastName: true, email: true },
        })
      : null;
    const history = await tx.$queryRaw<{ type: string; at: Date }[]>(
      Prisma.sql`SELECT "type","createdAt" AS "at" FROM "command_center_events" WHERE "organizationId"=${identity.organizationId} AND "occurrenceId"=${row.id} ORDER BY "createdAt" DESC,"id" DESC LIMIT 5`,
    );
    const canDelegate = hasRbacPermission(
      current.authority.actor.permissions,
      "controls.manage",
    );
    const canAssign =
      (!row.ownerId || row.ownerId === identity.actorId || canDelegate) &&
      row.condition === "ACTIVE" &&
      (Boolean(current.scope.locationId) || current.authority.actor.wide) &&
      (await sourceModulesAllowed(
        tx,
        identity.organizationId,
        current.authority.actor,
        row.sourceKey,
        true,
      ));
    items.push({
      id: row.id,
      source: row.sourceKey,
      revision: row.revision,
      episode: row.episode,
      condition: row.condition,
      coordination: row.coordination,
      ownerId: row.ownerId,
      ownerName: owner
        ? [owner.firstName, owner.lastName].filter(Boolean).join(" ") ||
          owner.email
        : null,
      dueAt: row.dueAt?.toISOString() ?? null,
      actionPath: sources[row.sourceKey].path,
      canAssign,
      canDelegate,
      sourceRevision: row.sourceRevision,
      updatedAt: row.updatedAt.toISOString(),
      history: history.map((e) => ({ type: e.type, at: e.at.toISOString() })),
    });
  }
  const locations = await tx.location.findMany({
    where: {
      organizationId: identity.organizationId,
      isActive: true,
      deletedAt: null,
      ...(current.authority.actor.wide ? {} : { managerId: identity.actorId }),
    },
    select: { id: true, name: true, managerId: true },
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });
  current.authority.revalidate();
  return {
    availableLocations: locations.map((l) => ({
      id: l.id,
      name: l.name,
      assignedToActor: l.managerId === identity.actorId,
    })),
    scope: current.scope,
    items,
    actorId: identity.actorId,
    revision: current.state.revision,
    evidenceKey: current.evidenceKey,
    review: {
      current: Boolean(receipts.length),
      reviewedAt: receipts[0]?.createdAt.toISOString() ?? null,
    },
    unavailable: current.unavailable,
    ...(await visibleNotices(tx, identity, current.rows)),
  };
}
export async function loadFollowUps(identity: Identity, query: FollowUpQuery) {
  return inCoordinationTransaction(async (tx) =>
    present(tx, identity, await snapshot(tx, identity, query)),
  );
}
export async function changeFollowUp(
  identity: Identity,
  input: FollowUpCommand,
) {
  return inCoordinationTransaction(async (tx) => {
    const current = await snapshot(tx, identity, input, input.ownerId);
    const row = current.rows.find((r) => r.id === input.itemId);
    if (
      !row ||
      !canReadSource(current.authority.actor, row.sourceKey) ||
      row.condition !== "ACTIVE"
    )
      throw deny();
    const { actor, owner } = current.authority;
    if (!current.scope.locationId && !actor.wide) throw deny();
    if (
      (input.ownerId !== identity.actorId ||
        (row.ownerId && row.ownerId !== identity.actorId)) &&
      !hasRbacPermission(actor.permissions, "controls.manage")
    )
      throw deny();
    if (
      owner &&
      (!canReadSource(owner, row.sourceKey) ||
        !(await sourceModulesAllowed(
          tx,
          identity.organizationId,
          owner,
          row.sourceKey,
        )))
    )
      throw deny();
    if (
      !(await sourceModulesAllowed(
        tx,
        identity.organizationId,
        actor,
        row.sourceKey,
        true,
      ))
    )
      throw deny();
    if (
      (input.state === "ASSIGNED" || input.state === "WAITING") &&
      !input.ownerId
    )
      throw new BusinessRuleError("Choose an eligible assignee.");
    const intentHash = digest([
      row.id,
      input.expectedRevision,
      input.ownerId,
      input.state,
      input.dueAt,
    ]);
    const events = await tx.$queryRaw<
      { intentHash: string; resultRevision: number; occurrenceId: string }[]
    >(
      Prisma.sql`SELECT "intentHash","resultRevision","occurrenceId" FROM "command_center_events" WHERE "organizationId"=${identity.organizationId} AND "actorId"=${identity.actorId} AND "requestId"=${input.requestId}`,
    );
    if (events.length) {
      if (
        events[0].intentHash !== intentHash ||
        events[0].occurrenceId !== row.id ||
        events[0].resultRevision !== row.revision
      )
        throw conflict();
      return present(tx, identity, current);
    }
    if (row.revision !== input.expectedRevision) throw conflict();
    current.authority.revalidate();
    const before = {
      ownerId: row.ownerId,
      state: row.coordination,
      dueAt: row.dueAt?.toISOString() ?? null,
    };
    const updated = await tx.$queryRaw<Occurrence[]>(
      Prisma.sql`UPDATE "command_center_occurrences" SET "ownerId"=${input.ownerId},"coordination"=${input.state},"dueAt"=(${input.dueAt}::timestamptz AT TIME ZONE 'UTC'),"revision"="revision"+1,"updatedAt"=(CURRENT_TIMESTAMP AT TIME ZONE 'UTC') WHERE "organizationId"=${identity.organizationId} AND "id"=${row.id} RETURNING *`,
    );
    await event(
      tx,
      identity,
      updated[0],
      "COORDINATED",
      {
        before,
        after: {
          ownerId: input.ownerId,
          state: input.state,
          dueAt: input.dueAt,
        },
        sourceRevision: row.sourceRevision,
      },
      input.requestId,
      intentHash,
    );
    if (
      input.ownerId &&
      (input.ownerId !== row.ownerId ||
        input.dueAt !== (row.dueAt?.toISOString() ?? null))
    )
      await queueAssignmentNotice(tx, identity.organizationId, updated[0]);
    // Reuse the same transaction-bound source observation and pinned clock.
    current.rows = current.rows.map((r) => (r.id === row.id ? updated[0] : r));
    Object.assign(
      current,
      await updateReviewState(tx, identity, current, current.rows),
    );
    return present(tx, identity, current);
  });
}
export async function reviewFollowUps(
  identity: Identity,
  input: ReviewCommand,
) {
  return inCoordinationTransaction(async (tx) => {
    const current = await snapshot(tx, identity, input);
    if (current.observations.some((o) => o.condition === "UNKNOWN"))
      throw new BusinessRuleError(
        "Refresh unavailable source evidence before recording a review.",
      );
    const intentHash = digest([
      current.state.id,
      input.expectedRevision,
      input.evidenceKey,
    ]);
    const receipts = await tx.$queryRaw<
      { intentHash: string; revision: number }[]
    >(
      Prisma.sql`SELECT "intentHash","revision" FROM "command_center_review_receipts" WHERE "organizationId"=${identity.organizationId} AND "actorId"=${identity.actorId} AND "requestId"=${input.requestId}`,
    );
    if (receipts.length) {
      if (
        receipts[0].intentHash !== intentHash ||
        receipts[0].revision !== current.state.revision
      )
        throw conflict();
      return present(tx, identity, current);
    }
    if (
      current.state.revision !== input.expectedRevision ||
      current.evidenceKey !== input.evidenceKey
    )
      throw conflict();
    current.authority.revalidate();
    await tx.$executeRaw(
      Prisma.sql`INSERT INTO "command_center_review_receipts" ("id","organizationId","actorId","stateId","revision","evidenceKey","center","requestId","intentHash") VALUES (${randomUUID()},${identity.organizationId},${identity.actorId},${current.state.id},${current.state.revision},${current.evidenceKey},${input.center},${input.requestId},${intentHash})`,
    );
    return present(tx, identity, current);
  });
}

export async function followUpCandidates(
  identity: Identity,
  input: import("./contracts").CandidateQuery,
) {
  return inCoordinationTransaction(async (tx) => {
    const current = await snapshot(tx, identity, input);
    const row = current.rows.find((r) => r.id === input.itemId);
    if (
      !row ||
      !hasRbacPermission(current.authority.actor.permissions, "controls.manage")
    )
      throw deny();
    const users = await tx.user.findMany({
      where: {
        organizationId: identity.organizationId,
        isActive: true,
        OR: [
          { firstName: { contains: input.search, mode: "insensitive" } },
          { lastName: { contains: input.search, mode: "insensitive" } },
        ],
      },
      select: { id: true },
      orderBy: { id: "asc" },
      take: 51,
    });
    const candidates: import("./contracts").FollowUpCandidate[] = [];
    for (const user of users.slice(0, 50)) {
      try {
        const auth = await loadAuthority(tx, identity, input, user.id);
        if (
          auth.owner &&
          canReadSource(auth.owner, row.sourceKey) &&
          (await sourceModulesAllowed(
            tx,
            identity.organizationId,
            auth.owner,
            row.sourceKey,
          ))
        )
          candidates.push({ id: user.id, name: auth.owner.name });
      } catch (error) {
        if (!(error instanceof Error) || error.name !== "ForbiddenError")
          throw error;
      }
    }
    current.authority.revalidate();
    return { candidates, limited: users.length > 50 };
  });
}

export async function saveFollowUpPreference(
  identity: Identity,
  input: import("./contracts").PreferenceCommand,
) {
  return inCoordinationTransaction(async (tx) => {
    const current = await snapshot(tx, identity, input);
    await tx.$executeRaw(
      Prisma.sql`INSERT INTO "command_center_preferences" ("id","organizationId","actorId","enabled","quietStart","quietEnd") VALUES (${randomUUID()},${identity.organizationId},${identity.actorId},${input.enabled},${input.quietStart},${input.quietEnd}) ON CONFLICT ("organizationId","actorId") DO UPDATE SET "enabled"=EXCLUDED."enabled","quietStart"=EXCLUDED."quietStart","quietEnd"=EXCLUDED."quietEnd"`,
    );
    return present(tx, identity, current);
  });
}
export async function acknowledgeFollowUpNotice(
  identity: Identity,
  input: import("./contracts").NoticeCommand,
) {
  return inCoordinationTransaction(async (tx) => {
    const current = await snapshot(tx, identity, input),
      ids = current.rows
        .filter(
          (r) => r.ownerId === identity.actorId && r.condition === "ACTIVE",
        )
        .map((r) => r.id);
    if (!ids.length) throw deny();
    const rows = await tx.$queryRaw<{ id: string }[]>(
      Prisma.sql`SELECT "id" FROM "command_center_notices" WHERE "id"=${input.noticeId} AND "organizationId"=${identity.organizationId} AND "recipientId"=${identity.actorId} AND "occurrenceId" IN (${Prisma.join(ids)})`,
    );
    if (!rows.length) throw deny();
    await tx.$executeRaw(
      Prisma.sql`UPDATE "command_center_notices" SET "state"='READ',"readAt"=(CURRENT_TIMESTAMP AT TIME ZONE 'UTC') WHERE "id"=${input.noticeId} AND "organizationId"=${identity.organizationId} AND "state"<>'READ'`,
    );
    return present(tx, identity, current);
  });
}
