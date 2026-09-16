"use client"

import { useParams } from "next/navigation"
import { PermissionGuard } from "@/components/PermissionGuard"
import { SopForm } from "@/app/sops/components/sop-form"

export default function EditSopPage() {
  const params = useParams()
  const sopId = params.id as string

  return (
    <PermissionGuard permissions={["can_view_finance_menu", "can_manage_system", "can_manage_company"]}>
      <SopForm mode="edit" sopId={sopId} />
    </PermissionGuard>
  )
}
