"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, Package } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getProducts } from "@/lib/products"
import { Button } from "@/components/ui/button"

interface Product {
  id: string
  name: string
  price: string | number
  sku?: string | null
  category?: string | { id: string; name: string } | null
  stock_quantity: number
  image_url?: string | null
  image_urls?: string[]
  primary_image_url?: string | null
  variants?: ProductVariant[]
}

interface ProductVariant {
  id: string | number
  name: string
  price: string | number
  sku?: string | null
  stock_quantity: number
  primary_image_url?: string | null
  image_urls?: string[]
  images?: string[]
}

interface ProductSearchProps {
  onAddToCart: (product: Product, variant?: ProductVariant) => void
}

export function ProductSearch({ onAddToCart }: ProductSearchProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Array<string | { id: string; name: string }>>(["All"])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showVariantModal, setShowVariantModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const { toast } = useToast()

  // Fetch all products once
  useEffect(() => {
    setLoading(true)
    setError(null)
    getProducts(1, 10000, {
      search: searchTerm,
      category: selectedCategory !== "All" ? selectedCategory : undefined,
    })
      .then((res) => {
        setAllProducts(res.data as Product[])
        // Extract categories from products
        // Extract categories from products, preserving objects if present
        const cats = Array.from(
          new Set(
            res.data
              .map((p) => p.category)
              .filter(Boolean)
              .map((cat) =>
                typeof cat === "string"
                  ? cat
                  : cat && typeof cat === "object" && "id" in cat && "name" in cat
                  ? JSON.stringify(cat)
                  : null
              )
              .filter(Boolean)
          )
        )
          .map((cat) => {
            if (typeof cat === "string" && cat.startsWith("{")) {
              try {
                return JSON.parse(cat)
              } catch {
                return cat
              }
            }
            return cat
          });
        setCategories(["All", ...cats])
        setPage(1)
      })
      .catch((err) => {
        setError(err.message || "Failed to load products")
        setAllProducts([])
      })
      .finally(() => setLoading(false))
  }, [searchTerm, selectedCategory])

  // Filter products by search and category
  const filteredProducts = allProducts.filter((product) => {
    const matchesSearch =
      !searchTerm ||
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.sku || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (typeof product.category === 'string' 
        ? (product.category || "").toLowerCase().includes(searchTerm.toLowerCase())
        : ((product.category as any)?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
      );
    const matchesCategory = selectedCategory === "All" || 
      (typeof product.category === 'string' 
        ? product.category === selectedCategory
        : (product.category as any)?.id === selectedCategory
      );
    return matchesSearch && matchesCategory;
  });

  // Paginate filtered products
  const totalCount = filteredProducts.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedProducts = filteredProducts.slice((page - 1) * pageSize, page * pageSize);

  const handleProductClick = (product: Product) => {
    if (product.variants && product.variants.length > 0) {
      setSelectedProduct(product)
      setShowVariantModal(true)
    } else {
      // Remove out-of-stock check: allow adding any product
      onAddToCart(product)
    }
  }

  const handleVariantSelect = (variant: ProductVariant) => {
    // Remove out-of-stock check: allow adding any variant
    if (selectedProduct) {
      onAddToCart(selectedProduct, variant)
    }
    setShowVariantModal(false)
    setSelectedProduct(null)
  }

  const getStockStatus = (stock: number) => {
    if (stock <= 0) return { label: "Out of Stock", color: "destructive" as const }
    if (stock <= 5) return { label: "Low Stock", color: "secondary" as const }
    return { label: "In Stock", color: "default" as const }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search products by name or SKU..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setPage(1)
            }}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={(val) => { setSelectedCategory(val); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category, index) => {
              if (category === "All") {
                return (
                  <SelectItem key="category-all" value="All">
                    All
                  </SelectItem>
                );
              }
              if (typeof category === "string") {
                return (
                  <SelectItem key={`category-str-${category}`} value={category}>
                    {category}
                  </SelectItem>
                );
              }
              if (typeof category === "object" && category !== null && "id" in category && "name" in category) {
                return (
                  <SelectItem key={`category-obj-${category.id}`} value={category.id}>
                    {category.name}
                  </SelectItem>
                );
              }
              return null;
            })}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">Loading products...</div>
      ) : error ? (
        <div className="flex justify-center items-center py-12 text-red-500">{error}</div>
      ) : paginatedProducts.length === 0 ? (
        <div className="flex justify-center items-center py-12 text-gray-500">No products found.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedProducts.map((product, index) => {
              const stockStatus = getStockStatus(product.stock_quantity ?? 0)
              return (
                <Card
                  key={`product-${product.id}-${index}`}
                  className="p-4 cursor-pointer hover:shadow-lg transition"
                  onClick={() => handleProductClick(product)}
                >
                  <div className="flex flex-col items-center">
                    <img
                      src={product.primary_image_url || (product.image_urls && product.image_urls.length > 0 ? product.image_urls[0] : null) || product.image_url || "/placeholder.svg"}
                      alt={product.name}
                      className="w-24 h-24 object-contain mb-2"
                    />
                    <div className="font-semibold text-lg text-center">{product.name}</div>
                    <div className="text-gray-500 text-sm mb-1">{product.sku}</div>
                    <div className="font-bold text-primary">KES {(() => {
                      const priceNum = parseFloat(typeof product.price === 'string' ? product.price : String(product.price || "0"));
                      return !isNaN(priceNum) && priceNum > 0 ? priceNum.toLocaleString() : "N/A";
                    })()}</div>
                    <Badge variant={stockStatus.color}>{stockStatus.label}</Badge>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-muted-foreground">Rows per page</span>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[70px]">
                    <SelectValue placeholder="12" />
                  </SelectTrigger>
                  <SelectContent side="top">
                    {[6, 12, 24, 48].map((size) => (
                      <SelectItem key={`pagesize-${size}`} value={size.toString()}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm font-medium">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Variant Modal */}
      <Dialog open={showVariantModal} onOpenChange={setShowVariantModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Variant</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {selectedProduct?.variants?.map((variant, index) => {
              // Get variant image - prioritize primary_image_url, then first image from image_urls or images
              const variantImage = variant.primary_image_url || 
                                   (variant.image_urls && variant.image_urls.length > 0 ? variant.image_urls[0] : null) ||
                                   (variant.images && variant.images.length > 0 ? variant.images[0] : null) ||
                                   "/placeholder.svg"
              
              return (
                <Card
                  key={`variant-${variant.id}-${index}`}
                  className="p-4 cursor-pointer hover:shadow-lg transition flex justify-between items-center gap-4"
                  onClick={() => handleVariantSelect(variant)}
                >
                  {/* Variant Image */}
                  <div className="flex-shrink-0">
                    <img
                      src={variantImage}
                      alt={variant.name}
                      className="w-16 h-16 object-cover rounded-md border border-gray-200"
                    />
                  </div>
                  
                  {/* Variant Info */}
                  <div className="flex-1">
                    <div className="font-semibold">{variant.name}</div>
                    <div className="text-gray-500 text-sm">{variant.sku}</div>
                  </div>
                  
                  {/* Price */}
                  <div className="font-bold text-primary">KES {(() => {
                    const priceNum = parseFloat(typeof variant.price === 'string' ? variant.price : String(variant.price || "0"));
                    return !isNaN(priceNum) && priceNum > 0 ? priceNum.toLocaleString() : "N/A";
                  })()}</div>
                  
                  {/* Stock Badge */}
                  <Badge variant={getStockStatus(variant.stock_quantity ?? 0).color}>
                    {getStockStatus(variant.stock_quantity ?? 0).label}
                  </Badge>
                </Card>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
