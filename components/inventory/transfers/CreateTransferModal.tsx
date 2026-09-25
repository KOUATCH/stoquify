"use client"

import { useMemo, useState } from "react"
import {
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Loader2,
  MapPin,
  Package,
  Plus,
  Search,
  Trash2,
} from "lucide-react"
import { useTranslations } from "next-intl"

import { DatePicker } from "@/components/ui/date-picker"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useTransferSourceInventory } from "@/hooks/useTransferSourceInventory"
import { useOrgLocationsNew } from "@/hooks/useAllLocationsQueries"
import { useClientAuth } from "@/hooks/useClientAuth"
import { useCreateTransfer } from "@/hooks/useTransferQueries"
import { notify } from "@/lib/notifications/notify"
import { getModuleOperationErrorReason } from "@/lib/modules/module-operation-error"
import type { CreateTransferPayload, TransferPriority } from "@/types/inventoryMovementTypes"
import type { LocationDTO } from "@/types/location"

interface CreateTransferModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
}

interface TransferLineItem {
  id: string
  itemId: string
  itemName: string
  itemSku: string
  requestedQuantity: number
  availableQuantity: number
  notes?: string
}

type TransferItemOption = {
  id: string
  name?: string | null
  nameEn?: string | null
  nameFr?: string | null
  sku?: string | null
}

const priorityOptions: Array<{ value: TransferPriority; label: string; className: string }> = [
  {
    value: "LOW",
    label: "Low Priority",
    className: "border-[var(--dash-border-subtle)] bg-[rgba(126,145,137,0.14)] text-[var(--dash-text-soft)]",
  },
  {
    value: "NORMAL",
    label: "Normal Priority",
    className: "border-[var(--dash-info)] bg-[var(--dash-info-soft)] text-[var(--dash-info)]",
  },
  {
    value: "HIGH",
    label: "High Priority",
    className: "border-[var(--dash-warning)] bg-[var(--dash-warning-soft)] text-[var(--dash-warning)]",
  },
  {
    value: "URGENT",
    label: "Urgent",
    className: "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]",
  },
]

function itemDisplayName(item: TransferItemOption) {
  return item.name ?? item.nameEn ?? item.nameFr ?? "Unnamed item"
}

function itemSku(item: TransferItemOption) {
  return item.sku ?? "No SKU"
}

// Compatibility entry point for existing callers; creation now renders in normal page flow.
export function CreateTransferModal({ open, onOpenChange, organizationId }: CreateTransferModalProps) {
  return open ? <CreateTransferForm organizationId={organizationId} onCancel={() => onOpenChange(false)} onSuccess={() => onOpenChange(false)} /> : null
}

