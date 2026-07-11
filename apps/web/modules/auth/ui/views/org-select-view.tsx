"use client"

import { OrganizationList, TaskChooseOrganization, useSession } from "@clerk/nextjs"
import { Spinner } from "@workspace/ui/components/spinner"

export const OrgSelectView = () => {
  const { session, isLoaded } = useSession()

  if (!isLoaded) {
    return (
      <div className="flex min-h-[18rem] items-center justify-center">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    )
  }

  if (session?.status === "pending") {
    return <TaskChooseOrganization redirectUrlComplete="/analytics" />
  }

  return (
    <OrganizationList
      afterCreateOrganizationUrl="/organization-created"
      afterSelectOrganizationUrl="/analytics"
      hidePersonal
      skipInvitationScreen
    />
  )
}
