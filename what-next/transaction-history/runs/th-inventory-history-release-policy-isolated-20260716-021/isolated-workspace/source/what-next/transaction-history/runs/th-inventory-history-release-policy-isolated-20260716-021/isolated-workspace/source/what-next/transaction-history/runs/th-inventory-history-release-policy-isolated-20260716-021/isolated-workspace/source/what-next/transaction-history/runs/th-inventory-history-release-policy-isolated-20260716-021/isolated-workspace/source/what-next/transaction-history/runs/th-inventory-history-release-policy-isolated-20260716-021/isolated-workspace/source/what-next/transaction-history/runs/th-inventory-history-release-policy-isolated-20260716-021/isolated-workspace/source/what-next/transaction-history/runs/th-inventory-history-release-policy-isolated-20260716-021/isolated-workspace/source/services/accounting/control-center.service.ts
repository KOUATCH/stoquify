import "server-only"

import { PostingRuleLineSide } from "@prisma/client"

import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { db } from "@/prisma/db"
import {
  collectAccountingSetupReadinessIssues,
  getAccountingSettings,
  REQUIRED_ACCOUNTING_MAPPINGS,
  REQUIRED_DEFAULT_JOURNAL_TYPES,
  REQUIRED_READY_POSTING_PURPOSES,
} from "./accounting-settings.service"
import { getDefaultPostingRuleTemplates } from "./default-posting-rules.service"
import { listAccountingPeriods } from "./periods.service"
import { listPostingRules } from "./posting-rules.service"
import { getSensitiveActionPolicy } from "@/services/controls/sensitive-action.service"

export type AccountingBlockerCategory = "operational" | "accounting" | "regulatory" | "permission"
export type AccountingReadinessStatus = "ok" | "warning" | "blocked"
export type AccountingControlCenterStatus = "blocked" | "ready_to_lock" | "ready"

export type AccountingControlCenterBlocker = {
  id: string
  category: AccountingBlockerCategory
  severity: Exclude<AccountingReadinessStatus, "ok">
  messageEn: string
  messageFr: string
}

export type AccountingReadinessChecklistItem = {
  id: string
  labelEn: string
  labelFr: string
  category: AccountingBlockerCategory
  status: AccountingReadinessStatus
  detailEn: string
  detailFr: string
  blockerCount: number
}

export type AccountMappingStatus = {
  key: string
  labelEn: string
  labelFr: string
  requiredType: string
  requiredNormalBalance: string
  requiredSyscohadaClass: string
  accountId: string | null
  code: string | null
  nameEn: string | null
  nameFr: string | null
  syscohadaClass: string | null
  syscohadaReference: string | null
  status: AccountingReadinessStatus
  blockerCategories: AccountingBlockerCategory[]
  blockers: AccountingControlCenterBlocker[]
}

export type DefaultJournalStatus = {
  type: string
  code: string | null
  nameEn: string | null
  nameFr: string | null
  allowManualEntries: boolean | null
  status: AccountingReadinessStatus
  blockers: AccountingControlCenterBlocker[]
}

export type PostingRuleStatus = {
  postingPurpose: string
  expectedSourceType: string | null
  defaultCode: string | null
  ruleId: string | null
  code: string | null
  nameEn: string | null
  nameFr: string | null
  sourceType: string | null
  lineCount: number
  debitLineCount: number
  creditLineCount: number
  effectiveFrom: string | null
  effectiveTo: string | null
  status: AccountingReadinessStatus
  blockers: AccountingControlCenterBlocker[]
}

export type AccountingPeriodSummary = {
  id: string
  name: string
  status: string
  startDate: string
  endDate: string
  fiscalYearName: string | null
}

export type AccountingSetupLockPolicy = {
  action: string
  requiredPermission: string
  requiredAssurance: string
  riskTier: string
  freshAuthMaxAgeSeconds: number | null
  hasPermission: boolean
  canLock: boolean
  locked: boolean
  disabledReasonEn: string | null
  disabledReasonFr: string | null
}

export type AccountingControlEventSummary = {
  id: string
  source: "ledger" | "control"
  action: string
  resourceType: string
  resourceId: string | null
  actorId: string | null
  message: string | null
  createdAt: string
  status: "allowed" | "denied" | "recorded"
  riskTier: string | null
  reasonCode: string | null
  category: AccountingBlockerCategory
}

