"use client"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { ShoppingCartIcon as CartIcon, Plus, Minus, Trash2, Package, Edit, Check, X } from "lucide-react"
import type { CartItem } from "./pos-interface"
import { Switch } from "@/components/ui/switch"
import { useState } from "react"
import { usePermissions } from "@/hooks/use-permissions"
import { useToast } from "@/hooks/use-toast"

interface ShoppingCartProps {
  items: CartItem[]
  onUpdateQuantity: (id: string, quantity: number) => void
  onUpdatePrice: (id: string, price: number) => void
  onRemoveItem: (id: string) => void
  onCheckout: () => void
  onClearCart: () => void
  taxEnabled: boolean
  setTaxEnabled: (enabled: boolean) => void
  taxRate: number
  setTaxRate: (rate: number) => void
}

export function ShoppingCart({ items, onUpdateQuantity, onUpdatePrice, onRemoveItem, onCheckout, onClearCart, taxEnabled, setTaxEnabled, taxRate, setTaxRate }: ShoppingCartProps) {
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null)
  const [tempPrice, setTempPrice] = useState<string>("")
  const { hasPermission } = usePermissions()
  const { toast } = useToast()
  
  // Check if user has permission to create orders
  const canCreateOrders = hasPermission("can_create_orders")

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const tax = taxEnabled ? subtotal * (taxRate / 100) : 0
  const total = subtotal + tax

  const handleQuantityChange = (id: string, value: string) => {
    // Check permission before allowing quantity changes
    if (!canCreateOrders) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to modify cart items",
        variant: "destructive"
      })
      return
    }
    
    const quantity = Number.parseInt(value) || 0
    onUpdateQuantity(id, quantity)
  }

  const handleEditPrice = (id: string, currentPrice: number) => {
    // Check permission before allowing price editing
    if (!canCreateOrders) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to modify item prices",
        variant: "destructive"
      })
      return
    }
    
    setEditingPriceId(id)
    setTempPrice(currentPrice.toString())
  }

  const handleSavePrice = (id: string) => {
    // Check permission before allowing price saving
    if (!canCreateOrders) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to modify item prices",
        variant: "destructive"
      })
      return
    }
    
    const price = parseFloat(tempPrice)
    if (!isNaN(price) && price >= 0) {
      onUpdatePrice(id, price)
    }
    setEditingPriceId(null)
    setTempPrice("")
  }

  const handleCancelEdit = () => {
    setEditingPriceId(null)
    setTempPrice("")
  }

  const handleRemoveItem = (id: string) => {
    // Check permission before allowing item removal
    if (!canCreateOrders) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to remove items from cart",
        variant: "destructive"
      })
      return
    }
    
    onRemoveItem(id)
  }

  const handleClearCart = () => {
    // Check permission before allowing cart clearing
    if (!canCreateOrders) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to clear the cart",
        variant: "destructive"
      })
      return
    }
    
    onClearCart()
  }

  const handleCheckout = () => {
    // Check permission before allowing checkout
    if (!canCreateOrders) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to create orders",
        variant: "destructive"
      })
      return
    }
    
    onCheckout()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <CartIcon className="h-5 w-5" />
          Cart ({items.length})
        </h2>
        {items.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleClearCart} disabled={!canCreateOrders}>
            Clear All
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Your cart is empty</p>
          <p className="text-sm text-gray-500">Add products to get started</p>
        </div>
      ) : (
        <>
          {/* Product List */}
          <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition group"
              >
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden mr-4">
                  {item.image ? (
                    <img
                      src={item.image || "/placeholder.svg"}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="h-7 w-7 text-gray-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-base truncate">{item.name}</h4>
                    {item.variant && <span className="text-xs text-gray-500 ml-2">{item.variant}</span>}
                  </div>
                  <span className="text-xs text-gray-400">SKU: {item.sku}</span>
                  {editingPriceId === item.id ? (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">Ksh</span>
                      <Input
                        type="number"
                        value={tempPrice}
                        onChange={(e) => setTempPrice(e.target.value)}
                        className="w-20 h-6 text-xs"
                        min="0"
                        step="0.01"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSavePrice(item.id)
                          } else if (e.key === 'Escape') {
                            handleCancelEdit()
                          }
                        }}
                        disabled={!canCreateOrders}
                      />
                      <span className="text-xs text-gray-500">each</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleSavePrice(item.id)}
                        disabled={!canCreateOrders}
                      >
                        <Check className="h-3 w-3 text-green-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={handleCancelEdit}
                        disabled={!canCreateOrders}
                      >
                        <X className="h-3 w-3 text-red-600" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">Ksh {(() => {
                        const priceNum = Number(item.price);
                        return !isNaN(priceNum) && priceNum > 0 ? priceNum.toLocaleString() : "N/A";
                      })()} each</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 hover:bg-gray-100"
                        onClick={() => handleEditPrice(item.id, item.price)}
                        title="Edit price"
                        disabled={!canCreateOrders}
                      >
                        <Edit className="h-3 w-3 text-gray-400" />
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleQuantityChange(item.id, (item.quantity - 1).toString())}
                      disabled={item.quantity <= 1 || !canCreateOrders}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                      className="w-14 text-center h-8"
                      min="1"
                      max={item.stock}
                      disabled={!canCreateOrders}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleQuantityChange(item.id, (item.quantity + 1).toString())}
                      disabled={!canCreateOrders}
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col items-end justify-between h-full ml-4 min-w-[80px]">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full bg-gray-100 hover:bg-red-100 transition-colors"
                    onClick={() => handleRemoveItem(item.id)}
                    aria-label="Remove from cart"
                    disabled={!canCreateOrders}
                  >
                    <Trash2 className="h-5 w-5 text-gray-400 group-hover:text-red-500 transition-colors" />
                  </Button>
                  <span className="font-bold text-primary text-base mt-4">Ksh {(item.price * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Cart Summary Card */}
          <div className="bg-gray-50 rounded-xl shadow-inner p-4 mt-4 space-y-2">
            {/* Tax Toggle and Dropdown */}
            <div className="flex items-center gap-3 mb-2">
              <Switch id="tax-toggle" checked={taxEnabled} onCheckedChange={canCreateOrders ? setTaxEnabled : undefined} disabled={!canCreateOrders} />
              <label htmlFor="tax-toggle" className="text-sm font-medium select-none">Apply Tax</label>
              {taxEnabled && (
                <select
                  className="ml-2 border rounded px-2 py-1 text-sm"
                  value={taxRate}
                  onChange={canCreateOrders ? (e => setTaxRate(Number(e.target.value))) : undefined}
                  disabled={!canCreateOrders}
                >
                  <option value={0}>0%</option>
                  <option value={8}>8%</option>
                  <option value={16}>16%</option>
                </select>
              )}
            </div>
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>Ksh {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            {taxEnabled && (
              <div className="flex justify-between text-sm">
                <span>Tax ({taxRate}%):</span>
                <span>Ksh {tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-semibold text-lg">
              <span>Total:</span>
              <span>Ksh {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <Button onClick={handleCheckout} className="w-full mt-4" size="lg" disabled={!canCreateOrders || items.length === 0}>
              Proceed to Checkout
            </Button>
          </div>
        </>
      )}
    </div>
  )
}