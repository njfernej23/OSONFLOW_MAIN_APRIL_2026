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
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-y-3 bg-muted/50">
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
    <div className="flex h-full min-h-0 flex-col overflow-y-auto overflow-x-hidden bg-muted/40">
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-screen-xl px-4 py-4 sm:px-6 sm:py-6 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 sm:size-10">
              <PaletteIcon className="size-4 text-primary sm:size-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight sm:text-xl md:text-2xl">
                Widget Customization
              </h1>
              <p className="hidden text-sm text-muted-foreground sm:block">
                Customize how your chat widget looks and behaves for your customers
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-screen-xl px-4 py-4 pb-24 sm:px-6 sm:py-6 sm:pb-16 md:px-8 md:py-8 md:pb-12">
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
