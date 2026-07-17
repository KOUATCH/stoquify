"use client"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search } from "lucide-react"
import { useState } from "react"

type InviteStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED"

export type InviteDataProps={
id:string;
email:string;
createdAt:Date;
status:InviteStatus;
}
export default function InviteTableWithSearch({data}:{data:InviteDataProps[]}) {
    const [searchTerm, setSearchTerm] = useState("")
    // const [invites, setInvites] = useState<invites[]>(data)

  // Format date to be more readable
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  // Filter invites based on search term
  const filteredInvites = data.filter((invite) => invite.email.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[var(--dash-text-soft)]" />
        <Input
          type="text"
          placeholder="Search by email..."
          className="dashboard-control h-9 rounded-lg pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="dashboard-table-shell min-w-0 overflow-hidden rounded-lg">
        <Table>
          <TableCaption className="text-[var(--dash-text-soft)]">List of organization invites</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="px-3">Email</TableHead>
              <TableHead className="px-3">Date</TableHead>
              <TableHead className="px-3">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvites.length > 0 ? (
              filteredInvites.map((invite) => (
                <TableRow key={invite.id} className="hover:bg-[rgba(47,125,246,0.085)]">
                  <TableCell className="px-3 py-3 font-medium text-[var(--dash-text)]">{invite.email}</TableCell>
                  <TableCell className="px-3 py-3 text-[var(--dash-text-soft)]">{formatDate(invite.createdAt)}</TableCell>
                  <TableCell className="px-3 py-3">
                    {invite.status === "ACCEPTED" ? (
                      <Badge className="border-0 bg-[var(--dash-success-soft)] text-[var(--dash-success)] hover:bg-[var(--dash-success-soft)]">Success</Badge>
                    ) : invite.status === "PENDING" ? (
                      <Badge variant="outline" className="border-[var(--dash-gold)] text-[var(--dash-gold)]">
                        Pending
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-[var(--dash-surface-raised)] text-[var(--dash-text-soft)]">{invite.status.toLowerCase()}</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="py-6 text-center text-[var(--dash-text-soft)]">
                  No invites found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
