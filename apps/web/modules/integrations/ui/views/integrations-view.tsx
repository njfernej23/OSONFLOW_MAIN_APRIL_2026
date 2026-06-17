"use client"

import { useOrganization } from "@clerk/nextjs"
import { useAction, useMutation, useQuery } from "convex/react"
import { api } from "@workspace/backend/_generated/api"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { Switch } from "@workspace/ui/components/switch"
import {
  ActivityIcon,
  BotIcon,
  CameraIcon as InstagramIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  CopyIcon,
  ExternalLinkIcon,
  KeyRoundIcon,
  Loader2Icon,
  PlugZapIcon,
  RefreshCwIcon,
  SendIcon,
  ShieldCheckIcon,
  Trash2Icon,
  WebhookIcon,
  XCircleIcon,
  ZapIcon,
} from "lucide-react"
import Image from "next/image"
import { formatDistanceToNow } from "date-fns"
import { useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { cn } from "@workspace/ui/lib/utils"
import {
  DEFAULT_WIDGET_SCRIPT_URL,
  type IntegrationId,
  INTEGRATIONS,
  type WebhookEventType,
  type WebhookProvider,
  WEBHOOK_EVENT_TYPES,
  WEBHOOK_PROVIDERS,
  type WidgetPosition,
  WIDGET_POSITIONS,
} from "../../constants"
import {
  createScript,
  isValidWidgetScriptUrl,
  normalizeScriptUrl,
} from "../../utils"
import {
  ApiKeysSection,
  type ProviderStatuses,
} from "../components/api-keys-section"
import { ProFeatureGate } from "@/modules/billing/ui/components/pro-feature-gate"

type WebhookDestination = {
  _id: string
  _creationTime: number
  url: string
  description?: string
  provider: WebhookProvider
  providerConfigPreview?: {
    telegramChatId?: string
    hasTelegramBotToken?: boolean
    whatsappPhoneNumberId?: string
    whatsappRecipientPhone?: string
    hasWhatsappAccessToken?: boolean
  }
  isEnabled: boolean
  eventTypes: WebhookEventType[]
  updatedAt: number
  signingSecretPreview: string
}

type WebhookDelivery = {
  _id: string
  _creationTime: number
  webhookId: string
  webhookUrl: string
  eventId: string
  eventType: WebhookEventType
  status: "success" | "failed"
  attempt: number
  responseStatus?: number
  responseBody?: string
  error?: string
  durationMs?: number
}

type WebhookDashboard = {
  webhooks: WebhookDestination[]
  deliveries: WebhookDelivery[]
}

type TelegramDashboard = {
  integration: null | {
    _id: string
    _creationTime: number
    botUsername?: string
    botFirstName?: string
    webhookUrl?: string
    isEnabled: boolean
    status: "connected" | "needs_webhook_url" | "error"
    setupError?: string
    lastWebhookAt?: number
    updatedAt: number
  }
}

type InstagramDashboard = {
  integration: null | {
    _id: string
    _creationTime: number
    instagramUserId: string
    username?: string
    webhookUrl?: string
    verifyToken: string
    isEnabled: boolean
    status: "connected" | "needs_webhook_url" | "error"
    setupError?: string
    lastWebhookAt?: number
    updatedAt: number
  }
}

type WhatsAppDashboard = {
  integration: null | {
    _id: string
    _creationTime: number
    phoneNumberId: string
    businessAccountId?: string
    displayPhoneNumber?: string
    verifiedName?: string
    webhookUrl?: string
    verifyToken: string
    isEnabled: boolean
    status: "connected" | "needs_webhook_url" | "error"
    setupError?: string
    lastWebhookAt?: number
    updatedAt: number
  }
}

const webhookEventTypeById = WEBHOOK_EVENT_TYPES.reduce(
  (acc, e) => {
    acc[e.id] = e
    return acc
  },
  {} as Record<WebhookEventType, (typeof WEBHOOK_EVENT_TYPES)[number]>
)
const webhookProviderById = WEBHOOK_PROVIDERS.reduce(
  (acc, p) => {
    acc[p.id] = p
    return acc
  },
  {} as Record<WebhookProvider, (typeof WEBHOOK_PROVIDERS)[number]>
)

const formatEventTypeLabel = (e: WebhookEventType) =>
  webhookEventTypeById[e]?.label ?? e
const formatWebhookProviderLabel = (p: WebhookProvider) =>
  webhookProviderById[p]?.label ?? p
const formatTimeAgo = (ts: number) =>
  formatDistanceToNow(ts, { addSuffix: true })
const DELIVERY_HISTORY_VISIBLE_COUNT = 10

const PROVIDER_IMAGE_SRC: Partial<Record<WebhookProvider, string>> = {
  discord: "/discord.png",
  telegram: "/telegram.png",
  whatsapp: "/whatsapp.png",
}

const ProviderIcon = ({
  provider,
  size = 24,
}: {
  provider: WebhookProvider
  size?: number
}) => {
  const src = PROVIDER_IMAGE_SRC[provider]
  if (src) {
    return (
      <Image
        alt={formatWebhookProviderLabel(provider)}
        src={src}
        width={size}
        height={size}
        className="rounded-sm object-contain"
      />
    )
  }
  return (
    <WebhookIcon
      style={{ width: size, height: size }}
      className="text-muted-foreground"
    />
  )
}

const ChannelIcon = ({
  channel,
  size = 24,
}: {
  channel: "telegram" | "instagram" | "whatsapp"
  size?: number
}) => {
  if (channel === "instagram") {
    return (
      <InstagramIcon
        style={{ width: size, height: size }}
        className="text-pink-600"
      />
    )
  }

  if (channel === "whatsapp") {
    return <ProviderIcon provider="whatsapp" size={size} />
  }

  return <ProviderIcon provider="telegram" size={size} />
}

// Simple token-class syntax highlighter for generated snippets
const tokenizeSnippet = (code: string): { text: string; cls: string }[] => {
  const tokens: { text: string; cls: string }[] = []
  const regex =
    /(\/\/[^\n]*|<!--[\s\S]*?-->|"[^"]*"|'[^']*'|`[^`]*`|<\/?[A-Za-z][A-Za-z0-9.]*|\/?>|import|export|const|return|function|async|await|useEffect|null|undefined|true|false|[A-Za-z_$][A-Za-z0-9_$.]*\s*(?=\()|[{}[\]();,])/g
  let last = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(code)) !== null) {
    if (match.index > last)
      tokens.push({ text: code.slice(last, match.index), cls: "text-zinc-300" })
    const t = match[0]
    let cls = "text-zinc-300"
    if (/^(\/\/|<!--)/.test(t)) cls = "text-zinc-500 italic"
    else if (/^["'`]/.test(t) || /^"[^"]*"$/.test(t)) cls = "text-amber-300"
    else if (/^<\/?[A-Za-z]|[/>]>?$/.test(t)) cls = "text-emerald-400"
    else if (
      /^(import|export|const|return|function|async|await|useEffect|null|undefined|true|false)$/.test(
        t
      )
    )
      cls = "text-sky-400"
    else if (/^[A-Za-z_$][A-Za-z0-9_$.]*\s*\($/.test(t)) cls = "text-yellow-300"
    else if (/^[{}[\]();,]$/.test(t)) cls = "text-zinc-500"
    tokens.push({ text: t, cls })
    last = match.index + t.length
  }
  if (last < code.length)
    tokens.push({ text: code.slice(last), cls: "text-zinc-300" })
  return tokens
}

const EmptyWebhooksState = () => (
  <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-14 text-center">
    <svg
      width="64"
      height="64"
      viewBox="0 0 80 80"
      fill="none"
      className="text-muted-foreground/20"
    >
      <circle
        cx="40"
        cy="40"
        r="28"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeDasharray="6 4"
      />
      <path
        d="M28 40h8M44 40h8"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="40" cy="40" r="4" fill="currentColor" />
      <path
        d="M40 16v6M40 58v6M16 40h6M58 40h6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
    <div>
      <p className="text-sm font-medium text-muted-foreground">
        No destinations yet
      </p>
      <p className="mt-1 text-xs text-muted-foreground/60">
        Create your first webhook on the left.
      </p>
    </div>
  </div>
)

const EmptyDeliveriesState = () => (
  <div className="flex flex-col items-center justify-center gap-4 py-14 text-center">
    <svg
      width="64"
      height="64"
      viewBox="0 0 80 80"
      fill="none"
      className="text-muted-foreground/20"
    >
      <rect
        x="16"
        y="24"
        width="48"
        height="32"
        rx="4"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <path d="M16 34h48" stroke="currentColor" strokeWidth="2" />
      <path
        d="M28 44h8M28 50h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.6"
      />
      <circle
        cx="56"
        cy="47"
        r="5"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.6"
      />
    </svg>
    <div>
      <p className="text-sm font-medium text-muted-foreground">
        No deliveries recorded
      </p>
      <p className="mt-1 text-xs text-muted-foreground/60">
        Deliveries appear here after your first webhook fires.
      </p>
    </div>
  </div>
)

type ActiveSection =
  | "widget"
  | "apiKeys"
  | "telegram"
  | "instagram"
  | "whatsapp"
  | "webhooks"

export const IntegrationsView = () => {
  const { organization } = useOrganization()
  const searchParams = useSearchParams()

  const [activeSection, setActiveSection] = useState<ActiveSection>("widget")
  const [selectedIntegration, setSelectedIntegration] =
    useState<IntegrationId>("html5")
  const [scriptUrl, setScriptUrl] = useState(DEFAULT_WIDGET_SCRIPT_URL)
  const [position, setPosition] = useState<WidgetPosition>("bottom-right")
  const [snippetCopied, setSnippetCopied] = useState(false)

  const [selectedWebhookProvider, setSelectedWebhookProvider] =
    useState<WebhookProvider>("discord")
  const [webhookUrl, setWebhookUrl] = useState<string>(
    webhookProviderById.discord.defaultUrl
  )
  const [webhookDescription, setWebhookDescription] = useState("")
  const [telegramBotToken, setTelegramBotToken] = useState("")
  const [telegramChatId, setTelegramChatId] = useState("")
  const [whatsappAccessToken, setWhatsappAccessToken] = useState("")
  const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState("")
  const [whatsappRecipientPhone, setWhatsappRecipientPhone] = useState("")
  const [selectedWebhookEvents, setSelectedWebhookEvents] = useState<
    WebhookEventType[]
  >(WEBHOOK_EVENT_TYPES.map((e) => e.id))
  const [isCreatingWebhook, setIsCreatingWebhook] = useState(false)
  const [isClearingDeliveryHistory, setIsClearingDeliveryHistory] =
    useState(false)
  const [loadingWebhookId, setLoadingWebhookId] = useState<string | null>(null)
  const [latestSigningSecret, setLatestSigningSecret] = useState<string | null>(
    null
  )
  const [expandedWebhookId, setExpandedWebhookId] = useState<string | null>(
    null
  )
  const [telegramChannelBotToken, setTelegramChannelBotToken] = useState("")
  const [isConnectingTelegram, setIsConnectingTelegram] = useState(false)
  const [isDisconnectingTelegram, setIsDisconnectingTelegram] = useState(false)
  const [isStartingInstagramOAuth, setIsStartingInstagramOAuth] = useState(false)
  const [isDisconnectingInstagram, setIsDisconnectingInstagram] =
    useState(false)
  const [isResyncingInstagram, setIsResyncingInstagram] = useState(false)
  const [whatsappChannelAccessToken, setWhatsappChannelAccessToken] =
    useState("")
  const [whatsappChannelPhoneNumberId, setWhatsappChannelPhoneNumberId] =
    useState("")
  const [whatsappChannelBusinessAccountId, setWhatsappChannelBusinessAccountId] =
    useState("")
  const [isConnectingWhatsapp, setIsConnectingWhatsapp] = useState(false)
  const [isDisconnectingWhatsapp, setIsDisconnectingWhatsapp] = useState(false)

  const normalizedScriptUrl = useMemo(
    () => normalizeScriptUrl(scriptUrl),
    [scriptUrl]
  )
  const scriptUrlIsValid = useMemo(
    () => isValidWidgetScriptUrl(normalizedScriptUrl),
    [normalizedScriptUrl]
  )
  const selectedIntegrationItem = useMemo(
    () => INTEGRATIONS.find((i) => i.id === selectedIntegration),
    [selectedIntegration]
  )
  const selectedWebhookProviderItem = useMemo(
    () => webhookProviderById[selectedWebhookProvider],
    [selectedWebhookProvider]
  )

  const snippet = useMemo(() => {
    if (!organization?.id) return ""
    return createScript(selectedIntegration, {
      organizationId: organization.id,
      scriptUrl: normalizedScriptUrl,
      position,
    })
  }, [organization?.id, selectedIntegration, normalizedScriptUrl, position])

  const snippetTokens = useMemo(() => tokenizeSnippet(snippet), [snippet])

  const webhookDashboard = useQuery(
    (api as any).private.integrationWebhooks.getDashboard,
    {}
  ) as WebhookDashboard | undefined
  const telegramDashboard = useQuery(
    (api as any).private.telegram.getDashboard,
    {}
  ) as TelegramDashboard | undefined
  const instagramDashboard = useQuery(
    (api as any).private.instagram.getDashboard,
    {}
  ) as InstagramDashboard | undefined
  const whatsappDashboard = useQuery(
    (api as any).private.whatsapp.getDashboard,
    {}
  ) as WhatsAppDashboard | undefined
  const providerStatuses = useQuery(api.private.secrets.getProviderStatuses) as
    | ProviderStatuses
    | undefined

  const connectTelegram = useAction(
    (api as any).private.telegram.connect
  ) as (args: { botToken: string }) => Promise<{
    integrationId: string
    botUsername?: string
    status: "connected" | "needs_webhook_url"
    webhookUrl?: string
  }>

  const disconnectTelegram = useAction(
    (api as any).private.telegram.disconnect
  )

  const getInstagramOAuthAuthorizationUrl = useAction(
    (api as any).private.instagram.getOAuthAuthorizationUrl
  ) as () => Promise<{ authorizationUrl: string }>

  const disconnectInstagram = useAction(
    (api as any).private.instagram.disconnect
  ) as () => Promise<{ removed: boolean }>

  const resyncInstagramWebhooks = useAction(
    (api as any).private.instagram.resyncWebhooks
  ) as () => Promise<{
    status: "connected" | "needs_webhook_url"
    webhookUrl?: string
    verifyToken: string
    setupError?: string
  }>

  const connectWhatsapp = useAction(
    (api as any).private.whatsapp.connect
  ) as (args: {
    accessToken: string
    phoneNumberId: string
    businessAccountId?: string
  }) => Promise<{
    integrationId: string
    phoneNumberId: string
    displayPhoneNumber?: string
    status: "connected" | "needs_webhook_url"
    webhookUrl?: string
    verifyToken: string
  }>

  const disconnectWhatsapp = useAction(
    (api as any).private.whatsapp.disconnect
  ) as () => Promise<{ removed: boolean }>

  useEffect(() => {
    const section = searchParams.get("section")

    if (
      section === "widget" ||
      section === "apiKeys" ||
      section === "telegram" ||
      section === "instagram" ||
      section === "whatsapp" ||
      section === "webhooks"
    ) {
      setActiveSection(section)
    }
  }, [searchParams])

  const createWebhook = useMutation(
    (api as any).private.integrationWebhooks.createWebhook
  ) as (args: {
    url?: string
    description?: string
    provider: WebhookProvider
    providerConfig?: {
      telegramBotToken?: string
      telegramChatId?: string
      whatsappAccessToken?: string
      whatsappPhoneNumberId?: string
      whatsappRecipientPhone?: string
    }
    eventTypes: WebhookEventType[]
  }) => Promise<{ webhookId: string; signingSecret: string }>

  const updateWebhook = useMutation(
    (api as any).private.integrationWebhooks.updateWebhook
  ) as (args: {
    webhookId: string
    isEnabled?: boolean
    url?: string
    description?: string
    eventTypes?: WebhookEventType[]
    provider?: WebhookProvider
    providerConfig?: {
      telegramBotToken?: string
      telegramChatId?: string
      whatsappAccessToken?: string
      whatsappPhoneNumberId?: string
      whatsappRecipientPhone?: string
    }
  }) => Promise<void>

  const rotateSigningSecret = useMutation(
    (api as any).private.integrationWebhooks.rotateSigningSecret
  ) as (args: { webhookId: string }) => Promise<{ signingSecret: string }>
  const removeWebhook = useMutation(
    (api as any).private.integrationWebhooks.removeWebhook
  ) as (args: { webhookId: string }) => Promise<void>
  const clearDeliveryHistory = useMutation(
    (api as any).private.integrationWebhooks.clearDeliveryHistory
  ) as (args: {
    webhookId?: string
  }) => Promise<{ deletedCount: number; hasMore: boolean }>

  const copyText = async (
    value: string,
    successMessage: string,
    errorMessage: string
  ) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(successMessage)
    } catch {
      toast.error(errorMessage)
    }
  }

  const handleCopyOrganizationId = async () => {
    if (!organization?.id) {
      toast.error("Organization ID not found")
      return
    }
    await copyText(
      organization.id,
      "Organization ID copied",
      "Failed to copy organization ID"
    )
  }

  const handleCopySnippet = async () => {
    if (!snippet) {
      toast.error("Generate a snippet first")
      return
    }
    try {
      await navigator.clipboard.writeText(snippet)
      toast.success("Snippet copied to clipboard")
      setSnippetCopied(true)
      setTimeout(() => setSnippetCopied(false), 2000)
    } catch {
      toast.error("Failed to copy snippet")
    }
  }

  const handleCreateWebhook = async () => {
    const normalizedUrl = webhookUrl.trim()
    const isUrlRequired =
      selectedWebhookProvider === "webhook" ||
      selectedWebhookProvider === "discord"
    if (isUrlRequired && !normalizedUrl) {
      toast.error("Destination URL is required")
      return
    }
    if (
      selectedWebhookProvider === "telegram" &&
      (!telegramBotToken.trim() || !telegramChatId.trim())
    ) {
      toast.error("Telegram requires bot token and chat ID")
      return
    }
    if (
      selectedWebhookProvider === "whatsapp" &&
      (!whatsappAccessToken.trim() ||
        !whatsappPhoneNumberId.trim() ||
        !whatsappRecipientPhone.trim())
    ) {
      toast.error(
        "WhatsApp requires access token, phone number ID, and recipient"
      )
      return
    }
    if (selectedWebhookEvents.length === 0) {
      toast.error("Select at least one event type")
      return
    }

    setIsCreatingWebhook(true)
    try {
      const providerConfig =
        selectedWebhookProvider === "telegram"
          ? {
              telegramBotToken: telegramBotToken.trim(),
              telegramChatId: telegramChatId.trim(),
            }
          : selectedWebhookProvider === "whatsapp"
            ? {
                whatsappAccessToken: whatsappAccessToken.trim(),
                whatsappPhoneNumberId: whatsappPhoneNumberId.trim(),
                whatsappRecipientPhone: whatsappRecipientPhone.trim(),
              }
            : undefined

      const result = await createWebhook({
        url: normalizedUrl || undefined,
        description: webhookDescription.trim() || undefined,
        provider: selectedWebhookProvider,
        providerConfig,
        eventTypes: selectedWebhookEvents,
      })
      setLatestSigningSecret(result.signingSecret)
      setWebhookUrl(selectedWebhookProviderItem.defaultUrl)
      setWebhookDescription("")
      setTelegramBotToken("")
      setTelegramChatId("")
      setWhatsappAccessToken("")
      setWhatsappPhoneNumberId("")
      setWhatsappRecipientPhone("")
      toast.success("Webhook destination created")
    } catch {
      toast.error("Failed to create webhook destination")
    } finally {
      setIsCreatingWebhook(false)
    }
  }

  const handleConnectTelegram = async () => {
    if (!telegramChannelBotToken.trim()) {
      toast.error("Telegram bot token is required")
      return
    }

    setIsConnectingTelegram(true)
    try {
      const result = await connectTelegram({
        botToken: telegramChannelBotToken.trim(),
      })
      setTelegramChannelBotToken("")
      if (result.status === "connected") {
        toast.success(
          result.botUsername
            ? `Connected @${result.botUsername}`
            : "Telegram bot connected"
        )
      } else {
        toast.info("Bot saved. Add a webhook base URL to receive messages.")
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to connect Telegram bot"
      )
    } finally {
      setIsConnectingTelegram(false)
    }
  }

  const handleDisconnectTelegram = async () => {
    setIsDisconnectingTelegram(true)
    try {
      await disconnectTelegram()
      toast.success("Telegram bot disconnected")
    } catch {
      toast.error("Failed to disconnect Telegram bot")
    } finally {
      setIsDisconnectingTelegram(false)
    }
  }

  const handleConnectInstagram = async () => {
    setIsStartingInstagramOAuth(true)
    try {
      const { authorizationUrl } = await getInstagramOAuthAuthorizationUrl()
      window.location.assign(authorizationUrl)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to start Instagram authorization"
      )
      setIsStartingInstagramOAuth(false)
    }
  }

  const handleDisconnectInstagram = async () => {
    setIsDisconnectingInstagram(true)
    try {
      await disconnectInstagram()
      toast.success("Instagram account disconnected")
    } catch {
      toast.error("Failed to disconnect Instagram account")
    } finally {
      setIsDisconnectingInstagram(false)
    }
  }

  const handleResyncInstagramWebhooks = async () => {
    setIsResyncingInstagram(true)
    try {
      const result = await resyncInstagramWebhooks()
      if (result.status === "connected") {
        toast.success("Instagram webhooks refreshed")
      } else {
        toast.error(
          result.setupError ||
            "Instagram connected, but webhook setup still needs attention"
        )
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to refresh Instagram webhooks"
      )
    } finally {
      setIsResyncingInstagram(false)
    }
  }

  const handleConnectWhatsapp = async () => {
    if (
      !whatsappChannelPhoneNumberId.trim() ||
      !whatsappChannelAccessToken.trim()
    ) {
      toast.error("WhatsApp phone number ID and access token are required")
      return
    }

    setIsConnectingWhatsapp(true)
    try {
      const result = await connectWhatsapp({
        phoneNumberId: whatsappChannelPhoneNumberId.trim(),
        accessToken: whatsappChannelAccessToken.trim(),
        businessAccountId:
          whatsappChannelBusinessAccountId.trim() || undefined,
      })
      setWhatsappChannelPhoneNumberId("")
      setWhatsappChannelAccessToken("")
      setWhatsappChannelBusinessAccountId("")
      if (result.status === "connected") {
        toast.success(
          result.displayPhoneNumber
            ? `Connected ${result.displayPhoneNumber}`
            : "WhatsApp number connected"
        )
      } else {
        toast.info(
          "WhatsApp number saved. Add a webhook base URL to receive messages."
        )
      }
    } catch {
      toast.error("Failed to connect WhatsApp number")
    } finally {
      setIsConnectingWhatsapp(false)
    }
  }

  const handleDisconnectWhatsapp = async () => {
    setIsDisconnectingWhatsapp(true)
    try {
      await disconnectWhatsapp()
      toast.success("WhatsApp number disconnected")
    } catch {
      toast.error("Failed to disconnect WhatsApp number")
    } finally {
      setIsDisconnectingWhatsapp(false)
    }
  }

  const handleToggleWebhookEvent = (eventType: WebhookEventType) => {
    setSelectedWebhookEvents((prev) =>
      prev.includes(eventType)
        ? prev.filter((v) => v !== eventType)
        : [...prev, eventType]
    )
  }

  const handleWebhookProviderChange = (provider: WebhookProvider) => {
    setSelectedWebhookProvider(provider)
    setWebhookUrl(webhookProviderById[provider].defaultUrl)
  }

  const handleToggleWebhookEnabled = async (webhook: WebhookDestination) => {
    setLoadingWebhookId(webhook._id)
    try {
      await updateWebhook({
        webhookId: webhook._id,
        isEnabled: !webhook.isEnabled,
      })
      toast.success(
        webhook.isEnabled
          ? "Webhook destination disabled"
          : "Webhook destination enabled"
      )
    } catch {
      toast.error("Failed to update webhook destination")
    } finally {
      setLoadingWebhookId(null)
    }
  }

  const handleRotateSigningSecret = async (webhook: WebhookDestination) => {
    setLoadingWebhookId(webhook._id)
    try {
      const result = await rotateSigningSecret({ webhookId: webhook._id })
      setLatestSigningSecret(result.signingSecret)
      toast.success("Signing secret rotated")
    } catch {
      toast.error("Failed to rotate signing secret")
    } finally {
      setLoadingWebhookId(null)
    }
  }

  const handleDeleteWebhook = async (webhook: WebhookDestination) => {
    setLoadingWebhookId(webhook._id)
    try {
      await removeWebhook({ webhookId: webhook._id })
      toast.success("Webhook destination removed")
    } catch {
      toast.error("Failed to remove webhook destination")
    } finally {
      setLoadingWebhookId(null)
    }
  }

  const handleClearDeliveryHistory = async () => {
    if (deliveryLogs.length === 0) {
      toast.info("No delivery history to clear")
      return
    }
    setIsClearingDeliveryHistory(true)
    try {
      let totalDeleted = 0
      let hasMore = true
      let safetyCounter = 0
      while (hasMore && safetyCounter < 20) {
        const result = await clearDeliveryHistory({})
        totalDeleted += result.deletedCount
        hasMore = result.hasMore && result.deletedCount > 0
        safetyCounter += 1
        if (result.deletedCount === 0) break
      }
      if (totalDeleted > 0) {
        toast.success(
          `Cleared ${totalDeleted} delivery histor${totalDeleted === 1 ? "y entry" : "y entries"}`
        )
      } else {
        toast.info("No delivery history to clear")
      }
    } catch {
      toast.error("Failed to clear delivery history")
    } finally {
      setIsClearingDeliveryHistory(false)
    }
  }

  const resetGenerator = () => {
    setSelectedIntegration("html5")
    setScriptUrl(DEFAULT_WIDGET_SCRIPT_URL)
    setPosition("bottom-right")
  }

  const webhookDestinations = webhookDashboard?.webhooks ?? []
  const deliveryLogs = webhookDashboard?.deliveries ?? []
  const telegramIntegration = telegramDashboard?.integration ?? null
  const instagramIntegration = instagramDashboard?.integration ?? null
  const whatsappIntegration = whatsappDashboard?.integration ?? null
  const configuredApiKeyCount = [
    providerStatuses?.openaiConfigured ??
      providerStatuses?.openaiRealtimeConfigured,
    providerStatuses?.geminiLiveConfigured,
  ].filter(Boolean).length

  const hasOverflowingDeliveryHistory =
    deliveryLogs.length > DELIVERY_HISTORY_VISIBLE_COUNT
  const successCount = deliveryLogs.filter((d) => d.status === "success").length
  const failedCount = deliveryLogs.filter((d) => d.status === "failed").length

  // Last delivery per webhook
  const lastDeliveryByWebhookId = useMemo(() => {
    const map: Record<string, WebhookDelivery> = {}
    for (const d of deliveryLogs) {
      if (!map[d.webhookId]) map[d.webhookId] = d
    }
    return map
  }, [deliveryLogs])

  const NAV_ITEMS: {
    id: ActiveSection
    label: string
    icon: React.ReactNode
    count?: number
  }[] = [
    {
      id: "widget",
      label: "Widget Setup",
      icon: <PlugZapIcon className="size-4" />,
    },
    {
      id: "apiKeys",
      label: "API Keys",
      icon: <KeyRoundIcon className="size-4" />,
      count: configuredApiKeyCount,
    },
    {
      id: "telegram",
      label: "Telegram Bot",
      icon: <SendIcon className="size-4" />,
      count: telegramIntegration ? 1 : undefined,
    },
    {
      id: "instagram",
      label: "Instagram",
      icon: <InstagramIcon className="size-4" />,
      count: instagramIntegration ? 1 : undefined,
    },
    {
      id: "whatsapp",
      label: "WhatsApp",
      icon: <ProviderIcon provider="whatsapp" size={16} />,
      count: whatsappIntegration ? 1 : undefined,
    },
    {
      id: "webhooks",
      label: "Event Webhooks",
      icon: <WebhookIcon className="size-4" />,
      count: webhookDestinations.length,
    },
  ]

  return (
    <div className="flex h-full min-h-0 flex-col overflow-x-hidden overflow-y-auto bg-transparent">
      <div className="mx-auto w-full max-w-[1540px] px-3 py-3 sm:px-4 sm:py-4 lg:px-5">
        <div className="surface-frosted mb-4 rounded-[22px] px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background shadow-sm">
                <PlugZapIcon className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                  Setup
                </p>
                <h1 className="mt-1 text-xl font-semibold tracking-tight">
                  Setup & integrations
                </h1>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Install the widget, generate embed code, and manage event
                  destinations.
                </p>
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex min-w-0 items-center gap-2 rounded-xl border border-border/70 bg-background/60 px-3 py-2">
                <KeyRoundIcon className="size-3.5 shrink-0 text-muted-foreground" />
                <code className="min-w-0 flex-1 truncate font-mono text-xs text-foreground sm:max-w-[340px]">
                  {organization?.id ?? "—"}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 shrink-0 gap-1.5 px-2 text-xs"
                  onClick={handleCopyOrganizationId}
                  type="button"
                >
                  <CopyIcon className="size-3.5" />
                  Copy
                </Button>
              </div>
              <div className="grid shrink-0 grid-cols-2 overflow-hidden rounded-xl border border-border/70 bg-background/60">
                <div className="border-r border-border/70 px-3 py-2 text-center">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase">
                    Webhooks
                  </p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums">
                    {webhookDestinations.length}
                  </p>
                </div>
                <div className="px-3 py-2 text-center">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase">
                    Events
                  </p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums">
                    {deliveryLogs.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-1 rounded-2xl border border-border/70 bg-background/58 p-1 sm:inline-grid sm:grid-cols-6">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                type="button"
                className={cn(
                  "flex min-w-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                  activeSection === item.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                      activeSection === item.id
                        ? "bg-primary-foreground/18 text-primary-foreground"
                        : "bg-primary/10 text-primary"
                    )}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ─── WIDGET SETUP ─── */}
        {activeSection === "widget" && (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,430px)_minmax(0,1fr)]">
            <section className="surface-sidebar min-w-0 rounded-[22px] p-3">
              <div className="px-1 py-1">
                <p className="text-[10px] font-semibold tracking-[0.12em] text-sidebar-foreground/46 uppercase">
                  Widget setup
                </p>
                <h2 className="mt-1 text-base font-semibold text-sidebar-foreground">
                  Install target
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-sidebar-foreground/58">
                  Pick your environment, then tune the generated embed snippet.
                </p>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
                {INTEGRATIONS.map((integration) => {
                  const isSelected = integration.id === selectedIntegration
                  const isPopular =
                    integration.id === "react" || integration.id === "nextjs"
                  return (
                    <button
                      key={integration.id}
                      className={cn(
                        "group relative w-full min-w-0 rounded-xl border px-3 py-3 text-left",
                        "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0",
                        isSelected
                          ? "border-sidebar-primary/25 bg-sidebar-accent/95 shadow-sm"
                          : "border-transparent bg-sidebar-accent/48 hover:border-sidebar-border/70 hover:bg-sidebar-accent/75"
                      )}
                      onClick={() => setSelectedIntegration(integration.id)}
                      type="button"
                    >
                      {isSelected && (
                        <span className="absolute top-2.5 right-2.5 size-2 rounded-full bg-primary" />
                      )}
                      {isPopular && !isSelected && (
                        <span className="absolute top-2 right-2 rounded-full bg-sidebar/80 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-sidebar-foreground/58 uppercase">
                          Popular
                        </span>
                      )}
                      <div className="mb-2 flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-background/88 transition-transform duration-200 group-hover:scale-105">
                          <Image
                            alt={integration.title}
                            height={24}
                            src={integration.icon}
                            width={24}
                          />
                        </div>
                        <span className="text-sm font-semibold text-sidebar-foreground">
                          {integration.title}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-sidebar-foreground/58">
                        {integration.description}
                      </p>
                    </button>
                  )
                })}
              </div>

              <div className="mt-3 space-y-4 rounded-2xl border border-sidebar-border/70 bg-sidebar/58 p-3">
                <div>
                  <p className="text-xs font-semibold text-sidebar-foreground">
                    Configuration
                  </p>
                  <p className="mt-0.5 text-[11px] text-sidebar-foreground/55">
                    Embed source and launcher placement.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="widget-script-url"
                    className="text-xs text-sidebar-foreground/58"
                  >
                    Script URL
                  </Label>
                  <Input
                    id="widget-script-url"
                    onChange={(e) => setScriptUrl(e.target.value)}
                    placeholder="https://widget.osonflow.uz/widget.js"
                    value={scriptUrl}
                    className={cn(
                      "h-10 min-w-0 bg-sidebar-accent/70 font-mono text-xs",
                      scriptUrlIsValid &&
                        "border-green-500/50 focus-visible:ring-green-500/20"
                    )}
                  />
                  <p
                    className={cn(
                      "text-xs",
                      scriptUrlIsValid
                        ? "text-green-600 dark:text-green-400"
                        : "text-muted-foreground"
                    )}
                  >
                    {scriptUrlIsValid
                      ? "Valid URL — will be used in generated snippets."
                      : "Use an absolute http(s) URL for the widget script."}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="launcher-position"
                    className="text-xs text-sidebar-foreground/58"
                  >
                    Launcher Position
                  </Label>
                  <Select
                    onValueChange={(v) => setPosition(v as WidgetPosition)}
                    value={position}
                  >
                    <SelectTrigger
                      className="h-10 w-full min-w-0 bg-sidebar-accent/70"
                      id="launcher-position"
                    >
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      {WIDGET_POSITIONS.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <button
                  className="text-xs font-medium text-sidebar-primary transition-colors hover:text-sidebar-primary/80"
                  onClick={resetGenerator}
                  type="button"
                >
                  Reset to defaults
                </button>
              </div>
            </section>

            <section className="surface-panel min-w-0 overflow-hidden rounded-[22px] shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 bg-background/62 px-4 py-4 sm:px-5">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                    Generated snippet
                  </p>
                  <h2 className="mt-1 text-base font-semibold">
                    {selectedIntegrationItem?.title ?? "Framework"} install code
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Includes your organization ID and launcher position.
                  </p>
                </div>
                <Button
                  className={cn(
                    "gap-2 transition-all duration-200",
                    snippetCopied && "text-green-600"
                  )}
                  disabled={!snippet || !scriptUrlIsValid}
                  onClick={handleCopySnippet}
                  size="sm"
                  type="button"
                  variant={snippetCopied ? "outline" : "default"}
                >
                  {snippetCopied ? (
                    <>
                      <CheckCircle2Icon className="size-3.5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <CopyIcon className="size-3.5" />
                      Copy snippet
                    </>
                  )}
                </Button>
              </div>

              <div className="min-w-0 overflow-hidden">
                <div className="flex items-center justify-between bg-zinc-900 px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="size-3 rounded-full bg-red-500/70" />
                    <span className="size-3 rounded-full bg-yellow-500/70" />
                    <span className="size-3 rounded-full bg-green-500/70" />
                  </div>
                  <span className="font-mono text-xs text-zinc-400">
                    {selectedIntegrationItem?.title ?? "snippet"}
                  </span>
                  <div className="w-16" aria-hidden="true" />
                </div>
                <div className="min-h-[320px] w-full min-w-0 overflow-auto bg-zinc-950 p-4 sm:min-h-[380px] sm:p-5">
                  <pre className="font-mono text-xs leading-relaxed whitespace-pre">
                    {snippet ? (
                      snippetTokens.map((tok, i) => (
                        <span key={i} className={tok.cls}>
                          {tok.text}
                        </span>
                      ))
                    ) : (
                      <span className="text-zinc-600">
                        // Select an organization to generate your snippet.
                      </span>
                    )}
                  </pre>
                </div>
              </div>

              <div className="border-t border-border/70 bg-background/62 p-4 sm:p-5">
                <ol className="list-none space-y-2 text-sm text-muted-foreground">
                  {[
                    "Copy the snippet above.",
                    "Paste it into your app, layout, root component, or HTML page.",
                    "Publish and test on your live page.",
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          </div>
        )}

        {/* ─── API KEYS ─── */}
        {activeSection === "apiKeys" && (
          <ProFeatureGate>
            <ApiKeysSection providerStatuses={providerStatuses} />
          </ProFeatureGate>
        )}

        {/* ─── TELEGRAM BOT ─── */}
        {activeSection === "telegram" && (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,430px)_minmax(0,1fr)]">
            <section className="surface-sidebar min-w-0 rounded-[22px] p-3">
              <div className="px-1 py-1">
                <p className="text-[10px] font-semibold tracking-[0.12em] text-sidebar-foreground/46 uppercase">
                  Channel
                </p>
                <h2 className="mt-1 text-base font-semibold text-sidebar-foreground">
                  Connect Telegram
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-sidebar-foreground/58">
                  Add your BotFather token and route Telegram chats into the
                  Osonflow inbox.
                </p>
              </div>

              <div className="mt-3 space-y-4 rounded-2xl border border-sidebar-border/70 bg-sidebar/58 p-3">
                <div className="flex items-center gap-3 rounded-xl border border-sidebar-border/70 bg-sidebar-accent/45 p-3">
                  <ProviderIcon provider="telegram" size={30} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-sidebar-foreground">
                      Telegram bot channel
                    </p>
                    <p className="text-xs text-sidebar-foreground/58">
                      Customer messages become support conversations.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="telegram-channel-token"
                    className="text-xs text-sidebar-foreground/58"
                  >
                    Bot Token
                  </Label>
                  <Input
                    className="bg-sidebar-accent/70 font-mono text-xs"
                    id="telegram-channel-token"
                    onChange={(e) => setTelegramChannelBotToken(e.target.value)}
                    placeholder="123456789:AA..."
                    type="password"
                    value={telegramChannelBotToken}
                  />
                </div>

                <Button
                  className="w-full gap-2"
                  disabled={isConnectingTelegram}
                  onClick={handleConnectTelegram}
                  type="button"
                >
                  {isConnectingTelegram ? (
                    <>
                      <Loader2Icon className="size-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <SendIcon className="size-4" />
                      Connect Telegram Bot
                    </>
                  )}
                </Button>
              </div>
            </section>

            <section className="surface-panel min-w-0 overflow-hidden rounded-[22px] shadow-sm">
              <div className="flex items-center justify-between border-b border-border/70 bg-background/62 px-4 py-4 sm:px-5">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background shadow-sm">
                    <BotIcon className="size-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                      Telegram
                    </p>
                    <h2 className="mt-1 text-base font-semibold">
                      Channel status
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      One bot per organization for now.
                    </p>
                  </div>
                </div>
                <Badge
                  variant={telegramIntegration ? "default" : "outline"}
                  className="shrink-0 text-xs"
                >
                  {telegramIntegration ? "Connected" : "Not connected"}
                </Badge>
              </div>

              <div className="p-4 sm:p-5">
                {!telegramIntegration ? (
                  <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-14 text-center">
                    <ProviderIcon provider="telegram" size={46} />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        No Telegram bot connected
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground/60">
                        Connect a bot to receive Telegram chats in Osonflow.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background/60 p-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <ProviderIcon provider="telegram" size={34} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {telegramIntegration.botUsername
                              ? `@${telegramIntegration.botUsername}`
                              : "Connected"}
                          </p>
                          <p className="text-xs capitalize text-muted-foreground">
                            {telegramIntegration.status.replaceAll("_", " ")}
                          </p>
                        </div>
                      </div>
                      <Button
                        aria-label="Disconnect Telegram"
                        className="size-9 p-0"
                        disabled={isDisconnectingTelegram}
                        onClick={handleDisconnectTelegram}
                        title="Disconnect Telegram"
                        type="button"
                        variant="destructive"
                      >
                        {isDisconnectingTelegram ? (
                          <Loader2Icon className="size-4 animate-spin" />
                        ) : (
                          <Trash2Icon className="size-4" />
                        )}
                      </Button>
                    </div>

                    {telegramIntegration.setupError ? (
                      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                        {telegramIntegration.setupError}
                      </div>
                    ) : null}

                    <p className="text-xs text-muted-foreground">
                      After connecting, open your bot in Telegram, tap Start,
                      then send a normal message. Only text messages are handled
                      right now.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* ─── INSTAGRAM ─── */}
        {activeSection === "instagram" && (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,430px)_minmax(0,1fr)]">
            <section className="surface-sidebar min-w-0 rounded-[22px] p-3">
              <div className="px-1 py-1">
                <p className="text-[10px] font-semibold tracking-[0.12em] text-sidebar-foreground/46 uppercase">
                  Channel
                </p>
                <h2 className="mt-1 text-base font-semibold text-sidebar-foreground">
                  Connect Instagram
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-sidebar-foreground/58">
                  Sign in with Instagram to route DMs and comments into the
                  Osonflow inbox.
                </p>
              </div>

              <div className="mt-3 space-y-4 rounded-2xl border border-sidebar-border/70 bg-sidebar/58 p-3">
                <div className="flex items-center gap-3 rounded-xl border border-sidebar-border/70 bg-sidebar-accent/45 p-3">
                  <ChannelIcon channel="instagram" size={30} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-sidebar-foreground">
                      Instagram DM channel
                    </p>
                    <p className="text-xs text-sidebar-foreground/58">
                      Customer DMs become support conversations.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-sidebar-border/70 bg-sidebar-accent/35 p-3">
                  <div className="flex items-start gap-2">
                    <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-blue-500" />
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-sidebar-foreground">
                        Osonflow will request permission to:
                      </p>
                      <ul className="space-y-1 text-xs text-sidebar-foreground/68">
                        <li>Read and reply to DM messages</li>
                        <li>Read and reply to post comments</li>
                        <li>Access account profile information</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full gap-2"
                  disabled={isStartingInstagramOAuth || Boolean(instagramIntegration)}
                  onClick={handleConnectInstagram}
                  type="button"
                >
                  {isStartingInstagramOAuth ? (
                    <>
                      <Loader2Icon className="size-4 animate-spin" />
                      Redirecting to Instagram...
                    </>
                  ) : (
                    <>
                      <InstagramIcon className="size-4" />
                      Continue with Instagram
                      <ExternalLinkIcon className="size-4 opacity-70" />
                    </>
                  )}
                </Button>

                <p className="text-center text-[11px] leading-relaxed text-sidebar-foreground/52">
                  You will be redirected to Instagram to authorize access.
                </p>
              </div>
            </section>

            <section className="surface-panel min-w-0 overflow-hidden rounded-[22px] shadow-sm">
              <div className="flex items-center justify-between border-b border-border/70 bg-background/62 px-4 py-4 sm:px-5">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background shadow-sm">
                    <InstagramIcon className="size-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                      Instagram
                    </p>
                    <h2 className="mt-1 text-base font-semibold">
                      Channel status
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      One Instagram account per organization for now.
                    </p>
                  </div>
                </div>
                <Badge
                  variant={instagramIntegration ? "default" : "outline"}
                  className="shrink-0 text-xs"
                >
                  {instagramIntegration ? "Connected" : "Not connected"}
                </Badge>
              </div>

              <div className="p-4 sm:p-5">
                {!instagramIntegration ? (
                  <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-14 text-center">
                    <ChannelIcon channel="instagram" size={46} />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        No Instagram account connected
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground/60">
                        Connect an account to receive Instagram DMs in Osonflow.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background/60 p-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <ChannelIcon channel="instagram" size={34} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {instagramIntegration.username
                              ? `@${instagramIntegration.username}`
                              : "Connected"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {instagramIntegration.instagramUserId}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          disabled={isResyncingInstagram}
                          onClick={handleResyncInstagramWebhooks}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          {isResyncingInstagram ? (
                            <Loader2Icon className="size-4 animate-spin" />
                          ) : (
                            "Refresh webhooks"
                          )}
                        </Button>
                        <Button
                          aria-label="Disconnect Instagram"
                          className="size-9 p-0"
                          disabled={isDisconnectingInstagram}
                          onClick={handleDisconnectInstagram}
                          title="Disconnect Instagram"
                          type="button"
                          variant="destructive"
                        >
                          {isDisconnectingInstagram ? (
                            <Loader2Icon className="size-4 animate-spin" />
                          ) : (
                            <Trash2Icon className="size-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Instagram DMs are routed into your Osonflow inbox after
                      Meta webhooks are configured.
                    </p>

                    {instagramIntegration.status === "needs_webhook_url" && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        {instagramIntegration.setupError
                          ? instagramIntegration.setupError
                          : "Finish Meta webhook setup to start receiving Instagram DMs."}
                      </p>
                    )}

                    {instagramIntegration.webhookUrl && (
                      <div className="rounded-lg border bg-background/60 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-muted-foreground">
                              Meta callback URL
                            </p>
                            <code className="mt-1 block truncate font-mono text-xs">
                              {instagramIntegration.webhookUrl}
                            </code>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="shrink-0 gap-1.5"
                            onClick={() =>
                              copyText(
                                instagramIntegration.webhookUrl || "",
                                "Callback URL copied",
                                "Failed to copy callback URL"
                              )
                            }
                            type="button"
                          >
                            <CopyIcon className="size-3.5" />
                            Copy
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="rounded-lg border bg-background/60 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-muted-foreground">
                            Meta verify token
                          </p>
                          <code className="mt-1 block truncate font-mono text-xs">
                            {instagramIntegration.verifyToken}
                          </code>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 gap-1.5"
                          onClick={() =>
                            copyText(
                              instagramIntegration.verifyToken,
                              "Verify token copied",
                              "Failed to copy verify token"
                            )
                          }
                          type="button"
                        >
                          <CopyIcon className="size-3.5" />
                          Copy
                        </Button>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      In Meta App Dashboard, open Instagram → Webhooks, paste the
                      callback URL and verify token above, then subscribe to{" "}
                      <code className="font-mono">messages</code>.
                    </p>

                    {instagramIntegration.lastWebhookAt && (
                      <p className="text-xs text-muted-foreground">
                        Last webhook{" "}
                        {formatTimeAgo(instagramIntegration.lastWebhookAt)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* ─── WHATSAPP ─── */}
        {activeSection === "whatsapp" && (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,430px)_minmax(0,1fr)]">
            <section className="surface-sidebar min-w-0 rounded-[22px] p-3">
              <div className="px-1 py-1">
                <p className="text-[10px] font-semibold tracking-[0.12em] text-sidebar-foreground/46 uppercase">
                  Channel
                </p>
                <h2 className="mt-1 text-base font-semibold text-sidebar-foreground">
                  Connect WhatsApp
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-sidebar-foreground/58">
                  Add your WhatsApp Cloud API number and route customer messages
                  into the Osonflow inbox.
                </p>
              </div>

              <div className="mt-3 space-y-4 rounded-2xl border border-sidebar-border/70 bg-sidebar/58 p-3">
                <div className="flex items-center gap-3 rounded-xl border border-sidebar-border/70 bg-sidebar-accent/45 p-3">
                  <ChannelIcon channel="whatsapp" size={30} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-sidebar-foreground">
                      WhatsApp channel
                    </p>
                    <p className="text-xs text-sidebar-foreground/58">
                      Customer messages become support conversations.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="whatsapp-channel-phone-number-id"
                    className="text-xs text-sidebar-foreground/58"
                  >
                    Phone Number ID
                  </Label>
                  <Input
                    className="bg-sidebar-accent/70 font-mono text-xs"
                    id="whatsapp-channel-phone-number-id"
                    onChange={(e) =>
                      setWhatsappChannelPhoneNumberId(e.target.value)
                    }
                    placeholder="123456789012345"
                    value={whatsappChannelPhoneNumberId}
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="whatsapp-channel-access-token"
                    className="text-xs text-sidebar-foreground/58"
                  >
                    Access Token
                  </Label>
                  <Input
                    className="bg-sidebar-accent/70 font-mono text-xs"
                    id="whatsapp-channel-access-token"
                    onChange={(e) =>
                      setWhatsappChannelAccessToken(e.target.value)
                    }
                    placeholder="EAAG..."
                    type="password"
                    value={whatsappChannelAccessToken}
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="whatsapp-channel-business-account-id"
                    className="text-xs text-sidebar-foreground/58"
                  >
                    Business Account ID{" "}
                    <span className="text-muted-foreground/60">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    className="bg-sidebar-accent/70 font-mono text-xs"
                    id="whatsapp-channel-business-account-id"
                    onChange={(e) =>
                      setWhatsappChannelBusinessAccountId(e.target.value)
                    }
                    placeholder="987654321098765"
                    value={whatsappChannelBusinessAccountId}
                  />
                </div>

                <Button
                  className="w-full gap-2"
                  disabled={isConnectingWhatsapp}
                  onClick={handleConnectWhatsapp}
                  type="button"
                >
                  {isConnectingWhatsapp ? (
                    <>
                      <Loader2Icon className="size-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <SendIcon className="size-4" />
                      Connect WhatsApp
                    </>
                  )}
                </Button>
              </div>
            </section>

            <section className="surface-panel min-w-0 overflow-hidden rounded-[22px] shadow-sm">
              <div className="flex items-center justify-between border-b border-border/70 bg-background/62 px-4 py-4 sm:px-5">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background shadow-sm">
                    <ProviderIcon provider="whatsapp" size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                      WhatsApp
                    </p>
                    <h2 className="mt-1 text-base font-semibold">
                      Channel status
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      One WhatsApp number per organization for now.
                    </p>
                  </div>
                </div>
                <Badge
                  variant={whatsappIntegration ? "default" : "outline"}
                  className="shrink-0 text-xs"
                >
                  {whatsappIntegration ? "Connected" : "Not connected"}
                </Badge>
              </div>

              <div className="p-4 sm:p-5">
                {!whatsappIntegration ? (
                  <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-14 text-center">
                    <ChannelIcon channel="whatsapp" size={46} />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        No WhatsApp number connected
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground/60">
                        Connect a number to receive WhatsApp messages in
                        Osonflow.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background/60 p-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <ChannelIcon channel="whatsapp" size={34} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {whatsappIntegration.verifiedName ||
                              whatsappIntegration.displayPhoneNumber ||
                              "Connected"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {whatsappIntegration.phoneNumberId}
                          </p>
                        </div>
                      </div>
                      <Button
                        aria-label="Disconnect WhatsApp"
                        className="size-9 p-0"
                        disabled={isDisconnectingWhatsapp}
                        onClick={handleDisconnectWhatsapp}
                        title="Disconnect WhatsApp"
                        type="button"
                        variant="destructive"
                      >
                        {isDisconnectingWhatsapp ? (
                          <Loader2Icon className="size-4 animate-spin" />
                        ) : (
                          <Trash2Icon className="size-4" />
                        )}
                      </Button>
                    </div>

                    {whatsappIntegration.webhookUrl && (
                      <div className="rounded-lg border bg-background/60 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-muted-foreground">
                              Meta callback URL
                            </p>
                            <code className="mt-1 block truncate font-mono text-xs">
                              {whatsappIntegration.webhookUrl}
                            </code>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="shrink-0 gap-1.5"
                            onClick={() =>
                              copyText(
                                whatsappIntegration.webhookUrl || "",
                                "Callback URL copied",
                                "Failed to copy callback URL"
                              )
                            }
                            type="button"
                          >
                            <CopyIcon className="size-3.5" />
                            Copy
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="rounded-lg border bg-background/60 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-muted-foreground">
                            Meta verify token
                          </p>
                          <code className="mt-1 block truncate font-mono text-xs">
                            {whatsappIntegration.verifyToken}
                          </code>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 gap-1.5"
                          onClick={() =>
                            copyText(
                              whatsappIntegration.verifyToken,
                              "Verify token copied",
                              "Failed to copy verify token"
                            )
                          }
                          type="button"
                        >
                          <CopyIcon className="size-3.5" />
                          Copy
                        </Button>
                      </div>
                    </div>

                    {whatsappIntegration.lastWebhookAt && (
                      <p className="text-xs text-muted-foreground">
                        Last webhook{" "}
                        {formatTimeAgo(whatsappIntegration.lastWebhookAt)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* ─── EVENT WEBHOOKS ─── */}
        {activeSection === "webhooks" && (
          <div className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,430px)_minmax(0,1fr)]">
              <section className="surface-sidebar min-w-0 rounded-[22px] p-3">
                <div className="px-1 py-1">
                  <p className="text-[10px] font-semibold tracking-[0.12em] text-sidebar-foreground/46 uppercase">
                    Event destination
                  </p>
                  <h2 className="mt-1 text-base font-semibold text-sidebar-foreground">
                    New destination
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-sidebar-foreground/58">
                    Connect a platform or custom endpoint to receive live
                    events.
                  </p>
                </div>

                <div className="mt-3 space-y-5 rounded-2xl border border-sidebar-border/70 bg-sidebar/58 p-3">
                  {/* Provider picker */}
                  <div className="space-y-2">
                    <Label className="text-xs text-sidebar-foreground/58">
                      Destination Type
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {WEBHOOK_PROVIDERS.map((provider) => {
                        const isActive = selectedWebhookProvider === provider.id
                        return (
                          <button
                            key={provider.id}
                            type="button"
                            onClick={() =>
                              handleWebhookProviderChange(
                                provider.id as WebhookProvider
                              )
                            }
                            className={cn(
                              "flex min-w-0 flex-col items-center gap-1.5 rounded-xl border p-2.5",
                              "transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0",
                              isActive
                                ? "border-sidebar-primary/25 bg-sidebar-accent/95 shadow-sm"
                                : "border-transparent bg-sidebar-accent/48 hover:border-sidebar-border/70 hover:bg-sidebar-accent/75"
                            )}
                          >
                            <div className="flex size-9 items-center justify-center">
                              <ProviderIcon
                                provider={provider.id as WebhookProvider}
                                size={28}
                              />
                            </div>
                            <span
                              className={cn(
                                "w-full truncate text-center text-[10px] leading-none font-medium",
                                isActive
                                  ? "text-sidebar-foreground"
                                  : "text-sidebar-foreground/58"
                              )}
                            >
                              {provider.label}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                    <p className="text-xs text-sidebar-foreground/58">
                      {selectedWebhookProviderItem.description}
                    </p>
                  </div>

                  <div className="h-px bg-sidebar-border/70" />

                  {/* URL */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="webhook-url"
                      className="text-xs text-sidebar-foreground/58"
                    >
                      {selectedWebhookProvider === "telegram" ||
                      selectedWebhookProvider === "whatsapp"
                        ? "Endpoint URL (optional override)"
                        : "Destination URL"}
                    </Label>
                    <Input
                      id="webhook-url"
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder={selectedWebhookProviderItem.defaultUrl}
                      value={webhookUrl}
                      className="h-10 min-w-0 bg-sidebar-accent/70 font-mono text-xs"
                    />
                    <p className="text-xs text-sidebar-foreground/58">
                      {selectedWebhookProvider === "telegram" ||
                      selectedWebhookProvider === "whatsapp"
                        ? "Leave as default unless using a custom relay endpoint."
                        : "Use the webhook URL from your destination app."}
                    </p>
                  </div>

                  {/* Telegram fields */}
                  {selectedWebhookProvider === "telegram" && (
                    <div className="space-y-3 rounded-xl border border-sidebar-border/70 bg-sidebar-accent/45 p-3">
                      <div className="mb-1 flex items-center gap-2">
                        <ProviderIcon provider="telegram" size={14} />
                        <span className="text-xs font-medium text-sidebar-foreground/58">
                          Telegram Config
                        </span>
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="telegram-bot-token"
                          className="text-xs text-sidebar-foreground/58"
                        >
                          Bot Token
                        </Label>
                        <Input
                          className="bg-sidebar/70"
                          id="telegram-bot-token"
                          onChange={(e) => setTelegramBotToken(e.target.value)}
                          placeholder="123456789:AA..."
                          type="password"
                          value={telegramBotToken}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="telegram-chat-id"
                          className="text-xs text-sidebar-foreground/58"
                        >
                          Chat ID
                        </Label>
                        <Input
                          className="bg-sidebar/70"
                          id="telegram-chat-id"
                          onChange={(e) => setTelegramChatId(e.target.value)}
                          placeholder="-1001234567890"
                          value={telegramChatId}
                        />
                      </div>
                    </div>
                  )}

                  {/* WhatsApp fields */}
                  {selectedWebhookProvider === "whatsapp" && (
                    <div className="space-y-3 rounded-xl border border-sidebar-border/70 bg-sidebar-accent/45 p-3">
                      <div className="mb-1 flex items-center gap-2">
                        <ProviderIcon provider="whatsapp" size={14} />
                        <span className="text-xs font-medium text-sidebar-foreground/58">
                          WhatsApp Config
                        </span>
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="whatsapp-access-token"
                          className="text-xs text-sidebar-foreground/58"
                        >
                          Access Token
                        </Label>
                        <Input
                          className="bg-sidebar/70"
                          id="whatsapp-access-token"
                          onChange={(e) =>
                            setWhatsappAccessToken(e.target.value)
                          }
                          placeholder="EAAG..."
                          type="password"
                          value={whatsappAccessToken}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="whatsapp-phone-number-id"
                          className="text-xs text-sidebar-foreground/58"
                        >
                          Phone Number ID
                        </Label>
                        <Input
                          className="bg-sidebar/70"
                          id="whatsapp-phone-number-id"
                          onChange={(e) =>
                            setWhatsappPhoneNumberId(e.target.value)
                          }
                          placeholder="123456789012345"
                          value={whatsappPhoneNumberId}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="whatsapp-recipient-phone"
                          className="text-xs text-sidebar-foreground/58"
                        >
                          Recipient Phone
                        </Label>
                        <Input
                          className="bg-sidebar/70"
                          id="whatsapp-recipient-phone"
                          onChange={(e) =>
                            setWhatsappRecipientPhone(e.target.value)
                          }
                          placeholder="15551234567"
                          value={whatsappRecipientPhone}
                        />
                      </div>
                    </div>
                  )}

                  {/* Label */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="webhook-description"
                      className="text-xs text-sidebar-foreground/58"
                    >
                      Label{" "}
                      <span className="text-muted-foreground/60">
                        (optional)
                      </span>
                    </Label>
                    <Input
                      className="bg-sidebar-accent/70"
                      id="webhook-description"
                      onChange={(e) => setWebhookDescription(e.target.value)}
                      placeholder="e.g. Production alerts"
                      value={webhookDescription}
                    />
                  </div>

                  {/* Trigger events */}
                  <div className="space-y-2">
                    <Label className="text-xs text-sidebar-foreground/58">
                      Trigger Events
                    </Label>
                    <div className="space-y-1.5">
                      {WEBHOOK_EVENT_TYPES.map((eventType) => {
                        const checked = selectedWebhookEvents.includes(
                          eventType.id
                        )
                        return (
                          <label
                            key={eventType.id}
                            className={cn(
                              "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors",
                              checked
                                ? "border-sidebar-primary/30 bg-sidebar-accent/82"
                                : "border-sidebar-border/60 bg-sidebar-accent/36 hover:bg-sidebar-accent/62"
                            )}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() =>
                                handleToggleWebhookEvent(eventType.id)
                              }
                              className="mt-0.5"
                            />
                            <span className="space-y-0.5">
                              <span className="block text-sm font-medium text-sidebar-foreground">
                                {eventType.label}
                              </span>
                              <span className="block text-xs text-sidebar-foreground/58">
                                {eventType.description}
                              </span>
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  <Button
                    className="w-full gap-2"
                    disabled={isCreatingWebhook}
                    onClick={handleCreateWebhook}
                    type="button"
                  >
                    {isCreatingWebhook ? (
                      <>
                        <Loader2Icon className="size-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <ZapIcon className="size-4" />
                        Create Webhook Destination
                      </>
                    )}
                  </Button>
                </div>

                {/* Signing secret reveal */}
                {latestSigningSecret && (
                  <div className="mt-3 space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                    <div className="flex items-center gap-2">
                      <KeyRoundIcon className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                        Signing Secret — save this now
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        className="bg-background font-mono text-xs"
                        readOnly
                        value={latestSigningSecret}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        onClick={() =>
                          copyText(
                            latestSigningSecret,
                            "Signing secret copied",
                            "Failed to copy signing secret"
                          )
                        }
                        type="button"
                      >
                        <CopyIcon className="size-3.5" />
                      </Button>
                    </div>
                    <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
                      Shown once only. Use it to verify webhook payload
                      signatures.
                    </p>
                  </div>
                )}
              </section>

              <section className="surface-panel min-w-0 overflow-hidden rounded-[22px] shadow-sm">
                <div className="flex items-center justify-between border-b border-border/70 bg-background/62 px-4 py-4 sm:px-5">
                  <div>
                    <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                      Integrations
                    </p>
                    <h2 className="mt-1 text-base font-semibold">
                      Active destinations
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Manage and toggle your connected endpoints.
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {webhookDestinations.length} connected
                  </Badge>
                </div>

                <div className="p-4 sm:p-5">
                  {webhookDestinations.length === 0 ? (
                    <EmptyWebhooksState />
                  ) : (
                    <div className="space-y-2">
                      {webhookDestinations.map((webhook) => {
                        const isExpanded = expandedWebhookId === webhook._id
                        const lastDelivery =
                          lastDeliveryByWebhookId[webhook._id]
                        return (
                          <div
                            key={webhook._id}
                            className={cn(
                              "overflow-hidden rounded-lg border transition-all duration-200",
                              !webhook.isEnabled && "opacity-60"
                            )}
                          >
                            {/* Collapsed header — always visible */}
                            <div
                              role="button"
                              tabIndex={0}
                              aria-expanded={isExpanded}
                              className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30"
                              onClick={() =>
                                setExpandedWebhookId(
                                  isExpanded ? null : webhook._id
                                )
                              }
                              onKeyDown={(event) => {
                                if (
                                  event.key === "Enter" ||
                                  event.key === " "
                                ) {
                                  event.preventDefault()
                                  setExpandedWebhookId(
                                    isExpanded ? null : webhook._id
                                  )
                                }
                              }}
                            >
                              <div className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted">
                                <ProviderIcon
                                  provider={webhook.provider}
                                  size={18}
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold">
                                    {formatWebhookProviderLabel(
                                      webhook.provider
                                    )}
                                  </span>
                                  {webhook.isEnabled ? (
                                    <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                                      <span className="size-1.5 animate-pulse rounded-full bg-green-500" />
                                      Live
                                    </span>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">
                                      Paused
                                    </span>
                                  )}
                                </div>
                                {webhook.description && (
                                  <p className="truncate text-xs text-muted-foreground">
                                    {webhook.description}
                                  </p>
                                )}
                                {lastDelivery && (
                                  <p
                                    className={cn(
                                      "mt-0.5 text-[10px]",
                                      lastDelivery.status === "success"
                                        ? "text-green-600 dark:text-green-400"
                                        : "text-red-500"
                                    )}
                                  >
                                    Last: {lastDelivery.status}{" "}
                                    {formatTimeAgo(lastDelivery._creationTime)}
                                  </p>
                                )}
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <Switch
                                  checked={webhook.isEnabled}
                                  disabled={loadingWebhookId === webhook._id}
                                  onCheckedChange={() =>
                                    handleToggleWebhookEnabled(webhook)
                                  }
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <ChevronDownIcon
                                  className={cn(
                                    "size-4 text-muted-foreground transition-transform duration-200",
                                    isExpanded && "rotate-180"
                                  )}
                                />
                              </div>
                            </div>

                            {/* Expanded details */}
                            <div
                              className={cn(
                                "overflow-hidden border-t transition-all duration-200",
                                isExpanded
                                  ? "max-h-96 opacity-100"
                                  : "max-h-0 border-t-0 opacity-0"
                              )}
                            >
                              <div className="space-y-3 bg-muted/10 px-4 py-3">
                                {/* URL */}
                                {webhook.url && (
                                  <p className="font-mono text-xs break-all text-muted-foreground">
                                    {webhook.url}
                                  </p>
                                )}
                                {webhook.provider === "telegram" && (
                                  <p className="text-xs text-muted-foreground">
                                    Chat ID:{" "}
                                    {webhook.providerConfigPreview
                                      ?.telegramChatId || "—"}
                                  </p>
                                )}
                                {webhook.provider === "whatsapp" && (
                                  <p className="text-xs text-muted-foreground">
                                    Recipient:{" "}
                                    {webhook.providerConfigPreview
                                      ?.whatsappRecipientPhone || "—"}
                                  </p>
                                )}
                                <p className="font-mono text-[10px] text-muted-foreground/50">
                                  sig: {webhook.signingSecretPreview}
                                </p>

                                {/* Event badges */}
                                <div className="flex flex-wrap gap-1.5">
                                  {webhook.eventTypes.map((et) => (
                                    <Badge
                                      key={`${webhook._id}-${et}`}
                                      variant="secondary"
                                      className="px-2 py-0.5 text-xs"
                                    >
                                      {formatEventTypeLabel(et)}
                                    </Badge>
                                  ))}
                                </div>

                                {/* Action buttons */}
                                <div className="flex items-center gap-2 pt-1">
                                  <Button
                                    className="h-8 gap-1.5 text-xs"
                                    disabled={loadingWebhookId === webhook._id}
                                    onClick={() =>
                                      handleRotateSigningSecret(webhook)
                                    }
                                    size="sm"
                                    type="button"
                                    variant="outline"
                                  >
                                    <RefreshCwIcon className="size-3" />
                                    Rotate Secret
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        className="h-8 gap-1.5 text-xs"
                                        disabled={
                                          loadingWebhookId === webhook._id
                                        }
                                        size="sm"
                                        type="button"
                                        variant="destructive"
                                      >
                                        <Trash2Icon className="size-3" />
                                        Remove
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          Remove webhook destination?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This will permanently delete the{" "}
                                          {formatWebhookProviderLabel(
                                            webhook.provider
                                          )}{" "}
                                          destination
                                          {webhook.description
                                            ? ` "${webhook.description}"`
                                            : ""}{" "}
                                          and all its delivery history. This
                                          action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>
                                          Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() =>
                                            handleDeleteWebhook(webhook)
                                          }
                                        >
                                          Remove
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* ── Delivery History ── */}
            <section className="surface-panel overflow-hidden rounded-[22px] shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 bg-background/62 px-4 py-4 sm:px-5">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background shadow-sm">
                    <ActivityIcon className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                      Event log
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold">
                        Delivery history
                      </h2>
                      {successCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                          <CheckCircle2Icon className="size-3" />
                          {successCount} ok
                        </span>
                      )}
                      {failedCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
                          <XCircleIcon className="size-3" />
                          {failedCount} failed
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Recent webhook dispatch attempts and their outcomes.
                    </p>
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      className="h-8 shrink-0 gap-1.5 text-xs"
                      disabled={
                        isClearingDeliveryHistory || deliveryLogs.length === 0
                      }
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <Trash2Icon className="size-3" />
                      {isClearingDeliveryHistory
                        ? "Clearing..."
                        : "Clear history"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Clear delivery history?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all {deliveryLogs.length}{" "}
                        delivery log{deliveryLogs.length !== 1 ? "s" : ""}. This
                        action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearDeliveryHistory}>
                        Clear history
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {/* Timeline feed */}
              {deliveryLogs.length === 0 ? (
                <EmptyDeliveriesState />
              ) : (
                <ScrollArea
                  className={cn(hasOverflowingDeliveryHistory && "h-[35rem]")}
                >
                  <div className="divide-y">
                    {deliveryLogs.map((delivery) => (
                      <div
                        key={delivery._id}
                        className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-muted/20"
                      >
                        <div
                          className={cn(
                            "mt-1.5 size-2 shrink-0 rounded-full",
                            delivery.status === "success"
                              ? "bg-green-500"
                              : "bg-red-500"
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium">
                              {formatEventTypeLabel(delivery.eventType)}
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {formatTimeAgo(delivery._creationTime)}
                            </span>
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                            <span
                              className={cn(
                                "font-medium",
                                delivery.status === "success"
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-500"
                              )}
                            >
                              {delivery.status}
                            </span>
                            <span className="max-w-[240px] truncate font-mono opacity-70">
                              {delivery.webhookUrl}
                            </span>
                            {delivery.responseStatus && (
                              <span>· HTTP {delivery.responseStatus}</span>
                            )}
                            {delivery.durationMs && (
                              <span>· {delivery.durationMs}ms</span>
                            )}
                            {delivery.attempt > 1 && (
                              <span>· Attempt #{delivery.attempt}</span>
                            )}
                            {delivery.error && (
                              <span className="max-w-[200px] truncate text-red-500">
                                · {delivery.error}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
