"use client"

import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTransfer, useApproveTransfer } from "@/hooks/useTransferQueries"
import { formatCurrency } from "@/lib/utils"
import { ArrowRight, Calendar, CheckCircle, Clock, MapPin, Package, Truck, User, XCircle, FileText, Activity } from 'lucide-react'
import { useClientAuth } from "@/hooks/useClientAuth"
import type { TransferPriority, TransferStatus } from "@/types/inventoryMovementTypes"
import { format } from "date-fns"

interface TransferDetailsModalProps {
  transferId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
}

type TransferStatusConfig = {
  icon: ReactNode
  color: string
  label: string
  description: string
}

const transferStatusConfig: Record<TransferStatus, TransferStatusConfig> = {
  DRAFT: {
    icon: <Clock className="h-3 w-3" />,
    color: "border-[var(--dash-border-subtle)] bg-[rgba(126,145,137,0.14)] text-[var(--dash-text-soft)]",
    label: "Draft",
    description: "Being prepared",
  },
  SUBMITTED: {
    icon: <Clock className="h-3 w-3" />,
    color: "border-[var(--dash-info)] bg-[var(--dash-info-soft)] text-[var(--dash-info)]",
    label: "Submitted",
    description: "Awaiting approval",
  },
  APPROVED: {
    icon: <CheckCircle className="h-3 w-3" />,
    color: "border-[var(--dash-success)] bg-[var(--dash-success-soft)] text-[var(--dash-success)]",
    label: "Approved",
    description: "Ready to ship",
  },
  IN_TRANSIT: {
    icon: <Truck className="h-3 w-3" />,
    color: "border-[var(--dash-warning)] bg-[var(--dash-warning-soft)] text-[var(--dash-warning)]",
    label: "In Transit",
    description: "Being transferred",
  },
  PARTIALLY_RECEIVED: {
    icon: <Package className="h-3 w-3" />,
    color: "border-[var(--dash-gold)] bg-[var(--dash-gold-soft)] text-[var(--dash-gold)]",
    label: "Partial",
    description: "Partially received",
  },
  COMPLETED: {
    icon: <CheckCircle className="h-3 w-3" />,
    color: "border-[var(--dash-spruce)] bg-[var(--dash-spruce-soft)] text-[var(--dash-spruce)]",
    label: "Completed",
    description: "Transfer complete",
  },
  CANCELLED: {
    icon: <XCircle className="h-3 w-3" />,
    color: "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]",
    label: "Cancelled",
    description: "Transfer cancelled",
  },
  REJECTED: {
    icon: <XCircle className="h-3 w-3" />,
    color: "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]",
    label: "Rejected",
    description: "Transfer rejected",
  },
}

const priorityConfig: Record<TransferPriority, { color: string; label: string }> = {
  LOW: { color: "border-[var(--dash-border-subtle)] bg-[rgba(126,145,137,0.14)] text-[var(--dash-text-soft)]", label: "Low" },
  NORMAL: { color: "border-[var(--dash-info)] bg-[var(--dash-info-soft)] text-[var(--dash-info)]", label: "Normal" },
  HIGH: { color: "border-[var(--dash-warning)] bg-[var(--dash-warning-soft)] text-[var(--dash-warning)]", label: "High" },
  URGENT: { color: "border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-danger)]", label: "Urgent" },
}

