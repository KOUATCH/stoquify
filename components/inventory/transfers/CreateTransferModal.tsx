"use client"

import { useMemo, useState } from "react"
import {
  ArrowRight,
  CheckCircle,
  Loader2,
  MapPin,
  Package,
  Plus,
  Search,
  Trash2,
} from "lucide-react"
import { useQuery } from "@tanstack/react-query"

import { getInventoryLevels } from "@/actions/inventory/inventoryActions"
import { DatePicker } from "@/components/ui/date-picker"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useOrgItemsNew } from "@/hooks/useAllItemQueries"
import { useOrgLocationsNew } from "@/hooks/useAllLocationsQueries"
import { useClientAuth } from "@/hooks/useClientAuth"
import { useCreateTransfer } from "@/hooks/useTransferQueries"
import { notify } from "@/lib/notifications/notify"
import type { InventoryLevelWithRelations } from "@/types/inventoryTypes"
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

export function CreateTransferModal({ open, onOpenChange, organizationId }: CreateTransferModalProps) {
  const { user } = useClientAuth()
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

  const createTransferMutation = useCreateTransfer()

  const { data: locationsResponse } = useOrgLocationsNew(organizationId, { enabled: !!organizationId })
  const { data: itemsResponse } = useOrgItemsNew(organizationId, { enabled: !!organizationId })
  const { data: inventoryResponse } = useQuery({
    queryKey: ["transfer-source-inventory", organizationId, fromLocationId],
    queryFn: () =>
      getInventoryLevels({
        organizationId,
        filters: {
          locationId: fromLocationId || undefined,
        },
      }),
    enabled: !!organizationId && !!fromLocationId,
  })

  const locations = useMemo<LocationDTO[]>(() => locationsResponse?.data ?? [], [locationsResponse?.data])
  const items = useMemo<TransferItemOption[]>(() => itemsResponse?.data ?? [], [itemsResponse?.data])
  const inventory = useMemo<InventoryLevelWithRelations[]>(
    () => inventoryResponse?.data ?? [],
    [inventoryResponse?.data],
  )

  const availableFromLocations = locations.filter((location) => location.id !== toLocationId)
  const availableToLocations = locations.filter((location) => location.id !== fromLocationId)

  const filteredItems = useMemo(() => {
    const query = itemSearch.trim().toLowerCase()
    if (!query) return items.slice(0, 10)

    return items
      .filter((item) => itemDisplayName(item).toLowerCase().includes(query) || itemSku(item).toLowerCase().includes(query))
      .slice(0, 10)
  }, [items, itemSearch])

  const selectedItemInventory = useMemo(() => {
    if (!selectedItemId || !fromLocationId) return null
    return inventory.find((entry) => entry.itemId === selectedItemId && entry.locationId === fromLocationId)
  }, [selectedItemId, fromLocationId, inventory])

  const totalItems = lines.reduce((sum, line) => sum + line.requestedQuantity, 0)
  const isValid = Boolean(fromLocationId && toLocationId && lines.length > 0 && userId)

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
    if (!selectedItemId || !quantity || Number(quantity) <= 0) {
      notify.error("Please select an item and enter a valid quantity")
      return
    }

    const item = items.find((entry) => entry.id === selectedItemId)
    const availableQty = selectedItemInventory?.quantityAvailable || 0
    const requestedQty = Number(quantity)

    if (requestedQty > availableQty) {
      notify.error(`Insufficient inventory. Available: ${availableQty}`)
      return
    }

    const existingLineIndex = lines.findIndex((line) => line.itemId === selectedItemId)

    if (existingLineIndex >= 0) {
      const updatedLines = [...lines]
      updatedLines[existingLineIndex].requestedQuantity += requestedQty

      if (updatedLines[existingLineIndex].requestedQuantity > availableQty) {
        notify.error(`Total quantity exceeds available inventory. Available: ${availableQty}`)
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
    if (!line) return

    if (newQuantity > line.availableQuantity) {
      notify.error(`Quantity exceeds available inventory. Available: ${line.availableQuantity}`)
      return
    }

    setLines(lines.map((entry) => (entry.id === lineId ? { ...entry, requestedQuantity: newQuantity } : entry)))
  }

  async function handleSubmit() {
    if (!userId) {
      notify.error("Unable to identify the current user")
      return
    }

    if (!fromLocationId || !toLocationId) {
      notify.error("Please select both source and destination locations")
      return
    }

    if (lines.length === 0) {
      notify.error("Please add at least one item to transfer")
      return
    }

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
      await createTransferMutation.mutateAsync(payload)
      onOpenChange(false)
      resetForm()
    } catch {
      // The mutation hook owns user-facing error notifications.
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dashboard-glass-panel max-h-[92vh] max-w-5xl overflow-y-auto rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)]">
        <DialogHeader className="border-b border-[var(--dash-border-subtle)] pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl text-[var(--dash-text)]">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-info-soft)] text-[var(--dash-info)]">
              <Package className="h-5 w-5" />
            </span>
            Create Location Transfer
          </DialogTitle>
          <DialogDescription className="text-[var(--dash-text-soft)]">
            Move inventory between locations with requested quantities, priority, and audit notes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <Card className="rounded-lg border-[var(--dash-border-subtle)] bg-[rgba(24,38,45,0.48)] text-[var(--dash-text)]">
            <CardHeader>
              <CardTitle className="text-lg text-[var(--dash-text)]">Transfer Route</CardTitle>
              <CardDescription className="text-[var(--dash-text-soft)]">Select source and destination locations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-[var(--dash-text-muted)]">From Location</Label>
                  <Select value={fromLocationId} onValueChange={setFromLocationId}>
                    <SelectTrigger className="dashboard-control h-11 rounded-lg">
                      <SelectValue placeholder="Select source location" />
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
                  <Label className="text-[var(--dash-text-muted)]">To Location</Label>
                  <Select value={toLocationId} onValueChange={setToLocationId}>
                    <SelectTrigger className="dashboard-control h-11 rounded-lg">
                      <SelectValue placeholder="Select destination location" />
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
                <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.38)] p-4">
                  <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                    <RouteNode
                      label="Source"
                      name={locations.find((location) => location.id === fromLocationId)?.name}
                      tone="info"
                    />
                    <ArrowRight className="mx-auto hidden h-7 w-7 text-[var(--dash-text-faint)] sm:block" />
                    <RouteNode
                      label="Destination"
                      name={locations.find((location) => location.id === toLocationId)?.name}
                      tone="success"
                    />
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="rounded-lg border-[var(--dash-border-subtle)] bg-[rgba(24,38,45,0.48)] text-[var(--dash-text)]">
            <CardHeader>
              <CardTitle className="text-lg text-[var(--dash-text)]">Transfer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-[var(--dash-text-muted)]">Priority</Label>
                  <Select value={priority} onValueChange={(value) => setPriority(value as TransferPriority)}>
                    <SelectTrigger className="dashboard-control h-11 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                      {priorityOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[var(--dash-text-muted)]">Requested Date</Label>
                  <DatePicker
                    date={requestedDate}
                    onDateChange={setRequestedDate}
                    placeholder="Select requested date"
                    minDate={new Date()}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-[var(--dash-text-muted)]">Notes</Label>
                  <Textarea
                    placeholder="Add transfer notes..."
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={3}
                    className="dashboard-control min-h-[92px] rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[var(--dash-text-muted)]">Internal Notes</Label>
                  <Textarea
                    placeholder="Internal notes for operations..."
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
            <Card className="rounded-lg border-[var(--dash-border-subtle)] bg-[rgba(24,38,45,0.48)] text-[var(--dash-text)]">
              <CardHeader>
                <CardTitle className="text-lg text-[var(--dash-text)]">Add Items</CardTitle>
                <CardDescription className="text-[var(--dash-text-soft)]">Search inventory at the selected source location.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_140px_140px]">
                  <div className="space-y-2">
                    <Label className="text-[var(--dash-text-muted)]">Search Items</Label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dash-text-faint)]" />
                      <Input
                        placeholder="Search by name or SKU..."
                        value={itemSearch}
                        onChange={(event) => setItemSearch(event.target.value)}
                        className="dashboard-control h-11 rounded-lg pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[var(--dash-text-muted)]">Select Item</Label>
                    <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                      <SelectTrigger className="dashboard-control h-11 rounded-lg">
                        <SelectValue placeholder="Choose item" />
                      </SelectTrigger>
                      <SelectContent className="border-[var(--dash-border-subtle)] bg-[var(--dash-surface-raised)] text-[var(--dash-text)]">
                      {filteredItems.map((item) => {
                          const itemInventory = inventory.find((entry) => entry.itemId === item.id && entry.locationId === fromLocationId)
                          const available = itemInventory?.quantityAvailable || 0

                          return (
                            <SelectItem key={item.id} value={item.id} disabled={available === 0}>
                              {itemDisplayName(item)} ({itemSku(item)}) - {available} available
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[var(--dash-text-muted)]">Quantity</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={quantity}
                      onChange={(event) => setQuantity(event.target.value)}
                      min="1"
                      max={selectedItemInventory?.quantityAvailable || 0}
                      className="dashboard-control h-11 rounded-lg"
                    />
                    {selectedItemInventory ? (
                      <p className="text-xs text-[var(--dash-text-soft)]">Available: {selectedItemInventory.quantityAvailable}</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-transparent">Add</Label>
                    <Button
                      type="button"
                      onClick={handleAddLine}
                      disabled={!selectedItemId || !quantity || Number(quantity) <= 0}
                      className="dashboard-button-primary h-11 w-full rounded-lg"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {lines.length > 0 ? (
            <Card className="rounded-lg border-[var(--dash-border-subtle)] bg-[rgba(24,38,45,0.48)] text-[var(--dash-text)]">
              <CardHeader>
                <CardTitle className="flex flex-col gap-3 text-lg text-[var(--dash-text)] sm:flex-row sm:items-center sm:justify-between">
                  <span>Items to Transfer</span>
                  <Badge variant="outline" className="w-fit rounded-lg border-[var(--dash-gold)] bg-[var(--dash-gold-soft)] text-[var(--dash-gold)]">
                    {lines.length} items / {totalItems} total qty
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {lines.map((line) => (
                    <div
                      key={line.id}
                      className="grid gap-3 rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.34)] p-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[var(--dash-text)]">{line.itemName}</p>
                        <p className="text-sm text-[var(--dash-text-soft)]">{line.itemSku}</p>
                      </div>

                      <div className="flex items-center gap-3 text-sm text-[var(--dash-text-soft)]">
                        <span>Available: {line.availableQuantity}</span>
                        <Label className="text-[var(--dash-text-muted)]">Qty</Label>
                        <Input
                          type="number"
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
                        <span className="sr-only">Remove item</span>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <DialogFooter className="border-t border-[var(--dash-border-subtle)] pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="dashboard-button-secondary h-10 rounded-lg"
          >
            Cancel
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
            Create Transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
    <div className="flex items-center gap-3 rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.36)] p-3">
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
