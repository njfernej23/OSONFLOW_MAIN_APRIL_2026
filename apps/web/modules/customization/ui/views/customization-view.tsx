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
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-y-3 bg-transparent px-4">
        <div className="surface-frosted rounded-full p-4">
          <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          Loading your widget settings...
        </p>
      </div>
    )
  }
  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-x-hidden overflow-y-auto bg-transparent">
      <div className="mx-auto w-full max-w-[1540px] px-3 py-3 sm:px-4 sm:py-4 lg:px-5">
        <div className="surface-frosted mb-4 rounded-[22px] px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background shadow-sm">
                <PaletteIcon className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                  Visual system
                </p>
                <h1 className="mt-1 text-xl font-semibold tracking-tight">
                  Widget customization
                </h1>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Manage the chat widget, launcher, voice settings, and publish
                  workflow from a cleaner control surface.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-border/70 bg-background/60">
              <div className="border-r border-border/70 px-3 py-2 text-center">
                <p className="text-[10px] font-medium text-muted-foreground uppercase">
                  Published
                </p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums">
                  v{customizationState.publishedVersion}
                </p>
              </div>
              <div className="px-3 py-2 text-center">
                <p className="text-[10px] font-medium text-muted-foreground uppercase">
                  Draft
                </p>
                <p className="mt-0.5 text-sm font-semibold">
                  {customizationState.isDraftDifferentFromPublished
                    ? "Pending"
                    : "Synced"}
                </p>
              </div>
            </div>
          </div>
        </div>

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
