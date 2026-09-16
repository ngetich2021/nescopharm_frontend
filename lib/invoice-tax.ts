export type InvoiceTaxCode = "A" | "B" | "C" | "D" | "E"

export const INVOICE_TAX_OPTIONS: ReadonlyArray<{
  code: InvoiceTaxCode
  label: string
  rate: number
}> = [
  { code: "A", label: "Exempt", rate: 0 },
  { code: "B", label: "VAT 16%", rate: 16 },
  { code: "C", label: "Zero-rated", rate: 0 },
  { code: "D", label: "Non-VAT", rate: 0 },
  { code: "E", label: "VAT 8%", rate: 8 },
]

export function invoiceTaxRate(code?: InvoiceTaxCode | null): number {
  return INVOICE_TAX_OPTIONS.find((option) => option.code === code)?.rate ?? 0
}

export function invoiceTaxCodeFromRate(rate: number | string | null | undefined): InvoiceTaxCode {
  const parsedRate = Number(rate)
  if (parsedRate === 16) return "B"
  if (parsedRate === 8) return "E"
  return "D"
}

export function invoiceTaxCodeForProduct(product: {
  is_taxable?: boolean | null
  tax_rate?: number | string | null
}): InvoiceTaxCode {
  if (product.is_taxable === false) return "D"

  const hasConfiguredRate = product.tax_rate !== null && product.tax_rate !== undefined
  const rate = Number(product.tax_rate)
  if (hasConfiguredRate && rate === 0) return "C"
  if (rate === 8) return "E"
  return "B"
}
