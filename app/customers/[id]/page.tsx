import { Suspense } from "react"
import { CustomerProfile } from "./customer-profile"
import { Skeleton } from "@/components/ui/skeleton"

export const metadata = {
  title: "Customer Profile | Citimax",
  description: "View and manage customer information",
}

export default async function CustomerProfilePage({ params }: { params: { id: string } }) {
  // Ensure params is destructured properly
  const id = params?.id
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-[200px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      }
    >
      <CustomerProfile customerId={id} isOpen={false} onClose={function (): void {
        throw new Error("Function not implemented.")
      } } />
    </Suspense>
  )
}
