import { AuthenticateWithRedirectCallback } from "@clerk/nextjs"

import { appPath } from "@/lib/urls"

export default function SsoCallbackPage() {
  return (
    <div className="auth-page flex min-h-svh items-center justify-center px-5 py-10">
      <AuthenticateWithRedirectCallback
        signInFallbackRedirectUrl={appPath("/analytics")}
        signUpFallbackRedirectUrl={appPath("/org-selection")}
      />
    </div>
  )
}