export function CreateTransferForm({ organizationId, onCancel, onSuccess }: {
  organizationId: string
  onCancel: () => void
  onSuccess: (transferId?: string) => void
}) {
  const { user } = useClientAuth()
  const t = useTranslations("moduleComposition.stop")
  const copy = useTranslations("inventoryTransferCreate")
  const userId = user?.id ?? ""

  const [fromLocationId, setFromLocationId] = useState("")
  const [toLocationId, setToLocationId] = useState("")
  const [priority, setPriority] = useState<TransferPriority>("NORMAL")
  const [notes, setNotes] = useState("")
  const [internalNotes, setInternalNotes] = useState("")
  const [requestedDate, setRequestedDate] = useState<Date | undefined>(undefined)

  const [lines, setLines] = useState<TransferLineItem[]>([])
  const [itemSearch, setItemSearch] = useState("")
  const [selectedItemId, setSelectedItemId] = useState("")
  const [quantity, setQuantity] = useState("")

  const createTransferMutation = useCreateTransfer({ inlineStoppedWork: true })

  const locationsQuery = useOrgLocationsNew(organizationId, { enabled: !!organizationId })
  const sourceQuery = useTransferSourceInventory(organizationId, fromLocationId)
  const locations = useMemo<LocationDTO[]>(() => locationsQuery.data?.data ?? [], [locationsQuery.data?.data])
  const inventory = useMemo(() => (sourceQuery.data ?? []).filter(entry => entry.locationId === fromLocationId && entry.quantityAvailable > 0 && entry.item), [sourceQuery.data, fromLocationId])
  const items = useMemo<TransferItemOption[]>(() => inventory.flatMap(entry => entry.item ? [entry.item] : []), [inventory])
  const locationsFailed = locationsQuery.isError || locationsQuery.data?.success === false

  function changeSource(locationId: string) {
    setFromLocationId(locationId)
    setLines([])
    setSelectedItemId("")
    setItemSearch("")
    setQuantity("")
  }

  const availableFromLocations = locations.filter((location) => location.id !== toLocationId)
  const availableToLocations = locations.filter((location) => location.id !== fromLocationId)

  const filteredItems = useMemo(() => {
    const query = itemSearch.trim().toLowerCase()
    if (!query) return items

    return items.filter((item) => itemDisplayName(item).toLowerCase().includes(query) || itemSku(item).toLowerCase().includes(query))
  }, [items, itemSearch])

  const selectedItemInventory = useMemo(() => {
    if (!selectedItemId || !fromLocationId) return null
    return inventory.find((entry) => entry.itemId === selectedItemId && entry.locationId === fromLocationId)
  }, [selectedItemId, fromLocationId, inventory])

  const totalItems = lines.reduce((sum, line) => sum + line.requestedQuantity, 0)
  const isValid = Boolean(fromLocationId && toLocationId && fromLocationId !== toLocationId && lines.length > 0 && userId
    && !locationsFailed && !sourceQuery.isError && !sourceQuery.isFetching
    && lines.every(line => Number.isFinite(line.requestedQuantity) && line.requestedQuantity > 0
      && line.requestedQuantity <= (inventory.find(entry => entry.itemId === line.itemId)?.quantityAvailable ?? 0)))

  function resetForm() {
    setFromLocationId("")
    setToLocationId("")
    setPriority("NORMAL")
    setNotes("")
    setInternalNotes("")
    setRequestedDate(undefined)
    setLines([])
    setItemSearch("")
    setSelectedItemId("")
    setQuantity("")
  }

  function handleAddLine() {
    if (!selectedItemId || !quantity || !Number.isFinite(Number(quantity)) || Number(quantity) <= 0 || sourceQuery.isFetching || sourceQuery.isError) {
      notify.error(copy("invalidItem"))
      return
    }

    const item = items.find((entry) => entry.id === selectedItemId)
    if (!item || !selectedItemInventory) return
    const availableQty = selectedItemInventory.quantityAvailable
    const requestedQty = Number(quantity)

    if (requestedQty > availableQty) {
      notify.error(copy("insufficient", { quantity: availableQty }))
      return
    }

    const existingLineIndex = lines.findIndex((line) => line.itemId === selectedItemId)

    if (existingLineIndex >= 0) {
      const updatedLines = lines.map(line => ({ ...line }))
      updatedLines[existingLineIndex].requestedQuantity += requestedQty

      if (updatedLines[existingLineIndex].requestedQuantity > availableQty) {
        notify.error(copy("excessiveTotal", { quantity: availableQty }))
        return
      }

      setLines(updatedLines)
    } else {
      setLines([
        ...lines,
        {
          id: `temp-${Date.now()}`,
          itemId: selectedItemId,
          itemName: item ? itemDisplayName(item) : "",
          itemSku: item ? itemSku(item) : "",
          requestedQuantity: requestedQty,
          availableQuantity: availableQty,
        },
      ])
    }

    setSelectedItemId("")
    setQuantity("")
    setItemSearch("")
  }

  function handleUpdateLineQuantity(lineId: string, newQuantity: number) {
    const line = lines.find((entry) => entry.id === lineId)
    if (!line || !Number.isFinite(newQuantity) || newQuantity <= 0) return

    if (newQuantity > line.availableQuantity) {
      notify.error(copy("excessive", { quantity: line.availableQuantity }))
      return
    }

    setLines(lines.map((entry) => (entry.id === lineId ? { ...entry, requestedQuantity: newQuantity } : entry)))
  }

  async function handleSubmit() {
    if (!userId) {
      notify.error(copy("missingUser"))
      return
    }

    if (!fromLocationId || !toLocationId) {
      notify.error(copy("missingLocations"))
      return
    }

    if (lines.length === 0) {
      notify.error(copy("missingLines"))
      return
    }

    if (!isValid || createTransferMutation.isPending) return

    const payload: CreateTransferPayload = {
      fromLocationId,
      toLocationId,
      priority,
      requestedDate: requestedDate || undefined,
      notes: notes.trim() || undefined,
      internalNotes: internalNotes.trim() || undefined,
      organizationId,
      createdById: userId,
      lines: lines.map((line) => ({
        itemId: line.itemId,
        requestedQuantity: line.requestedQuantity,
        notes: line.notes,
      })),
    }

    try {
      const result = await createTransferMutation.mutateAsync(payload)
      onSuccess(result?.transfer?.id)
      resetForm()
    } catch {
      // Keep the draft on this page after a denial; other errors are notified by the hook.
    }
  }

  return (
    <section aria-label={copy("title")} className="min-w-0 space-y-6 text-[var(--dash-text)]">
        <header className="border-b border-[var(--dash-border-subtle)] pb-4">
          <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight text-[var(--dash-text)] sm:text-4xl">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-info-soft)] text-[var(--dash-info)]">
              <Package className="h-5 w-5" />
            </span>
            {copy("title")}
          </h1>
          <p className="text-[var(--dash-text-soft)]">
            {copy("description")}
          </p>
        </header>

        {locationsQuery.isLoading ? <p role="status">{copy("locationsLoading")}</p> : locationsFailed ? (
          <div role="alert" className="rounded-lg border border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] p-4">
            <p>{copy("locationsError")}</p><Button type="button" variant="outline" onClick={() => locationsQuery.refetch()}>{copy("retry")}</Button>
          </div>
        ) : locations.length < 2 ? <p role="status">{copy("locationsEmpty")}</p> : null}
        <fieldset disabled={createTransferMutation.isPending} className="min-w-0 space-y-5">
          <Card className="rounded-lg border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] text-[var(--dash-text)]">
            <CardHeader>
              <CardTitle className="text-lg text-[var(--dash-text)]">{copy("route")}</CardTitle>
              <CardDescription className="text-[var(--dash-text-soft)]">{copy("routeDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="transfer-source" className="text-[var(--dash-text-muted)]">{copy("from")}</Label>
                  <Select value={fromLocationId} onValueChange={changeSource}>
                    <SelectTrigger id="transfer-source" className="dashboard-control h-11 rounded-lg">
                      <SelectValue placeholder={copy("sourcePlaceholder")} />
                    </SelectTrigger>
                    <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                      {availableFromLocations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transfer-destination" className="text-[var(--dash-text-muted)]">{copy("to")}</Label>
                  <Select value={toLocationId} onValueChange={setToLocationId}>
                    <SelectTrigger id="transfer-destination" className="dashboard-control h-11 rounded-lg">
                      <SelectValue placeholder={copy("destinationPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                      {availableToLocations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {fromLocationId && toLocationId ? (
                <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-canvas)] p-4">
                  <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                    <RouteNode
                      label={copy("source")}
                      name={locations.find((location) => location.id === fromLocationId)?.name}
                      tone="info"
                    />
                    <ArrowRight className="mx-auto hidden h-7 w-7 text-[var(--dash-text-faint)] sm:block" />
                    <RouteNode
                      label={copy("destination")}
                      name={locations.find((location) => location.id === toLocationId)?.name}
                      tone="success"
                    />
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="rounded-lg border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] text-[var(--dash-text)]">
            <CardHeader>
              <CardTitle className="text-lg text-[var(--dash-text)]">{copy("details")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="transfer-priority" className="text-[var(--dash-text-muted)]">{copy("priority")}</Label>
                  <Select value={priority} onValueChange={(value) => setPriority(value as TransferPriority)}>
                    <SelectTrigger id="transfer-priority" className="dashboard-control h-11 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                      {priorityOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {copy(option.value)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{copy("date")}</Label>
                  <DatePicker
                    date={requestedDate}
                    onDateChange={setRequestedDate}
                    placeholder={copy("datePlaceholder")}
                    minDate={new Date()}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="transfer-notes" className="text-[var(--dash-text-muted)]">{copy("notes")}</Label>
                  <Textarea
                    id="transfer-notes" placeholder={copy("notesPlaceholder")}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={3}
                    className="dashboard-control min-h-[92px] rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transfer-internal-notes" className="text-[var(--dash-text-muted)]">{copy("internalNotes")}</Label>
                  <Textarea
                    id="transfer-internal-notes" placeholder={copy("internalPlaceholder")}
                    value={internalNotes}
                    onChange={(event) => setInternalNotes(event.target.value)}
                    rows={3}
                    className="dashboard-control min-h-[92px] rounded-lg"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {fromLocationId ? (
            <Card className="rounded-lg border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] text-[var(--dash-text)]">
              <CardHeader>
                <CardTitle className="text-lg text-[var(--dash-text)]">{copy("addItems")}</CardTitle>
                <CardDescription className="text-[var(--dash-text-soft)]">{copy("addDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {sourceQuery.isFetching ? <p role="status">{copy("itemsLoading")}</p> : sourceQuery.isError ? (
                  <div role="alert" className="rounded-lg border border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] p-4">
                    <p>{copy("itemsError")}</p><Button type="button" variant="outline" onClick={() => sourceQuery.refetch()}>{copy("retry")}</Button>
                  </div>
                ) : inventory.length === 0 ? <p role="status">{copy("itemsEmpty")}</p> : filteredItems.length === 0 ? <p role="status">{copy("noResults")}</p> : null}
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_140px_140px]">
                  <div className="space-y-2">
                    <Label htmlFor="transfer-search" className="text-[var(--dash-text-muted)]">{copy("search")}</Label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dash-text-faint)]" />
                      <Input
                        id="transfer-search" placeholder={copy("searchPlaceholder")}
                        value={itemSearch}
                        onChange={(event) => setItemSearch(event.target.value)}
                        className="dashboard-control h-11 rounded-lg pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transfer-item" className="text-[var(--dash-text-muted)]">{copy("item")}</Label>
                    <Select value={selectedItemId} onValueChange={setSelectedItemId} disabled={sourceQuery.isFetching || sourceQuery.isError || filteredItems.length === 0}>
                      <SelectTrigger id="transfer-item" className="dashboard-control h-11 rounded-lg">
                        <SelectValue placeholder={copy("itemPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                      {filteredItems.map((item) => {
                          const itemInventory = inventory.find((entry) => entry.itemId === item.id && entry.locationId === fromLocationId)
                          const available = itemInventory?.quantityAvailable || 0

                          return (
                            <SelectItem key={item.id} value={item.id} disabled={available === 0}>
                              {copy("option", { name: itemDisplayName(item), sku: itemSku(item), quantity: available })}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transfer-quantity" className="text-[var(--dash-text-muted)]">{copy("quantity")}</Label>
                    <Input
                      type="number"
                      id="transfer-quantity" placeholder="0"
                      value={quantity}
                      onChange={(event) => setQuantity(event.target.value)}
                      min="1"
                      max={selectedItemInventory?.quantityAvailable || 0}
                      className="dashboard-control h-11 rounded-lg"
                    />
                    {selectedItemInventory ? (
                      <p className="text-xs text-[var(--dash-text-soft)]">{copy("available", { quantity: selectedItemInventory.quantityAvailable })}</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-transparent">{copy("add")}</Label>
                    <Button
                      type="button"
                      onClick={handleAddLine}
                      disabled={!selectedItemId || !quantity || !Number.isFinite(Number(quantity)) || Number(quantity) <= 0 || sourceQuery.isFetching || sourceQuery.isError}
                      className="dashboard-button-primary h-11 w-full rounded-lg"
                    >
                      <Plus className="h-4 w-4" />
                      {copy("add")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : <p role="status" className="text-sm text-[var(--dash-text-soft)]">{copy("selectSource")}</p>}

          {lines.length > 0 ? (
            <Card className="rounded-lg border-[var(--dash-border-subtle)] bg-[var(--dash-surface)] text-[var(--dash-text)]">
              <CardHeader>
                <CardTitle className="flex flex-col gap-3 text-lg text-[var(--dash-text)] sm:flex-row sm:items-center sm:justify-between">
                  <span>{copy("lines")}</span>
                  <Badge variant="outline" className="w-fit rounded-lg border-[var(--dash-gold)] bg-[var(--dash-gold-soft)] text-[var(--dash-gold)]">
                    {copy("total", { count: lines.length, quantity: totalItems })}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {lines.map((line) => (
                    <div
                      key={line.id}
                      className="grid gap-3 rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-canvas)] p-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[var(--dash-text)]">{line.itemName}</p>
                        <p className="text-sm text-[var(--dash-text-soft)]">{line.itemSku}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--dash-text-soft)]">
                        <span>{copy("available", { quantity: line.availableQuantity })}</span>
                        <Label htmlFor={`transfer-quantity-${line.id}`} className="text-[var(--dash-text-muted)]">{copy("qty")}</Label>
                        <Input
                          type="number"
                          id={`transfer-quantity-${line.id}`}
                          value={line.requestedQuantity}
                          onChange={(event) => handleUpdateLineQuantity(line.id, Number(event.target.value))}
                          min="1"
                          max={line.availableQuantity}
                          className="dashboard-control h-10 w-24 rounded-lg"
                        />
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setLines(lines.filter((entry) => entry.id !== line.id))}
                        className="h-10 w-10 rounded-lg text-[var(--dash-danger)] hover:bg-[var(--dash-danger-soft)] hover:text-[var(--dash-danger)]"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">{copy("remove")}</span>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </fieldset>

        {getModuleOperationErrorReason(createTransferMutation.error) ? <div role="alert" className="flex items-start gap-3 rounded-lg border border-[var(--dash-warning)] bg-[var(--dash-warning-soft)] p-4 text-[var(--dash-text)]">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--dash-warning)]" aria-hidden="true" />
          <div><p className="font-semibold">{t("deniedTitle")}</p><p className="mt-1 text-sm leading-6">{t("deniedMessage")}</p></div>
        </div> : null}
        <footer className="flex flex-col-reverse gap-3 border-t border-[var(--dash-border-subtle)] pt-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={createTransferMutation.isPending}
            className="dashboard-button-secondary h-10 rounded-lg"
          >
            {copy("cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || createTransferMutation.isPending}
            className="dashboard-button-primary h-10 rounded-lg"
          >
            {createTransferMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            {copy("create")}
          </Button>
        </footer>
    </section>
  )
}

function RouteNode({
  label,
  name,
  tone,
}: {
  label: string
  name?: string
  tone: "info" | "success"
}) {
  const toneClass =
    tone === "info"
      ? "bg-[var(--dash-info-soft)] text-[var(--dash-info)]"
      : "bg-[var(--dash-spruce-soft)] text-[var(--dash-spruce)]"

  return (
    <div className="flex items-center gap-3 rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] p-3">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${toneClass}`}>
        <MapPin className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--dash-text-faint)]">{label}</p>
        <p className="truncate font-semibold text-[var(--dash-text)]">{name || "Location"}</p>
      </div>
    </div>
  )
}
