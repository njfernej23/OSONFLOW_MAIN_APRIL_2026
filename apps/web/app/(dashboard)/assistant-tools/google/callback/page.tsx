import { Suspense } from "react"

import { GoogleSheetsOAuthCallbackView } from "@/modules/assistant-tools/ui/views/google-sheets-oauth-callback-view"

const Page = () => {
  return (
    <Suspense fallback={null}>
      <GoogleSheetsOAuthCallbackView />
    </Suspense>
  )
}

export default Page
