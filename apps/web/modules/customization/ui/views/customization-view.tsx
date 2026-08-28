"use client"

import { useCallback, useState } from "react"
import { api } from "@workspace/backend/_generated/api"
import { useQuery } from "convex/react"
import { Loader2Icon, PaletteIcon } from "lucide-react"

import {
  ConsoleHeader,
  ConsoleMeta,
} from "@/modules/dashboard/ui/components/console"
import { AgentSwitcher } from "../components/agent-switcher"
import { CustomizationForm } from "../components/customization-form"

const DEFAULT_AGENT_ID = "default"

export const CustomizationView = () => {
  const [agentId, setAgentId] = useState(DEFAULT_AGENT_ID)
  const handleAgentIdChange = useCallback((nextAgentId: string) => {
    setAgentId(nextAgentId)
  }, [])

  const customizationState = useQuery(
    api.private.widgetSettings.getCustomizationState,
    { agentId }
  )
  const isLoading = customizationState === undefined

  if (isLoading) {
    return (
      <div className="console-page flex h-full min-h-0 flex-col items-center justify-center gap-3 px-4">
        <span className="console-medallion size-12">
          <Loader2Icon className="size-5 animate-spin" />
        </span>
        <p className="text-sm text-muted-foreground">
          Loading your widget settings…
        </p>
      </div>
    )
  }

  return (
    <div className="console-page relative flex h-full min-h-0 flex-col overflow-x-hidden overflow-y-auto">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 px-4 py-5 sm:px-6 sm:py-7">
        <ConsoleHeader
          actions={
            <AgentSwitcher
              agentId={agentId}
              onAgentIdChange={handleAgentIdChange}
            />
          }
          description="The chat widget, launcher, brand kit, and voice settings — edited as a draft, published when you're ready."
          eyebrow="Visual system"
          icon={PaletteIcon}
          meta={
            <>
              <ConsoleMeta
                label="Published"
                value={`v${customizationState.publishedVersion}`}
              />
              <ConsoleMeta
                dot
                label="Draft"
                tone={
                  customizationState.isDraftDifferentFromPublished
                    ? "warning"
                    : "positive"
                }
                value={
                  customizationState.isDraftDifferentFromPublished
                    ? "Pending"
                    : "Synced"
                }
              />
            </>
          }
          title="Widget customization"
        />

        <CustomizationForm
          agentId={agentId}
          draftData={customizationState.draft}
          draftUpdatedAt={customizationState.draftUpdatedAt}
          isDraftDifferentFromPublished={
            customizationState.isDraftDifferentFromPublished
          }
          key={agentId}
          publishedAt={customizationState.publishedAt}
          publishedVersion={customizationState.publishedVersion}
          versions={customizationState.versions}
        />
      </div>
    </div>
  )
}
