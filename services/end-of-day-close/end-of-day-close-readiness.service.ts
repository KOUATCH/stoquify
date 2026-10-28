import "server-only";

import { POSSessionStatus } from "@prisma/client";

import { db } from "@/prisma/db";
import {
  BusinessRuleError,
  ForbiddenError,
} from "@/services/_shared/action-errors";
import type { AllowedOperatingAccessScope } from "@/services/operating-access/operating-access-scope-contracts";
import { resolveOperatingAccessScope } from "@/services/operating-access/operating-access-scope.service";
import { getBranchOperatingSnapshot } from "@/services/snapshots/branch-operating-snapshot.service";
import type {
  SnapshotResult,
  BranchOperatingMetrics,
} from "@/services/snapshots/snapshot-contracts";
import {
  createFreshness,
  createSnapshotSourceHash,
  maxDate,
  normalizeSnapshotScope,
} from "@/services/snapshots/snapshot-utils";

import type { BranchPaymentAttributionResult } from "./branch-payment-attribution-contracts";
import { readBranchPaymentAttributionForVerifiedCloseContext } from "./branch-payment-attribution.service";
import type {
  EndOfDayCloseChecklistItem,
  EndOfDayCloseEvidenceReference,
  EndOfDayCloseEvidenceStatus,
  EndOfDayCloseReadinessBlocker,
  EndOfDayCloseReadinessInput,
  EndOfDayCloseReadinessResult,
  EndOfDayCloseReadinessState,
} from "./end-of-day-close-readiness-contracts";

const CLOSED_POS_SESSION_STATUSES = new Set<POSSessionStatus>([
  POSSessionStatus.CLOSED,
  POSSessionStatus.RECONCILED,
]);

