"use client"

import { useEffect, useState } from "react"
import { Quote } from "@/lib/quotes"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, FileText, User, Calendar, DollarSign, Package, CheckCircle2, XCircle, CreditCard, Wallet } from "lucide-react"
import { formatCurrency, cn } from "@/lib/utils"
import { getCustomerDisplayName, fetchCustomerCreditTerms, type CustomerCreditTerms } from "@/lib/customers"

interface ConvertQuoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  quote: Quote | null
  onConfirm: (paymentOption: "instant" | "credit") => void
  isConverting: boolean
}

export function ConvertQuoteDialog({
  open,
  onOpenChange,
  quote,
  onConfirm,
  isConverting
}: ConvertQuoteDialogProps) {
  const [creditTerms, setCreditTerms] = useState<CustomerCreditTerms | null>(null)
  const [isLoadingCreditTerms, setIsLoadingCreditTerms] = useState(false)
  const [paymentOption, setPaymentOption] = useState<"instant" | "credit">("credit")

  const orderTotal = quote ? Number(quote.final_amount || quote.total_amount || 0) : 0

  useEffect(() => {
    if (!open || !quote?.customer_id) {
      setCreditTerms(null)
      return
    }
    let cancelled = false
    setIsLoadingCreditTerms(true)
    fetchCustomerCreditTerms(quote.customer_id)
      .then((terms) => {
        if (cancelled) return
        setCreditTerms(terms)
        // Default to whatever the customer is actually set up for, but if
        // they're a credit customer with too little room left, default to
        // instant instead of leaving them stuck on an option that will 422.
        const insufficientCredit = terms.available_credit !== null && orderTotal > Number(terms.available_credit)
        setPaymentOption(terms.payment_method === "credit" && !insufficientCredit ? "credit" : "instant")
      })
      .catch(() => {
        if (!cancelled) setCreditTerms(null)
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCreditTerms(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, quote?.customer_id])

  if (!quote) return null

  // Check if quote can be converted
  const canConvert = !quote.converted_to_order_id &&
                     !quote.requires_approval &&
                     quote.status !== "rejected" &&
                     quote.status !== "expired"

  const availableCredit = creditTerms?.available_credit !== null && creditTerms?.available_credit !== undefined
    ? Number(creditTerms.available_credit)
    : null
  const insufficientCredit = availableCredit !== null && orderTotal > availableCredit
  const isCreditCustomer = creditTerms?.payment_method === "credit"

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase()
    if (statusLower === "accepted") {
      return <Badge className="bg-green-100 text-green-800 border-green-500">Accepted</Badge>
    } else if (statusLower === "pending") {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-500">Pending</Badge>
    } else if (statusLower === "rejected") {
      return <Badge className="bg-red-100 text-red-800 border-red-500">Rejected</Badge>
    } else if (statusLower === "expired") {
      return <Badge className="bg-gray-100 text-gray-800 border-gray-500">Expired</Badge>
    }
    return <Badge>{status}</Badge>
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            Convert Quote to Order
          </DialogTitle>
          <DialogDescription>
            {canConvert 
              ? "Review the quote details below and confirm to create an order."
              : "This quote cannot be converted to an order."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Validation Messages */}
          {!canConvert && (
            <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4 space-y-2">
              <div className="flex items-start gap-2">
                <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-red-900">Cannot Convert Quote</p>
                  <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                    {quote.converted_to_order_id && (
                      <li>This quote has already been converted to an order</li>
                    )}
                    {quote.requires_approval && (
                      <li>This quote requires approval before conversion</li>
                    )}
                    {quote.status === "rejected" && (
                      <li>Rejected quotes cannot be converted</li>
                    )}
                    {quote.status === "expired" && (
                      <li>Expired quotes cannot be converted</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {canConvert && (
            <div className="rounded-lg border-2 border-green-200 bg-green-50 p-3 flex gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-800 font-medium">
                This quote is ready to be converted to an order
              </p>
            </div>
          )}

          {/* Quote Details */}
          <div className="rounded-lg border bg-gray-50 p-4 space-y-3">
            <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide mb-3">Quote Summary</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-start gap-2 text-sm">
                <FileText className="h-4 w-4 text-gray-500 mt-0.5" />
                <div>
                  <span className="block text-xs text-gray-500">Quote Number</span>
                  <span className="font-medium text-gray-900">{quote.quote_number}</span>
                </div>
              </div>

              <div className="flex items-start gap-2 text-sm">
                <User className="h-4 w-4 text-gray-500 mt-0.5" />
                <div>
                  <span className="block text-xs text-gray-500">Customer</span>
                  <span className="font-medium text-gray-900">{quote.customer ? getCustomerDisplayName(quote.customer) : "Unknown"}</span>
                </div>
              </div>

              <div className="flex items-start gap-2 text-sm">
                <Calendar className="h-4 w-4 text-gray-500 mt-0.5" />
                <div>
                  <span className="block text-xs text-gray-500">Valid Until</span>
                  <span className="font-medium text-gray-900">
                    {new Date(quote.valid_until).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 text-sm">
                <div className="h-4 w-4 mt-0.5" />
                <div>
                  <span className="block text-xs text-gray-500">Status</span>
                  {getStatusBadge(quote.status)}
                </div>
              </div>
            </div>

            {/* Items Count */}
            {quote.quote_items && quote.quote_items.length > 0 && (
              <div className="pt-3 border-t">
                <div className="flex items-center gap-2 text-sm">
                  <Package className="h-4 w-4 text-gray-500" />
                  <span className="text-xs text-gray-500">Items</span>
                  <span className="font-medium text-gray-900">
                    {quote.quote_items.length} item{quote.quote_items.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                  {quote.quote_items.map((item, index) => (
                    <div key={index} className="text-xs text-gray-600 pl-6">
                      • {item.product?.name || 'Product'} - Qty: {item.quantity} @ {quote.currency} {Number(item.unit_price).toLocaleString()}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Total Amount */}
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-500" />
                  <span className="font-medium text-gray-700">Total Amount</span>
                </div>
                <span className="text-xl font-bold text-primary">
                  {quote.currency} {Number(quote.final_amount || quote.total_amount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              {quote.discount && Number(quote.discount) > 0 && (
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-gray-500">Discount Applied</span>
                  <span className="text-gray-700">-{quote.currency} {Number(quote.discount).toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Notes */}
            {quote.notes && (
              <div className="pt-3 border-t">
                <span className="block text-xs text-gray-500 mb-1">Notes</span>
                <p className="text-sm text-gray-700 italic">{quote.notes}</p>
              </div>
            )}
          </div>

          {/* Payment Method - a customer's remaining credit isn't unlimited,
              so this has to be chosen explicitly rather than always silently
              going through on credit regardless of how much room is left. */}
          {canConvert && (
            <div className="rounded-lg border bg-white p-4 space-y-3">
              <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Payment Method</h3>
              {isLoadingCreditTerms ? (
                <p className="text-sm text-gray-500">Checking customer's credit standing…</p>
              ) : (
                <>
                  {isCreditCustomer && (
                    <div className={cn(
                      "text-sm rounded-md px-3 py-2",
                      insufficientCredit ? "bg-red-50 text-red-800" : "bg-gray-50 text-gray-700"
                    )}>
                      Available credit: <span className="font-semibold">
                        {availableCredit !== null ? formatCurrency(availableCredit) : "—"}
                      </span>
                      {insufficientCredit && (
                        <span> — not enough to cover this order ({formatCurrency(orderTotal)}). Choose "Pay Instant" below.</span>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentOption("credit")}
                      disabled={insufficientCredit}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-sm transition-colors",
                        paymentOption === "credit" ? "border-primary bg-primary/5" : "border-gray-200",
                        insufficientCredit && "opacity-40 cursor-not-allowed"
                      )}
                    >
                      <CreditCard className="h-5 w-5" />
                      <span className="font-medium">On Credit</span>
                      <span className="text-xs text-gray-500">Customer's registered terms</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentOption("instant")}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-sm transition-colors",
                        paymentOption === "instant" ? "border-primary bg-primary/5" : "border-gray-200"
                      )}
                    >
                      <Wallet className="h-5 w-5" />
                      <span className="font-medium">Pay Instant</span>
                      <span className="text-xs text-gray-500">Cash / due on receipt</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Info message */}
          {canConvert && (
            <div className="flex gap-3 rounded-lg bg-blue-50 p-3 text-sm">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-blue-900">What happens next?</p>
                <ul className="list-disc list-inside text-blue-700 space-y-1">
                  <li>A new order will be created with these quote details</li>
                  <li>The quote will remain in the system</li>
                  <li>You can manage the order in the Orders section</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isConverting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onConfirm(paymentOption)}
            disabled={isConverting || !canConvert}
            className={!canConvert ? "opacity-50 cursor-not-allowed" : ""}
          >
            {isConverting ? "Converting..." : "Convert to Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
