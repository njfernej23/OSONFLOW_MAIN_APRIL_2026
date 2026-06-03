import { OrganizationProfile } from "@clerk/nextjs"

const OrganizationSettingsPage = () => {
  return (
    <div className="flex min-h-0 flex-1 overflow-auto p-4 md:p-6">
      <OrganizationProfile path="/organization-settings" routing="path" />
    </div>
  )
}

export default OrganizationSettingsPage
