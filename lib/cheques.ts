import apiCall from "@/lib/api"

export type ChequeStatus = "pending" | "approved" | "bounced" | "cancelled"

export interface Cheque {
  id: string
  company_id: string
  customer_id: string
  invoice_id: string | null
  payment_id: string | null
  cheque_number: string
  bank_name: string
  amount: string | number
  issue_date: string
  maturity_date: string
  status: ChequeStatus
  notes: string | null
  attachment_path: string | null
  attachment_url: string | null
  created_by: string | null
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
  customer?: { id: string; name: string; business_name?: string | null; customer_type?: "individual" | "company" | null }
  invoice?: { id: string; invoice_number: string }
}

export interface CreateChequeRequest {
  invoice_id: string
  cheque_number: string
  bank_name: string
  amount: number
  issue_date: string
  maturity_date: string
  notes?: string
  attachment?: File | null
}

export interface ChequeFilters {
  status?: ChequeStatus
  customer_id?: string
  invoice_id?: string
}

export async function fetchCheques(filters?: ChequeFilters): Promise<Cheque[]> {
  const params = new URLSearchParams()
  if (filters?.status) params.append("status", filters.status)
  if (filters?.customer_id) params.append("customer_id", filters.customer_id)
  if (filters?.invoice_id) params.append("invoice_id", filters.invoice_id)
  const query = params.toString() ? `?${params.toString()}` : ""

  const response = await apiCall<{ data: Cheque[] }>(`/cheques${query}`, "GET", undefined, true)
  return response.data
}

export async function createCheque(data: CreateChequeRequest): Promise<Cheque> {
  const { attachment, ...fields } = data
  const formData = new FormData()
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value))
    }
  })
  if (attachment) {
    formData.append("attachment", attachment)
  }

  const response = await apiCall<{ message: string; data: Cheque }>("/cheques", "POST", formData, true)
  return response.data
}

export async function approveCheque(id: string): Promise<Cheque> {
  const response = await apiCall<{ message: string; data: Cheque }>(`/cheques/${id}/approve`, "POST", undefined, true)
  return response.data
}

export async function bounceCheque(id: string): Promise<Cheque> {
  const response = await apiCall<{ message: string; data: Cheque }>(`/cheques/${id}/bounce`, "POST", undefined, true)
  return response.data
}

export async function cancelCheque(id: string): Promise<Cheque> {
  const response = await apiCall<{ message: string; data: Cheque }>(`/cheques/${id}/cancel`, "POST", undefined, true)
  return response.data
}

export function getChequeStatusColor(status: ChequeStatus): string {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800"
    case "approved":
      return "bg-green-100 text-green-800"
    case "bounced":
      return "bg-red-100 text-red-800"
    case "cancelled":
      return "bg-gray-100 text-gray-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}
