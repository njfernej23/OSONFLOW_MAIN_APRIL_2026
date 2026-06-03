import { UserProfile } from "@clerk/nextjs"

const AccountPage = () => {
  return (
    <div className="flex min-h-0 flex-1 overflow-auto p-4 md:p-6">
      <UserProfile path="/account" routing="path" />
    </div>
  )
}

export default AccountPage
