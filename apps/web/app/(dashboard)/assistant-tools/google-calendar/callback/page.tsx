import { Suspense } from "react"

import { GoogleCalendarOAuthCallbackView } from "@/modules/assistant-tools/ui/views/google-calendar-oauth-callback-view"

const Page = () => {
  return (
    <Suspense fallback={null}>
      <GoogleCalendarOAuthCallbackView />
    </Suspense>
  )
}

export default Page
