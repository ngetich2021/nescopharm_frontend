"use client"

import { useState, useEffect, use, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { fetchInvoiceById, Invoice } from "@/lib/invoices"
import { getCompany, Company } from "@/lib/company"
import { getCustomerProfile, CustomerProfileData } from "@/lib/customers"
import { INVOICE_PAYMENT_DETAILS } from "@/lib/invoice-payment-details"
import { ArrowLeft, Download, Mail, Printer } from "lucide-react"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function InvoiceDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const invoiceRef = useRef<HTMLDivElement>(null)
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [customerDetails, setCustomerDetails] = useState<CustomerProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const getInvoice = async () => {
      try {
        const fetchedInvoice = await fetchInvoiceById(id)
        setInvoice(fetchedInvoice)
        
        // Fetch company data attached to the invoice
        if (fetchedInvoice.company_id) {
          try {
            if (fetchedInvoice.company) {
              setCompany(fetchedInvoice.company as Company)
            } else {
              const companyData = await getCompany(fetchedInvoice.company_id)
              setCompany(companyData)
            }
          } catch (err) {
            console.error('Failed to fetch company:', err)
          }
        }
        
        // Fetch full customer details to get customer_type and business_name
        if (fetchedInvoice.customer_id) {
          try {
            const fullCustomerData = await getCustomerProfile(fetchedInvoice.customer_id)
            if (fullCustomerData) {
              setCustomerDetails(fullCustomerData)
            }
          } catch (err) {
            console.error('Failed to fetch customer details:', err)
          }
        }
      } catch (err: any) {
        setError(err.message || "Failed to load invoice")
      } finally {
        setIsLoading(false)
      }
    }

    getInvoice()
  }, [id])

  const handlePrint = () => {
    window.print()
  }

  // Allow linking straight to a print dialog, e.g. a "Print" button elsewhere in the app.
  useEffect(() => {
    if (!isLoading && invoice && typeof window !== 'undefined' && window.location.search.includes('autoprint=1')) {
      const timer = setTimeout(() => window.print(), 300)
      return () => clearTimeout(timer)
    }
  }, [isLoading, invoice])

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current || !invoice) return
    
    setIsDownloading(true)
    
    try {
      // Dynamically import the libraries
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')
      
      const element = invoiceRef.current
      
      // Create canvas from the invoice element
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      })
      
      const imgData = canvas.toDataURL('image/png')
      
      // Calculate dimensions for A4 page
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })
      
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = canvas.width
      const imgHeight = canvas.height
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight)
      const imgX = (pdfWidth - imgWidth * ratio) / 2
      const imgY = 10
      
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio)
      pdf.save(`Invoice-${invoice.invoice_number}.pdf`)
      
      toast({
        title: "Success",
        description: "Invoice PDF downloaded successfully",
      })
    } catch (err) {
      console.error('Failed to generate PDF:', err)
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try printing instead.",
        variant: "destructive",
      })
    } finally {
      setIsDownloading(false)
    }
  }

  const formatAmount = (amount: string | number): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 p-6 rounded-lg">
          <h2 className="text-lg font-semibold text-red-800">Error Loading Invoice</h2>
          <p className="mt-2 text-red-600">{error || "Invoice not found"}</p>
          <Button 
            variant="outline" 
            onClick={() => router.back()} 
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 print:min-h-0 print:bg-white">
      {/* Action Bar - Hide on print */}
      <div className="bg-white border-b print:hidden sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => router.back()} size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownloadPDF}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {isDownloading ? 'Generating...' : 'Download PDF'}
              </Button>
              <Button variant="outline" size="sm">
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Document */}
      <div className="container mx-auto px-4 py-8 print:p-0 print:m-0 print:max-w-none">
        <Card 
          ref={invoiceRef}
          className="max-w-4xl mx-auto bg-white p-8 md:p-12 shadow-lg print:shadow-none print:max-w-none print:m-0 print:p-8 print:border-0"
        >
          {/* Letterhead Banner - the sole source of company identity/contact info on this document */}
          {(company?.letterhead_url || invoice.company?.letterhead_url) && (
            <img
              src={company?.letterhead_url || invoice.company?.letterhead_url || undefined}
              alt={`${company?.name || invoice.company?.name} letterhead`}
              className="w-full h-auto mb-8"
              crossOrigin="anonymous"
            />
          )}

          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">INVOICE</h1>
              <p className="text-lg text-gray-600">#{invoice.invoice_number}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Issue Date</p>
              <p className="font-semibold">{new Date(invoice.invoice_date).toLocaleDateString()}</p>
              {invoice.due_date && (
                <>
                  <p className="text-sm text-gray-600 mt-2">Due Date</p>
                  <p className="font-semibold">{new Date(invoice.due_date).toLocaleDateString()}</p>
                </>
              )}
            </div>
          </div>

          {/* Bill To - company identity already shown once, in the letterhead above */}
          <div className="mb-8">
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-2">BILL TO</p>
              <div className="text-gray-900">
                <p className="font-semibold">
                  {/* Show business_name for company customers, otherwise show name */}
                  {(customerDetails?.customer_type === 'company' || invoice.customer?.customer_type === 'company') && 
                   (customerDetails?.business_name || invoice.customer?.business_name)
                    ? (customerDetails?.business_name || invoice.customer?.business_name)
                    : (customerDetails?.name || invoice.customer?.name || 'Customer Name')}
                </p>
                {/* Show contact person for company customers */}
                {(customerDetails?.customer_type === 'company' || invoice.customer?.customer_type === 'company') && 
                 (customerDetails?.business_name || invoice.customer?.business_name) && (
                  <p className="text-sm">c/o {customerDetails?.name || invoice.customer?.name}</p>
                )}
                {(customerDetails?.email || invoice.customer?.email) && (
                  <p className="text-sm">{customerDetails?.email || invoice.customer?.email}</p>
                )}
                {(customerDetails?.phone || invoice.customer?.phone) && (
                  <p className="text-sm">{customerDetails?.phone || invoice.customer?.phone}</p>
                )}
                {(customerDetails?.address || invoice.customer?.address) && (
                  <p className="text-sm">{customerDetails?.address || invoice.customer?.address}</p>
                )}
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="mb-8">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 text-sm font-semibold text-gray-700">DESCRIPTION</th>
                  <th className="text-right py-3 text-sm font-semibold text-gray-700">QTY</th>
                  <th className="text-right py-3 text-sm font-semibold text-gray-700">UNIT PRICE</th>
                  <th className="text-right py-3 text-sm font-semibold text-gray-700">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {invoice.line_items && invoice.line_items.map((item, index) => (
                  <tr key={item.id || index} className="border-b border-gray-200">
                    <td className="py-3 text-sm text-gray-900">{item.description}</td>
                    <td className="text-right py-3 text-sm text-gray-900">{item.quantity}</td>
                    <td className="text-right py-3 text-sm text-gray-900">KES {formatAmount(item.unit_price)}</td>
                    <td className="text-right py-3 text-sm text-gray-900">
                      KES {formatAmount(parseFloat(item.quantity.toString()) * parseFloat(item.unit_price.toString()))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="flex justify-end mb-8">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="text-gray-900">KES {formatAmount(invoice.subtotal)}</span>
              </div>
              {parseFloat(invoice.tax_amount.toString()) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax:</span>
                  <span className="text-gray-900">KES {formatAmount(invoice.tax_amount)}</span>
                </div>
              )}
              {parseFloat(invoice.discount_amount.toString()) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Discount:</span>
                  <span className="text-green-600">-KES {formatAmount(invoice.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t-2 border-gray-300 pt-2">
                <span>Total:</span>
                <span>KES {formatAmount(invoice.total_amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Amount Paid:</span>
                <span className="text-green-600">KES {formatAmount(invoice.amount_paid)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <span>Balance Due:</span>
                <span className={parseFloat(invoice.balance_amount.toString()) > 0 ? "text-red-600" : "text-green-600"}>
                  KES {formatAmount(invoice.balance_amount)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes & Payment Terms */}
          {(invoice.notes || invoice.payment_terms) && (
            <div className="border-t border-gray-200 pt-6 space-y-4">
              {invoice.payment_terms && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Payment Terms</p>
                  <p className="text-sm text-gray-600">{invoice.payment_terms}</p>
                </div>
              )}
              {invoice.notes && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Notes</p>
                  <p className="text-sm text-gray-600">{invoice.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Payment Details - only relevant while there's still a balance to collect */}
          {invoice.status !== 'paid' && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm font-bold text-gray-800 mb-3">
                {(company?.name || 'COMPANY').toUpperCase()} PAYMENT DETAILS
              </p>
              <div className="grid grid-cols-2 gap-8 text-sm text-gray-600">
                <div>
                  <p className="font-semibold text-gray-800 mb-1">MPESA</p>
                  <p>Paybill Number: {INVOICE_PAYMENT_DETAILS.mpesaPaybill}</p>
                  <p>Account Number: {INVOICE_PAYMENT_DETAILS.mpesaAccount}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800 mb-1">BANK DETAILS</p>
                  <p>Bank Name: {INVOICE_PAYMENT_DETAILS.bankName}</p>
                  <p>Bank Account Name: {INVOICE_PAYMENT_DETAILS.bankAccountName}</p>
                  <p>Account Number: {INVOICE_PAYMENT_DETAILS.bankAccountNumber}</p>
                  <p>Bank Branch: {INVOICE_PAYMENT_DETAILS.bankBranch}</p>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-gray-200 text-center text-xs text-gray-500">
            <p>Thank you for your business!</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
