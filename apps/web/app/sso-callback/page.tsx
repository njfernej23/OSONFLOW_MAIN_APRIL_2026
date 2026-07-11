import { AuthenticateWithRedirectCallback } from "@clerk/nextjs"

import { appPath } from "@/lib/urls"

export default function SsoCallbackPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-[#fcfcfa]">
      <AuthenticateWithRedirectCallback
        signInFallbackRedirectUrl={appPath("/analytics")}
        signUpFallbackRedirectUrl={appPath("/org-selection")}
      />
    </div>
  )
}