export function TransferDetailsModal({ transferId, open, onOpenChange, organizationId }: TransferDetailsModalProps) {
  const { user } = useClientAuth()
  const userId = user?.id ?? ""

  const { data: transfer, isLoading } = useTransfer(transferId, organizationId)
  const approveTransferMutation = useApproveTransfer()

  if (isLoading || !transfer) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="dashboard-glass-panel max-h-[90vh] max-w-4xl overflow-y-auto rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)]">
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[var(--dash-brand-strong)]" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const statusConfig = transferStatusConfig[transfer.status]
  const priorityConfigItem = priorityConfig[transfer.priority]
  const canApprove = Boolean(userId && transfer.status === "DRAFT" && userId !== transfer.createdById)

  const handleApprove = async () => {
    try {
      await approveTransferMutation.mutateAsync({
        transferId: transfer.id,
        organizationId,
        approvedById: userId,
      })
    } catch (error) {
      // Error handled by mutation
    }
  }

  const totalItems = transfer.lines.reduce((sum, line) => sum + line.requestedQuantity, 0)
  const totalValue = transfer.lines.reduce((sum, line) => sum + (line.requestedQuantity * (line.item.costPrice || 0)), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dashboard-glass-panel max-h-[92vh] max-w-5xl overflow-y-auto rounded-lg border-[var(--dash-border-subtle)] text-[var(--dash-text)]">
        <DialogHeader className="border-b border-[var(--dash-border-subtle)] pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl text-[var(--dash-text)]">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-info-soft)] text-[var(--dash-info)]">
              <Package className="h-5 w-5" />
            </span>
            Transfer Details - {transfer.transferNumber}
          </DialogTitle>
          <DialogDescription className="text-[var(--dash-text-soft)]">
            View and manage transfer details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Transfer Header */}
          <Card className="rounded-lg border-[var(--dash-border-subtle)] bg-[rgba(24,38,45,0.48)] text-[var(--dash-text)]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className={`gap-1.5 rounded-lg ${statusConfig.color}`}>
                    {statusConfig.icon}
                    {statusConfig.label}
                  </Badge>
                  <Badge variant="outline" className={`rounded-lg ${priorityConfigItem.color}`}>
                    {priorityConfigItem.label} Priority
                  </Badge>
                </div>
                {canApprove && (
                  <Button 
                    onClick={handleApprove}
                    disabled={approveTransferMutation.isPending}
                    className="dashboard-button-primary h-10 rounded-lg"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {approveTransferMutation.isPending ? "Approving..." : "Approve Transfer"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Route Visualization */}
              <div className="mb-6 grid gap-4 rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(12,20,24,0.38)] p-5 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-lg bg-[var(--dash-info-soft)]">
                    <MapPin className="h-8 w-8 text-[var(--dash-info)]" />
                  </div>
                  <div className="font-medium text-[var(--dash-text)]">{transfer.fromLocation.name}</div>
                  <div className="text-sm text-[var(--dash-text-soft)]">Source Location</div>
                  {transfer.fromLocation.address && (
                    <div className="mt-1 text-xs text-[var(--dash-text-faint)]">{transfer.fromLocation.address}</div>
                  )}
                </div>
                
                <div className="flex flex-col items-center gap-2">
                  <ArrowRight className="h-8 w-8 text-[var(--dash-text-faint)]" />
                  <div className="text-sm font-medium text-[var(--dash-text-soft)]">
                    {totalItems} items
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-lg bg-[var(--dash-spruce-soft)]">
                    <MapPin className="h-8 w-8 text-[var(--dash-spruce)]" />
                  </div>
                  <div className="font-medium text-[var(--dash-text)]">{transfer.toLocation.name}</div>
                  <div className="text-sm text-[var(--dash-text-soft)]">Destination Location</div>
                  {transfer.toLocation.address && (
                    <div className="mt-1 text-xs text-[var(--dash-text-faint)]">{transfer.toLocation.address}</div>
                  )}
                </div>
              </div>

              {/* Transfer Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.36)] p-4 text-center">
                  <Package className="mx-auto mb-2 h-8 w-8 text-[var(--dash-brand-strong)]" />
                  <div className="text-2xl font-bold text-[var(--dash-text)]">{totalItems}</div>
                  <div className="text-sm text-[var(--dash-text-soft)]">Total Items</div>
                </div>
                
                <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.36)] p-4 text-center">
                  <div className="text-2xl font-bold text-[var(--dash-text)]">{formatCurrency(totalValue)}</div>
                  <div className="text-sm text-[var(--dash-text-soft)]">Estimated Value</div>
                </div>
                
                <div className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(37,57,67,0.36)] p-4 text-center">
                  <Calendar className="mx-auto mb-2 h-8 w-8 text-[var(--dash-spruce)]" />
                  <div className="text-sm font-medium text-[var(--dash-text)]">
                    {format(new Date(transfer.createdAt), "MMM dd, yyyy")}
                  </div>
                  <div className="text-sm text-[var(--dash-text-soft)]">Created Date</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="items" className="space-y-4">
            <TabsList className="dashboard-control grid h-auto w-full grid-cols-2 rounded-lg p-1 md:grid-cols-4">
              <TabsTrigger value="items" className="rounded-md text-[var(--dash-text-soft)] data-[state=active]:bg-[var(--dash-brand-soft)] data-[state=active]:text-[var(--dash-text)]">Items ({transfer.lines.length})</TabsTrigger>
              <TabsTrigger value="details" className="rounded-md text-[var(--dash-text-soft)] data-[state=active]:bg-[var(--dash-brand-soft)] data-[state=active]:text-[var(--dash-text)]">Details</TabsTrigger>
              <TabsTrigger value="timeline" className="rounded-md text-[var(--dash-text-soft)] data-[state=active]:bg-[var(--dash-brand-soft)] data-[state=active]:text-[var(--dash-text)]">Timeline</TabsTrigger>
              <TabsTrigger value="notes" className="rounded-md text-[var(--dash-text-soft)] data-[state=active]:bg-[var(--dash-brand-soft)] data-[state=active]:text-[var(--dash-text)]">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="items" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Transfer Items
                  </CardTitle>
                  <CardDescription>Items included in this transfer</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead className="text-center">Requested Qty</TableHead>
                          <TableHead className="text-right">Unit Cost</TableHead>
                          <TableHead className="text-right">Total Value</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transfer.lines.map((line) => (
                          <TableRow key={line.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{line.item.name}</div>
                                <div className="text-sm text-muted-foreground">{line.item.sku}</div>
                                {line.item.description && (
                                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {line.item.description}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="font-medium">{line.requestedQuantity}</span>
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(line.item.costPrice || 0)}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-medium">
                                {formatCurrency(line.requestedQuantity * (line.item.costPrice || 0))}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{line.status}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="details" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Transfer Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Transfer Number</Label>
                        <div className="font-medium">{transfer.transferNumber}</div>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={`gap-1.5 ${statusConfig.color}`}>
                            {statusConfig.icon}
                            {statusConfig.label}
                          </Badge>
                          <span className="text-sm text-muted-foreground">{statusConfig.description}</span>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Priority</Label>
                        <div className="mt-1">
                          <Badge variant="outline" className={priorityConfigItem.color}>
                            {priorityConfigItem.label}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Created By</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{transfer.createdBy?.name || "Unknown"}</span>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Created Date</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{format(new Date(transfer.createdAt), "PPP 'at' p")}</span>
                        </div>
                      </div>
                      
                      {transfer.approvedBy && (
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Approved By</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="font-medium">{transfer.approvedBy.name}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timeline" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Transfer Timeline
                  </CardTitle>
                  <CardDescription>Track the progress of this transfer</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                        <Clock className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">Transfer Created</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(transfer.createdAt), "PPP 'at' p")}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Created by {transfer.createdBy?.name || "Unknown"}
                        </div>
                      </div>
                    </div>

                    {transfer.approvedDate && (
                      <div className="flex items-start gap-4">
                        <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">Transfer Approved</div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(transfer.approvedDate), "PPP 'at' p")}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Approved by {transfer.approvedBy?.name || "Unknown"}
                          </div>
                        </div>
                      </div>
                    )}

                    {transfer.shippedDate && (
                      <div className="flex items-start gap-4">
                        <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-full">
                          <Truck className="h-4 w-4 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">Transfer Shipped</div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(transfer.shippedDate), "PPP 'at' p")}
                          </div>
                        </div>
                      </div>
                    )}

                    {transfer.receivedDate && (
                      <div className="flex items-start gap-4">
                        <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                          <Package className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">Transfer Completed</div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(transfer.receivedDate), "PPP 'at' p")}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {transfer.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Transfer Notes</CardTitle>
                      <CardDescription>Public notes visible to all users</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="whitespace-pre-wrap">{transfer.notes}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {transfer.internalNotes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        Internal Notes
                        <Badge variant="secondary">Internal</Badge>
                      </CardTitle>
                      <CardDescription>Internal notes for authorized users only</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="whitespace-pre-wrap">{transfer.internalNotes}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {!transfer.notes && !transfer.internalNotes && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-8">
                        <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-medium">No Notes</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                          No additional notes have been added to this transfer.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
