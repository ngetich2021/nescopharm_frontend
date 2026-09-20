"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { User, Plus, Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import type { Customer } from "@/lib/customers"
import { getCustomers, createCustomer, getCustomerDisplayName } from "@/lib/customers"
import { usePermissions } from "@/hooks/use-permissions"

interface CustomerSelectorProps {
  selectedCustomer: Customer | null
  onCustomerSelect: (customer: Customer | null) => void
}

export function CustomerSelector({ selectedCustomer, onCustomerSelect }: CustomerSelectorProps) {
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const { toast } = useToast()
  const { companyId } = useAuth()
  const { hasPermission } = usePermissions()
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
  })

  // Check if user has permission to view customers
  const canViewCustomers = hasPermission("can_view_customers")

  // Load customers when component mounts or modal opens
  useEffect(() => {
    if (showCustomerModal && canViewCustomers) {
      loadCustomers()
    }
  }, [showCustomerModal, canViewCustomers])

  const loadCustomers = async () => {
    try {
      setIsLoading(true)
      const fetchedCustomers = await getCustomers()
      setCustomers(fetchedCustomers)
    } catch (error) {
      console.error("Failed to load customers:", error)
      toast({
        title: "Error",
        description: "Failed to load customers",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filteredCustomers = customers.filter(
    (customer: Customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.includes(searchTerm),
  )

  const handleCustomerSelect = (customer: Customer) => {
    onCustomerSelect(customer)
    setShowCustomerModal(false)
  }

  const handleCreateCustomer = async () => {
    if (!newCustomer.name.trim()) {
      toast({
        title: "Error",
        description: "Customer name is required",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)
    try {
      // Prepare customer data without company_id - it will be handled by the backend
      const customerData = {
        name: newCustomer.name,
        email: newCustomer.email || null,
        phone: newCustomer.phone || null,
        address: null,
        city: null,
        state: null,
        country: null,
        postal_code: null,
        company: null,
        preferred_communication_channel: null,
        last_contact_date: null,
        customer_type: null,
        // These fields are no longer collected via form, assuming backend handles defaults or they are not required
        first_name: newCustomer.name.split(" ")[0] || "", // Derive first_name from name
        last_name: newCustomer.name.split(" ").slice(1).join(" ") || "", // Derive last_name from name
        tags: [],
        notes: null,
        // company_id is intentionally omitted - will be handled by the backend
      };

      const customer = await createCustomer(customerData as any)

      // Add the new customer to the list and select it
      setCustomers(prev => [customer, ...prev])
      onCustomerSelect(customer)
      setNewCustomer({ name: "", email: "", phone: "" })
      setShowNewCustomerModal(false)
      
      toast({
        title: "Success",
        description: "Customer created successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create customer",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const walkInCustomer: Customer = {
    id: "walk-in",
    name: "Walk-in Customer",
    email: null,
    phone: null,
    address: null,
    city: null,
    state: null,
    country: null,
    postal_code: null,
    status: "active",
    company: null,
    notes: null,
    tags: [],
    preferred_communication_channel: null,
    last_contact_date: null,
    customer_type: null,
    total_spend: "0",
    total_orders: 0,
    loyalty_points: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    company_id: "", // Set to empty string instead of conditional value
    first_name: "Walk-in",
    last_name: "Customer",
  }

  // If user doesn't have permission to view customers, show a message
  if (!canViewCustomers) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <User className="h-4 w-4" />
            Customer
          </h3>
        </div>
        <div className="p-3 bg-gray-100 rounded-lg border border-gray-200">
          <p className="text-gray-500 text-sm">You don't have permission to view customers</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <User className="h-4 w-4" />
          Customer
        </h3>
      </div>

      {selectedCustomer ? (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{getCustomerDisplayName(selectedCustomer)}</p>
              {selectedCustomer.email && <p className="text-sm text-gray-600">{selectedCustomer.email}</p>}
              {selectedCustomer.phone && <p className="text-sm text-gray-600">{selectedCustomer.phone}</p>}
            </div>
            <Button variant="outline" size="sm" onClick={() => onCustomerSelect(null)}>
              Change
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Dialog open={showCustomerModal} onOpenChange={setShowCustomerModal}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full justify-start bg-transparent">
                <Search className="h-4 w-4 mr-2" />
                Select Customer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Select Customer</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-transparent"
                    onClick={() => handleCustomerSelect(walkInCustomer)}
                  >
                    Walk-in Customer
                  </Button>

                  {isLoading ? (
                    <div className="text-center py-4">Loading customers...</div>
                  ) : (
                    filteredCustomers.map((customer: Customer) => (
                      <Button
                        key={customer.id}
                        variant="outline"
                        className="w-full justify-start bg-transparent"
                        onClick={() => handleCustomerSelect(customer)}
                      >
                        <div className="text-left">
                          <p className="font-medium">{getCustomerDisplayName(customer)}</p>
                          {customer.email && <p className="text-xs text-gray-500">{customer.email}</p>}
                        </div>
                      </Button>
                    ))
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showNewCustomerModal} onOpenChange={setShowNewCustomerModal}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full justify-start bg-transparent">
                <Plus className="h-4 w-4 mr-2" />
                New Customer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Customer</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Customer name"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="customer@example.com"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="+1234567890"
                  />
                </div>

                <Button 
                  onClick={handleCreateCustomer} 
                  className="w-full" 
                  disabled={!newCustomer.name.trim() || isCreating}
                >
                  {isCreating ? "Creating..." : "Add Customer"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  )
}