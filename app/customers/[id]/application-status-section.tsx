"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { usePermissions } from "@/hooks/use-permissions"
import {
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Upload,
  Printer,
  ExternalLink,
  Loader2,
  ShieldAlert,
  History,
} from "lucide-react"
import {
  type CustomerApproval,
  getCustomerApprovals,
  submitCustomerApproval,
  uploadSignedCreditApplication,
  fetchCustomerCreditTerms,
  type CustomerCreditTerms,
} from "@/lib/customers"
import { getDocuments, type Document as CustomerDocument } from "@/lib/documents"

interface ApplicationStatusSectionProps {
  customerId: string
  /** The customer's current approval_status (undefined/null for customers not in the workflow). */
  approvalStatus: string | null | undefined
  /** Re-fetches the customer profile (and therefore approval_status) from the parent. */
  onRefresh: () => void | Promise<void>
}

const STATUS_META: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-800" },
  pending_stage1: { label: "Pending Stage 1 Review", className: "bg-yellow-100 text-yellow-800" },
  pending_documents: { label: "Awaiting Signed Documents", className: "bg-blue-100 text-blue-800" },
  pending_stage2: { label: "Pending Final Review", className: "bg-yellow-100 text-yellow-800" },
  approved: { label: "Approved", className: "bg-green-100 text-green-800" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-800" },
}

// Statuses that always belong to the rep-submitted credit-approval workflow,
// regardless of history. "approved"/"draft"/undefined are ambiguous - those
// are also the resting state for normal staff-created customers, so we only
// show the section for them when there's actual approval history proving
// they went through the workflow (checked in the component below).
const ALWAYS_SHOW_STATUSES = new Set(["pending_stage1", "pending_documents", "pending_stage2", "rejected"])

// Once Stage 1 is approved (pending_documents or later), the rep-facing
// print/download-for-stamping entry point becomes available. It must never
// appear before that.
const SHOW_PRINT_STATUSES = new Set(["pending_documents", "pending_stage2", "approved"])

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function fullName(person: { first_name: string; last_name: string } | null | undefined): string {
  if (!person) return "—"
  return `${person.first_name || ""} ${person.last_name || ""}`.trim() || "—"
}

function approvalTypeLabel(type: string): string {
  if (type === "stage1") return "Stage 1"
  if (type === "stage2") return "Stage 2 (Final)"
  return type
}

function formatKES(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "—"
  const num = Number(amount)
  return Number.isNaN(num) ? "—" : `KES ${num.toLocaleString()}`
}

