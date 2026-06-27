import { Suspense } from "react"

import { SignUpView } from "@/modules/auth/ui/views/sign-up-view"
import { Spinner } from "@workspace/ui/components/spinner"

const Page = () => {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[18rem] items-center justify-center">
          <Spinner className="size-6 text-muted-foreground" />
        </div>
      }
    >
      <SignUpView />
    </Suspense>
  )
}

export default Page