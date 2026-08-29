"use client"

import { useCallback, useState } from "react"
import { api } from "@workspace/backend/_generated/api"
import { useQuery } from "convex/react"
import { ExternalLinkIcon, PaletteIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  ConsoleHeader,
  ConsoleMeta,
  ConsolePage,
  ConsoleSkeleton,
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

  if (customizationState === undefined) {
    return <ConsoleSkeleton rows={3} stats={0} />
  }

  return (
    <ConsolePage width="wide">
      <ConsoleHeader
        actions={
          <>
            <Button
              className="gap-1.5"
              onClick={() => window.open("/widget-preview", "_blank")}
              size="sm"
              type="button"
              variant="outline"
            >
              <ExternalLinkIcon className="size-3.5" />
              Open preview
            </Button>
            <AgentSwitcher
              agentId={agentId}
              onAgentIdChange={handleAgentIdChange}
            />
          </>
        }
        description="Behaviour, copy, brand, launcher and voice for the widget your customers see. Everything is edited as a draft and published as a version you can roll back."
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
            <ConsoleMeta
              label="Versions"
              value={customizationState.versions.length}
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
    </ConsolePage>
  )
}
