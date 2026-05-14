"use client"

import { useState } from "react"
import { useMutation } from "convex/react"
import { KeyRoundIcon, Loader2Icon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"

import { api } from "@workspace/backend/_generated/api"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"

type ProviderService = "openai_realtime" | "gemini_live"

export type ProviderStatuses = {
  openaiConfigured?: boolean
  openaiRealtimeConfigured?: boolean
  geminiLiveConfigured?: boolean
}

type ApiKeyConfig = {
  service: ProviderService
  title: string
  label: string
  logoAlt: string
  logoSrc: string
  placeholder: string
  configured: boolean
  description: string
  statusLabel: string
  savedMessage: string
  removedMessage: string
}

const ApiKeyCard = ({
  config,
  inputValue,
  isRemoving,
  isSaving,
  onChange,
  onRemove,
  onSave,
}: {
  config: ApiKeyConfig
  inputValue: string
  isRemoving: boolean
  isSaving: boolean
  onChange: (value: string) => void
  onRemove: () => void
  onSave: () => void
}) => (
  <div className="surface-panel min-w-0 rounded-[22px] p-4 shadow-sm sm:p-5">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
            <Image
              alt={config.logoAlt}
              className="size-7 object-contain"
              height={28}
              src={config.logoSrc}
              width={28}
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{config.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {config.description}
            </p>
          </div>
        </div>
      </div>
      <span
        className={cn(
          "w-fit shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium",
          config.configured
            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            : "bg-muted text-muted-foreground"
        )}
      >
        {config.configured
          ? config.statusLabel
          : "No organization key saved"}
      </span>
    </div>

    <div className="mt-5 grid min-w-0 gap-2 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
      <Input
        className="min-w-0 font-mono text-sm"
        placeholder={config.placeholder}
        type="password"
        value={inputValue}
        onChange={(event) => onChange(event.target.value)}
      />
      <Button
        className="gap-2 lg:min-w-32"
        disabled={isSaving || inputValue.trim().length === 0}
        onClick={onSave}
        type="button"
      >
        {isSaving ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : (
          <KeyRoundIcon className="size-4" />
        )}
        {config.configured ? "Update key" : "Save key"}
      </Button>
      {config.configured ? (
        <Button
          className="gap-2"
          disabled={isRemoving || isSaving}
          onClick={onRemove}
          type="button"
          variant="outline"
        >
          {isRemoving ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <Trash2Icon className="size-4" />
          )}
          Remove
        </Button>
      ) : null}
    </div>

    <p className="mt-3 text-xs text-muted-foreground">
      {config.label} is stored securely per organization and is not included in
      widget drafts or published settings versions.
    </p>
  </div>
)

export const ApiKeysSection = ({
  providerStatuses,
}: {
  providerStatuses?: ProviderStatuses
}) => {
  const upsertSecret = useMutation(api.private.secrets.upsert)
  const removePlugin = useMutation(api.private.plugins.remove)

  const [openAIKey, setOpenAIKey] = useState("")
  const [geminiKey, setGeminiKey] = useState("")
  const [savingService, setSavingService] = useState<ProviderService | null>(
    null
  )
  const [removingService, setRemovingService] =
    useState<ProviderService | null>(null)

  const openAIConfigured = Boolean(
    providerStatuses?.openaiConfigured ??
      providerStatuses?.openaiRealtimeConfigured
  )

  const configs: ApiKeyConfig[] = [
    {
      service: "openai_realtime",
      title: "OpenAI API key",
      label: "The OpenAI key",
      logoAlt: "OpenAI logo",
      logoSrc: "/logos/chatgpt-logo.png",
      placeholder: "sk-...",
      configured: openAIConfigured,
      description:
        "Used for regular AI chat, knowledge-base answer summaries, operator AI polish, and OpenAI Realtime voice.",
      statusLabel: "Custom OpenAI key saved",
      savedMessage: "OpenAI API key saved",
      removedMessage: "OpenAI API key removed",
    },
    {
      service: "gemini_live",
      title: "Gemini API key",
      label: "The Gemini key",
      logoAlt: "Google Gemini logo",
      logoSrc: "/logos/gemini-logo.png",
      placeholder: "AIza...",
      configured: Boolean(providerStatuses?.geminiLiveConfigured),
      description:
        "Used for Gemini Live voice sessions when that voice channel is enabled.",
      statusLabel: "Custom Gemini key saved",
      savedMessage: "Gemini API key saved",
      removedMessage: "Gemini API key removed",
    },
  ]

  const getKeyState = (service: ProviderService) =>
    service === "openai_realtime"
      ? { value: openAIKey, reset: () => setOpenAIKey("") }
      : { value: geminiKey, reset: () => setGeminiKey("") }

  const saveKey = async (config: ApiKeyConfig) => {
    const keyState = getKeyState(config.service)
    const trimmedKey = keyState.value.trim()

    if (!trimmedKey) {
      toast.error("Enter an API key first")
      return
    }

    setSavingService(config.service)
    try {
      await upsertSecret({
        service: config.service,
        value: { apiKey: trimmedKey },
      })
      keyState.reset()
      toast.success(config.savedMessage)
    } catch {
      toast.error("Unable to save API key")
    } finally {
      setSavingService(null)
    }
  }

  const removeKey = async (config: ApiKeyConfig) => {
    setRemovingService(config.service)
    try {
      await removePlugin({ service: config.service })
      toast.success(config.removedMessage)
    } catch {
      toast.error("Unable to remove API key")
    } finally {
      setRemovingService(null)
    }
  }

  return (
    <div className="space-y-4">
      <section className="surface-frosted rounded-[22px] px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background shadow-sm">
            <KeyRoundIcon className="size-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              API keys
            </p>
            <h2 className="mt-1 text-base font-semibold">
              Organization AI provider keys
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Add customer-owned provider keys for this organization. When a
              key is saved, premium AI features use it instead of the workspace
              default credential.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        {configs.map((config) => {
          const value =
            config.service === "openai_realtime" ? openAIKey : geminiKey
          const onChange =
            config.service === "openai_realtime" ? setOpenAIKey : setGeminiKey

          return (
            <ApiKeyCard
              key={config.service}
              config={config}
              inputValue={value}
              isRemoving={removingService === config.service}
              isSaving={savingService === config.service}
              onChange={onChange}
              onRemove={() => void removeKey(config)}
              onSave={() => void saveKey(config)}
            />
          )
        })}
      </div>
    </div>
  )
}
