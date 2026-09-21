"use client"

import { useEffect, useRef, useState, use } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { fetchCustomerStatement, CustomerStatement } from "@/lib/customer-statements"
import { getCustomerDisplayName } from "@/lib/customers"
import { ArrowLeft, Download, Printer, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

function formatAmount(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount
  return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function todayDateString() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function firstOfMonthString() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
}

function lastOfMonthString() {
  const d = new Date()
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`
}

export default function CustomerStatementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const statementRef = useRef<HTMLDivElement>(null)

  const [statement, setStatement] = useState<CustomerStatement | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [dateFrom, setDateFrom] = useState(firstOfMonthString())
  const [dateTo, setDateTo] = useState(lastOfMonthString())

  const loadStatement = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchCustomerStatement(id, { date_from: dateFrom, date_to: dateTo })
      setStatement(data)
    } catch (err: any) {
      setError(err.message || "Failed to load statement")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadStatement()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = async () => {
    if (!statementRef.current || !statement) return

    setIsDownloading(true)
    try {
      const html2canvas = (await import("html2canvas")).default
      const { jsPDF } = await import("jspdf")

      const canvas = await html2canvas(statementRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      })

      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const ratio = Math.min(pdfWidth / canvas.width, pdfHeight / canvas.height)
      const imgX = (pdfWidth - canvas.width * ratio) / 2

      pdf.addImage(imgData, "PNG", imgX, 10, canvas.width * ratio, canvas.height * ratio)
      pdf.save(`Statement-${getCustomerDisplayName(statement.customer)}-${statement.period.from}-to-${statement.period.to}.pdf`)

      toast({ title: "Success", description: "Statement PDF downloaded successfully" })
    } catch (err) {
      console.error("Failed to generate PDF:", err)
      toast({ title: "Error", description: "Failed to generate PDF. Please try printing instead.", variant: "destructive" })
    } finally {
      setIsDownloading(false)
    }
  }

  if (isLoading && !statement) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !statement) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 p-6 rounded-lg">
          <h2 className="text-lg font-semibold text-red-800">Error Loading Statement</h2>
          <p className="mt-2 text-red-600">{error || "Statement not found"}</p>
          <Button variant="outline" onClick={() => router.back()} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  const sections = [
    {
      title: "Invoices",
      rows: statement.invoices.map((inv) => ({
        date: inv.invoice_date,
        reference: inv.invoice_number,
        amount: inv.total_amount,
      })),
      total: statement.summary.invoices_total,
    },
    {
      title: "Payments Received",
      rows: statement.payments.map((p) => ({
        date: p.payment_date,
        reference: p.transaction_id || p.payment_method || "-",
        amount: p.amount_paid,
      })),
      total: statement.summary.payments_total,
    },
    {
      title: "Credit Notes",
      rows: statement.credit_notes.map((cn) => ({
        date: cn.credit_note_date,
        reference: cn.credit_note_number,
        amount: cn.total_amount,
      })),
      total: statement.summary.credit_notes_total,
    },
    {
      title: "PD Cheques Received",
      rows: statement.pd_cheques.map((c) => ({
        date: c.issue_date,
        reference: `${c.cheque_number} (${c.bank_name}) - matures ${new Date(c.maturity_date).toLocaleDateString()}`,
        amount: c.amount,
      })),
      total: statement.summary.pd_cheques_total,
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 print:min-h-0 print:bg-white">
      {/* Action Bar - hidden on print */}
      <div className="bg-white border-b print:hidden sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Button variant="ghost" onClick={() => router.back()} size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <div className="flex flex-wrap items-end gap-3">
              <div className="grid gap-1">
                <Label htmlFor="date_from" className="text-xs">From</Label>
                <Input id="date_from" type="date" className="h-8 w-[150px]" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="date_to" className="text-xs">To</Label>
                <Input id="date_to" type="date" className="h-8 w-[150px]" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
              <Button size="sm" onClick={loadStatement} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                View
              </Button>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={isDownloading}>
                {isDownloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                {isDownloading ? "Generating..." : "Download PDF"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Statement Document */}
      <div className="container mx-auto px-4 py-8 print:p-0 print:m-0 print:max-w-none">
        <Card
          ref={statementRef}
          className="max-w-4xl mx-auto bg-white p-6 md:p-8 shadow-lg print:shadow-none print:max-w-none print:m-0 print:p-6 print:border-0 text-sm"
        >
          {statement.company?.letterhead_url && (
            <img
              src={statement.company.letterhead_url}
              alt={`${statement.company.name} letterhead`}
              className="w-full h-auto mb-4"
              crossOrigin="anonymous"
            />
          )}

          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-wide">ACCOUNT STATEMENT</h1>
              <p className="text-sm text-gray-600 mt-1">Report for {statement.period.label}</p>
            </div>
            <div className="text-right text-xs text-gray-500">
              <p>Generated {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className="mb-4 border border-gray-300 px-3 py-2">
            <p className="text-xs font-semibold text-gray-500 mb-1">CUSTOMER</p>
            <p className="font-semibold text-gray-900">{getCustomerDisplayName(statement.customer)}</p>
            {statement.customer.email && <p className="text-gray-700">{statement.customer.email}</p>}
            {statement.customer.phone && <p className="text-gray-700">{statement.customer.phone}</p>}
            {statement.customer.address && <p className="text-gray-700">{statement.customer.address}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="border border-gray-300 px-3 py-2">
              <p className="text-xs text-gray-500">Opening Balance</p>
              <p className="text-lg font-bold text-gray-900">KES {formatAmount(statement.opening_balance)}</p>
            </div>
            <div className="border border-gray-300 px-3 py-2">
              <p className="text-xs text-gray-500">Closing Balance</p>
              <p className="text-lg font-bold text-gray-900">KES {formatAmount(statement.closing_balance)}</p>
            </div>
          </div>

          {sections.map((section) => (
            <div key={section.title} className="mb-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">{section.title}</h3>
              {section.rows.length === 0 ? (
                <p className="text-xs text-gray-400 italic">None this period</p>
              ) : (
                <table className="w-full border border-gray-300 border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 text-left px-2 py-1.5 font-semibold text-gray-700 w-28">Date</th>
                      <th className="border border-gray-300 text-left px-2 py-1.5 font-semibold text-gray-700">Reference</th>
                      <th className="border border-gray-300 text-right px-2 py-1.5 font-semibold text-gray-700 w-32">Amount (KES)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.rows.map((row, i) => (
                      <tr key={i}>
                        <td className="border border-gray-300 px-2 py-1.5 text-gray-900">{new Date(row.date).toLocaleDateString()}</td>
                        <td className="border border-gray-300 px-2 py-1.5 text-gray-900">{row.reference}</td>
                        <td className="border border-gray-300 text-right px-2 py-1.5 text-gray-900">{formatAmount(row.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50">
                      <td colSpan={2} className="border border-gray-300 px-2 py-1.5 text-right font-semibold text-gray-700">Total</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right font-semibold text-gray-900">{formatAmount(section.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