export function ApplicationStatusSection({ customerId, approvalStatus: rawApprovalStatus, onRefresh }: ApplicationStatusSectionProps) {
  const { toast } = useToast()
  const { hasPermission } = usePermissions()
  const canApprove = hasPermission("can_approve_account")

  const [approvals, setApprovals] = useState<CustomerApproval[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)

  const [signedDocument, setSignedDocument] = useState<CustomerDocument | null>(null)
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true)

  const [creditTerms, setCreditTerms] = useState<CustomerCreditTerms | null>(null)

  const [notes, setNotes] = useState("")
  const [isSubmittingDecision, setIsSubmittingDecision] = useState<"approved" | "rejected" | null>(null)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const approvalStatus = rawApprovalStatus || "draft"

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoadingHistory(true)
      try {
        const data = await getCustomerApprovals(customerId)
        if (!cancelled) setApprovals(data)
      } catch {
        if (!cancelled) setApprovals([])
      } finally {
        if (!cancelled) setIsLoadingHistory(false)
      }
    }

    if (customerId) load()
    return () => {
      cancelled = true
    }
  }, [customerId, approvalStatus])

  // Only relevant once documents can exist (pending_documents or later), but
  // it's cheap enough to just always check so the Stage 2 approve button can
  // be gated the moment it's needed.
  useEffect(() => {
    let cancelled = false

    async function loadDocuments() {
      setIsLoadingDocuments(true)
      try {
        const docs = await getDocuments("Customer", customerId)
        if (cancelled) return
        const signed = docs.find((d) =>
          (d.document_name || "").toLowerCase().includes("signed credit application"),
        )
        setSignedDocument(signed || null)
      } catch {
        if (!cancelled) setSignedDocument(null)
      } finally {
        if (!cancelled) setIsLoadingDocuments(false)
      }
    }

    if (customerId) loadDocuments()
    return () => {
      cancelled = true
    }
  }, [customerId, approvalStatus])

  useEffect(() => {
    let cancelled = false

    async function loadTerms() {
      try {
        const terms = await fetchCustomerCreditTerms(customerId)
        if (!cancelled) setCreditTerms(terms)
      } catch {
        if (!cancelled) setCreditTerms(null)
      }
    }

    if (customerId && approvalStatus === "pending_stage2") loadTerms()
    return () => {
      cancelled = true
    }
  }, [customerId, approvalStatus])

  const hasWorkflowHistory = approvals.length > 0
  const shouldRender = ALWAYS_SHOW_STATUSES.has(approvalStatus) || hasWorkflowHistory

  if (!shouldRender) {
    return null
  }

  const meta = STATUS_META[approvalStatus] || {
    label: approvalStatus.charAt(0).toUpperCase() + approvalStatus.slice(1).replace(/_/g, " "),
    className: "bg-gray-100 text-gray-800",
  }

  const showPrintEntryPoint = SHOW_PRINT_STATUSES.has(approvalStatus)
  const canGiveDecision = canApprove && (approvalStatus === "pending_stage1" || approvalStatus === "pending_stage2")
  const isStage2 = approvalStatus === "pending_stage2"
  const stage2Blocked = isStage2 && !isLoadingDocuments && !signedDocument

  const latestRejection = [...approvals].reverse().find((a) => a.status === "rejected")

  async function handleDecision(status: "approved" | "rejected") {
    setIsSubmittingDecision(status)
    try {
      await submitCustomerApproval(customerId, { status, notes: notes.trim() || undefined })
      toast({
        title: status === "approved" ? "Approved" : "Rejected",
        description: `The application has been ${status} successfully.`,
      })
      setNotes("")
      await onRefresh()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to ${status === "approved" ? "approve" : "reject"} the application.`,
        variant: "destructive",
      })
    } finally {
      setIsSubmittingDecision(null)
    }
  }

  async function handleUpload() {
    if (!selectedFile) return
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "The signed application must be 5MB or smaller.",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    try {
      await uploadSignedCreditApplication(customerId, selectedFile)
      toast({
        title: "Uploaded",
        description: "Signed credit application uploaded. Moved to Stage 2 review.",
      })
      setSelectedFile(null)
      await onRefresh()
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload the signed application.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-5 w-5 text-primary" />
              Application Status
            </CardTitle>
            <CardDescription>Credit-approval workflow for this customer</CardDescription>
          </div>
          <Badge className={meta.className}>{meta.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Rejected banner */}
        {approvalStatus === "rejected" && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-2 text-red-800 font-medium">
              <XCircle className="h-4 w-4" />
              This application was rejected
            </div>
            {latestRejection && (
              <div className="mt-2 text-sm text-red-700 space-y-1">
                <p>
                  <span className="font-medium">By:</span> {fullName(latestRejection.approver)} on{" "}
                  {formatDateTime(latestRejection.approved_at || latestRejection.created_at)}
                </p>
                {latestRejection.notes && (
                  <p>
                    <span className="font-medium">Reason:</span> {latestRejection.notes}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Print / download for stamping - only from pending_documents onward, never before */}
        {showPrintEntryPoint && (
          <div className="flex items-center justify-between rounded-md border p-4 bg-muted/30">
            <div className="flex items-center gap-2 text-sm">
              <Printer className="h-4 w-4 text-muted-foreground" />
              <span>Print or download the credit application for the customer to sign and stamp.</span>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/customers/${customerId}/credit-form`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Print / Download
              </Link>
            </Button>
          </div>
        )}

        {/* Upload signed application - only while awaiting documents */}
        {approvalStatus === "pending_documents" && (
          <div className="rounded-md border p-4 space-y-3">
            <div className="flex items-center gap-2 font-medium text-sm">
              <Upload className="h-4 w-4" />
              Upload Signed Application
            </div>
            <p className="text-sm text-muted-foreground">
              Once the customer has signed and stamped the printed application, upload a scan or photo here
              (max 5MB) to move this application to Stage 2 review.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                disabled={isUploading}
                className="sm:max-w-sm"
              />
              <Button onClick={handleUpload} disabled={!selectedFile || isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
            </div>
            {selectedFile && (
              <p className="text-xs text-muted-foreground">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
              </p>
            )}
          </div>
        )}

        {/* Stage 2: what was captured/agreed, plus the signed document, before approving */}
        {isStage2 && (
          <div className="rounded-md border p-4 space-y-3">
            <div className="font-medium text-sm">Credit Terms Captured</div>
            {creditTerms ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Payment Method</p>
                  <p className="font-medium capitalize">{creditTerms.payment_method || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Requested Credit Limit</p>
                  <p className="font-medium">{formatKES(creditTerms.credit_required)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Credit Days</p>
                  <p className="font-medium">{creditTerms.credit_days ? `Net ${creditTerms.credit_days}` : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Terms</p>
                  <p className="font-medium">{creditTerms.credit_terms || "—"}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Loading credit terms…</p>
            )}

            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-1">Signed, Stamped Credit Application</p>
              {isLoadingDocuments ? (
                <p className="text-sm text-muted-foreground">Checking for uploaded document…</p>
              ) : signedDocument ? (
                <a
                  href={(signedDocument as any).url || signedDocument.document_image || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <FileText className="h-4 w-4" />
                  View signed document
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  No signed document found yet. Final approval is blocked until one is uploaded.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Approve / Reject controls */}
        {canGiveDecision && (
          <div className="rounded-md border p-4 space-y-3">
            <div className="font-medium text-sm">
              {isStage2 ? "Stage 2 - Final Decision" : "Stage 1 - Initial Decision"}
            </div>
            <div className="space-y-2">
              <Label htmlFor="approval-notes">Notes</Label>
              <Textarea
                id="approval-notes"
                placeholder="Optional notes explaining this decision"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                disabled={isSubmittingDecision !== null}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleDecision("approved")}
                disabled={isSubmittingDecision !== null || stage2Blocked}
                className="bg-green-600 hover:bg-green-700 text-white"
                title={stage2Blocked ? "Upload the signed, stamped credit application first." : undefined}
              >
                {isSubmittingDecision === "approved" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                {isStage2 ? "Give Final Approval" : "Approve"}
              </Button>
              <Button
                onClick={() => handleDecision("rejected")}
                disabled={isSubmittingDecision !== null}
                variant="destructive"
              >
                {isSubmittingDecision === "rejected" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Reject
              </Button>
            </div>
            {stage2Blocked && (
              <p className="text-xs text-amber-700">
                Final approval is disabled until the signed, stamped credit application is uploaded.
              </p>
            )}
          </div>
        )}

        {approvalStatus === "pending_stage1" && !canApprove && (
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            Awaiting Stage 1 review by an authorized approver.
          </p>
        )}
        {approvalStatus === "pending_stage2" && !canApprove && (
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            Awaiting final review by an authorized approver.
          </p>
        )}

        {/* Approval history */}
        <div className="space-y-2">
          <div className="font-medium text-sm">Approval History</div>
          {isLoadingHistory ? (
            <p className="text-sm text-muted-foreground">Loading history…</p>
          ) : approvals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No approval decisions recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {approvals.map((approval) => (
                <div key={approval.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="font-medium">{approvalTypeLabel(approval.approval_type)}</span>
                    <Badge className={STATUS_META[approval.status]?.className || "bg-gray-100 text-gray-800"}>
                      {approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {approval.status === "pending"
                      ? `Requested by ${fullName(approval.createdBy)} on ${formatDateTime(approval.created_at)}`
                      : `${fullName(approval.approver)} on ${formatDateTime(approval.approved_at || approval.created_at)}`}
                  </p>
                  {approval.notes && <p className="text-sm mt-1">{approval.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
