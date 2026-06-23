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
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by email..."
          className="pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableCaption>List of organization invites</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvites.length > 0 ? (
              filteredInvites.map((invite) => (
                <TableRow key={invite.id}>
                  <TableCell className="font-medium">{invite.email}</TableCell>
                  <TableCell>{formatDate(invite.createdAt)}</TableCell>
                  <TableCell>
                    {invite.status === "ACCEPTED" ? (
                      <Badge className="bg-green-500 hover:bg-green-600">Success</Badge>
                    ) : invite.status === "PENDING" ? (
                      <Badge variant="outline" className="text-amber-500 border-amber-500">
                        Pending
                      </Badge>
                    ) : (
                      <Badge variant="secondary">{invite.status.toLowerCase()}</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
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
