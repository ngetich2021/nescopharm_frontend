import { PermissionGuard } from "@/components/PermissionGuard"
import { SopForm } from "@/app/sops/components/sop-form"

export default function NewSopPage() {
  return (
    <PermissionGuard permissions={["can_view_finance_menu", "can_manage_system", "can_manage_company"]}>
      <SopForm mode="create" />
    </PermissionGuard>
  )
}
