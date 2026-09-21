import apiCall from "./api"

export interface StatementInvoice {
  id: string
  invoice_number: string
  invoice_date: string
  total_amount: string | number
  balance_amount: string | number
}

export interface StatementPayment {
  id: string
  transaction_id: string | null
  payment_date: string
  amount_paid: string | number
  payment_method: string | null
}

export interface StatementCreditNote {
  id: string
  credit_note_number: string
  credit_note_date: string
  total_amount: string | number
}

export interface StatementCheque {
  id: string
  cheque_number: string
  bank_name: string
  issue_date: string
  maturity_date: string
  amount: string | number
  status: string
}

export interface CustomerStatement {
  customer: {
    id: string
    name: string
    business_name?: string | null
    customer_type?: "individual" | "company" | null
    email?: string | null
    phone?: string | null
    address?: string | null
  }
  company: {
    id: string
    name: string
    logo_url: string | null
    letterhead_url: string | null
  } | null
  period: {
    from: string
    to: string
    label: string
  }
  opening_balance: number
  closing_balance: number
  invoices: StatementInvoice[]
  payments: StatementPayment[]
  credit_notes: StatementCreditNote[]
  pd_cheques: StatementCheque[]
  summary: {
    invoices_count: number
    invoices_total: number
    payments_count: number
    payments_total: number
    credit_notes_count: number
    credit_notes_total: number
    pd_cheques_count: number
    pd_cheques_total: number
  }
}

export async function fetchCustomerStatement(
  customerId: string,
  filters?: { date_from?: string; date_to?: string }
): Promise<CustomerStatement> {
  const params = new URLSearchParams()
  if (filters?.date_from) params.append("date_from", filters.date_from)
  if (filters?.date_to) params.append("date_to", filters.date_to)
  const query = params.toString() ? `?${params.toString()}` : ""

  const response = await apiCall<{ status: string; data: CustomerStatement }>(
    `/customers/${customerId}/statement${query}`,
    "GET",
    undefined,
    true
  )
  return response.data
}
