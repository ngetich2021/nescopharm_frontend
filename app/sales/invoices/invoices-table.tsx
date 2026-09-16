"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Eye, 
  Edit, 
  Trash2, 
  Send, 
  Plus, 
  Search, 
  Filter,
  MoreHorizontal,
  Receipt,
  DollarSign,
  Calendar,
  Mail,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Invoice, fetchInvoices, deleteInvoice, sendInvoice, parseInvoiceAmount } from "@/lib/invoices"
import { useDataCache } from "@/lib/data-cache"
import { CreateInvoiceModal } from "@/components/modals/create-invoice-modal"
import { CreateInvoiceFromOrderModal } from "@/components/modals/create-invoice-from-order-modal"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { invalidateCacheKey } from "@/lib/data-cache"
import { EditInvoiceSheet } from "@/components/sheets/edit-invoice-sheet"
import { DeleteInvoiceConfirmationDialog } from "./components/DeleteInvoiceConfirmationDialog"

interface InvoicesTableProps {
  initialInvoices?: Invoice[]
}

export function InvoicesTable({ initialInvoices = [] }: InvoicesTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCreateFromOrderModal, setShowCreateFromOrderModal] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  // Use data cache for invoices - fetch ALL invoices for client-side pagination
  const {
    data: invoicesResponse,
    isLoading,
    refetch: refreshInvoices
  } = useDataCache<{ data: Invoice[], meta?: any }>(
    'invoices',
    () => fetchInvoices({
      // Remove pagination parameters to fetch all data
      search: searchTerm || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      type: typeFilter !== 'all' ? typeFilter : undefined,
      // Don't pass per_page and page - let server return all results or a large set
      per_page: 1000, // Get a large number of invoices for client-side pagination
    }),
    {
      expirationMs: 5 * 60 * 1000, // 5 minutes cache
      autoRefresh: false, // Disable automatic background refresh to prevent rate limiting
      autoRefreshIntervalMs: 0 // Disable auto refresh
    }
  )

  // Listen for invoice updates and refresh cache when needed
  useEffect(() => {
    const handleInvoiceUpdate = (event: CustomEvent) => {
      // Only refresh if cache is stale or if this is a critical update
      setTimeout(() => refreshInvoices(), 1000) // Delayed refresh to avoid rate limiting
    }

    const handleInvoiceCreate = (event: CustomEvent) => {
      setTimeout(() => refreshInvoices(), 1000) // Delayed refresh to avoid rate limiting
    }

    const handleInvoiceDelete = (event: CustomEvent) => {
      setTimeout(() => refreshInvoices(), 1000) // Delayed refresh to avoid rate limiting
    }

    const handleInvoiceStatusChange = (event: CustomEvent) => {
      setTimeout(() => refreshInvoices(), 1000) // Delayed refresh to avoid rate limiting
    }

    // Add event listeners for all invoice-related changes
    window.addEventListener('invoice-updated', handleInvoiceUpdate as EventListener)
    window.addEventListener('invoice-created', handleInvoiceCreate as EventListener)
    window.addEventListener('invoice-deleted', handleInvoiceDelete as EventListener)
    window.addEventListener('invoice-status-changed', handleInvoiceStatusChange as EventListener)

    // Cleanup event listeners
    return () => {
      window.removeEventListener('invoice-updated', handleInvoiceUpdate as EventListener)
      window.removeEventListener('invoice-created', handleInvoiceCreate as EventListener)
      window.removeEventListener('invoice-deleted', handleInvoiceDelete as EventListener)
      window.removeEventListener('invoice-status-changed', handleInvoiceStatusChange as EventListener)
    }
  }, []) // Empty dependency array to prevent recreating listeners

  const invoices = invoicesResponse?.data || initialInvoices

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, typeFilter])

  // Only refresh data when filters change, NOT when pagination changes
  useEffect(() => {
    const timer = setTimeout(() => {
      refreshInvoices()
    }, 500) // 500ms debounce to prevent excessive API calls
    
    return () => clearTimeout(timer)
  }, [searchTerm, statusFilter, typeFilter]) // Removed currentPage and itemsPerPage

  // Client-side filtering (like payments table)
  const filteredInvoices = invoices.filter((invoice) =>
    (statusFilter === "all" || invoice.status.toLowerCase() === statusFilter) &&
    (typeFilter === "all" || invoice.type.toLowerCase() === typeFilter) &&
    (searchTerm === "" ||
      (invoice.invoice_number && invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (invoice.customer?.name && invoice.customer.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      ((invoice.customer as any)?.business_name && (invoice.customer as any).business_name.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  )

  // Client-side pagination (like payments table)
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage)
  const paginatedInvoices = filteredInvoices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  // Status color mapping
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      case 'sent':
        return 'bg-blue-100 text-blue-800'
      case 'viewed':
        return 'bg-purple-100 text-purple-800'
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'partially_paid':
        return 'bg-yellow-100 text-yellow-800'
      case 'overdue':
        return 'bg-red-100 text-red-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Add state for edit sheet and delete dialog
  const [showEditSheet, setShowEditSheet] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null)

  // Add handler functions for actions
  const handleEditInvoice = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId)
    setShowEditSheet(true)
  }

  const handleDeleteInvoice = (invoice: Invoice) => {
    setInvoiceToDelete(invoice)
    setIsDeleteDialogOpen(true)
  }

  const handleInvoiceDeleted = () => {
    setIsDeleteDialogOpen(false)
    setInvoiceToDelete(null)
    refreshInvoices()
  }

  // Add ActionsDropdown component
  const ActionsDropdown = ({ invoice }: { invoice: Invoice }) => {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link href={`/sales/invoices/${invoice.id}`}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </Link>
          </DropdownMenuItem>
          {invoice.status === 'draft' && (
            <>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditInvoice(invoice.id); }}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Invoice
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {(invoice.status === 'draft' || invoice.status === 'sent' || invoice.status === 'viewed') && (
            <>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSendEmail(invoice.id); }}>
                <Mail className="mr-2 h-4 w-4" />
                Send via Email
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSendWhatsApp(invoice.id); }}>
                <MessageCircle className="mr-2 h-4 w-4" />
                Send via WhatsApp
              </DropdownMenuItem>
            </>
          )}
          {invoice.status === 'draft' && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); handleDeleteInvoice(invoice); }}
                className="text-primary"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Invoice
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  const handleSendEmail = async (invoiceId: string) => {
    // TODO: Implement email sending functionality
    toast({
      title: "Coming Soon",
      description: "Email functionality will be implemented soon",
    })
  }

  const handleSendWhatsApp = async (invoiceId: string) => {
    // TODO: Implement WhatsApp sending functionality
    toast({
      title: "Coming Soon",
      description: "WhatsApp functionality will be implemented soon",
    })
  }

  const handleRowClick = (invoiceId: string, event: React.MouseEvent) => {
    // Prevent navigation if clicking on interactive elements
    const target = event.target as HTMLElement
    const isInteractive = target.closest('button') || 
                          target.closest('a') || 
                          target.closest('[role="button"]') ||
                          target.closest('.dropdown-trigger')
    
    if (!isInteractive) {
      router.push(`/sales/invoices/${invoiceId}`)
    }
  }

  // Calculate summary statistics - use all invoices for summary (not just current page)
  const totalInvoices = invoices.length
  const totalAmount = invoices.reduce((sum, inv) => {
    const amount = parseInvoiceAmount(inv.total_amount)
    return sum + amount
  }, 0)
  const paidInvoices = invoices.filter(inv => inv.status === 'paid').length
  const overdueInvoices = invoices.filter(inv => inv.status === 'overdue').length

  // Calculate item count for each invoice
  const getInvoiceItemCount = (invoice: Invoice): number => {
    return invoice.line_items?.length || 0
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <Receipt className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-24" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{totalInvoices}</div>
                <p className="text-xs text-muted-foreground">All time invoices</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <>
                <Skeleton className="h-8 w-24 mb-1" />
                <Skeleton className="h-3 w-28" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
                <p className="text-xs text-muted-foreground">Total billed amount</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Invoices</CardTitle>
            <Receipt className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <>
                <Skeleton className="h-8 w-12 mb-1" />
                <Skeleton className="h-3 w-28" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{paidInvoices}</div>
                <p className="text-xs text-muted-foreground">Successfully paid</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <>
                <Skeleton className="h-8 w-12 mb-1" />
                <Skeleton className="h-3 w-20" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{overdueInvoices}</div>
                <p className="text-xs text-muted-foreground">Past due date</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-1">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="viewed">Viewed</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="service">Service</SelectItem>
                <SelectItem value="recurring">Recurring</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => refreshInvoices()}
            className="flex items-center gap-2"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowCreateFromOrderModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            From Order
          </Button>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* Invoices Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Show skeleton loader when loading
              Array.from({ length: itemsPerPage }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-8 ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : paginatedInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  No invoices found
                </TableCell>
              </TableRow>
            ) : (
              paginatedInvoices.map((invoice) => (
                <TableRow 
                  key={invoice.id}
                  className="cursor-pointer hover:bg-gray-50 hover:shadow-sm transition-all duration-150"
                  onClick={(e) => handleRowClick(invoice.id, e)}
                >
                  <TableCell className="font-medium">
                    {invoice.invoice_number}
                  </TableCell>
                  <TableCell>
                    {(invoice.customer as any)?.customer_type === "company"
                      ? ((invoice.customer as any)?.business_name || invoice.customer?.name || 'N/A')
                      : (invoice.customer?.name || 'N/A')
                    }
                  </TableCell>
                  <TableCell>{formatCurrency(parseInvoiceAmount(invoice.total_amount))}</TableCell>
                  <TableCell>{getInvoiceItemCount(invoice)}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(invoice.status)}>
                      {invoice.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <ActionsDropdown invoice={invoice} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => {
              setItemsPerPage(Number(value))
              setCurrentPage(1)
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={itemsPerPage} />
            </SelectTrigger>
            <SelectContent side="top">
              {[5, 10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={pageSize.toString()}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((old) => Math.max(old - 1, 1))}
            disabled={currentPage === 1}
            className="border-gray-200 hover:bg-primary/10 hover:text-primary hover:border-primary"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <div className="flex items-center justify-center text-sm font-medium">
            Page {currentPage} of {totalPages || 1}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((old) => Math.min(old + 1, totalPages || 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="border-gray-200 hover:bg-primary/10 hover:text-primary hover:border-primary"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Modals */}
      <CreateInvoiceModal 
        open={showCreateModal} 
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false)
          // Dispatch event for automatic cache refresh
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('invoice-created', { 
              detail: { timestamp: Date.now() } 
            }))
          }
        }}
      />
      
      <CreateInvoiceFromOrderModal 
        open={showCreateFromOrderModal} 
        onClose={() => setShowCreateFromOrderModal(false)}
        onSuccess={() => {
          setShowCreateFromOrderModal(false)
          // Dispatch event for automatic cache refresh
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('invoice-created', { 
              detail: { timestamp: Date.now() } 
            }))
          }
        }}
      />

      {/* Add Edit Sheet and Delete Dialog */}
      {selectedInvoiceId && (
        <EditInvoiceSheet
          open={showEditSheet}
          onClose={() => {
            setShowEditSheet(false)
            setSelectedInvoiceId(null)
          }}
          invoiceId={selectedInvoiceId}
          onSuccess={() => {
            setShowEditSheet(false)
            setSelectedInvoiceId(null)
            refreshInvoices()
          }}
        />
      )}
      
      <DeleteInvoiceConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onSuccess={handleInvoiceDeleted}
        invoice={invoiceToDelete}
      />
    </div>
  )
}
