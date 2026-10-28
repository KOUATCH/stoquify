"use client";

import { useState, type ReactNode } from "react";
import { useLocale } from "next-intl";
import {
  Boxes,
  CalendarDays,
  ClipboardCheck,
  Eye,
  FileCheck2,
  MapPin,
  PackageSearch,
  RefreshCcw,
  RotateCcw,
  Scale,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

import {
  CommandBriefHeader,
  DetailDrawer,
  FilterBar,
  KpiTile,
  ProofBadge,
  RouteStatePanel,
  StatusStrip,
  dashboardMutedTextClass,
  dashboardPanelClass,
} from "@/components/dashboard/primitives/command-center-primitives";
import { TableDateRangePicker } from "@/components/DataTableComponents/TableDateRangePicker";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  inventoryLossErrorState,
  useInventoryLossWorkbench,
} from "@/hooks/useInventoryLossWorkbench";
import { cn } from "@/lib/utils";

import {
  formatDateTime,
  categoryLabel,
  formatInteger,
  formatMoney,
  formatPercent,
  formatQuantity,
  scopeLabel,
  type InventoryLossRecord,
  type InventoryLossData,
  type InventoryLossProductGroup,
  type InventoryLossValueGroup,
} from "./inventoryLossWorkbenchAdapter";
import {
  inventoryLossWorkbenchCopy,
  type InventoryLossWorkbenchCopy,
} from "./inventoryLossWorkbenchCopy";

