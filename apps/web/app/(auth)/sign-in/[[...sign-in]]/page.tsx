import { Suspense } from "react"

import { SignInView } from "@/modules/auth/ui/views/sign-in-view"
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
      <SignInView />
    </Suspense>
  )
}

export default Page