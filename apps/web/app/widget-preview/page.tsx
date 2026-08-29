import type { Metadata } from "next"

import { WidgetPreviewView } from "@/modules/onboarding/ui/views/widget-preview-view"

export const metadata: Metadata = {
  title: "Widget preview",
  robots: { index: false, follow: false },
}

const Page = () => {
  return <WidgetPreviewView />
}

export default Page