export function InventoryLossWorkbench() {
  const locale = useLocale();
  const copy: InventoryLossWorkbenchCopy =
    locale === "fr"
      ? inventoryLossWorkbenchCopy.fr
      : inventoryLossWorkbenchCopy.en;
  const [selectedRecord, setSelectedRecord] =
    useState<InventoryLossRecord | null>(null);
  const {
    filters,
    periodError,
    result,
    scope,
    isLoading,
    isFetching,
    isError,
    error,
    updateFilters,
    resetFilters,
    refetch,
  } = useInventoryLossWorkbench();

  const complete = result?.completeness.state === "complete";
  const partialMessage = result
    ? result.completeness.sources
        .filter((source) => source.state === "partial")
        .map((source) => source.reason)
        .filter(Boolean)
        .join(" ")
    : "";
  const errorState = inventoryLossErrorState(error);

  return (
    <main className="dashboard-landing-theme dark min-h-screen bg-[var(--dash-canvas)] text-[var(--dash-text)]">
      <div className="dashboard-landing-content mx-auto w-full max-w-[1920px] space-y-4 px-4 py-5 md:px-6 lg:px-8">
        <CommandBriefHeader
          eyebrow={copy.eyebrow}
          title={copy.title}
          summary={copy.summary}
          state={{
            label: isFetching
              ? copy.refreshing
              : result
                ? complete
                  ? copy.complete
                  : copy.partial
                : copy.loading,
            tone: isFetching
              ? "info"
              : complete
                ? "success"
                : result
                  ? "gold"
                  : "info",
          }}
          metadata={
            result && scope
              ? [
                  {
                    label: copy.scope,
                    value: scopeLabel(scope, copy),
                    icon: ShieldCheck,
                  },
                  {
                    label: copy.period,
                    value: `${filters.from} - ${filters.to}`,
                    icon: CalendarDays,
                  },
                  {
                    label: copy.timezone,
                    value: result.period.timezone,
                    icon: MapPin,
                  },
                  {
                    label: copy.generated,
                    value: formatDateTime(
                      result.snapshot.generatedAt,
                      locale,
                      result.period.timezone,
                    ),
                    icon: RefreshCcw,
                  },
                ]
              : []
          }
          actions={[
            {
              label: copy.refresh,
              icon: RefreshCcw,
              onClick: () => void refetch(),
              disabled: isFetching || Boolean(periodError),
              variant: "secondary",
            },
          ]}
          proof={
            result
              ? {
                  state: complete ? "verified" : "pending",
                  label: complete ? copy.complete : copy.partial,
                  source: "stock_adjustment_lines",
                  sourceCount: result.snapshot.sourceLineCount,
                }
              : undefined
          }
        />

        <FilterBar
          title={copy.filtersTitle}
          detail={copy.filtersDetail}
          actions={[
            {
              label: copy.reset,
              icon: RotateCcw,
              onClick: resetFilters,
              variant: "secondary",
            },
          ]}
        >
          <TableDateRangePicker
            value={{ from: filters.from, to: filters.to }}
            onChange={(range) => updateFilters({ from: range.from ?? "", to: range.to ?? "" })}
            locale={locale === "fr" ? "fr" : "en"}
            placeholder={copy.from + " - " + copy.through}
            ariaLabel={copy.from + " - " + copy.through}
            triggerClassName="h-10"
          />
        </FilterBar>

        {periodError ? (
          <RouteStatePanel
            kind="error"
            title={copy.invalidPeriod}
            message={periodError}
          />
        ) : null}

        {!periodError && isLoading && !result ? (
          <RouteStatePanel kind="loading" />
        ) : null}

        {!periodError && isError && !result ? (
          <RouteStatePanel
            kind={errorState}
            title={
              errorState === "permission_denied"
                ? copy.permissionTitle
                : errorState === "stale_session"
                  ? copy.sessionTitle
                  : copy.errorTitle
            }
            message={
              errorState === "permission_denied"
                ? copy.permissionMessage
                : errorState === "stale_session"
                  ? copy.sessionMessage
                  : error instanceof Error
                    ? error.message
                    : undefined
            }
            action={
              errorState === "error"
                ? {
                    label: copy.retry,
                    icon: RefreshCcw,
                    onClick: () => void refetch(),
                  }
                : undefined
            }
          />
        ) : null}

        {result ? (
          <>
            {isError ? (
              <RouteStatePanel
                kind="error"
                title={copy.refreshFailedTitle}
                message={copy.refreshFailedMessage}
                action={{
                  label: copy.retry,
                  icon: RefreshCcw,
                  onClick: () => void refetch(),
                }}
              />
            ) : null}

            {!complete ? (
              <RouteStatePanel
                kind="partial"
                title={copy.partialTitle}
                message={partialMessage || undefined}
              />
            ) : null}

            <section
              aria-label={copy.title}
              className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
            >
              <KpiTile
                label={copy.lossValue}
                value={formatMoney(
                  result.summary.totalLossValue,
                  result.summary.currency,
                  locale,
                )}
                detail={copy.lossValueDetail}
                tone="danger"
                icon={Scale}
              />
              <KpiTile
                label={copy.lossLines}
                value={formatInteger(result.summary.lossLineCount, locale)}
                detail={copy.lossLinesDetail}
                tone="warning"
                icon={Boxes}
              />
              <KpiTile
                label={copy.adjustments}
                value={formatInteger(result.summary.adjustmentCount, locale)}
                detail={copy.adjustmentsDetail}
                tone="gold"
                icon={ClipboardCheck}
              />
              <KpiTile
                label={copy.evidenceCoverage}
                value={formatPercent(result.coverage.evidence.percent, locale)}
                detail={copy.evidenceCoverageDetail}
                tone={
                  result.coverage.evidence.percent === 100
                    ? "success"
                    : "spruce"
                }
                icon={FileCheck2}
              />
            </section>

            <StatusStrip
              title={copy.coverageTitle}
              detail={copy.coverageDetail}
              items={[
                coverageItem(
                  "evidence",
                  copy.evidence,
                  result.coverage.evidence,
                  FileCheck2,
                  locale,
                ),
                coverageItem(
                  "valuation",
                  copy.valuation,
                  result.coverage.valuation,
                  Scale,
                  locale,
                ),
                coverageItem(
                  "approval",
                  copy.approval,
                  result.coverage.approvingActor,
                  UserCheck,
                  locale,
                ),
                {
                  id: "source",
                  label: copy.source,
                  value: complete ? copy.complete : copy.partial,
                  detail: `${formatInteger(result.snapshot.sourceLineCount, locale)} / ${formatInteger(result.snapshot.sourceLineLimit, locale)}`,
                  state: complete ? "ready" : "partial",
                  icon: PackageSearch,
                },
              ]}
            />

            <p className="flex items-start gap-2 text-sm leading-6 text-[var(--dash-text-soft)]">
              <UserCheck className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{copy.approvalMeaning}</span>
            </p>

            {result.summary.lossLineCount === 0 ? (
              <RouteStatePanel
                kind="empty"
                title={copy.emptyTitle}
                message={copy.emptyMessage}
              />
            ) : (
              <>
                <LossBreakdown result={result} locale={locale} copy={copy} />
                <RecentLossRecords
                  result={result}
                  locale={locale}
                  copy={copy}
                  onSelect={setSelectedRecord}
                />
              </>
            )}
          </>
        ) : null}

        <LossRecordDrawer
          record={selectedRecord}
          locale={locale}
          timezone={result?.period.timezone ?? "UTC"}
          copy={copy}
          onOpenChange={(open) => {
            if (!open) setSelectedRecord(null);
          }}
        />
      </div>
    </main>
  );
}

