import { Suspense } from "react"

import { InstagramOAuthCallbackView } from "@/modules/integrations/ui/views/instagram-oauth-callback-view"

const Page = () => {
  return (
    <Suspense fallback={null}>
      <InstagramOAuthCallbackView />
    </Suspense>
  )
}

export default Page
