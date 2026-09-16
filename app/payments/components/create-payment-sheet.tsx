"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { createPayment, getOrders, PaymentOrder } from "@/lib/payments"
import { getCustomers, Customer } from "@/lib/customers"
import { Loader2 } from "lucide-react"

interface CreatePaymentSheetProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onPaymentCreated: () => void
}

export function CreatePaymentSheet({ isOpen, onOpenChange, onPaymentCreated }: CreatePaymentSheetProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    customer_id: "",
    order_id: "",
    amount_paid: "",
    payment_method: "M-Pesa",
    transaction_id: "",
    status: "completed",
    currency: "KES",
  })

  const [customers, setCustomers] = useState<Customer[]>([])
  const [orders, setOrders] = useState<PaymentOrder[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [customerSearch, setCustomerSearch] = useState("");

  // Load customers and orders when the sheet is opened
  useEffect(() => {
    if (isOpen) {
      console.log('Payment sheet opened, fetching customers and orders...')
      fetchCustomers()
      fetchOrders()
    }
  }, [isOpen])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const fetchCustomers = async () => {
    setLoadingCustomers(true)
    try {
      const data = await getCustomers()
      console.log('Fetched customers for payments:', data)
      setCustomers(data || [])
    } catch (error: any) {
      console.error('Error fetching customers for payments:', error)
      toast({
        title: "Error",
        description: `Failed to load customers: ${error.message || 'Please try again.'}`,
        variant: "destructive",
      })
      // Set empty array on error to prevent undefined issues
      setCustomers([])
    } finally {
      setLoadingCustomers(false)
    }
  }

  const fetchOrders = async () => {
    setLoadingOrders(true)
    try {
      const data = await getOrders()
      console.log('Fetched orders for payments:', data)
      setOrders(data || [])
    } catch (error: any) {
      console.error('Error fetching orders for payments:', error)
      toast({
        title: "Error",
        description: `Failed to load orders: ${error.message || 'Please try again.'}`,
        variant: "destructive",
      })
      // Set empty array on error to prevent undefined issues
      setOrders([])
    } finally {
      setLoadingOrders(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Create payment payload - only include order_id if it's provided
      const payloadData: any = {
        amount_paid: Number(formData.amount_paid),
        payment_method: formData.payment_method,
        status: formData.status,
      }

      // Only include customer_id if it's provided and not empty
      if (formData.customer_id && formData.customer_id.trim() !== '') {
        payloadData.customer_id = formData.customer_id
      }

      // Only include order_id if it's provided and not empty
      if (formData.order_id && formData.order_id.trim() !== '') {
        payloadData.order_id = formData.order_id
      }

      // Only include transaction_id if it's provided and not empty
      if (formData.transaction_id && formData.transaction_id.trim() !== '') {
        payloadData.transaction_id = formData.transaction_id
      }

      console.log('Payment payload being sent:', payloadData)
      await createPayment(payloadData)

      toast({
        title: "Success",
        description: "Payment created successfully",
      })

      onPaymentCreated()
      onOpenChange(false)

      // Reset form
      setFormData({
        customer_id: "",
        order_id: "",
        amount_paid: "",
        payment_method: "M-Pesa",
        transaction_id: "",
        status: "completed",
        currency: "KES",
      })
    } catch (error: any) {
      console.error('Payment creation error:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to create payment",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add New Payment</SheetTitle>
          <SheetDescription>Record a new payment transaction. Fill in the details below.</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="customer_id">Customer (Optional)</Label>
            <Select
              value={formData.customer_id}
              onValueChange={(value) => handleSelectChange("customer_id", value)}
              onOpenChange={(open) => {
                if (open && customers.length === 0 && !loadingCustomers) {
                  console.log('Customer select opened, fetching customers...')
                  fetchCustomers()
                }
                setCustomerSearch("");
              }}
              required={false}
            >
              <SelectTrigger>
                <SelectValue placeholder="Search or select a customer (optional)" />
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 py-2">
                  <Input
                    placeholder="Type to search by name, email, or phone"
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                {loadingCustomers ? (
                  <SelectItem value="loading" disabled>
                    Loading customers...
                  </SelectItem>
                ) : customers.length > 0 ? (
                  customers
                    .filter((customer) => {
                      const search = customerSearch.toLowerCase();
                      return (
                        (customer.name?.toLowerCase() || "").includes(search) ||
                        (customer.email?.toLowerCase() || "").includes(search) ||
                        (customer.phone?.toLowerCase() || "").includes(search)
                      );
                    })
                    .map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} {customer.phone ? `(${customer.phone})` : ""} {customer.email ? `- ${customer.email}` : ""}
                      </SelectItem>
                    ))
                ) : (
                  <SelectItem value="none" disabled>
                    No customers found
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="order_id">Order (Optional)</Label>
            <Select
              value={formData.order_id}
              onValueChange={(value) => handleSelectChange("order_id", value)}
              onOpenChange={(open) => {
                if (open && orders.length === 0 && !loadingOrders) {
                  console.log('Orders select opened, fetching orders...')
                  fetchOrders()
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an order" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {loadingOrders ? (
                  <SelectItem value="loading" disabled>
                    Loading orders...
                  </SelectItem>
                ) : orders && orders.length > 0 ? (
                  orders.map((order) => (
                    <SelectItem key={order.id} value={order.id}>
                      {order.order_number ? `#${order.order_number}` : 'Order'} - {order.total_amount ? `Ksh ${parseFloat(order.total_amount).toLocaleString()}` : ''}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    No orders available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount_paid">Amount</Label>
              <Input
                id="amount_paid"
                name="amount_paid"
                type="number"
                step="0.01"
                value={formData.amount_paid}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={formData.currency} onValueChange={(value) => handleSelectChange("currency", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KES">Ksh (KES)</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_method">Payment Method</Label>
            <Select
              value={formData.payment_method}
              onValueChange={(value) => handleSelectChange("payment_method", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                <SelectItem value="Cheque">Cheque</SelectItem>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Credit Card">Credit Card</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transaction_id">Transaction ID / Reference (Optional)</Label>
            <Input
              id="transaction_id"
              name="transaction_id"
              type="text"
              value={formData.transaction_id}
              onChange={handleChange}
              placeholder="Enter transaction ID or reference number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => handleSelectChange("status", value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <SheetFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" className="bg-[#E30040] hover:bg-[#E30040]/90" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Payment"
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