function LossBreakdown({
  result,
  locale,
  copy,
}: {
  result: InventoryLossData;
  locale: string;
  copy: InventoryLossWorkbenchCopy;
}) {
  return (
    <section className="space-y-3" aria-labelledby="loss-breakdown-title">
      <div>
        <h2
          id="loss-breakdown-title"
          className="text-base font-semibold text-[var(--dash-text)]"
        >
          {copy.breakdownTitle}
        </h2>
        <p className={cn("text-sm leading-6", dashboardMutedTextClass)}>
          {copy.breakdownDetail}
        </p>
      </div>

      <Tabs defaultValue="products">
        <TabsList
          aria-label={copy.breakdownTitle}
          className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.34)] p-1"
        >
          <TabsTrigger value="products">{copy.products}</TabsTrigger>
          <TabsTrigger value="locations">{copy.locations}</TabsTrigger>
          <TabsTrigger value="categories">{copy.categories}</TabsTrigger>
          <TabsTrigger value="approvers">{copy.approvers}</TabsTrigger>
          <TabsTrigger value="months">{copy.months}</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <ProductGroupTable
            groups={result.groups.byProduct}
            locale={locale}
            copy={copy}
          />
        </TabsContent>
        <TabsContent value="locations">
          <ValueGroupTable
            groups={result.groups.byLocation}
            label={copy.location}
            locale={locale}
            copy={copy}
          />
        </TabsContent>
        <TabsContent value="categories">
          <ValueGroupTable
            groups={result.groups.byCategory}
            label={copy.category}
            locale={locale}
            copy={copy}
            formatLabel={(group) => categoryLabel(group.key, copy)}
          />
        </TabsContent>
        <TabsContent value="approvers">
          <p className="mb-3 text-sm leading-6 text-[var(--dash-text-soft)]">
            {copy.approvalMeaning}
          </p>
          <ValueGroupTable
            groups={result.groups.byApprovingActor}
            label={copy.approver}
            locale={locale}
            copy={copy}
          />
        </TabsContent>
        <TabsContent value="months">
          <ValueGroupTable
            groups={result.groups.byPeriod}
            label={copy.month}
            locale={locale}
            copy={copy}
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}

