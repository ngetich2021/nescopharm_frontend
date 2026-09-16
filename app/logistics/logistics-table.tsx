"use client"

import { useState, useEffect, useCallback } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  MoreHorizontal,
  Search,
  TruckIcon,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Loader2,
} from "lucide-react"
import { getLogisticsPaginated, updateLogistics, type Logistics } from "@/lib/logistics"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"

function getStatusBadge(status: string) {
  const s = (status || "").toLowerCase()
  if (s.includes("deliver")) return <Badge className="bg-green-100 text-green-800 border-green-500 hover:bg-green-100">{capitalize(status)}</Badge>
  if (s.includes("transit")) return <Badge className="bg-blue-100 text-blue-800 border-blue-500 hover:bg-blue-100">{capitalize(status)}</Badge>
  if (s.includes("dispatch")) return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-500 hover:bg-indigo-100">{capitalize(status)}</Badge>
  if (s.includes("pending")) return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-500 hover:bg-yellow-100">{capitalize(status)}</Badge>
  if (s.includes("fail") || s.includes("cancel")) return <Badge className="bg-red-100 text-red-800 border-red-500 hover:bg-red-100">{capitalize(status)}</Badge>
  if (s.includes("return")) return <Badge className="bg-purple-100 text-purple-800 border-purple-500 hover:bg-purple-100">{capitalize(status)}</Badge>
  return <Badge className="bg-gray-100 text-gray-800 border-gray-500 hover:bg-gray-100">{capitalize(status)}</Badge>
}

function capitalize(str: string) {
  return (str || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatDate(dateString: string | null) {
  if (!dateString) return "—"
  try {
    return format(new Date(dateString), "MMM dd, yyyy HH:mm")
  } catch {
    return dateString
  }
}

export function LogisticsTable() {
  const { toast } = useToast()

  // Data
  const [logistics, setLogistics] = useState<Logistics[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // Filters
  const [search, setSearch] = useState("")
  const [searchDebounced, setSearchDebounced] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // Update dialog
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false)
  const [updateEntry, setUpdateEntry] = useState<Logistics | null>(null)
  const [updateStatus, setUpdateStatus] = useState("")
  const [updateNotes, setUpdateNotes] = useState("")
  const [updating, setUpdating] = useState(false)

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else if (logistics.length === 0) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await getLogisticsPaginated({
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: searchDebounced || undefined,
        page: currentPage,
        per_page: rowsPerPage,
      })
      setLogistics(res.data)
      setTotalItems(res.meta.total)
      setTotalPages(res.meta.last_page)
    } catch {
      if (!isRefresh) setLogistics([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [statusFilter, searchDebounced, currentPage, rowsPerPage])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search)
      setCurrentPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  const paginatedLogistics = logistics

  const handleSearchChange = (value: string) => {
    setSearch(value)
  }

  const openUpdateDialog = (entry: Logistics) => {
    setUpdateEntry(entry)
    setUpdateStatus(entry.delivery_status || "pending")
    setUpdateNotes((entry as any).notes || "")
    setUpdateDialogOpen(true)
  }

  const handleUpdateStatus = async () => {
    if (!updateEntry) return
    setUpdating(true)
    try {
      const data: any = {
        delivery_status: updateStatus,
        notes: updateNotes || undefined,
      }
      if (updateStatus === "delivered") {
        data.actual_delivery_time = new Date().toISOString()
        data.update_order_status = true
      }
      await updateLogistics(updateEntry.id, data)
      toast({ title: "Success", description: `Status updated to ${capitalize(updateStatus)}.` })
      setUpdateDialogOpen(false)
      fetchData(true)
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to update status.", variant: "destructive" })
    } finally {
      setUpdating(false)
    }
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-auto">
            <Input
              className="pl-8 w-full sm:max-w-sm"
              placeholder="Search by name, tracking #, address..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1) }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="dispatched">Dispatched</SelectItem>
              <SelectItem value="in_transit">In Transit</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="returned">Returned</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchData(true)} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Table */}
      <div className={`rounded-md border transition-opacity duration-200 ${refreshing ? "opacity-50 pointer-events-none" : ""}`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dispatch #</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Tracking #</TableHead>
              <TableHead>Delivery Address</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Dispatched</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading logistics...
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedLogistics.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  <div className="text-muted-foreground">
                    <TruckIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium">No logistics found</p>
                    <p className="text-sm">
                      {search || statusFilter !== "all"
                        ? "Try adjusting your search or filter."
                        : "Logistics entries will appear here when dispatches are created."}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedLogistics.map((entry) => (
                <TableRow key={entry.id} className="hover:bg-gray-50 cursor-pointer">
                  <TableCell className="font-semibold text-primary">
                    {entry.order?.order_number || entry.order_dispatch?.dispatch_number || "—"}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{entry.recipient_name || "N/A"}</div>
                      <div className="text-sm text-muted-foreground">{entry.recipient_phone || ""}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{entry.driver_name || "—"}</div>
                      <div className="text-sm text-muted-foreground">{entry.vehicle_registration || ""}</div>
                    </div>
                  </TableCell>
                  <TableCell>{entry.tracking_number || "—"}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={entry.delivery_address || ""}>
                    {entry.delivery_address || "—"}
                  </TableCell>
                  <TableCell>{getStatusBadge(entry.delivery_status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(entry.dispatch_time)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openUpdateDialog(entry) }}>
                          Update Status
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={rowsPerPage.toString()}
            onValueChange={(value) => { setRowsPerPage(Number(value)); setCurrentPage(1) }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="top">
              {[5, 10, 20, 30, 40, 50].map((size) => (
                <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            {totalItems > 0
              ? `Showing ${(currentPage - 1) * rowsPerPage + 1}–${Math.min(currentPage * rowsPerPage, totalItems)} of ${totalItems}`
              : "No results"}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <div className="text-sm font-medium">
            Page {currentPage} of {totalPages || 1}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages || 1))}
            disabled={currentPage >= totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Update Status Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Delivery Status</DialogTitle>
            <DialogDescription>
              {updateEntry && (
                <span>
                  {updateEntry.order?.order_number || updateEntry.order_dispatch?.dispatch_number || "Logistics Entry"} — {updateEntry.recipient_name || "N/A"}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={updateStatus} onValueChange={setUpdateStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="dispatched">Dispatched</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="returned">Returned</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={updateNotes}
                onChange={(e) => setUpdateNotes(e.target.value)}
                placeholder="Add delivery notes..."
                rows={3}
              />
            </div>
            {updateStatus === "delivered" && (
              <p className="text-xs text-muted-foreground">
                Marking as delivered will set the delivery time to now and update the associated order status.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateDialogOpen(false)} disabled={updating}>
              Cancel
            </Button>
            <Button onClick={handleUpdateStatus} disabled={updating}>
              {updating ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
