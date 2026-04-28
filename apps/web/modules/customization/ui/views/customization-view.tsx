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
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_34%)]" />
      <div className="sticky top-0 z-10 border-b border-border/60 bg-background/78 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-screen-xl px-4 py-4 sm:px-6 sm:py-5 md:px-8">
          <div className="max-w-3xl">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_92%,white_8%),color-mix(in_srgb,var(--primary)_58%,#0f172a_42%))] text-white shadow-[0_20px_40px_-24px_color-mix(in_srgb,var(--primary)_68%,transparent)] sm:size-11">
                <PaletteIcon className="size-5" />
              </div>
              <div className="space-y-1">
                <p className="section-kicker">Visual System</p>
                <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                  Widget customization
                </h1>
                <p className="max-w-2xl text-sm text-muted-foreground sm:text-[0.95rem]">
                  Shape the first impression: brand tone, motion, launcher,
                  gradients, and voice entry points all in one polished flow.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-screen-xl px-4 py-5 pb-24 sm:px-6 sm:py-6 sm:pb-16 md:px-8 md:py-8 md:pb-12">
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