export type AccountingControlCenterData = {
  organizationId: string
  generatedAt: string
  source: "ACCOUNTING_CONTROL_CENTER_READ_MODEL"
  status: AccountingControlCenterStatus
  settings: {
    accountingEnabled: boolean
    setupStatus: string
    countryPack: string | null
    baseCurrency: string
    fiscalYearStartMonth: number
    fiscalYearStartDay: number
    setupCompletedAt: string | null
  }
  summary: {
    blockerCount: number
    warningCount: number
    mappingReadyCount: number
    mappingRequiredCount: number
    defaultJournalReadyCount: number
    defaultJournalRequiredCount: number
    postingRuleReadyCount: number
    postingRuleRequiredCount: number
    openPeriodCount: number
  }
  blockers: AccountingControlCenterBlocker[]
  checklist: AccountingReadinessChecklistItem[]
  accountMappings: AccountMappingStatus[]
  defaultJournals: DefaultJournalStatus[]
  postingRules: PostingRuleStatus[]
  periods: {
    currentOpenPeriod: AccountingPeriodSummary | null
    openPeriods: AccountingPeriodSummary[]
    recentPeriods: AccountingPeriodSummary[]
  }
  controlEvents: {
    latest: AccountingControlEventSummary[]
    ledgerEventCount: number
    controlEventCount: number
    deniedControlEventCount: number
  }
  setupLock: AccountingSetupLockPolicy
}

type AccountingControlCenterContext = {
  actorPermissions: readonly string[]
}

function iso(value: Date | string | null | undefined) {
  if (!value) return null
  return new Date(value).toISOString()
}

function normalizeMappingKey(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed.toUpperCase() : null
}

function normalizeSyscohadaClass(value?: string | null) {
  return value?.trim().slice(0, 1) || null
}

function uniqueCategories(blockers: AccountingControlCenterBlocker[]) {
  return Array.from(new Set(blockers.map((blocker) => blocker.category)))
}

function blocker(
  id: string,
  category: AccountingBlockerCategory,
  messageEn: string,
  messageFr: string,
  severity: Exclude<AccountingReadinessStatus, "ok"> = "blocked",
): AccountingControlCenterBlocker {
  return { id, category, messageEn, messageFr, severity }
}

function statusFromBlockers(blockers: AccountingControlCenterBlocker[]): AccountingReadinessStatus {
  if (blockers.some((item) => item.severity === "blocked")) return "blocked"
  if (blockers.length > 0) return "warning"
  return "ok"
}

function isEffective(
  rule: { effectiveFrom: Date | null; effectiveTo: Date | null },
  now: Date,
) {
  return (!rule.effectiveFrom || rule.effectiveFrom <= now) && (!rule.effectiveTo || rule.effectiveTo >= now)
}

function asJsonObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : null
}

function classifySetupIssue(issue: string, index: number): AccountingControlCenterBlocker {
  const lower = issue.toLowerCase()

  if (lower.includes("syscohada")) {
    return blocker(
      `readiness-regulatory-${index}`,
      "regulatory",
      issue,
      issue,
    )
  }

  if (lower.includes("period")) {
    return blocker(
      `readiness-operational-${index}`,
      "operational",
      issue,
      issue,
    )
  }

  if (lower.includes("posting rule") || lower.includes("journal") || lower.includes("account")) {
    return blocker(
      `readiness-accounting-${index}`,
      "accounting",
      issue,
      issue,
    )
  }

  return blocker(
    `readiness-operational-${index}`,
    "operational",
    issue,
    issue,
  )
}

function buildChecklistItem(
  id: string,
  labelEn: string,
  labelFr: string,
  category: AccountingBlockerCategory,
  blockers: AccountingControlCenterBlocker[],
  okEn: string,
  okFr: string,
): AccountingReadinessChecklistItem {
  const status = statusFromBlockers(blockers)

  return {
    id,
    labelEn,
    labelFr,
    category,
    status,
    detailEn: status === "ok" ? okEn : blockers.map((item) => item.messageEn).join("; "),
    detailFr: status === "ok" ? okFr : blockers.map((item) => item.messageFr).join("; "),
    blockerCount: blockers.length,
  }
}