const BUSINESS_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function getEndOfDayCloseReadiness(
  input: EndOfDayCloseReadinessInput,
): Promise<EndOfDayCloseReadinessResult> {
  const locationId = normalizeLocationId(input.locationId);
  const businessDate = parseBusinessDate(input.businessDate);
  const now =
    parseOptionalDate(input.now, "End-of-day readiness now") ?? new Date();

  const access = await resolveOperatingAccessScope(input.accessContext);
  if (!access.allowed) {
    throw new ForbiddenError(
      "End-of-day close readiness is not available for this account.",
    );
  }

  assertAccessIdentity(access, input);
  assertLocationAuthority(access, locationId);

  const scope = normalizeSnapshotScope({
    organizationId: access.organizationId,
    locationId,
    periodStart: businessDate,
    periodEnd: businessDate,
    now,
    maxAgeMinutes: input.maxAgeMinutes,
  });

  const location = await db.location.findFirst({
    where: {
      id: locationId,
      organizationId: access.organizationId,
      isActive: true,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      code: true,
      updatedAt: true,
    },
  });

  if (!location) {
    throw new ForbiddenError(
      "End-of-day close readiness is not available for this location.",
    );
  }

  const [snapshot, sessions, drawers, paymentAttribution] = await Promise.all([
    getBranchOperatingSnapshot({
      organizationId: access.organizationId,
      locationId,
      periodStart: scope.periodStart,
      periodEnd: scope.periodEnd,
      now: scope.now,
      maxAgeMinutes: scope.maxAgeMinutes,
    }),
    db.pOSSession.findMany({
      where: {
        organizationId: access.organizationId,
        locationId,
        startTime: { lte: scope.periodEnd },
        OR: [{ endTime: null }, { endTime: { gte: scope.periodStart } }],
      },
      orderBy: [{ startTime: "asc" }, { id: "asc" }],
      select: {
        id: true,
        status: true,
        startTime: true,
        endTime: true,
        updatedAt: true,
      },
    }),
    db.cashDrawer.findMany({
      where: {
        locationId,
        location: { organizationId: access.organizationId },
      },
      orderBy: { id: "asc" },
      select: {
        id: true,
        isOpen: true,
        updatedAt: true,
      },
    }),
    readBranchPaymentAttributionForVerifiedCloseContext({
      access,
      organizationId: input.accessContext.orgId,
      actorId: input.accessContext.userId,
      locationId,
      location,
      businessDate: scope.periodStart.toISOString().slice(0, 10),
      periodStart: scope.periodStart,
      periodEnd: scope.periodEnd,
      now: scope.now,
      maxAgeMinutes: scope.maxAgeMinutes,
    }),
  ]);

  assertSnapshotIdentity(snapshot, access.organizationId, locationId);

  const sessionFacts = summarizeSessions(sessions);
  const openCashDrawerCount = drawers.filter((drawer) => drawer.isOpen).length;
  const snapshotItem = branchSnapshotChecklistItem(snapshot);
  const posItem = posSessionChecklistItem({
    sessions,
    facts: sessionFacts,
    now: scope.now,
    maxAgeMinutes: scope.maxAgeMinutes,
  });
  const drawerItem = cashDrawerChecklistItem({
    drawers,
    openCashDrawerCount,
    now: scope.now,
    maxAgeMinutes: scope.maxAgeMinutes,
  });
  const paymentCaptureItem = paymentCaptureChecklistItem(paymentAttribution);
  const checklist: EndOfDayCloseChecklistItem[] = [
    locationChecklistItem(location),
    snapshotItem,
    posItem,
    drawerItem,
    paymentCaptureItem,
    unsupportedPaymentChecklistItem(),
    unsupportedSignOffChecklistItem(),
  ];
  const blockers = buildReadinessBlockers({
    snapshot,
    snapshotItem,
    posItem,
    drawerItem,
    paymentAttribution,
    activeSessionCount: sessionFacts.activeSessionCount,
    suspendedSessionCount: sessionFacts.suspendedSessionCount,
    inconsistentSessionCount: sessionFacts.inconsistentSessionCount,
    openCashDrawerCount,
  });
  const readiness = deriveReadiness({
    snapshotStatus: snapshotItem.status,
    posStatus: posItem.status,
    drawerStatus: drawerItem.status,
    paymentCaptureStatus: paymentCaptureItem.status,
  });
  const supportedItemCount = checklist.filter(
    (item) => item.status !== "UNSUPPORTED",
  ).length;
  const unsupportedItemCount = checklist.length - supportedItemCount;
  const sourceHash = createSnapshotSourceHash({
    kind: "BRANCH_END_OF_DAY_CLOSE_READINESS",
    organizationId: access.organizationId,
    locationId,
    businessDate: scope.periodStart.toISOString().slice(0, 10),
    checklist: checklist.map((item) => ({
      key: item.key,
      status: item.status,
      sourceHash: item.evidence.sourceHash,
    })),
    blockers: blockers.map((item) => ({
      code: item.code,
      severity: item.severity,
    })),
  });

  return {
    kind: "BRANCH_END_OF_DAY_CLOSE_READINESS",
    organizationId: access.organizationId,
    actorId: access.actorId,
    generatedAt: scope.now.toISOString(),
    businessDate: scope.periodStart.toISOString().slice(0, 10),
    periodStart: scope.periodStart.toISOString(),
    periodEnd: scope.periodEnd.toISOString(),
    authority: authoritySummary(access),
    scope: {
      kind: "LOCATION",
      locationId,
    },
    location: {
      id: location.id,
      name: location.name,
      code: location.code,
    },
    readiness,
    evidenceCoverage: {
      state: unsupportedItemCount > 0 ? "PARTIAL" : "COMPLETE",
      supportedItemCount,
      unsupportedItemCount,
      complete: unsupportedItemCount === 0,
    },
    completion: {
      state: "NOT_AVAILABLE",
      signOffSupported: false,
      signedOff: false,
      signedOffAt: null,
      signedOffBy: null,
      reasonCode: "NO_DURABLE_DAILY_CLOSE_SIGN_OFF_SOURCE",
    },
    facts: {
      branchSnapshotStatus: snapshot.status,
      posSessionCount: sessions.length,
      closedOrReconciledSessionCount:
        sessionFacts.closedOrReconciledSessionCount,
      activeSessionCount: sessionFacts.activeSessionCount,
      suspendedSessionCount: sessionFacts.suspendedSessionCount,
      inconsistentSessionCount: sessionFacts.inconsistentSessionCount,
      cashDrawerCount: drawers.length,
      openCashDrawerCount,
      attributedPaymentCount: paymentAttribution.facts.paymentCount,
      attributedPaymentStatusCounts: {
        ...paymentAttribution.facts.statusCounts,
      },
      attributedPaymentMethodCounts: {
        ...paymentAttribution.facts.methodCounts,
      },
    },
    checklist,
    blockers,
    sourceHash,
  };
}

