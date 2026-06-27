import { AuthenticateWithRedirectCallback } from "@clerk/nextjs"

export default function SsoCallbackPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-[#fcfcfa]">
      <AuthenticateWithRedirectCallback
        signInFallbackRedirectUrl="/analytics"
        signUpFallbackRedirectUrl="/org-selection"
      />
    </div>
  )
}
