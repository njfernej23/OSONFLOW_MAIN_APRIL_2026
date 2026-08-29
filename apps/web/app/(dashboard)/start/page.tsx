import type { Metadata } from "next"

import { GetStartedView } from "@/modules/onboarding/ui/views/get-started-view"

export const metadata: Metadata = {
  title: "Getting started",
}

const Page = () => {
  return <GetStartedView />
}

export default Page
