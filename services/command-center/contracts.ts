export type Center = "digest" | "manager" | "owner";
export type SourceKey =
  | "suspense"
  | "stockout"
  | "receiving"
  | "loss"
  | "close"
  | "payroll_forecast"
  | "employee_balance";
export type Scope = {
  locationId: string | null;
  periodStart: string;
  periodEnd: string;
};
export type FollowUpQuery = {
  center: Center;
  locationId?: string | null;
  periodStart: string;
  periodEnd: string;
};
export type Condition = "ACTIVE" | "CLEAR" | "UNKNOWN";
export type Coordination = "OPEN" | "ASSIGNED" | "WAITING" | "REVIEWED";
export type FollowUpItem = {
  id: string;
  source: SourceKey;
  revision: number;
  episode: number;
  condition: Condition;
  coordination: Coordination;
  ownerId: string | null;
  ownerName: string | null;
  dueAt: string | null;
  actionPath: string;
  canAssign: boolean;
  canDelegate: boolean;
  sourceRevision: string;
  updatedAt: string;
  history: { type: string; at: string }[];
};
export type FollowUpData = {
  availableLocations: { id: string; name: string; assignedToActor: boolean }[];
  scope: Scope;
  items: FollowUpItem[];
  actorId: string;
  revision: number;
  evidenceKey: string;
  review: { current: boolean; reviewedAt: string | null };
  unavailable: SourceKey[];
  notices: { id: string; source: SourceKey }[];
  preference: {
    enabled: boolean;
    quietStart: number | null;
    quietEnd: number | null;
  };
};
export type FollowUpCommand = FollowUpQuery & {
  requestId: string;
  itemId: string;
  expectedRevision: number;
  ownerId: string | null;
  state: Coordination;
  dueAt: string | null;
};
export type ReviewCommand = FollowUpQuery & {
  requestId: string;
  expectedRevision: number;
  evidenceKey: string;
};
export type FollowUpCandidate = { id: string; name: string };

export type CandidateQuery = FollowUpQuery & { itemId: string; search: string };

export type PreferenceCommand = FollowUpQuery & {
  enabled: boolean;
  quietStart: number | null;
  quietEnd: number | null;
};
export type NoticeCommand = FollowUpQuery & { noticeId: string };