export async function getAccountingControlCenterData(
  organizationId: string,
  context: AccountingControlCenterContext,
  now = new Date(),
): Promise<AccountingControlCenterData> {
  const requiredMappingKeys = REQUIRED_ACCOUNTING_MAPPINGS.map((mapping) => mapping.key)
  const setupLockPolicy = getSensitiveActionPolicy("accounting.setup.lock")
  const defaultPostingTemplates = getDefaultPostingRuleTemplates()
  const defaultTemplateByPurpose = new Map(
    defaultPostingTemplates.map((template) => [template.postingPurpose, template]),
  )

  const [
    settings,
    mappedAccounts,
    defaultJournals,
    postingRules,
    periods,
    setupIssues,
    latestLedgerEvents,
    latestControlEvents,
  ] = await Promise.all([
    getAccountingSettings(organizationId),
    db.chartOfAccount.findMany({
      where: {
        organizationId,
        deletedAt: null,
        mappingKey: { in: requiredMappingKeys },
      },
      select: {
        id: true,
        code: true,
        nameEn: true,
        nameFr: true,
        type: true,
        normalBalance: true,
        mappingKey: true,
        syscohadaClass: true,
        syscohadaReference: true,
        isActive: true,
        _count: { select: { children: true } },
      },
      orderBy: { code: "asc" },
    }),
    db.journal.findMany({
      where: {
        organizationId,
        type: { in: [...REQUIRED_DEFAULT_JOURNAL_TYPES] },
      },
      select: {
        id: true,
        code: true,
        nameEn: true,
        nameFr: true,
        type: true,
        isDefault: true,
        isActive: true,
        allowManualEntries: true,
      },
      orderBy: [{ type: "asc" }, { code: "asc" }],
    }),
    listPostingRules(organizationId, { includeInactive: true }),
    listAccountingPeriods(organizationId),
    collectAccountingSetupReadinessIssues(organizationId, db, now),
    db.ledgerAuditEvent.findMany({
      where: { organizationId },
      select: {
        id: true,
        action: true,
        actorId: true,
        resourceType: true,
        resourceId: true,
        message: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    db.auditLog.findMany({
      where: {
        organizationId,
        OR: [
          {
            entityType: {
              in: ["AccountingSetup", "AccountingPeriod", "JournalEntry", "AccountingExport", "SensitiveAction"],
            },
          },
          { action: { contains: "CONTROL" } },
        ],
      },
      select: {
        id: true,
        entityType: true,
        entityId: true,
        action: true,
        changes: true,
        userId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ])

  const mappedAccountByKey = new Map(
    mappedAccounts.map((account) => [normalizeMappingKey(account.mappingKey), account]),
  )
  const mappingRows: AccountMappingStatus[] = REQUIRED_ACCOUNTING_MAPPINGS.map((required) => {
    const account = mappedAccountByKey.get(required.key)
    const blockers: AccountingControlCenterBlocker[] = []

    if (!account) {
      blockers.push(
        blocker(
          `mapping-${required.key}-missing`,
          "accounting",
          `Missing active mapping for ${required.key}.`,
          `Mappage actif manquant pour ${required.key}.`,
        ),
      )
    } else {
      if (!account.isActive) {
        blockers.push(
          blocker(
            `mapping-${required.key}-inactive`,
            "accounting",
            `Mapped account ${account.code} is inactive.`,
            `Le compte mappe ${account.code} est inactif.`,
          ),
        )
      }

      if (account._count.children > 0) {
        blockers.push(
          blocker(
            `mapping-${required.key}-leaf`,
            "accounting",
            `Mapped account ${account.code} must be a leaf account.`,
            `Le compte mappe ${account.code} doit etre un compte feuille.`,
          ),
        )
      }

      if (account.type !== required.type) {
        blockers.push(
          blocker(
            `mapping-${required.key}-type`,
            "accounting",
            `Mapped account ${account.code} must be ${required.type}.`,
            `Le compte mappe ${account.code} doit etre ${required.type}.`,
          ),
        )
      }

      if (account.normalBalance !== required.normalBalance) {
        blockers.push(
          blocker(
            `mapping-${required.key}-balance`,
            "accounting",
            `Mapped account ${account.code} must have ${required.normalBalance} normal balance.`,
            `Le compte mappe ${account.code} doit avoir un solde normal ${required.normalBalance}.`,
          ),
        )
      }

      if (normalizeSyscohadaClass(account.syscohadaClass) !== required.syscohadaClass) {
        blockers.push(
          blocker(
            `mapping-${required.key}-syscohada-class`,
            "regulatory",
            `Mapped account ${account.code} must be SYSCOHADA class ${required.syscohadaClass}.`,
            `Le compte mappe ${account.code} doit etre de classe SYSCOHADA ${required.syscohadaClass}.`,
          ),
        )
      }

      if (!account.syscohadaReference?.trim()) {
        blockers.push(
          blocker(
            `mapping-${required.key}-syscohada-reference`,
            "regulatory",
            `Mapped account ${account.code} requires a SYSCOHADA reference.`,
            `Le compte mappe ${account.code} exige une reference SYSCOHADA.`,
          ),
        )
      }
    }

    return {
      key: required.key,
      labelEn: required.label,
      labelFr: required.label,
      requiredType: required.type,
      requiredNormalBalance: required.normalBalance,
      requiredSyscohadaClass: required.syscohadaClass,
      accountId: account?.id ?? null,
      code: account?.code ?? null,
      nameEn: account?.nameEn ?? null,
      nameFr: account?.nameFr ?? null,
      syscohadaClass: account?.syscohadaClass ?? null,
      syscohadaReference: account?.syscohadaReference ?? null,
      status: statusFromBlockers(blockers),
      blockerCategories: uniqueCategories(blockers),
      blockers,
    }
  })

  const defaultJournalByType = new Map(
    defaultJournals
      .filter((journal) => journal.isDefault)
      .map((journal) => [journal.type, journal]),
  )
  const journalRows: DefaultJournalStatus[] = REQUIRED_DEFAULT_JOURNAL_TYPES.map((type) => {
    const journal = defaultJournalByType.get(type)
    const blockers: AccountingControlCenterBlocker[] = []

    if (!journal) {
      blockers.push(
        blocker(
          `journal-${type}-missing`,
          "accounting",
          `Missing default ${type} journal.`,
          `Journal par defaut ${type} manquant.`,
        ),
      )
    } else if (!journal.isActive) {
      blockers.push(
        blocker(
          `journal-${type}-inactive`,
          "accounting",
          `Default journal ${journal.code} is inactive.`,
          `Le journal par defaut ${journal.code} est inactif.`,
        ),
      )
    }

    return {
      type,
      code: journal?.code ?? null,
      nameEn: journal?.nameEn ?? null,
      nameFr: journal?.nameFr ?? null,
      allowManualEntries: journal?.allowManualEntries ?? null,
      status: statusFromBlockers(blockers),
      blockers,
    }
  })

  const postingRuleRows: PostingRuleStatus[] = REQUIRED_READY_POSTING_PURPOSES.map((purpose) => {
    const activeRules = postingRules
      .filter((rule) => rule.postingPurpose === purpose && rule.isActive && isEffective(rule, now))
      .sort((left, right) => left.priority - right.priority || left.code.localeCompare(right.code))
    const rule = activeRules[0]
    const template = defaultTemplateByPurpose.get(purpose)
    const blockers: AccountingControlCenterBlocker[] = []
    const debitLineCount = rule?.lines.filter((line) => line.side === PostingRuleLineSide.DEBIT).length ?? 0
    const creditLineCount = rule?.lines.filter((line) => line.side === PostingRuleLineSide.CREDIT).length ?? 0
    const missingResolvableLine = rule?.lines.some((line) => !line.accountId && !normalizeMappingKey(line.mappingKey)) ?? false

    if (!rule) {
      blockers.push(
        blocker(
          `posting-rule-${purpose}-missing`,
          "accounting",
          `Missing active effective posting rule for ${purpose}.`,
          `Regle d'ecriture active manquante pour ${purpose}.`,
        ),
      )
    } else {
      if (rule.lines.length < 2) {
        blockers.push(
          blocker(
            `posting-rule-${purpose}-line-count`,
            "accounting",
            `Posting rule ${rule.code} needs at least two lines.`,
            `La regle ${rule.code} exige au moins deux lignes.`,
          ),
        )
      }

      if (debitLineCount === 0 || creditLineCount === 0) {
        blockers.push(
          blocker(
            `posting-rule-${purpose}-balance-sides`,
            "accounting",
            `Posting rule ${rule.code} must include debit and credit lines.`,
            `La regle ${rule.code} doit inclure des lignes debit et credit.`,
          ),
        )
      }

      if (missingResolvableLine) {
        blockers.push(
          blocker(
            `posting-rule-${purpose}-line-resolution`,
            "accounting",
            `Posting rule ${rule.code} has a line without account or mapping resolution.`,
            `La regle ${rule.code} a une ligne sans compte ni mappage.`,
          ),
        )
      }
    }

    return {
      postingPurpose: purpose,
      expectedSourceType: template?.sourceType ?? null,
      defaultCode: template?.code ?? null,
      ruleId: rule?.id ?? null,
      code: rule?.code ?? null,
      nameEn: rule?.nameEn ?? null,
      nameFr: rule?.nameFr ?? null,
      sourceType: rule?.sourceType ?? null,
      lineCount: rule?.lines.length ?? 0,
      debitLineCount,
      creditLineCount,
      effectiveFrom: iso(rule?.effectiveFrom),
      effectiveTo: iso(rule?.effectiveTo),
      status: statusFromBlockers(blockers),
      blockers,
    }
  })

  const periodRows = periods.map((period) => ({
    id: period.id,
    name: period.name,
    status: period.status,
    startDate: iso(period.startDate)!,
    endDate: iso(period.endDate)!,
    fiscalYearName: period.fiscalYear?.name ?? null,
  }))
  const currentOpenPeriods = periodRows.filter((period) => {
    const startDate = new Date(period.startDate)
    const endDate = new Date(period.endDate)
    return period.status === "OPEN" && startDate <= now && endDate >= now
  })
  const openPeriods = periodRows.filter((period) => period.status === "OPEN")

  const hasSetupLockPermission = hasRbacPermission(context.actorPermissions, setupLockPolicy.permission)
  const settingsBlockers = settings
    ? []
    : [
        blocker(
          "settings-missing",
          "operational",
          "Accounting settings have not been initialized.",
          "Les parametres comptables ne sont pas initialises.",
        ),
      ]
  const mappingBlockers = mappingRows.flatMap((row) => row.blockers)
  const journalBlockers = journalRows.flatMap((row) => row.blockers)
  const postingRuleBlockers = postingRuleRows.flatMap((row) => row.blockers)
  const periodBlockers =
    currentOpenPeriods.length > 0
      ? []
      : [
          blocker(
            "period-current-open-missing",
            "operational",
            "No open accounting period covers today's date.",
            "Aucune periode comptable ouverte ne couvre la date du jour.",
          ),
        ]
  const permissionBlockers = hasSetupLockPermission
    ? []
    : [
        blocker(
          "permission-setup-lock-missing",
          "permission",
          `Missing ${setupLockPolicy.permission} permission for setup lock.`,
          `Permission ${setupLockPolicy.permission} manquante pour verrouiller la configuration.`,
        ),
      ]

  const readinessBlockers = setupIssues.map(classifySetupIssue)
  const allBlockersById = new Map<string, AccountingControlCenterBlocker>()
  for (const item of [
    ...settingsBlockers,
    ...mappingBlockers,
    ...journalBlockers,
    ...postingRuleBlockers,
    ...periodBlockers,
    ...permissionBlockers,
    ...readinessBlockers,
  ]) {
    allBlockersById.set(item.id, item)
  }
  const blockers = Array.from(allBlockersById.values()).filter((item) => item.severity === "blocked")
  const warnings = Array.from(allBlockersById.values()).filter((item) => item.severity === "warning")

  const ledgerEvents: AccountingControlEventSummary[] = latestLedgerEvents.map((event) => ({
    id: event.id,
    source: "ledger",
    action: event.action,
    resourceType: event.resourceType,
    resourceId: event.resourceId,
    actorId: event.actorId,
    message: event.message,
    createdAt: event.createdAt.toISOString(),
    status: "recorded",
    riskTier: null,
    reasonCode: null,
    category: "accounting",
  }))
  const controlEvents: AccountingControlEventSummary[] = latestControlEvents.map((event) => {
    const changes = asJsonObject(event.changes)
    const allowed = changes.allowed === true
    const denied = changes.allowed === false || event.action.endsWith("_DENIED")

    return {
      id: event.id,
      source: "control",
      action: event.action,
      resourceType: event.entityType,
      resourceId: event.entityId,
      actorId: event.userId,
      message: null,
      createdAt: event.createdAt.toISOString(),
      status: denied ? "denied" : allowed ? "allowed" : "recorded",
      riskTier: stringValue(changes.riskTier),
      reasonCode: stringValue(changes.reasonCode),
      category: denied ? "permission" : "operational",
    }
  })
  const latestEvents = [...ledgerEvents, ...controlEvents]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 10)

  const locked = settings?.setupStatus === "READY" || settings?.setupStatus === "LOCKED"
  const operationallyReady = blockers.length === 0
  const canLock = operationallyReady && !locked
  const disabledReasonEn = locked
    ? "Accounting setup is already marked ready."
    : !hasSetupLockPermission
      ? `Missing ${setupLockPolicy.permission} permission.`
      : blockers.length > 0
        ? "Resolve all setup blockers before locking accounting."
        : null
  const disabledReasonFr = locked
    ? "La configuration comptable est deja marquee prete."
    : !hasSetupLockPermission
      ? `Permission ${setupLockPolicy.permission} manquante.`
      : blockers.length > 0
        ? "Corrigez tous les blocages avant de verrouiller la comptabilite."
        : null

  return {
    organizationId,
    generatedAt: now.toISOString(),
    source: "ACCOUNTING_CONTROL_CENTER_READ_MODEL",
    status: locked ? "ready" : operationallyReady ? "ready_to_lock" : "blocked",
    settings: {
      accountingEnabled: settings?.accountingEnabled ?? false,
      setupStatus: settings?.setupStatus ?? "NOT_STARTED",
      countryPack: settings?.countryPack ?? null,
      baseCurrency: settings?.baseCurrency ?? "XAF",
      fiscalYearStartMonth: settings?.fiscalYearStartMonth ?? 1,
      fiscalYearStartDay: settings?.fiscalYearStartDay ?? 1,
      setupCompletedAt: iso(settings?.setupCompletedAt),
    },
    summary: {
      blockerCount: blockers.length,
      warningCount: warnings.length,
      mappingReadyCount: mappingRows.filter((row) => row.status === "ok").length,
      mappingRequiredCount: mappingRows.length,
      defaultJournalReadyCount: journalRows.filter((row) => row.status === "ok").length,
      defaultJournalRequiredCount: journalRows.length,
      postingRuleReadyCount: postingRuleRows.filter((row) => row.status === "ok").length,
      postingRuleRequiredCount: postingRuleRows.length,
      openPeriodCount: openPeriods.length,
    },
    blockers,
    checklist: [
      buildChecklistItem(
        "settings",
        "Accounting settings",
        "Parametres comptables",
        "operational",
        settingsBlockers,
        "Accounting settings exist for this organization.",
        "Les parametres comptables existent pour cette organisation.",
      ),
      buildChecklistItem(
        "mappings",
        "Required account mappings",
        "Mappages de comptes requis",
        "accounting",
        mappingBlockers,
        "All required mapping accounts are active, leaf accounts, and SYSCOHADA aligned.",
        "Tous les comptes mappes requis sont actifs, feuilles et alignes SYSCOHADA.",
      ),
      buildChecklistItem(
        "journals",
        "Default journals",
        "Journaux par defaut",
        "accounting",
        journalBlockers,
        "All required default journals are active.",
        "Tous les journaux par defaut requis sont actifs.",
      ),
      buildChecklistItem(
        "posting-rules",
        "Posting rules",
        "Regles d'ecriture",
        "accounting",
        postingRuleBlockers,
        "Required operational posting rules have active balanced scaffolds.",
        "Les regles operationnelles requises ont des canevas actifs et equilibres.",
      ),
      buildChecklistItem(
        "open-period",
        "Open accounting period",
        "Periode comptable ouverte",
        "operational",
        periodBlockers,
        "A current open period is available for postings.",
        "Une periode ouverte courante est disponible pour les ecritures.",
      ),
      buildChecklistItem(
        "setup-lock-permission",
        "Setup-lock permission",
        "Permission verrouillage",
        "permission",
        permissionBlockers,
        `Actor has ${setupLockPolicy.permission}.`,
        `L'utilisateur a ${setupLockPolicy.permission}.`,
      ),
    ],
    accountMappings: mappingRows,
    defaultJournals: journalRows,
    postingRules: postingRuleRows,
    periods: {
      currentOpenPeriod: currentOpenPeriods[0] ?? null,
      openPeriods,
      recentPeriods: periodRows.slice(0, 12),
    },
    controlEvents: {
      latest: latestEvents,
      ledgerEventCount: ledgerEvents.length,
      controlEventCount: controlEvents.length,
      deniedControlEventCount: controlEvents.filter((event) => event.status === "denied").length,
    },
    setupLock: {
      action: setupLockPolicy.action,
      requiredPermission: setupLockPolicy.permission,
      requiredAssurance: setupLockPolicy.requiredAssurance,
      riskTier: setupLockPolicy.riskTier,
      freshAuthMaxAgeSeconds: setupLockPolicy.freshAuthMaxAgeSeconds ?? null,
      hasPermission: hasSetupLockPermission,
      canLock,
      locked,
      disabledReasonEn,
      disabledReasonFr,
    },
  }
}
