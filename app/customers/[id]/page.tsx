import { Suspense } from "react"
import { CustomerProfile } from "./customer-profile"
import { Skeleton } from "@/components/ui/skeleton"

export const metadata = {
  title: "Customer Profile | Citimax",
  description: "View and manage customer information",
}

export default async function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-[200px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      }
    >
      <CustomerProfile customerId={id} isOpen={true} onClose={function (): void {
        // No-op here - this is a direct page route, not a panel; there's
        // nothing to "close" back to within this same page.
      } } />
    </Suspense>
  )
}