function normalizeLocationId(value: string) {
  const locationId = value?.trim();
  if (!locationId) {
    throw new BusinessRuleError(
      "A location is required for end-of-day close readiness.",
    );
  }
  return locationId;
}

function parseBusinessDate(value: string) {
  const businessDate = value?.trim();
  if (!BUSINESS_DATE_PATTERN.test(businessDate)) {
    throw new BusinessRuleError("End-of-day businessDate must use YYYY-MM-DD.");
  }

  const parsed = new Date(`${businessDate}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== businessDate
  ) {
    throw new BusinessRuleError(
      "End-of-day businessDate must be a valid calendar date.",
    );
  }
  return parsed;
}

function parseOptionalDate(
  value: Date | string | null | undefined,
  label: string,
) {
  if (value === null || value === undefined) return null;
  const parsed = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BusinessRuleError(`${label} must be a valid date.`);
  }
  return parsed;
}

function assertAccessIdentity(
  access: AllowedOperatingAccessScope,
  input: EndOfDayCloseReadinessInput,
) {
  if (
    access.organizationId !== input.accessContext.orgId ||
    access.actorId !== input.accessContext.userId
  ) {
    throw new ForbiddenError(
      "End-of-day close operating scope evidence is inconsistent.",
    );
  }
}

function assertLocationAuthority(
  access: AllowedOperatingAccessScope,
  locationId: string,
) {
  if (
    access.scope.kind === "TENANT" &&
    access.authority.kind === "TENANT_WIDE"
  ) {
    return;
  }

  if (
    access.scope.kind === "LOCATIONS" &&
    access.authority.kind === "LOCATION_RESPONSIBILITY"
  ) {
    const managedLocationIds = access.authority.managedLocations.map(
      (location) => location.id,
    );
    const scopedLocationIds = access.scope.locationIds;
    if (
      managedLocationIds.length !== scopedLocationIds.length ||
      managedLocationIds.some((id, index) => id !== scopedLocationIds[index])
    ) {
      throw new ForbiddenError(
        "End-of-day close operating scope evidence is inconsistent.",
      );
    }
    if (!scopedLocationIds.includes(locationId)) {
      throw new ForbiddenError(
        "End-of-day close readiness is not available for this location.",
      );
    }
    return;
  }

  throw new ForbiddenError(
    "End-of-day close operating scope evidence is inconsistent.",
  );
}

function authoritySummary(access: AllowedOperatingAccessScope) {
  if (access.authority.kind === "TENANT_WIDE") {
    return {
      kind: access.authority.kind,
      basis: access.authority.basis,
    } as const;
  }

  return {
    kind: access.authority.kind,
    basis: access.authority.basis,
  } as const;
}

function assertSnapshotIdentity(
  snapshot: SnapshotResult<BranchOperatingMetrics>,
  organizationId: string,
  locationId: string,
) {
  if (
    snapshot.organizationId !== organizationId ||
    snapshot.locationId !== locationId ||
    snapshot.kind !== "branch.operating"
  ) {
    throw new ForbiddenError(
      "End-of-day close branch evidence is inconsistent.",
    );
  }
}

function summarizeSessions(
  sessions: Array<{
    status: POSSessionStatus;
    endTime: Date | null;
  }>,
) {
  let closedOrReconciledSessionCount = 0;
  let activeSessionCount = 0;
  let suspendedSessionCount = 0;
  let inconsistentSessionCount = 0;

  for (const session of sessions) {
    const closed = CLOSED_POS_SESSION_STATUSES.has(session.status);
    if (closed) closedOrReconciledSessionCount += 1;
    if (session.status === POSSessionStatus.ACTIVE) activeSessionCount += 1;
    if (session.status === POSSessionStatus.SUSPENDED)
      suspendedSessionCount += 1;
    if ((closed && !session.endTime) || (!closed && session.endTime)) {
      inconsistentSessionCount += 1;
    }
  }

  return {
    closedOrReconciledSessionCount,
    activeSessionCount,
    suspendedSessionCount,
    inconsistentSessionCount,
  };
}

function locationChecklistItem(location: {
  id: string;
  updatedAt: Date;
}): EndOfDayCloseChecklistItem {
  return {
    key: "LOCATION_ACTIVE",
    status: "READY",
    title: "Branch location is active",
    detail:
      "The requested location is active and belongs to the authenticated organization.",
    evidence: {
      sourceType: "LOCATION",
      sourceIds: [location.id],
      sourceHash: createSnapshotSourceHash({
        id: location.id,
        updatedAt: location.updatedAt,
      }),
      observedAt: location.updatedAt.toISOString(),
      freshness: null,
      evidenceGrade: "operational",
    },
  };
}

function branchSnapshotChecklistItem(
  snapshot: SnapshotResult<BranchOperatingMetrics>,
): EndOfDayCloseChecklistItem {
  const status = snapshotChecklistStatus(snapshot);
  return {
    key: "BRANCH_OPERATING_SNAPSHOT",
    status,
    title: "Branch operating snapshot",
    detail: snapshotChecklistDetail(status),
    evidence: {
      sourceType: "BRANCH_OPERATING_SNAPSHOT",
      sourceIds: [snapshot.locationId!],
      sourceHash: snapshot.sourceHash,
      observedAt: snapshot.freshness.sourceMaxUpdatedAt,
      freshness: snapshot.freshness,
      evidenceGrade: snapshot.evidenceGrade,
    },
  };
}

function snapshotChecklistStatus(
  snapshot: SnapshotResult<BranchOperatingMetrics>,
): EndOfDayCloseEvidenceStatus {
  if (snapshot.status === "failed" || snapshot.status === "building")
    return "UNAVAILABLE";
  if (snapshot.status === "blocked") return "BLOCKED";
  if (snapshot.status === "stale" || snapshot.freshness.stale) return "STALE";
  if (snapshot.status === "partial") return "ACTION_REQUIRED";
  if (snapshot.status === "empty") return "NO_ACTIVITY";
  return "READY";
}

function snapshotChecklistDetail(status: EndOfDayCloseEvidenceStatus) {
  if (status === "UNAVAILABLE")
    return "The branch operating snapshot is not available for reliable review.";
  if (status === "BLOCKED")
    return "The branch operating snapshot reports blocking evidence.";
  if (status === "STALE")
    return "The branch operating snapshot is outside its freshness window.";
  if (status === "ACTION_REQUIRED")
    return "The branch operating snapshot is partial and requires evidence review.";
  if (status === "NO_ACTIVITY")
    return "The branch operating snapshot reports no supported activity for this day.";
  return "The branch operating snapshot is available for review.";
}

function posSessionChecklistItem(input: {
  sessions: Array<{
    id: string;
    status: POSSessionStatus;
    startTime: Date;
    endTime: Date | null;
    updatedAt: Date;
  }>;
  facts: ReturnType<typeof summarizeSessions>;
  now: Date;
  maxAgeMinutes: number;
}): EndOfDayCloseChecklistItem {
  const observedAt = maxDate(
    input.sessions.flatMap((session) => [
      session.updatedAt,
      session.endTime,
      session.startTime,
    ]),
  );
  const freshness = createFreshness({
    generatedAt: input.now,
    sourceMaxUpdatedAt: observedAt,
    maxAgeMinutes: input.maxAgeMinutes,
  });
  const unclosedCount =
    input.sessions.length - input.facts.closedOrReconciledSessionCount;
  let status: EndOfDayCloseEvidenceStatus;
  if (input.sessions.length === 0) status = "NO_ACTIVITY";
  else if (input.facts.inconsistentSessionCount > 0 || unclosedCount > 0)
    status = "ACTION_REQUIRED";
  else if (freshness.stale) status = "STALE";
  else status = "READY";

  return {
    key: "POS_SESSION_CLOSURE",
    status,
    title: "POS session closure",
    detail:
      status === "NO_ACTIVITY"
        ? "No POS session overlaps this branch business day."
        : status === "ACTION_REQUIRED"
          ? `${unclosedCount} POS session(s) remain unclosed or have inconsistent close evidence.`
          : status === "STALE"
            ? "POS session close evidence is outside its freshness window."
            : "All overlapping POS sessions are closed or reconciled.",
    evidence: evidenceReference({
      sourceType: "POS_SESSION",
      sourceIds: input.sessions.map((session) => session.id),
      sourceHashParts: input.sessions.map((session) => ({
        id: session.id,
        status: session.status,
        startTime: session.startTime,
        endTime: session.endTime,
        updatedAt: session.updatedAt,
      })),
      observedAt,
      freshness,
      evidenceGrade: input.sessions.length > 0 ? "operational" : "raw",
    }),
  };
}

function cashDrawerChecklistItem(input: {
  drawers: Array<{
    id: string;
    isOpen: boolean;
    updatedAt: Date;
  }>;
  openCashDrawerCount: number;
  now: Date;
  maxAgeMinutes: number;
}): EndOfDayCloseChecklistItem {
  const observedAt = maxDate(input.drawers.map((drawer) => drawer.updatedAt));
  const freshness = createFreshness({
    generatedAt: input.now,
    sourceMaxUpdatedAt: observedAt,
    maxAgeMinutes: input.maxAgeMinutes,
  });
  let status: EndOfDayCloseEvidenceStatus;
  if (input.drawers.length === 0) status = "NO_ACTIVITY";
  else if (input.openCashDrawerCount > 0) status = "ACTION_REQUIRED";
  else if (freshness.stale) status = "STALE";
  else status = "READY";

  return {
    key: "CASH_DRAWER_CLOSURE",
    status,
    title: "Cash drawer closure",
    detail:
      status === "NO_ACTIVITY"
        ? "No cash drawer is configured for this branch."
        : status === "ACTION_REQUIRED"
          ? `${input.openCashDrawerCount} cash drawer(s) remain open.`
          : status === "STALE"
            ? "Cash drawer closure evidence is outside its freshness window."
            : "All configured cash drawers are closed.",
    evidence: evidenceReference({
      sourceType: "CASH_DRAWER",
      sourceIds: input.drawers.map((drawer) => drawer.id),
      sourceHashParts: input.drawers.map((drawer) => ({
        id: drawer.id,
        isOpen: drawer.isOpen,
        updatedAt: drawer.updatedAt,
      })),
      observedAt,
      freshness,
      evidenceGrade: input.drawers.length > 0 ? "operational" : "raw",
    }),
  };
}

function paymentCaptureChecklistItem(
  attribution: BranchPaymentAttributionResult,
): EndOfDayCloseChecklistItem {
  const status: EndOfDayCloseEvidenceStatus =
    attribution.state === "NO_ACTIVITY_WITH_LIMITATIONS"
      ? "NO_ACTIVITY"
      : attribution.state === "STALE_WITH_LIMITATIONS"
        ? "STALE"
        : "READY";

  return {
    key: "PAYMENT_CAPTURE_ATTRIBUTION",
    status,
    title: "Branch payment capture attribution",
    detail:
      status === "NO_ACTIVITY"
        ? "No sales-order-linked payment capture is attributable to this branch day; unlinked and provider evidence remain outside coverage."
        : status === "STALE"
          ? "Directly attributed payment capture evidence is stale; unlinked and provider evidence remain outside coverage."
          : "Sales-order-linked payment captures are directly attributable to this branch; unlinked and provider evidence remain outside coverage.",
    evidence: {
      sourceType: "PAYMENT_CAPTURE",
      sourceIds: [...attribution.evidence.sourceIds],
      sourceHash: attribution.evidence.sourceHash,
      observedAt: attribution.evidence.observedAt,
      freshness: attribution.evidence.freshness,
      evidenceGrade: attribution.evidence.evidenceGrade,
    },
  };
}

function unsupportedPaymentChecklistItem(): EndOfDayCloseChecklistItem {
  return {
    key: "PAYMENT_RECONCILIATION",
    status: "UNSUPPORTED",
    title: "Branch payment reconciliation",
    detail:
      "Current reconciliation evidence has no certified branch-ownership contract, so tenant or provider totals are not substituted.",
    evidence: unsupportedEvidence("PAYMENT_RECONCILIATION"),
  };
}

function unsupportedSignOffChecklistItem(): EndOfDayCloseChecklistItem {
  return {
    key: "MANAGER_SIGN_OFF",
    status: "UNSUPPORTED",
    title: "Manager end-of-day sign-off",
    detail:
      "No durable branch daily-close sign-off record exists. Readiness cannot claim completion or approval.",
    evidence: unsupportedEvidence("MANAGER_SIGN_OFF"),
  };
}

function unsupportedEvidence(
  sourceType: "PAYMENT_RECONCILIATION" | "MANAGER_SIGN_OFF",
): EndOfDayCloseEvidenceReference {
  return {
    sourceType,
    sourceIds: [],
    sourceHash: null,
    observedAt: null,
    freshness: null,
    evidenceGrade: "raw",
  };
}

function evidenceReference(input: {
  sourceType: "POS_SESSION" | "CASH_DRAWER";
  sourceIds: string[];
  sourceHashParts: unknown;
  observedAt: Date | null;
  freshness: EndOfDayCloseEvidenceReference["freshness"];
  evidenceGrade: EndOfDayCloseEvidenceReference["evidenceGrade"];
}): EndOfDayCloseEvidenceReference {
  return {
    sourceType: input.sourceType,
    sourceIds: [...input.sourceIds],
    sourceHash: createSnapshotSourceHash(input.sourceHashParts),
    observedAt: input.observedAt?.toISOString() ?? null,
    freshness: input.freshness,
    evidenceGrade: input.evidenceGrade,
  };
}

function buildReadinessBlockers(input: {
  snapshot: SnapshotResult<BranchOperatingMetrics>;
  snapshotItem: EndOfDayCloseChecklistItem;
  posItem: EndOfDayCloseChecklistItem;
  drawerItem: EndOfDayCloseChecklistItem;
  paymentAttribution: BranchPaymentAttributionResult;
  activeSessionCount: number;
  suspendedSessionCount: number;
  inconsistentSessionCount: number;
  openCashDrawerCount: number;
}): EndOfDayCloseReadinessBlocker[] {
  const blockers: EndOfDayCloseReadinessBlocker[] = input.snapshot.blockers.map(
    (item) => ({
      code: `BRANCH_SNAPSHOT:${item.id}`,
      severity: item.severity,
      gate: item.gate,
      title: item.title,
      detail: item.detail,
      sourceTables: [...item.sourceTables],
      nextAction: item.nextAction ?? null,
    }),
  );

  blockers.push(
    ...input.paymentAttribution.blockers.map((item) => ({
      code: item.code,
      severity: item.severity,
      gate: item.gate,
      title: item.title,
      detail: item.detail,
      sourceTables: [...item.sourceTables],
      nextAction: item.nextAction,
    })),
  );

  if (input.snapshotItem.status === "STALE") {
    blockers.push({
      code: "BRANCH_SNAPSHOT_STALE",
      severity: "high",
      gate: "branch_operating_snapshot_freshness",
      title: "Branch operating evidence is stale",
      detail:
        input.snapshot.freshness.staleReason ??
        "The branch snapshot is outside its freshness window.",
      sourceTables: ["branch_operating_snapshot"],
      nextAction: "Refresh branch operating evidence before end-of-day review.",
    });
  }
  if (input.snapshotItem.status === "UNAVAILABLE") {
    blockers.push({
      code: "BRANCH_SNAPSHOT_UNAVAILABLE",
      severity: "high",
      gate: "branch_operating_snapshot",
      title: "Branch operating evidence is unavailable",
      detail:
        "The branch operating snapshot cannot currently support end-of-day review.",
      sourceTables: ["branch_operating_snapshot"],
      nextAction:
        "Restore the branch snapshot service before end-of-day review.",
    });
  }
  if (input.activeSessionCount > 0) {
    blockers.push({
      code: "ACTIVE_POS_SESSIONS",
      severity: "high",
      gate: "pos_session_close",
      title: "POS sessions remain active",
      detail: `${input.activeSessionCount} POS session(s) remain active for this branch business day.`,
      sourceTables: ["pos_sessions"],
      nextAction: "Close each active POS session with counted-cash evidence.",
    });
  }
  if (input.suspendedSessionCount > 0) {
    blockers.push({
      code: "SUSPENDED_POS_SESSIONS",
      severity: "high",
      gate: "pos_session_close",
      title: "POS sessions remain suspended",
      detail: `${input.suspendedSessionCount} POS session(s) remain suspended for this branch business day.`,
      sourceTables: ["pos_sessions"],
      nextAction: "Resume and close or investigate each suspended POS session.",
    });
  }
  if (input.inconsistentSessionCount > 0) {
    blockers.push({
      code: "INCONSISTENT_POS_SESSION_CLOSE_EVIDENCE",
      severity: "critical",
      gate: "pos_session_close_evidence",
      title: "POS session close evidence is inconsistent",
      detail: `${input.inconsistentSessionCount} POS session(s) disagree between lifecycle status and end timestamp.`,
      sourceTables: ["pos_sessions"],
      nextAction:
        "Investigate session lifecycle evidence before relying on the branch close.",
    });
  }
  if (input.posItem.status === "STALE") {
    blockers.push({
      code: "POS_SESSION_EVIDENCE_STALE",
      severity: "medium",
      gate: "pos_session_close_freshness",
      title: "POS session evidence is stale",
      detail:
        input.posItem.evidence.freshness?.staleReason ??
        "POS session evidence is outside its freshness window.",
      sourceTables: ["pos_sessions"],
      nextAction: "Refresh POS session evidence before end-of-day review.",
    });
  }
  if (input.openCashDrawerCount > 0) {
    blockers.push({
      code: "OPEN_CASH_DRAWERS",
      severity: "high",
      gate: "cash_drawer_close",
      title: "Cash drawers remain open",
      detail: `${input.openCashDrawerCount} cash drawer(s) remain open at this branch.`,
      sourceTables: ["cash_drawers"],
      nextAction: "Close each drawer through its POS shift workflow.",
    });
  }
  if (input.drawerItem.status === "STALE") {
    blockers.push({
      code: "CASH_DRAWER_EVIDENCE_STALE",
      severity: "medium",
      gate: "cash_drawer_close_freshness",
      title: "Cash drawer evidence is stale",
      detail:
        input.drawerItem.evidence.freshness?.staleReason ??
        "Cash drawer evidence is outside its freshness window.",
      sourceTables: ["cash_drawers"],
      nextAction: "Refresh cash drawer evidence before end-of-day review.",
    });
  }

  return blockers;
}

function deriveReadiness(input: {
  snapshotStatus: EndOfDayCloseEvidenceStatus;
  posStatus: EndOfDayCloseEvidenceStatus;
  drawerStatus: EndOfDayCloseEvidenceStatus;
  paymentCaptureStatus: EndOfDayCloseEvidenceStatus;
}): EndOfDayCloseReadinessState {
  if (input.snapshotStatus === "UNAVAILABLE") return "UNAVAILABLE";
  const supportedStatuses = [
    input.snapshotStatus,
    input.posStatus,
    input.drawerStatus,
    input.paymentCaptureStatus,
  ];
  if (
    supportedStatuses.some(
      (status) =>
        status === "ACTION_REQUIRED" ||
        status === "STALE" ||
        status === "BLOCKED" ||
        status === "UNAVAILABLE",
    )
  ) {
    return "ACTION_REQUIRED";
  }
  if (supportedStatuses.every((status) => status === "NO_ACTIVITY")) {
    return "NO_ACTIVITY";
  }
  return "READY_FOR_REVIEW";
}
