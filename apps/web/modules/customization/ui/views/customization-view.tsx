"use client"

import { api } from "@workspace/backend/_generated/api"
import { useQuery } from "convex/react"
import { Loader2Icon, PaletteIcon } from "lucide-react"
import { CustomizationForm } from "../components/customization-form"

export const CustomizationView = () => {
  const customizationState = useQuery(
    api.private.widgetSettings.getCustomizationState
  )
  const vapiPlugin = useQuery(api.private.plugins.getOne, { service: "vapi" })
  const isLoading = customizationState === undefined || vapiPlugin === undefined

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-y-3 bg-muted/50">
        <div className="rounded-full bg-background p-4 shadow-sm">
          <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          Loading your widget settings...
        </p>
      </div>
    )
  }
  return (
    <div className="min-h-screen bg-muted/40">
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-screen-xl px-6 py-6 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <PaletteIcon className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
                Widget Customization
              </h1>
              <p className="text-sm text-muted-foreground">
                Customize how your chat widget looks and behaves for your
                customers
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-screen-xl px-6 py-8 pb-12 md:px-8">
        <CustomizationForm
          key={`${customizationState.publishedVersion}`}
          draftData={customizationState.draft}
          publishedVersion={customizationState.publishedVersion}
          publishedAt={customizationState.publishedAt}
          draftUpdatedAt={customizationState.draftUpdatedAt}
          isDraftDifferentFromPublished={
            customizationState.isDraftDifferentFromPublished
          }
          versions={customizationState.versions}
          hasVapiPlugin={!!vapiPlugin}
        />
      </div>
    </div>
  )
}