function ProductGroupTable({
  groups,
  locale,
  copy,
}: {
  groups: InventoryLossProductGroup[];
  locale: string;
  copy: InventoryLossWorkbenchCopy;
}) {
  return (
    <div className={cn(dashboardPanelClass, "overflow-hidden")}>
      <Table scrollRegionLabel={copy.products}>
        <TableHeader>
          <TableRow className="border-[var(--dash-border-subtle)] hover:bg-transparent">
            <TableHead className="min-w-[14rem] text-[var(--dash-text-soft)]">
              {copy.product}
            </TableHead>
            <TableHead className="text-right text-[var(--dash-text-soft)]">
              {copy.quantity}
            </TableHead>
            <TableHead className="text-right text-[var(--dash-text-soft)]">
              {copy.lines}
            </TableHead>
            <TableHead className="text-right text-[var(--dash-text-soft)]">
              {copy.sourceAdjustments}
            </TableHead>
            <TableHead className="min-w-[10rem] text-right text-[var(--dash-text-soft)]">
              {copy.value}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => (
            <TableRow
              key={group.key}
              className="border-[var(--dash-border-subtle)]"
            >
              <TableCell>
                <p className="font-medium text-[var(--dash-text)]">
                  {group.label}
                </p>
                <p className="text-xs text-[var(--dash-text-soft)]">
                  {group.sku}
                </p>
              </TableCell>
              <TableCell className="text-right text-[var(--dash-text)]">
                {formatQuantity(group.quantityLost, group.unit, locale)}
              </TableCell>
              <TableCell className="text-right text-[var(--dash-text)]">
                {formatInteger(group.lineCount, locale)}
              </TableCell>
              <TableCell className="text-right text-[var(--dash-text)]">
                {formatInteger(group.adjustmentCount, locale)}
              </TableCell>
              <TableCell className="text-right font-semibold text-[var(--dash-text)]">
                {formatMoney(group.lossValue, group.currency, locale)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ValueGroupTable({
  groups,
  label,
  locale,
  copy,
  formatLabel,
}: {
  groups: InventoryLossValueGroup[];
  label: string;
  locale: string;
  copy: InventoryLossWorkbenchCopy;
  formatLabel?: (group: InventoryLossValueGroup) => string;
}) {
  return (
    <div className={cn(dashboardPanelClass, "overflow-hidden")}>
      <Table scrollRegionLabel={label}>
        <TableHeader>
          <TableRow className="border-[var(--dash-border-subtle)] hover:bg-transparent">
            <TableHead className="min-w-[14rem] text-[var(--dash-text-soft)]">
              {label}
            </TableHead>
            <TableHead className="text-right text-[var(--dash-text-soft)]">
              {copy.lines}
            </TableHead>
            <TableHead className="text-right text-[var(--dash-text-soft)]">
              {copy.sourceAdjustments}
            </TableHead>
            <TableHead className="min-w-[10rem] text-right text-[var(--dash-text-soft)]">
              {copy.value}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => (
            <TableRow
              key={group.key}
              className="border-[var(--dash-border-subtle)]"
            >
              <TableCell className="font-medium text-[var(--dash-text)]">
                {formatLabel ? formatLabel(group) : group.label}
              </TableCell>
              <TableCell className="text-right text-[var(--dash-text)]">
                {formatInteger(group.lineCount, locale)}
              </TableCell>
              <TableCell className="text-right text-[var(--dash-text)]">
                {formatInteger(group.adjustmentCount, locale)}
              </TableCell>
              <TableCell className="text-right font-semibold text-[var(--dash-text)]">
                {formatMoney(group.lossValue, group.currency, locale)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
function RecentLossRecords({
  result,
  locale,
  copy,
  onSelect,
}: {
  result: InventoryLossData;
  locale: string;
  copy: InventoryLossWorkbenchCopy;
  onSelect: (record: InventoryLossRecord) => void;
}) {
  return (
    <section className="space-y-3" aria-labelledby="recent-loss-title">
      <div>
        <h2
          id="recent-loss-title"
          className="text-base font-semibold text-[var(--dash-text)]"
        >
          {copy.recentTitle}
        </h2>
        <p className={cn("text-sm leading-6", dashboardMutedTextClass)}>
          {copy.recentDetail}
        </p>
      </div>

      <div className={cn(dashboardPanelClass, "overflow-hidden")}>
        <Table scrollRegionLabel={copy.recentTitle}>
          <TableHeader>
            <TableRow className="border-[var(--dash-border-subtle)] hover:bg-transparent">
              <TableHead className="min-w-[10rem] text-[var(--dash-text-soft)]">
                {copy.occurred}
              </TableHead>
              <TableHead className="min-w-[14rem] text-[var(--dash-text-soft)]">
                {copy.item}
              </TableHead>
              <TableHead className="min-w-[10rem] text-[var(--dash-text-soft)]">
                {copy.category}
              </TableHead>
              <TableHead className="min-w-[10rem] text-[var(--dash-text-soft)]">
                {copy.location}
              </TableHead>
              <TableHead className="text-right text-[var(--dash-text-soft)]">
                {copy.quantity}
              </TableHead>
              <TableHead className="min-w-[10rem] text-right text-[var(--dash-text-soft)]">
                {copy.value}
              </TableHead>
              <TableHead className="text-[var(--dash-text-soft)]">
                {copy.proof}
              </TableHead>
              <TableHead className="w-12 text-right text-[var(--dash-text-soft)]">
                <span className="sr-only">{copy.details}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.records.map((record) => (
              <TableRow
                key={record.id}
                className="border-[var(--dash-border-subtle)]"
              >
                <TableCell className="text-[var(--dash-text)]">
                  {formatDateTime(
                    record.adjustment.occurredAt,
                    locale,
                    result.period.timezone,
                  )}
                </TableCell>
                <TableCell>
                  <p className="font-medium text-[var(--dash-text)]">
                    {record.product.name}
                  </p>
                  <p className="text-xs text-[var(--dash-text-soft)]">
                    {record.product.sku}
                  </p>
                </TableCell>
                <TableCell className="text-[var(--dash-text)]">
                  {categoryLabel(record.adjustment.category, copy)}
                </TableCell>
                <TableCell className="text-[var(--dash-text)]">
                  {record.location.name}
                </TableCell>
                <TableCell className="text-right text-[var(--dash-text)]">
                  {formatQuantity(
                    record.quantityLost,
                    record.product.unit,
                    locale,
                  )}
                </TableCell>
                <TableCell className="text-right font-semibold text-[var(--dash-text)]">
                  {formatMoney(record.lossValue, record.currency, locale)}
                </TableCell>
                <TableCell>
                  <ProofBadge
                    state={record.evidence.present ? "verified" : "unavailable"}
                    label={
                      record.evidence.present ? copy.recorded : copy.unavailable
                    }
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    aria-label={`${copy.openDetails}: ${record.adjustment.number}`}
                    title={copy.openDetails}
                    onClick={() => onSelect(record)}
                  >
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function LossRecordDrawer({
  record,
  locale,
  timezone,
  copy,
  onOpenChange,
}: {
  record: InventoryLossRecord | null;
  locale: string;
  timezone: string;
  copy: InventoryLossWorkbenchCopy;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <DetailDrawer
      open={Boolean(record)}
      onOpenChange={onOpenChange}
      title={
        record
          ? `${copy.drawerTitle}: ${record.adjustment.number}`
          : copy.drawerTitle
      }
      description={
        record ? `${record.product.name} / ${record.location.name}` : undefined
      }
      metadata={
        record
          ? [
              {
                label: copy.occurred,
                value: formatDateTime(
                  record.adjustment.occurredAt,
                  locale,
                  timezone,
                ),
                icon: CalendarDays,
              },
              {
                label: copy.location,
                value: record.location.name,
                icon: MapPin,
              },
              {
                label: copy.evidenceState,
                value: record.evidence.present
                  ? copy.recorded
                  : copy.unavailable,
                icon: FileCheck2,
              },
            ]
          : []
      }
    >
      {record ? (
        <>
          <DrawerSection title={copy.sourceIdentity}>
            <DetailLine
              label={copy.adjustmentNumber}
              value={record.adjustment.number}
            />
            <DetailLine
              label={copy.adjustmentType}
              value={categoryLabel(record.adjustment.category, copy)}
            />
            <DetailLine label={copy.reason} value={record.adjustment.reason} />
            <DetailLine
              label={copy.countSession}
              value={record.adjustment.sourceCountSessionId ?? copy.none}
            />
          </DrawerSection>

          <DrawerSection title={copy.businessValue}>
            <DetailLine
              label={copy.quantity}
              value={formatQuantity(
                record.quantityLost,
                record.product.unit,
                locale,
              )}
            />
            <DetailLine
              label={copy.unitCost}
              value={
                record.unitCost
                  ? formatMoney(record.unitCost, record.currency, locale)
                  : copy.unavailable
              }
            />
            <DetailLine
              label={copy.value}
              value={formatMoney(record.lossValue, record.currency, locale)}
            />
          </DrawerSection>

          <DrawerSection title={copy.approval}>
            <DetailLine
              label={copy.approvedBy}
              value={
                record.approvingActor?.name ??
                record.approvingActor?.id ??
                copy.noApprover
              }
            />
            <DetailLine
              label={copy.attributionGuard}
              value={copy.approvalMeaning}
            />
          </DrawerSection>
        </>
      ) : null}
    </DetailDrawer>
  );
}

function DrawerSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-[var(--dash-border-subtle)] pb-4 last:border-b-0">
      <h3 className="text-sm font-semibold text-[var(--dash-text)]">{title}</h3>
      <dl className="mt-3 space-y-2">{children}</dl>
    </section>
  );
}

function DetailLine({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid gap-1 text-sm sm:grid-cols-[10rem_minmax(0,1fr)]">
      <dt className="text-[var(--dash-text-soft)]">{label}</dt>
      <dd className="min-w-0 break-words text-[var(--dash-text)]">{value}</dd>
    </div>
  );
}

function coverageItem(
  id: string,
  label: string,
  coverage: { covered: number; total: number; percent: number },
  icon: typeof FileCheck2,
  locale: string,
) {
  return {
    id,
    label,
    value: formatPercent(coverage.percent, locale),
    detail: `${formatInteger(coverage.covered, locale)} / ${formatInteger(coverage.total, locale)}`,
    state: coverage.percent === 100 ? ("ready" as const) : ("partial" as const),
    icon,
  };
}
