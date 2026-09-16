"use client"

import { InvoicesTable } from "./invoices-table"
import { useState, useEffect } from "react"
import { fetchInvoices } from "@/lib/invoices"
import { useDataCache } from "@/lib/data-cache"

export default function InvoicesPage() {
  // Use the data cache hook for invoices
  const { 
    data: invoicesResponse,
    isLoading: isLoadingInvoices,
    refetch: refreshInvoices
  } = useDataCache<{ data: import('@/lib/invoices').Invoice[], meta?: any }>(
    'invoices', 
    fetchInvoices,
    {
      expirationMs: 5 * 60 * 1000 // 5 minutes cache
    }
  )

  const invoices = invoicesResponse?.data || [];

  return (
    <div className="flex-1 space-y-6 p-2 sm:p-4 md:p-8 pt-4 sm:pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Invoices</h1>
      </div>

      {/* Invoices Table */}
      <InvoicesTable initialInvoices={invoices} />
    </div>
  )
}