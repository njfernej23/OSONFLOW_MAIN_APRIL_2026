import { CreateOrganization } from "@clerk/nextjs"

const CreateOrganizationPage = () => {
  return (
    <div className="flex min-h-0 flex-1 items-start justify-center overflow-auto p-4 md:p-6">
      <CreateOrganization
        path="/create-organization"
        routing="path"
        afterCreateOrganizationUrl="/organization-created"
        skipInvitationScreen
      />
    </div>
  )
}

export default CreateOrganizationPage
