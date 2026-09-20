"use client"

import { useState, useEffect, use, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { getCustomerProfile, CustomerProfileData } from "@/lib/customers"
import { getCustomerAccount, CustomerAccountWithDetails } from "@/lib/customer-accounts"
import { getCompany, Company } from "@/lib/company"
import { ArrowLeft, Download, Printer } from "lucide-react"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// The customer profile response includes several Credit Appraisal Form fields
// that aren't yet part of the shared `CustomerProfileData` type (confirmed live
// on the backend via tinker). Extend locally rather than editing the shared
// lib/customers.ts type, to avoid colliding with the parallel customer-creation
// and customer-approval work touching that area.
type CustomerProfileWithCreditFields = CustomerProfileData & {
  trading_name?: string | null
  business_type?: string | null
  registration_number?: string | null
  ppb_license_number?: string | null
  website?: string | null
  telephone?: string | null
  region?: string | null
  county?: string | null
  accounts_contact_name?: string | null
  accounts_contact_designation?: string | null
  accounts_contact_phone?: string | null
  accounts_contact_email?: string | null
  approval_status?: string | null
}

// Same rationale as above: `credit_period_pd_cheque_days` and bank account
// holder name are confirmed live fields not yet reflected in the shared type.
type CustomerAccountWithCreditFields = Omit<CustomerAccountWithDetails, "bank_details"> & {
  credit_period_pd_cheque_days?: string | number | null
  bank_details: (CustomerAccountWithDetails["bank_details"][number] & {
    account_name?: string | null
  })[]
}

// Approval statuses that mean "Stage 1 has not yet cleared" (or no application
// exists at all yet) — the document must not be shown for these.
const GATED_STATUSES = new Set(["pending_stage1", "draft", "", null, undefined])

export default function CreditAppraisalFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const formRef = useRef<HTMLDivElement>(null)
  const [customer, setCustomer] = useState<CustomerProfileWithCreditFields | null>(null)
  const [account, setAccount] = useState<CustomerAccountWithCreditFields | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const getData = async () => {
      try {
        const fetchedCustomer = (await getCustomerProfile(id)) as CustomerProfileWithCreditFields | null
        if (!fetchedCustomer) {
          setError("Customer not found")
          return
        }
        setCustomer(fetchedCustomer)

        if (fetchedCustomer.company_id) {
          try {
            const companyData = await getCompany(fetchedCustomer.company_id)
            setCompany(companyData)
          } catch (err) {
            console.error('Failed to fetch company:', err)
          }
        }

        if (fetchedCustomer.account_id) {
          try {
            const accountData = await getCustomerAccount(fetchedCustomer.account_id)
            setAccount(accountData as CustomerAccountWithCreditFields | null)
          } catch (err) {
            console.error('Failed to fetch customer account:', err)
          }
        }
      } catch (err: any) {
        setError(err.message || "Failed to load customer")
      } finally {
        setIsLoading(false)
      }
    }

    getData()
  }, [id])

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = async () => {
    if (!formRef.current || !customer) return

    setIsDownloading(true)

    try {
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')

      const element = formRef.current

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      })

      const imgData = canvas.toDataURL('image/png')

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
      const nameForFile = customer.business_name || customer.name || 'Customer'
      pdf.save(`Credit-Appraisal-Form-${nameForFile}.pdf`)

      toast({
        title: "Success",
        description: "Credit Appraisal Form PDF downloaded successfully",
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 p-6 rounded-lg">
          <h2 className="text-lg font-semibold text-red-800">Error Loading Customer</h2>
          <p className="mt-2 text-red-600">{error || "Customer not found"}</p>
          <Button variant="outline" onClick={() => router.back()} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  // Gate: only reachable once Stage 1 approval has cleared. Anything still at
  // pending_stage1 / draft / unset implies no application has progressed far
  // enough yet for this document to be meaningful.
  const status = customer.approval_status ?? undefined
  const isGated = GATED_STATUSES.has(status as any)

  if (isGated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="max-w-lg w-full p-8 text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Credit Appraisal Form Not Yet Available</h2>
          <p className="text-sm text-gray-600 mb-6">
            This document becomes available once the customer&apos;s application has cleared Stage 1 approval.
            {status ? ` Current status: ${status.replace(/_/g, ' ')}.` : ' No application has been started for this customer yet.'}
          </p>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </Card>
      </div>
    )
  }

  const displayName = customer.business_name || customer.name

  const formatMoney = (amount: string | number | undefined | null): string => {
    if (amount === undefined || amount === null || amount === '') return '—'
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    if (isNaN(num)) return '—'
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const field = (value: string | number | null | undefined) =>
    value === null || value === undefined || value === '' ? '—' : value

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
            </div>
          </div>
        </div>
      </div>

      {/* Credit Appraisal Form Document */}
      <div className="container mx-auto px-4 py-8 print:p-0 print:m-0 print:max-w-none">
        <Card
          ref={formRef}
          className="max-w-4xl mx-auto bg-white p-8 md:p-12 shadow-lg print:shadow-none print:max-w-none print:m-0 print:p-8 print:border-0"
        >
          {/* Letterhead Banner - the sole source of company identity/contact info on this document */}
          {company?.letterhead_url && (
            <img
              src={company.letterhead_url}
              alt={`${company?.name || 'Company'} letterhead`}
              className="w-full h-auto mb-8"
              crossOrigin="anonymous"
            />
          )}

          {/* Title */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900">CREDIT APPRAISAL FORM</h1>
            <p className="text-sm text-gray-600 mt-1">{displayName}</p>
          </div>

          {/* Company Details */}
          <section className="mb-8">
            <h2 className="text-sm font-bold text-gray-800 border-b-2 border-gray-300 pb-2 mb-3">COMPANY DETAILS</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div><span className="text-gray-600">Business Name:</span> <span className="text-gray-900 font-medium">{field(customer.business_name)}</span></div>
              <div><span className="text-gray-600">Trading Name:</span> <span className="text-gray-900 font-medium">{field(customer.trading_name)}</span></div>
              <div><span className="text-gray-600">Business Type:</span> <span className="text-gray-900 font-medium">{field(customer.business_type)}</span></div>
              <div><span className="text-gray-600">Registration Number:</span> <span className="text-gray-900 font-medium">{field(customer.registration_number)}</span></div>
              <div><span className="text-gray-600">PPB License Number:</span> <span className="text-gray-900 font-medium">{field(customer.ppb_license_number)}</span></div>
              <div><span className="text-gray-600">Website:</span> <span className="text-gray-900 font-medium">{field(customer.website)}</span></div>
              <div><span className="text-gray-600">Telephone:</span> <span className="text-gray-900 font-medium">{field(customer.telephone)}</span></div>
              <div><span className="text-gray-600">Country:</span> <span className="text-gray-900 font-medium">{field(customer.country)}</span></div>
              <div><span className="text-gray-600">Region:</span> <span className="text-gray-900 font-medium">{field(customer.region)}</span></div>
              <div><span className="text-gray-600">County:</span> <span className="text-gray-900 font-medium">{field(customer.county)}</span></div>
              <div><span className="text-gray-600">City:</span> <span className="text-gray-900 font-medium">{field(customer.city)}</span></div>
              <div className="col-span-2"><span className="text-gray-600">Address:</span> <span className="text-gray-900 font-medium">{field(customer.address)}</span></div>
            </div>
          </section>

          {/* Contact Persons */}
          <section className="mb-8">
            <h2 className="text-sm font-bold text-gray-800 border-b-2 border-gray-300 pb-2 mb-3">CONTACT PERSONS</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <div>
                <p className="font-semibold text-gray-700 mb-1">Primary Contact</p>
                <p><span className="text-gray-600">Name:</span> {field(customer.contact_person_name)}</p>
                <p><span className="text-gray-600">Phone:</span> {field(customer.contact_person_phone)}</p>
                <p><span className="text-gray-600">Email:</span> {field(customer.contact_person_email)}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700 mb-1">Accounts Contact</p>
                <p><span className="text-gray-600">Name:</span> {field(customer.accounts_contact_name)}</p>
                <p><span className="text-gray-600">Designation:</span> {field(customer.accounts_contact_designation)}</p>
                <p><span className="text-gray-600">Phone:</span> {field(customer.accounts_contact_phone)}</p>
                <p><span className="text-gray-600">Email:</span> {field(customer.accounts_contact_email)}</p>
              </div>
            </div>
          </section>

          {/* Directors / Business Owners */}
          <section className="mb-8">
            <h2 className="text-sm font-bold text-gray-800 border-b-2 border-gray-300 pb-2 mb-3">DIRECTORS / BUSINESS OWNERS</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-2 font-semibold text-gray-700">Name</th>
                  <th className="text-left py-2 font-semibold text-gray-700">ID/Passport No.</th>
                  <th className="text-left py-2 font-semibold text-gray-700">PIN</th>
                  <th className="text-left py-2 font-semibold text-gray-700">Phone Number</th>
                </tr>
              </thead>
              <tbody>
                {account?.directors && account.directors.length > 0 ? (
                  account.directors.map((director) => (
                    <tr key={director.id} className="border-b border-gray-200">
                      <td className="py-2 text-gray-900">{field(director.name)}</td>
                      <td className="py-2 text-gray-900">{field(director.id_passport_number)}</td>
                      <td className="py-2 text-gray-900">{field(director.pin)}</td>
                      <td className="py-2 text-gray-900">{field(director.phone_number)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-3 text-gray-500 text-center">No directors on record</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          {/* Trade References */}
          <section className="mb-8">
            <h2 className="text-sm font-bold text-gray-800 border-b-2 border-gray-300 pb-2 mb-3">TRADE REFERENCES</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-2 font-semibold text-gray-700">Supplier Name</th>
                  <th className="text-left py-2 font-semibold text-gray-700">Contact Person</th>
                  <th className="text-left py-2 font-semibold text-gray-700">Phone Number</th>
                  <th className="text-right py-2 font-semibold text-gray-700">Credit Limit</th>
                </tr>
              </thead>
              <tbody>
                {account?.suppliers && account.suppliers.length > 0 ? (
                  account.suppliers.map((supplier) => (
                    <tr key={supplier.id} className="border-b border-gray-200">
                      <td className="py-2 text-gray-900">{field(supplier.name)}</td>
                      <td className="py-2 text-gray-900">{field(supplier.contact_person_name)}</td>
                      <td className="py-2 text-gray-900">{field(supplier.phone_number)}</td>
                      <td className="py-2 text-gray-900 text-right">{formatMoney(supplier.credit_limit)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-3 text-gray-500 text-center">No trade references on record</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          {/* Bank Details */}
          <section className="mb-8">
            <h2 className="text-sm font-bold text-gray-800 border-b-2 border-gray-300 pb-2 mb-3">BANK DETAILS</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-2 font-semibold text-gray-700">Account Name</th>
                  <th className="text-left py-2 font-semibold text-gray-700">Bank Name</th>
                  <th className="text-left py-2 font-semibold text-gray-700">Branch</th>
                  <th className="text-left py-2 font-semibold text-gray-700">Account Number</th>
                </tr>
              </thead>
              <tbody>
                {account?.bank_details && account.bank_details.length > 0 ? (
                  account.bank_details.map((bank) => (
                    <tr key={bank.id} className="border-b border-gray-200">
                      <td className="py-2 text-gray-900">{field(bank.account_name)}</td>
                      <td className="py-2 text-gray-900">{field(bank.bank_name)}</td>
                      <td className="py-2 text-gray-900">{field(bank.branch)}</td>
                      <td className="py-2 text-gray-900">{field(bank.account_number)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-3 text-gray-500 text-center">No bank details on record</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          {/* Credit Terms */}
          <section className="mb-8">
            <h2 className="text-sm font-bold text-gray-800 border-b-2 border-gray-300 pb-2 mb-3">CREDIT TERMS</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div><span className="text-gray-600">Annual Turnover:</span> <span className="text-gray-900 font-medium">{formatMoney(account?.annual_turnover)}</span></div>
              <div><span className="text-gray-600">Credit Required:</span> <span className="text-gray-900 font-medium">{formatMoney(account?.credit_required)}</span></div>
              <div><span className="text-gray-600">Credit Period Required:</span> <span className="text-gray-900 font-medium">{field(account?.credit_period_required)}</span></div>
              <div><span className="text-gray-600">PD Cheque Days:</span> <span className="text-gray-900 font-medium">{field(account?.credit_period_pd_cheque_days)}</span></div>
              <div><span className="text-gray-600">Credit Days:</span> <span className="text-gray-900 font-medium">{field(account?.credit_days)}</span></div>
              <div className="col-span-2"><span className="text-gray-600">Credit Terms:</span> <span className="text-gray-900 font-medium">{field(account?.credit_terms)}</span></div>
            </div>
          </section>

          {/* Declaration - printed blank for physical hand-signing */}
          <section className="mb-8 pt-4 border-t border-gray-300">
            <h2 className="text-sm font-bold text-gray-800 mb-4">DECLARATION</h2>
            <p className="text-xs text-gray-600 mb-6">
              I/We confirm that the information provided in this form is true and accurate to the best of my/our knowledge.
            </p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-8 text-sm">
              <div>
                <div className="border-b border-gray-400 h-8" />
                <p className="text-xs text-gray-600 mt-1">Director Name</p>
              </div>
              <div>
                <div className="border-b border-gray-400 h-8" />
                <p className="text-xs text-gray-600 mt-1">Designation</p>
              </div>
              <div>
                <div className="border-b border-gray-400 h-8" />
                <p className="text-xs text-gray-600 mt-1">Signature</p>
              </div>
              <div>
                <div className="border-b border-gray-400 h-8" />
                <p className="text-xs text-gray-600 mt-1">Date</p>
              </div>
            </div>
          </section>

          {/* For Official Use - printed blank for internal stamping */}
          <section className="pt-4 border-t border-gray-300">
            <h2 className="text-sm font-bold text-gray-800 mb-4">FOR OFFICIAL USE ONLY</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-8 text-sm">
              <div>
                <div className="border-b border-gray-400 h-8" />
                <p className="text-xs text-gray-600 mt-1">Reviewed By</p>
              </div>
              <div>
                <div className="border-b border-gray-400 h-8" />
                <p className="text-xs text-gray-600 mt-1">Approved Credit Limit</p>
              </div>
              <div>
                <div className="border-b border-gray-400 h-8" />
                <p className="text-xs text-gray-600 mt-1">Approved Credit Days</p>
              </div>
              <div>
                <div className="border-b border-gray-400 h-8" />
                <p className="text-xs text-gray-600 mt-1">Date / Stamp</p>
              </div>
            </div>
          </section>
        </Card>
      </div>
    </div>
  )
}
