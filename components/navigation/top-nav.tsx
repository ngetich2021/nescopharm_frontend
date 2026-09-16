"use client"

import type React from "react"

import { useState } from "react"
import { Search, Bell, Settings, LogOut, User, Loader2, FileText, ChevronDown, Package, ShoppingCart, Truck, ClipboardList, Users } from "lucide-react" // Added icons
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast" // For potential error feedback
import { useRouter } from "next/navigation" // For redirecting after sign out

export function TopNav() {
  const [searchQuery, setSearchQuery] = useState("")
  const { userProfile, signOut: authSignOut, isLoading: authLoading } = useAuth() // Get signOut and isLoading
  const { toast } = useToast()
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Implement search functionality here
  }

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await authSignOut()
      // The AuthGuard should handle redirection to /sign-in
      // but we can also explicitly push if needed, or just let AuthGuard do its job.
    } catch (error: any) {
      toast({
        title: "Sign Out Failed",
        description: error.message || "An unexpected error occurred during sign out.",
        variant: "destructive",
      })
    } finally {
      setIsSigningOut(false)
    }
  }

  const handleProfileAction = (action: string) => {
    if (action === "profile") {
      router.push("/profile") // Example: Redirect to a profile page
    } else if (action === "settings") {
      router.push("/settings") // Example: Redirect to a settings page
    }
    // "logout" is handled by handleSignOut directly
  }

  // Construct initials for AvatarFallback
  const getInitials = (firstName?: string, lastName?: string) => {
    const firstInitial = firstName ? firstName[0] : ""
    const lastInitial = lastName ? lastName[0] : ""
    return `${firstInitial}${lastInitial}`.toUpperCase() || "U" // Default to "U" if no names
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-50">
      {/* Search Section */}
      <div className="flex-1 max-w-md">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search customers, orders, products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border-gray-300 focus:border-[#1E2764] focus:ring-[#1E2764]"
            disabled={authLoading || isSigningOut}
          />
        </form>
      </div>

      {/* Right Section - Notifications and Reports and Profile */}
      <div className="flex items-center gap-4">
        {/* Reports Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={authLoading || isSigningOut}>
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Reports</span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => router.push("/reports/inventory")}>
              <Package className="mr-2 h-4 w-4" />
              <span>Inventory Reports</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/reports/sales")}>
              <ShoppingCart className="mr-2 h-4 w-4" />
              <span>Sales Reports</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/reports/logistics")}>
              <Truck className="mr-2 h-4 w-4" />
              <span>Logistics Reports</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/reports/procurement")}>
              <ClipboardList className="mr-2 h-4 w-4" />
              <span>Procurement Reports</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/reports/customers")}>
              <Users className="mr-2 h-4 w-4" />
              <span>CRM Reports</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-gray-100"
          onClick={() => {}}
          disabled={authLoading || isSigningOut}
        >
          <Bell className="h-5 w-5 text-gray-600" />
          {/* Notification badge */}
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-[#1E2764] text-white text-xs rounded-full flex items-center justify-center">
            3
          </span>
        </Button>

        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={authLoading || isSigningOut}>
            <button className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-2 transition-colors disabled:opacity-50">
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={undefined} // No avatar URL available, fallback will show
                  alt={userProfile?.first_name || "User"}
                />
                <AvatarFallback className="bg-[#1E2764]/10 text-[#1E2764] font-semibold">
                  {getInitials(userProfile?.first_name ?? undefined, userProfile?.last_name ?? undefined)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-900 truncate max-w-[150px]">
                  {userProfile?.first_name} {userProfile?.last_name}
                </p>
                <p className="text-xs text-gray-500 truncate max-w-[150px]">{userProfile?.email}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium text-gray-900 truncate">
                {userProfile?.first_name} {userProfile?.last_name}
              </p>
              <p className="text-xs text-gray-500 truncate">{userProfile?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => handleProfileAction("profile")}
              disabled={isSigningOut}
            >
              <User size={16} />
              <span>View Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => handleProfileAction("settings")}
              disabled={isSigningOut}
            >
              <Settings size={16} />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="flex items-center gap-2 cursor-pointer text-blue-600 hover:!text-blue-700 focus:!text-blue-700"
              onClick={handleSignOut}
              disabled={isSigningOut}
            >
              {isSigningOut ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <LogOut size={16} />
              )}
              <span>{isSigningOut ? "Signing Out..." : "Sign Out"}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
